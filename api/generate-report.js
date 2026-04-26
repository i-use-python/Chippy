/**
 * api/generate-report.js — Vercel serverless function.
 * Proxies report generation requests to Anthropic so the API key
 * never leaves the server.
 *
 * Security layers (applied in order):
 * 1. CORS — only allows requests from getchippy.co.nz, localhost dev,
 *    and Vercel preview deploys. Blocks unknown origins.
 * 2. Rate limiting — in-memory per-IP throttle: max 5 requests/minute
 *    and 50 requests/day. Prevents abuse and runaway API costs.
 * 3. Input validation — checks types, lengths, and structure of all
 *    fields before they reach the Anthropic API.
 */

// ── CORS ──

const ALLOWED_ORIGIN_HOSTS = [
  'getchippy.co.nz',
  'www.getchippy.co.nz',
  'localhost:5173',
  'localhost:3000',
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const host = url.host;
    if (ALLOWED_ORIGIN_HOSTS.includes(host)) return true;
    if (host.endsWith('.vercel.app')) return true;
    return false;
  } catch {
    return false;
  }
}

function setCorsHeaders(res, origin) {
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Rate Limiting ──

const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const DAILY_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAILY_LIMIT_MAX_REQUESTS = 50;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || {
    minuteCount: 0,
    minuteStart: now,
    dayCount: 0,
    dayStart: now,
  };

  if (now - record.minuteStart > RATE_LIMIT_WINDOW_MS) {
    record.minuteCount = 0;
    record.minuteStart = now;
  }
  if (now - record.dayStart > DAILY_LIMIT_WINDOW_MS) {
    record.dayCount = 0;
    record.dayStart = now;
  }

  if (record.minuteCount >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      reason: 'minute',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - record.minuteStart)) / 1000),
    };
  }
  if (record.dayCount >= DAILY_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      reason: 'day',
      retryAfter: Math.ceil((DAILY_LIMIT_WINDOW_MS - (now - record.dayStart)) / 1000),
    };
  }

  record.minuteCount += 1;
  record.dayCount += 1;
  rateLimitStore.set(ip, record);
  return { allowed: true };
}

// ── Input Validation ──

function validateAndSanitize(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }

  const { transcript, photos, address, date } = body;

  if (typeof transcript !== 'string') {
    return { ok: false, error: 'transcript must be a string' };
  }
  const trimmedTranscript = transcript.trim();
  if (trimmedTranscript.length === 0) {
    return { ok: false, error: 'transcript cannot be empty' };
  }
  if (trimmedTranscript.length > 10000) {
    return { ok: false, error: 'transcript too long (max 10000 characters)' };
  }

  let sanitizedPhotos = [];
  if (photos !== undefined) {
    if (!Array.isArray(photos)) {
      return { ok: false, error: 'photos must be an array' };
    }
    if (photos.length > 50) {
      return { ok: false, error: 'too many photos (max 50)' };
    }
    sanitizedPhotos = photos
      .slice(0, 50)
      .map((p) => {
        if (!p || typeof p !== 'object') return null;
        return {
          label: typeof p.label === 'string' ? p.label.slice(0, 50) : null,
        };
      })
      .filter(Boolean);
  }

  let sanitizedAddress = '';
  if (address !== undefined) {
    if (typeof address !== 'string') {
      return { ok: false, error: 'address must be a string' };
    }
    sanitizedAddress = address.trim().slice(0, 500);
  }

  let sanitizedDate = '';
  if (date !== undefined) {
    if (typeof date !== 'string') {
      return { ok: false, error: 'date must be a string' };
    }
    sanitizedDate = date.trim().slice(0, 100);
  }

  return {
    ok: true,
    data: {
      transcript: trimmedTranscript,
      photos: sanitizedPhotos,
      address: sanitizedAddress,
      date: sanitizedDate,
    },
  };
}

// ── System Prompt ──

const SYSTEM_PROMPT = `You are a report-writing assistant for NZ tradies. Take the voice transcript and photo labels provided and produce a structured job record. Use clean, professional language but keep the tradie's voice and terminology. Return valid JSON with these keys:
- workPerformed (string, 2-4 sentences describing what was done)
- materialsUsed (array of strings, each a material + quantity if mentioned, format as "Material name × quantity" when quantity is known)
- notes (array of strings, 2-4 short bullet observations/findings from the transcript — condition checks, recommendations, things the tradie advised the client)

Do not invent materials or details not mentioned. If the tradie didn't mention materials, return an empty array. If there are no observations or findings in the transcript, return an empty notes array. Be honest about what you're told. Use New Zealand English. Return ONLY the JSON object, no markdown fences.`;

// ── Handler ──

export default async function handler(req, res) {
  // 1. CORS
  const origin = req.headers.origin;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (origin && !isOriginAllowed(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // 2. Rate limiting
  const ip = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({
      error: limit.reason === 'minute'
        ? 'Too many requests. Try again in a minute.'
        : 'Daily limit reached. Try again tomorrow.',
    });
  }

  // 3. Input validation
  const validation = validateAndSanitize(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }
  const { transcript, photos, address, date } = validation.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfigured — missing API key.' });
  }

  // Build photo label summary
  const labelCounts = {};
  photos.forEach((p) => {
    const label = p.label || 'unlabelled';
    labelCounts[label] = (labelCounts[label] || 0) + 1;
  });
  const photoSummary =
    Object.entries(labelCounts)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ') || 'No photos';

  const userMessage = `Job: ${address || 'Not specified'}\nDate: ${date || new Date().toISOString()}\nPhotos: ${photoSummary}\nTranscript: ${transcript}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Anthropic API error:', response.status, errorBody);
      return res.status(502).json({
        error: `Anthropic API returned ${response.status}`,
        detail: errorBody,
      });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Extract JSON from response (handles both raw JSON and markdown-fenced)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'No valid JSON in API response' });
    }

    const report = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ report });
  } catch (error) {
    console.error('Report generation failed:', error);
    return res.status(500).json({ error: 'Report generation failed', detail: error.message });
  }
}
