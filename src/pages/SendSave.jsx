import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentJob, saveCurrentJob, saveJobToHistory, clearCurrentJob, getBusinessProfile } from '../utils/jobStore';
import { generatePdf } from '../utils/generatePdf';

const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

const iconProps = {
  width: 20, height: 20, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round',
};
const MailIcon = () => (
  <svg {...iconProps}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
);
const MessageSquareIcon = () => (
  <svg {...iconProps}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);
const MessageCircleIcon = () => (
  <svg {...iconProps}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
);
const ShareIcon = () => (
  <svg {...iconProps}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></svg>
);

export default function SendSave() {
  const navigate = useNavigate();
  const [job, setJob] = useState(getCurrentJob);
  const [sent, setSent] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
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

  const buildShareContent = () => {
    const doc = generatePdf(job);
    const filename = `Chippy_${job.ref || 'report'}.pdf`;
    const clientFirstName = (job.clientName || '').split(' ')[0] || 'there';
    const businessName = profile.businessName || 'your tradie';
    const address = job.address || 'the job site';
    const dateStr = new Date(job.date).toLocaleDateString('en-NZ');
    const subject = `Job Record - ${address}`;
    const body = `Hi ${clientFirstName},\n\nPlease find attached the job record for work completed at ${address} on ${dateStr}.\n\nThanks,\n${businessName}`;
    return { doc, filename, subject, body };
  };

  const openShareSheet = () => setShowShareSheet(true);
  const closeShareSheet = () => setShowShareSheet(false);

  const handleMail = () => {
    if (!job) return;

    const clientFirstName = (job.clientName || '').split(' ')[0] || 'there';
    const businessName = profile.businessName || 'your tradie';
    const address = job.address || 'the job site';
    const dateStr = new Date(job.date).toLocaleDateString('en-NZ');

    const subject = `Job Record - ${address}`;
    const body = `Hi ${clientFirstName},\n\nPlease find attached the job record for work completed at ${address} on ${dateStr}.\n\nThe PDF has been downloaded - please attach it before sending.\n\nThanks,\n${businessName}`;

    // Fire mailto FIRST while we're still in the user-gesture context
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Generate and download the PDF AFTER mailto, with a small delay so iOS doesn't kill it
    setTimeout(() => {
      const doc = generatePdf(job);
      doc.save(`Chippy_${job.ref || 'report'}.pdf`);
    }, 500);

    markSent();
  };

  const handleMessages = () => {
    if (!job) return;

    const clientFirstName = (job.clientName || '').split(' ')[0] || 'there';
    const businessName = profile.businessName || 'your tradie';
    const address = job.address || 'the job site';
    const dateStr = new Date(job.date).toLocaleDateString('en-NZ');

    const body = `Hi ${clientFirstName},\n\nPlease find attached the job record for work completed at ${address} on ${dateStr}.\n\nThe PDF has been downloaded - please attach it before sending.\n\nThanks,\n${businessName}`;

    window.location.href = `sms:?body=${encodeURIComponent(body)}`;

    setTimeout(() => {
      const doc = generatePdf(job);
      doc.save(`Chippy_${job.ref || 'report'}.pdf`);
    }, 500);

    markSent();
  };

  const handleWhatsApp = () => {
    if (!job) return;

    const clientFirstName = (job.clientName || '').split(' ')[0] || 'there';
    const businessName = profile.businessName || 'your tradie';
    const address = job.address || 'the job site';
    const dateStr = new Date(job.date).toLocaleDateString('en-NZ');

    const body = `Hi ${clientFirstName},\n\nPlease find attached the job record for work completed at ${address} on ${dateStr}.\n\nThe PDF has been downloaded - please attach it before sending.\n\nThanks,\n${businessName}`;

    window.location.href = `https://wa.me/?text=${encodeURIComponent(body)}`;

    setTimeout(() => {
      const doc = generatePdf(job);
      doc.save(`Chippy_${job.ref || 'report'}.pdf`);
    }, 500);

    markSent();
  };

  const handleAirDrop = async () => {
    const { doc, filename, subject, body } = buildShareContent();
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
    const shareData = { title: subject, text: body, files: [pdfFile] };
    if (navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        closeShareSheet();
        markSent();
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Share failed:', err);
      }
    } else {
      doc.save(filename);
      closeShareSheet();
      markSent();
    }
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
              Tap below to send the job record to the client. Pick a channel —
              the PDF will download and the chosen app will open with the message
              pre-filled.
            </p>

            {/* Send Report button */}
            <button
              onClick={openShareSheet}
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

      {/* Share Sheet — bottom sheet on mobile, centred modal on desktop */}
      {showShareSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={closeShareSheet}
        >
          <div
            className="w-full max-w-[430px] bg-offwhite border-t-2 border-x-2 sm:border-2 border-black p-5 shadow-[3px_3px_0_#0A0A0A]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-[11px] uppercase tracking-widest text-yellow bg-black inline-block px-2 py-1 mb-3">
              Share
            </p>
            <h2 className="font-heading text-xl text-black mb-1">Send to client</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-charcoal/50 mb-5">
              Pick a channel
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleMail}
                className="btn btn-yellow w-full py-4 text-sm !justify-start pl-5"
              >
                <MailIcon /> Mail
              </button>
              <button
                onClick={handleMessages}
                className="btn btn-white w-full py-4 text-sm !justify-start pl-5"
              >
                <MessageSquareIcon /> Messages
              </button>
              <button
                onClick={handleWhatsApp}
                className="btn btn-white w-full py-4 text-sm !justify-start pl-5"
              >
                <MessageCircleIcon /> WhatsApp
              </button>
              {isIOS && (
                <button
                  onClick={handleAirDrop}
                  className="btn btn-white w-full py-4 text-sm !justify-start pl-5"
                >
                  <ShareIcon /> AirDrop
                </button>
              )}
            </div>

            <button
              onClick={closeShareSheet}
              className="font-mono text-xs uppercase tracking-widest text-charcoal/60 mt-5 mx-auto block py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
