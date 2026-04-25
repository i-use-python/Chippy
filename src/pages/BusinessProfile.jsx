import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessProfile, saveBusinessProfile } from '../utils/jobStore';

const FIELDS = [
  { key: 'businessName', label: 'Business Name', placeholder: "e.g. Mike's Building Co." },
  { key: 'tagline', label: 'Tagline', placeholder: 'e.g. BUILDING · RENOVATIONS · NZ' },
  { key: 'tradieName', label: 'Your Full Name', placeholder: 'e.g. Mike Turner' },
  { key: 'phone', label: 'Phone', placeholder: 'e.g. 021 488 6723', type: 'tel' },
  { key: 'email', label: 'Email', placeholder: 'e.g. mike@mikesbuilding.co.nz', type: 'email' },
  { key: 'lbpNumber', label: 'LBP Number', placeholder: 'e.g. BP122475' },
  { key: 'nzbn', label: 'NZBN', placeholder: 'e.g. 9429048627104' },
];

export default function BusinessProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => getBusinessProfile() || {});
  const [saved, setSaved] = useState(false);

  const handleChange = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveBusinessProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        <h1 className="font-heading text-2xl text-black">Business Profile</h1>
        <p className="font-body text-sm text-charcoal/60 mt-1">
          This info appears on your job reports and PDFs.
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
                value={profile[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full bg-white border-2 border-black px-4 py-3 font-body text-sm
                           text-black placeholder:text-charcoal/40 outline-none"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Save button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-offwhite via-offwhite to-transparent pt-8">
        <button
          onClick={handleSave}
          className={`btn w-full py-4 text-sm ${saved ? 'btn-yellow' : 'btn-black'}`}
        >
          {saved ? '✓ Saved' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
