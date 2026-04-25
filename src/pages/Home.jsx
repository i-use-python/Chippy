import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEMO_JOBS, USER_NAME } from '../data/demoData';
import { getAllJobs, seedDemoJobs, startNewJob, seedBusinessProfile } from '../utils/jobStore';

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}

function StatCard({ jobs }) {
  const sentJobs = jobs.filter((j) => j.status === 'sent');
  const hoursSaved = sentJobs.length * 1.5;

  return (
    <div className="bg-yellow border-2 border-black p-4 mb-6 relative overflow-hidden">
      <div className="hazard-stripe h-[6px] absolute top-0 left-0 right-0" />
      <div className="pt-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-black/60 mb-1">
          Saved this week
        </p>
        <p className="font-heading text-4xl text-black leading-none">
          {hoursSaved} hrs
        </p>
        <p className="font-body text-sm text-black/60 mt-1">
          {sentJobs.length} job{sentJobs.length !== 1 ? 's' : ''} documented
        </p>
      </div>
    </div>
  );
}

function JobCard({ job }) {
  return (
    <Link
      to={job.report ? '/report' : '/record'}
      className="block bg-white border-2 border-black p-4 mb-3 no-underline
                 transition-transform active:translate-x-[2px] active:translate-y-[2px]
                 shadow-[3px_3px_0_#0A0A0A] active:shadow-[1px_1px_0_#0A0A0A]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-sm text-black leading-tight truncate">
            {job.address}
          </h3>
          <p className="text-sm text-charcoal mt-0.5">
            {job.jobTitle || job.description || 'New job'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {job.ref && (
              <span className="font-mono text-[10px] text-charcoal/40">
                {job.ref}
              </span>
            )}
            <span className="font-mono text-[11px] uppercase tracking-widest text-charcoal/50">
              {formatDate(job.date)}
            </span>
          </div>
        </div>
        <span
          className={`pill ${
            job.status === 'sent' ? 'pill-sent' : 'pill-draft'
          } shrink-0 mt-0.5`}
        >
          {job.status}
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    seedBusinessProfile();
    seedDemoJobs(DEMO_JOBS);
    setJobs(getAllJobs());
  }, []);

  const handleNewJob = () => {
    startNewJob('');
    navigate('/client');
  };

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      {/* Header */}
      <header className="px-5 pt-12 pb-2 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl text-black leading-tight">
            Kia ora, {USER_NAME}
          </h1>
          <p className="text-sm text-charcoal mt-1">
            Talk for 2 minutes. Job's written up.
          </p>
        </div>
        {/* Settings gear */}
        <button
          onClick={() => navigate('/profile')}
          className="mt-1 p-2 text-charcoal/40 hover:text-charcoal transition-colors"
          aria-label="Settings"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <main className="px-5 flex-1 pb-24">
        <StatCard jobs={jobs} />

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg text-black">Recent jobs</h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-charcoal/50">
            {jobs.length} total
          </span>
        </div>

        <div>
          {jobs.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-black/20 p-8 text-center">
              <p className="font-body text-sm text-charcoal/50">
                No jobs yet. Start your first one!
              </p>
            </div>
          ) : (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </main>

      {/* Sticky bottom button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-5 bg-gradient-to-t from-offwhite via-offwhite to-transparent pt-8">
        <button onClick={handleNewJob} className="btn btn-black w-full py-4 text-sm">
          + Start New Job
        </button>
      </div>
    </div>
  );
}
