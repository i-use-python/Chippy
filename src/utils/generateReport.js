/**
 * generateReport.js — Calls Anthropic API to turn a voice transcript
 * into a structured job report. Falls back to demo data if API fails.
 */

const SYSTEM_PROMPT = `You are a report-writing assistant for NZ tradies. Take the voice transcript and photo labels provided and produce a structured job record. Use clean, professional language but keep the tradie's voice and terminology. Return valid JSON with these keys:
- workPerformed (string, 2-4 sentences describing what was done)
- materialsUsed (array of strings, each a material + quantity if mentioned)
- notes (array of strings, findings/observations/recommendations)
- summary (single sentence, 15 words max)

Do not invent materials or details not mentioned. If the tradie didn't mention materials, return an empty array. Be honest about what you're told. Use New Zealand English. Return ONLY the JSON object, no markdown fences.`;

const FALLBACK_REPORT = {
  workPerformed:
    'Full bathroom renovation including demolition of existing shower and vanity, wall stripping to studs, insulation upgrade to R2.6 batts, installation of waterproof plasterboard, new shower base with glass enclosure, wall and floor tiling, and fitting of new maple vanity with brushed nickel tapware.',
  materialsUsed: [
    'R2.6 insulation batts',
    'Waterproof plasterboard',
    'Shower base and glass enclosure',
    'Grey mosaic wall tiles',
    'Porcelain floor tiles',
    'Maple vanity unit',
    'Brushed nickel tapware',
    'Silicone sealant',
  ],
  notes: [
    'Existing wall insulation was degraded — upgraded to R2.6 batts',
    'Framing in good condition, no water damage found',
    'Client advised not to use shower for 24 hours to allow silicone to cure',
  ],
  summary: 'Complete bathroom renovation with insulation upgrade at 42 Queen St.',
};

export async function generateReport({ address, date, transcript, photos }) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

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

  const userMessage = `Job: ${address}\nDate: ${date}\nPhotos: ${photoSummary}\nTranscript: ${transcript}`;

  if (!apiKey || apiKey === 'your-key-here') {
    console.warn('No API key set — using fallback report');
    return { report: FALLBACK_REPORT, usedFallback: true };
  }

  try {
    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
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
      throw new Error(`API ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Extract JSON from response (handles both raw JSON and markdown-fenced)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in API response');

    const report = JSON.parse(jsonMatch[0]);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return { report, elapsed, usedFallback: false };
  } catch (error) {
    console.error('Report generation failed:', error);
    return {
      report: FALLBACK_REPORT,
      usedFallback: true,
      error: error.message,
    };
  }
}
