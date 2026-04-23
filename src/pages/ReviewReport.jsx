import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentJob, saveCurrentJob } from '../utils/jobStore';
import { generateReport } from '../utils/generateReport';

export default function ReviewReport() {
  const navigate = useNavigate();
  const [job, setJob] = useState(getCurrentJob);
  const [report, setReport] = useState(job?.report || null);
  const [loading, setLoading] = useState(!job?.report);
  const [elapsed, setElapsed] = useState(null);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    if (report) return; // Already have a report
    if (!job) { navigate('/'); return; }

    let cancelled = false;

    async function generate() {
      setLoading(true);
      const result = await generateReport({
        address: job.address,
        date: new Date(job.date).toLocaleDateString('en-NZ'),
        transcript: job.transcript,
        photos: job.photos,
      });

      if (cancelled) return;

      setReport(result.report);
      setElapsed(result.elapsed || '2.1');
      setUsedFallback(result.usedFallback);
      if (result.error) setError(result.error);
      setLoading(false);

      // Save report to current job
      const updated = { ...job, report: result.report };
      saveCurrentJob(updated);
      setJob(updated);
    }

    generate();
    return () => { cancelled = true; };
  }, []);

  if (!job) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="px-5 pt-8 pb-4">
        <button
          onClick={() => navigate('/label')}
          className="font-mono text-xs uppercase tracking-widest text-white/40 mb-4 block"
        >
          ← Back
        </button>
        <h1 className="font-heading text-2xl text-white">
          {loading ? 'Generating your report...' : "Your report's ready"}
        </h1>
        {!loading && (
          <p className="font-mono text-[11px] uppercase tracking-widest text-yellow mt-1">
            {usedFallback
              ? 'Using sample report (API unavailable)'
              : `Generated in ${elapsed}s`}
          </p>
        )}
      </header>

      <main className="flex-1 px-5 pb-28">
        {loading ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center py-16">
            <div className="spinner mb-6" />
            <p className="font-mono text-xs uppercase tracking-widest text-white/50">
              Claude is writing your report...
            </p>
          </div>
        ) : (
          <>
            {/* Error banner */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 px-4 py-2 mb-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-red-400">
                  API Error: {error}
                </p>
              </div>
            )}

            {/* Report Card */}
            <div className="bg-white border-2 border-black relative overflow-hidden">
              {/* Hazard stripe accent on left edge */}
              <div className="hazard-stripe absolute left-0 top-0 bottom-0 w-[10px]" />

              <div className="pl-6 pr-4 py-5">
                {/* Job header */}
                <div className="mb-4 pb-3 border-b border-black/10">
                  <p className="font-heading text-sm text-black">{job.address}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-charcoal/50 mt-1">
                    {new Date(job.date).toLocaleDateString('en-NZ', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Summary */}
                {report?.summary && (
                  <div className="bg-yellow/20 border border-yellow px-3 py-2 mb-4">
                    <p className="font-body text-sm text-black font-medium">
                      {report.summary}
                    </p>
                  </div>
                )}

                {/* Work Performed */}
                <section className="mb-4">
                  <h3 className="font-heading text-xs uppercase tracking-wider text-black mb-2">
                    Work Performed
                  </h3>
                  <p className="font-body text-sm text-charcoal leading-relaxed">
                    {report?.workPerformed}
                  </p>
                </section>

                {/* Materials Used */}
                {report?.materialsUsed?.length > 0 && (
                  <section className="mb-4">
                    <h3 className="font-heading text-xs uppercase tracking-wider text-black mb-2">
                      Materials Used
                    </h3>
                    <ul className="space-y-1">
                      {report.materialsUsed.map((item, i) => (
                        <li
                          key={i}
                          className="font-body text-sm text-charcoal flex items-start gap-2"
                        >
                          <span className="text-yellow font-bold mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Notes */}
                {report?.notes?.length > 0 && (
                  <section className="mb-4">
                    <h3 className="font-heading text-xs uppercase tracking-wider text-black mb-2">
                      Notes
                    </h3>
                    <ul className="space-y-1.5">
                      {report.notes.map((note, i) => (
                        <li
                          key={i}
                          className="font-body text-sm text-charcoal flex items-start gap-2"
                        >
                          <span className="text-yellow font-bold mt-0.5">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Photo thumbnails */}
                {job.photos?.length > 0 && (
                  <section>
                    <h3 className="font-heading text-xs uppercase tracking-wider text-black mb-2">
                      Photos
                    </h3>
                    <div className="flex gap-1.5 flex-wrap">
                      {job.photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="w-12 h-12 border border-black/20 overflow-hidden"
                        >
                          {photo.dataUrl ? (
                            <img
                              src={photo.dataUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-offwhite" />
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Bottom Buttons */}
      {!loading && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-black via-black to-transparent pt-8">
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/record')}
              className="btn btn-white flex-1 py-4 text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => navigate('/send')}
              className="btn btn-yellow flex-1 py-4 text-sm"
            >
              Send →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
