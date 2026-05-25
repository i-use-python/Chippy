/**
 * generateReport.js — Calls the server-side API endpoint to turn a voice
 * transcript into a structured job report.
 *
 * Resilience contract:
 * - Before every request the exact input (transcript + photos + meta) is
 *   written to localStorage so nothing is lost if the request fails, the tab
 *   is closed, or the device reloads. The caller can recover it via
 *   getPendingReportInput() and resubmit.
 * - A failure is never swallowed into demo data. The result object reports
 *   { ok: false, offline, status, error } so the UI can show a friendly,
 *   recoverable error instead of a wrong report.
 * - The server retries transient upstream errors (429/5xx/529); this client
 *   simply waits for that single request to resolve.
 */

const PENDING_KEY = 'chippy_report_pending';

/** Persist the exact report input so it survives a failed request or reload. */
export function savePendingReportInput(input) {
  try {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ ...input, savedAt: Date.now() })
    );
  } catch (e) {
    console.warn('[generateReport] Could not persist pending input:', e);
  }
}

/** Recover previously saved report input (used by "Try Again"). */
export function getPendingReportInput() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Clear the safety copy once a report has been generated successfully. */
export function clearPendingReportInput() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Generate a report from the given job input.
 * Always resolves (never throws) with one of:
 *   { ok: true,  report, elapsed }
 *   { ok: false, offline: true, error }                  ← no connection
 *   { ok: false, offline: false, status, error }         ← server/API failure
 */
export async function generateReport({ address, date, transcript, photos }) {
  // 1. Save the exact payload first — before anything can go wrong.
  savePendingReportInput({ address, date, transcript, photos });

  // 2. Offline guard — fail fast and clearly rather than hanging on a fetch
  //    that can't succeed.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.warn('[generateReport] Aborting — device reports offline');
    return { ok: false, offline: true, error: 'offline' };
  }

  try {
    const startTime = Date.now();

    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, date, transcript, photos }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('[generateReport] API returned non-OK response:', {
        status: response.status,
        body: errorBody,
      });
      return {
        ok: false,
        offline: false,
        status: response.status,
        error: errorBody.error || `API ${response.status}`,
      };
    }

    const data = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Success — the safety copy is no longer needed.
    clearPendingReportInput();
    return { ok: true, report: data.report, elapsed };
  } catch (error) {
    // A fetch rejection usually means the network dropped mid-flight. Re-check
    // connectivity so we can show the right message.
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    console.error('[generateReport] Request failed:', {
      message: error.message,
      offline,
      error,
    });
    return { ok: false, offline, error: error.message };
  }
}
