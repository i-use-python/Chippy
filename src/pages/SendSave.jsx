import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentJob, saveCurrentJob, saveJobToHistory, clearCurrentJob, getBusinessProfile } from '../utils/jobStore';
import { generatePdf } from '../utils/generatePdf';

export default function SendSave() {
  const navigate = useNavigate();
  const [job, setJob] = useState(getCurrentJob);
  const [sent, setSent] = useState(false);
  const profile = getBusinessProfile() || {};

  if (!job) {
    navigate('/');
    return null;
  }

  const pdfFilename = `Chippy_${(job.address || 'job').replace(/[^a-zA-Z0-9]/g, '_')}_${
    new Date(job.date).toISOString().split('T')[0]
  }.pdf`;

  const handleDownloadPdf = () => {
    const doc = generatePdf(job);
    doc.save(pdfFilename);
  };

  const markSent = () => {
    const updated = { ...job, status: 'sent' };
    saveCurrentJob(updated);
    saveJobToHistory(updated);
    setJob(updated);
    setSent(true);
  };

  const handleSendReport = async () => {
    if (!job) return;

    // Generate the PDF as a Blob/File
    const doc = generatePdf(job);
    const pdfBlob = doc.output('blob');
    const filename = `Chippy_${job.ref || 'report'}.pdf`;
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    // Build email content
    const clientFirstName = (job.clientName || '').split(' ')[0] || 'there';
    const businessName = profile.businessName || 'your tradie';
    const address = job.address || 'the job site';
    const dateStr = new Date(job.date).toLocaleDateString('en-NZ');

    const subject = `Job Record - ${address}`;
    const body = `Hi ${clientFirstName},\n\nPlease find attached the job record for work completed at ${address} on ${dateStr}.\n\nThanks,\n${businessName}`;

    // Try Web Share API first (mobile — can attach the PDF natively)
    const shareData = {
      title: subject,
      text: body,
      files: [pdfFile],
    };

    if (navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        markSent();
        return;
      } catch (err) {
        // User cancelled the share sheet — don't fall through to mailto
        if (err.name === 'AbortError') return;
        // Other error — fall through to mailto
        console.warn('Share failed, falling back to mailto:', err);
      }
    }

    // Fallback: mailto (desktop or older browsers — no attachment)
    // Download the PDF separately so the user can attach it manually
    doc.save(filename);
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n(The PDF has been downloaded — please attach it before sending.)')}`;
    window.location.href = mailtoUrl;
    markSent();
  };

  const handleSavePhotos = () => {
    (job.photos || []).forEach((photo, i) => {
      if (!photo.dataUrl) return;
      const a = document.createElement('a');
      a.href = photo.dataUrl;
      a.download = `Chippy_${(job.address || 'job').replace(/[^a-zA-Z0-9]/g, '_')}_photo_${i + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  const handleDone = () => {
    clearCurrentJob();
    navigate('/');
  };

  const photoCount = (job.photos || []).filter((p) => p.dataUrl).length;

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
          {sent ? 'Report sent!' : 'Send your report'}
        </h1>
      </header>

      <main className="flex-1 px-5 pb-28">
        {!sent ? (
          <>
            <p className="font-body text-sm text-charcoal mb-8 leading-relaxed">
              Tap below to send the job record to the client. On mobile, you'll
              get the share sheet to pick your mail app — the PDF will be attached
              automatically. On desktop, the PDF will download and your mail app
              will open.
            </p>

            {/* Send Report button */}
            <button
              onClick={handleSendReport}
              className="btn btn-yellow w-full py-4 text-sm mb-4"
            >
              Send Report
            </button>

            {/* Secondary actions */}
            <button
              onClick={handleDownloadPdf}
              className="btn btn-white w-full py-4 text-sm mb-3"
            >
              Download PDF Only
            </button>

            {photoCount > 0 && (
              <button
                onClick={handleSavePhotos}
                className="btn btn-white w-full py-4 text-sm"
              >
                Save Photos to Files
              </button>
            )}
          </>
        ) : (
          /* Confirmation after sending */
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
            <p className="font-body text-sm text-charcoal mb-6 leading-relaxed">
              The job record has been shared with your client.
              Make sure they confirm receipt.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-charcoal/40">
              {job.address}
            </p>

            {/* Post-send actions */}
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={handleDownloadPdf}
                className="btn btn-black w-full py-4 text-sm"
              >
                Download PDF
              </button>
              {photoCount > 0 && (
                <button
                  onClick={handleSavePhotos}
                  className="btn btn-white w-full py-4 text-sm"
                >
                  Save Photos to Files
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Button */}
      {sent && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-offwhite via-offwhite to-transparent pt-8">
          <button onClick={handleDone} className="btn btn-yellow w-full py-4 text-sm">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
