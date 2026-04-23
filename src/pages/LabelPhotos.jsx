import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentJob, saveCurrentJob } from '../utils/jobStore';

const LABELS = [
  { value: 'before', display: 'Before' },
  { value: 'in-progress', display: 'In Progress' },
  { value: 'completed', display: 'Completed' },
];

export default function LabelPhotos() {
  const navigate = useNavigate();
  const job = getCurrentJob();
  const [photos, setPhotos] = useState(job?.photos || []);
  const [currentIndex, setCurrentIndex] = useState(0);

  // If no photos, skip straight to report
  if (photos.length === 0) {
    navigate('/report');
    return null;
  }

  const currentPhoto = photos[currentIndex];
  const allLabelled = photos.every((p) => p.label !== null);
  const labelledCount = photos.filter((p) => p.label !== null).length;

  const selectLabel = (labelValue) => {
    const updated = photos.map((p, i) =>
      i === currentIndex ? { ...p, label: labelValue } : p
    );
    setPhotos(updated);

    // Auto-advance to next unlabelled photo (or stay if last)
    const nextUnlabelled = updated.findIndex(
      (p, i) => i > currentIndex && p.label === null
    );
    if (nextUnlabelled >= 0) {
      setTimeout(() => setCurrentIndex(nextUnlabelled), 300);
    } else if (!allLabelled) {
      // Check if any before current index are unlabelled
      const anyBefore = updated.findIndex((p) => p.label === null);
      if (anyBefore >= 0) {
        setTimeout(() => setCurrentIndex(anyBefore), 300);
      }
    }
  };

  const goToPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goToNext = () => setCurrentIndex((i) => Math.min(photos.length - 1, i + 1));

  const handleGenerate = () => {
    const updatedJob = { ...job, photos };
    saveCurrentJob(updatedJob);
    navigate('/report');
  };

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      <header className="px-5 pt-8 pb-4">
        <button
          onClick={() => navigate('/photos')}
          className="font-mono text-xs uppercase tracking-widest text-charcoal/50 mb-4 block"
        >
          ← Back
        </button>
        <p className="font-mono text-[11px] uppercase tracking-widest text-yellow bg-black inline-block px-2 py-1 mb-3">
          Step 2 of 2
        </p>
        <h1 className="font-heading text-2xl text-black">Tag each photo</h1>
      </header>

      <main className="flex-1 px-5 pb-28">
        {/* Photo preview */}
        <div className="relative aspect-[4/3] bg-white border-2 border-black overflow-hidden mb-4">
          <img
            src={currentPhoto.dataUrl}
            alt={`Photo ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />
          {/* Navigation arrows */}
          {currentIndex > 0 && (
            <button
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 text-white
                         flex items-center justify-center text-xl font-bold"
            >
              ‹
            </button>
          )}
          {currentIndex < photos.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/70 text-white
                         flex items-center justify-center text-xl font-bold"
            >
              ›
            </button>
          )}
          {/* Current label badge */}
          {currentPhoto.label && (
            <span className="pill pill-sent absolute top-3 right-3 text-[10px]">
              {currentPhoto.label}
            </span>
          )}
        </div>

        {/* Counter */}
        <p className="font-mono text-[11px] uppercase tracking-widest text-charcoal/50 text-center mb-4">
          Photo {currentIndex + 1} of {photos.length} · {labelledCount} labelled
        </p>

        {/* Label Instruction */}
        <p className="font-body text-sm text-charcoal text-center mb-4">
          Which stage is this?
        </p>

        {/* Label Buttons */}
        <div className="flex flex-col gap-2">
          {LABELS.map(({ value, display }) => {
            const isSelected = currentPhoto.label === value;
            return (
              <button
                key={value}
                onClick={() => selectLabel(value)}
                className={`flex items-center gap-3 px-4 py-3.5 border-2 border-black text-left
                            transition-all ${
                              isSelected
                                ? 'bg-yellow shadow-[3px_3px_0_#0A0A0A]'
                                : 'bg-white shadow-[2px_2px_0_#0A0A0A] active:shadow-[1px_1px_0_#0A0A0A] active:translate-x-[1px] active:translate-y-[1px]'
                            }`}
              >
                {/* Radio dot */}
                <div
                  className={`w-5 h-5 rounded-full border-2 border-black flex items-center justify-center ${
                    isSelected ? 'bg-black' : 'bg-white'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-yellow" />}
                </div>
                <span className="font-heading text-sm uppercase tracking-wider">
                  {display}
                </span>
              </button>
            );
          })}
        </div>

        {/* Thumbnail strip */}
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setCurrentIndex(i)}
              className={`shrink-0 w-14 h-14 border-2 overflow-hidden ${
                i === currentIndex ? 'border-yellow' : 'border-black/20'
              } ${photo.label ? '' : 'opacity-60'}`}
            >
              <img
                src={photo.dataUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </main>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-offwhite via-offwhite to-transparent pt-8">
        <button
          onClick={handleGenerate}
          disabled={!allLabelled}
          className={`btn w-full py-4 text-sm ${
            allLabelled ? 'btn-yellow' : 'btn-yellow opacity-40 cursor-not-allowed'
          }`}
        >
          {allLabelled
            ? 'Generate Report →'
            : `Label ${photos.length - labelledCount} more photo${photos.length - labelledCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
