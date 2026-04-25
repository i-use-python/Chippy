import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentJob, saveCurrentJob, startNewJob } from '../utils/jobStore';

const FIELDS = [
  { key: 'clientName', label: 'Client Name', placeholder: 'e.g. Sarah Harper', defaultValue: 'Sarah Harper' },
  { key: 'address', label: 'Client Address', placeholder: 'e.g. 42 Queen Street, Ponsonby, Auckland 1011', defaultValue: '42 Queen Street, Ponsonby, Auckland 1011' },
  { key: 'clientPhone', label: 'Client Phone', placeholder: 'e.g. 021 554 9812', defaultValue: '021 554 9812', type: 'tel' },
  { key: 'jobTitle', label: 'Job Title', placeholder: 'e.g. Bathroom Renovation', defaultValue: 'Bathroom Renovation' },
  { key: 'jobLocation', label: 'Job Location', placeholder: 'e.g. Main bathroom', defaultValue: 'Main bathroom' },
];

export default function ClientDetails() {
  const navigate = useNavigate();
  const [job, setJob] = useState(() => {
    const existing = getCurrentJob();
    if (existing) return existing;
    return startNewJob('');
  });

  // Initialise form values — use job fields if they exist, otherwise demo defaults
  const [values, setValues] = useState(() => {
    const v = {};
    FIELDS.forEach(({ key, defaultValue }) => {
      v[key] = job[key] || defaultValue;
    });
    return v;
  });

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleContinue = () => {
    const updated = { ...job, ...values };
    saveCurrentJob(updated);
    navigate('/record');
  };

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      <header className="px-5 pt-8 pb-4">
        <button
          onClick={() => navigate('/')}
          className="font-mono text-xs uppercase tracking-widest text-charcoal/50 mb-4 block"
        >
          ← Back
        </button>
        {job.ref && (
          <p className="font-mono text-[11px] uppercase tracking-widest text-yellow bg-black inline-block px-2 py-1 mb-3">
            {job.ref}
          </p>
        )}
        <h1 className="font-heading text-2xl text-black">Job &amp; Client Details</h1>
        <p className="font-body text-sm text-charcoal/60 mt-1">
          These details go on the report. Edit or keep the defaults.
        </p>
      </header>

      <main className="flex-1 px-5 pb-28">
        <div className="space-y-4">
          {FIELDS.map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="font-mono text-[11px] uppercase tracking-widest text-charcoal/60 block mb-1">
                {label}
              </label>
              <input
                type={type || 'text'}
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full bg-white border-2 border-black px-4 py-3 font-body text-sm
                           text-black placeholder:text-charcoal/40 outline-none"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-offwhite via-offwhite to-transparent pt-8">
        <button
          onClick={handleContinue}
          className="btn btn-black w-full py-4 text-sm"
        >
          Continue to Recording →
        </button>
      </div>
    </div>
  );
}
