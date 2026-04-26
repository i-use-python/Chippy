import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentJob, saveCurrentJob } from '../utils/jobStore';

const MAX_PHOTOS = 12;

function resizeImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AddPhotos() {
  const navigate = useNavigate();
  const job = getCurrentJob();
  const [photos, setPhotos] = useState(job?.photos || []);
  const fileInputRef = useRef(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    const remaining = MAX_PHOTOS - photos.length;
    const toProcess = files.slice(0, remaining);

    const newPhotos = await Promise.all(
      toProcess.map(async (file) => {
        const dataUrl = await resizeImage(file);
        return {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          dataUrl,
          label: null, // untagged
        };
      })
    );

    setPhotos((prev) => [...prev, ...newPhotos]);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removePhoto = (id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleContinue = () => {
    const updatedJob = { ...job, photos };
    saveCurrentJob(updatedJob);
    navigate('/label');
  };

  const handleSkip = () => {
    const updatedJob = { ...job, photos: [] };
    saveCurrentJob(updatedJob);
    navigate('/report');
  };

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      <header className="px-5 pt-8 pb-4">
        <button
          onClick={() => navigate('/record')}
          className="font-mono text-xs uppercase tracking-widest text-charcoal/50 mb-4 block"
        >
          ← Back
        </button>
        <p className="font-mono text-[11px] uppercase tracking-widest text-yellow bg-black inline-block px-2 py-1 mb-3">
          Step 1 of 2
        </p>
        <h1 className="font-heading text-2xl text-black">Snap your photos</h1>
        <p className="text-sm text-charcoal mt-1">
          Add before, during, and after shots. {photos.length} / {MAX_PHOTOS} added.
        </p>
      </header>

      <main className="flex-1 px-5 pb-28">
        {/* Photo Grid — 2 columns */}
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square bg-white border-2 border-black overflow-hidden"
            >
              <img
                src={photo.dataUrl}
                alt="Job photo"
                className="w-full h-full object-cover"
              />
              {/* Label badge */}
              <span className="pill pill-draft absolute bottom-2 left-2 text-[9px]">
                {photo.label || 'Untagged'}
              </span>
              {/* Remove button */}
              <button
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 w-7 h-7 bg-black text-yellow
                           flex items-center justify-center text-lg leading-none font-bold"
              >
                ×
              </button>
            </div>
          ))}

          {/* Add button tile */}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-black/30 bg-white
                         flex flex-col items-center justify-center gap-2
                         active:bg-yellow/10 transition-colors"
            >
              <span className="text-3xl text-black/30 font-heading">+</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-charcoal/40">
                Add photo
              </span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </main>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-offwhite via-offwhite to-transparent pt-8">
        {photos.length > 0 ? (
          <button onClick={handleContinue} className="btn btn-black w-full py-4 text-sm">
            Next: Label Photos →
          </button>
        ) : (
          <button onClick={handleSkip} className="btn btn-black w-full py-4 text-sm">
            Skip Photos → Generate Report
          </button>
        )}
      </div>
    </div>
  );
}
