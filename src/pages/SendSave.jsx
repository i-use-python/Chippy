import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentJob, saveCurrentJob, saveJobToHistory, clearCurrentJob } from '../utils/jobStore';
import { generatePdf } from '../utils/generatePdf';

export default function SendSave() {
  const navigate = useNavigate();
  const [job, setJob] = useState(getCurrentJob);
  const [email, setEmail] = useState(job?.client ? '' : 'sarah.harper@email.co.nz');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!job) {
    navigate('/');
    return null;
  }

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);

    // Simulate sending (no backend yet)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mark job as sent and save to history
    const updated = { ...job, status: 'sent', client: email };
    saveCurrentJob(updated);
    saveJobToHistory(updated);
    setJob(updated);
    setSent(true);
    setSending(false);
  };

  const handleDownloadPdf = () => {
    const doc = generatePdf(job);
    const filename = `Chippy_${job.address.replace(/[^a-zA-Z0-9]/g, '_')}_${
      new Date(job.date).toISOString().split('T')[0]
    }.pdf`;
    doc.save(filename);
  };

  const handleDone = () => {
    clearCurrentJob();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      <header className="px-5 pt-8 pb-4">
        {!sent && (
          <button
            onClick={() => navigate('/report')}
            className="font-mono text-xs uppercase tracking-widest text-charcoal/50 mb-4 block"
          >
            ← Back
          </button>
        )}
        <p className="font-mono text-[11px] uppercase tracking-widest text-yellow bg-black inline-block px-2 py-1 mb-3">
          Final step
        </p>
        <h1 className="font-heading text-2xl text-black">
          {sent ? 'Report sent!' : 'Send to client'}
        </h1>
      </header>

      <main className="flex-1 px-5 pb-28">
        {!sent ? (
          <>
            {/* Email input */}
            <label className="font-mono text-[11px] uppercase tracking-widest text-charcoal/60 block mb-1">
              Client Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border-2 border-black px-4 py-3 font-body text-sm
                         text-black placeholder:text-charcoal/40 outline-none mb-6"
              placeholder="client@email.co.nz"
            />

            {/* Email Preview Card */}
            <div className="bg-white border-2 border-black p-4">
              <div className="border-b border-black/10 pb-3 mb-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-charcoal/40 mb-1">
                  Email Preview
                </p>
                <p className="font-body text-sm text-black font-medium">
                  Job Record — {job.address}
                </p>
              </div>

              <p className="font-body text-sm text-charcoal mb-3">
                Hi{email ? ` ${email.split('@')[0]}` : ''},
              </p>
              <p className="font-body text-sm text-charcoal mb-3">
                Please find attached the job record for work completed at{' '}
                <strong>{job.address}</strong> on{' '}
                {new Date(job.date).toLocaleDateString('en-NZ', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                .
              </p>
              {job.report?.summary && (
                <p className="font-body text-sm text-charcoal mb-3 italic">
                  "{job.report.summary}"
                </p>
              )}

              {/* Fake PDF attachment */}
              <div className="flex items-center gap-3 bg-offwhite border border-black/10 px-3 py-2 mt-4">
                <div className="w-8 h-10 bg-red-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-mono text-[8px] font-bold">PDF</span>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-black">
                    Chippy_JobRecord.pdf
                  </p>
                  <p className="font-mono text-[9px] text-charcoal/50">
                    ~{job.photos?.filter((p) => p.dataUrl).length > 0 ? '2.4' : '0.3'} MB
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Sent confirmation */
          <div className="text-center py-8">
            {/* Checkmark */}
            <div className="w-20 h-20 bg-yellow border-2 border-black rounded-full
                            flex items-center justify-center mx-auto mb-6
                            shadow-[3px_3px_0_#0A0A0A]">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className="font-heading text-xl text-black mb-2">Sweet as!</h2>
            <p className="font-body text-sm text-charcoal mb-1">
              Report sent to <strong>{email}</strong>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-charcoal/40">
              {job.address}
            </p>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={handleDownloadPdf}
                className="btn btn-black w-full py-4 text-sm"
              >
                Download PDF
              </button>
              <button
                onClick={handleDownloadPdf}
                className="btn btn-white w-full py-4 text-sm"
              >
                Save to Phone
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-offwhite via-offwhite to-transparent pt-8">
        {!sent ? (
          <button
            onClick={handleSend}
            disabled={!email.trim() || sending}
            className={`btn w-full py-4 text-sm ${
              email.trim() && !sending
                ? 'btn-yellow'
                : 'btn-yellow opacity-40 cursor-not-allowed'
            }`}
          >
            {sending ? 'Sending...' : 'Send Report ↗'}
          </button>
        ) : (
          <button onClick={handleDone} className="btn btn-yellow w-full py-4 text-sm">
            Done
          </button>
        )}
      </div>
    </div>
  );
}
