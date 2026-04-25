/**
 * api/generate-report.js — Vercel serverless function.
 * Proxies report generation requests to Anthropic so the API key
 * never leaves the server.
 */

const SYSTEM_PROMPT = `You are a report-writing assistant for NZ tradies. Take the voice transcript and photo labels provided and produce a structured job record. Use clean, professional language but keep the tradie's voice and terminology. Return valid JSON with these keys:
- workPerformed (string, 2-4 sentences describing what was done)
- materialsUsed (array of strings, each a material + quantity if mentioned)
- notes (array of strings, findings/observations/recommendations)
- summary (single sentence, 15 words max)

Do not invent materials or details not mentioned. If the tradie didn't mention materials, return an empty array. Be honest about what you're told. Use New Zealand English. Return ONLY the JSON object, no markdown fences.`;

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfigured — missing API key.' });
  }

  const { transcript, photos, address, date } = req.body || {};

  if (!transcript) {
    return res.status(400).json({ error: 'Missing required field: transcript' });
  }

  // Build photo label summary
  const labelCounts = {};
  (photos || []).forEach((p) => {
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
        model: 'claude-sonnet-4-6',
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
