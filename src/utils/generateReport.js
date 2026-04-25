/**
 * generateReport.js — Calls the server-side API endpoint to turn a voice
 * transcript into a structured job report. Falls back to demo data if the
 * API is unavailable.
 */

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
};

export async function generateReport({ address, date, transcript, photos }) {
  try {
    const startTime = Date.now();

    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, date, transcript, photos }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `API ${response.status}`);
    }

    const data = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return { report: data.report, elapsed, usedFallback: false };
  } catch (error) {
    console.error('Report generation failed:', error);
    return {
      report: FALLBACK_REPORT,
      usedFallback: true,
      error: error.message,
    };
  }
}
