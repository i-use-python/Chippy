import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentJob, saveCurrentJob, saveJobToHistory, clearCurrentJob, getBusinessProfile } from '../utils/jobStore';
import { generatePdf } from '../utils/generatePdf';

export default function SendSave() {
  const navigate = useNavigate();
  const [job, setJob] = useState(getCurrentJob);
  const [mailOpened, setMailOpened] = useState(false);
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

  const handleOpenMail = () => {
    // 1. Download the PDF so it's ready to attach
    handleDownloadPdf();

    // 2. Build mailto URL
    const clientFirstName = job.clientName
      ? job.clientName.split(' ')[0]
      : 'there';
    const dateStr = new Date(job.date).toLocaleDateString('en-NZ', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const tradieName = profile.tradieName || 'The team';

    const bodyText = [
      `Hi ${clientFirstName},`,
      '',
      `Please find attached the job record for work completed at ${job.address} on ${dateStr}.`,
      '',
      'The PDF has been downloaded to your device — please attach it to this email before sending.',
      '',
      'Thanks,',
      tradieName,
    ].join('\r\n');

    const subject = encodeURIComponent(`Job Record — ${job.address}`);
    const body = encodeURIComponent(bodyText);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

    // 3. Open mail app
    window.location.href = mailtoUrl;

    // 4. Mark as sent and save
    const updated = { ...job, status: 'sent' };
    saveCurrentJob(updated);
    saveJobToHistory(updated);
    setJob(updated);
    setMailOpened(true);
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
        {!mailOpened && (
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
          {mailOpened ? 'Mail app opened' : 'Send your report'}
        </h1>
      </header>

      <main className="flex-1 px-5 pb-28">
        {!mailOpened ? (
          <>
            <p className="font-body text-sm text-charcoal mb-8 leading-relaxed">
              Tap below to open your mail app with the job details pre-filled.
              The PDF will download — attach it to the email before sending.
            </p>

            {/* Open Mail App button */}
            <button
              onClick={handleOpenMail}
              className="btn btn-yellow w-full py-4 text-sm mb-4"
            >
              Open Mail App
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
                Save Photos to Phone
              </button>
            )}
          </>
        ) : (
          /* Confirmation after opening mail */
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
              Don't forget to attach the PDF before sending!
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-charcoal/40">
              {job.address}
            </p>

            {/* Post-send actions */}
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={handleDownloadPdf}
                className="btn btn-white w-full py-4 text-sm"
              >
                Download PDF Again
              </button>
              {photoCount > 0 && (
                <button
                  onClick={handleSavePhotos}
                  className="btn btn-white w-full py-4 text-sm"
                >
                  Save Photos to Phone
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Button */}
      {mailOpened && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-offwhite via-offwhite to-transparent pt-8">
          <button onClick={handleDone} className="btn btn-yellow w-full py-4 text-sm">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
