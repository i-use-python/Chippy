import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEMO_JOBS, USER_NAME } from '../data/demoData';
import { getAllJobs, seedDemoJobs, startNewJob } from '../utils/jobStore';

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
            {job.description || job.report?.summary || 'New job'}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-charcoal/50 mt-2">
            {formatDate(job.date)}
          </p>
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
    // Seed demo data on first visit, then read from localStorage
    seedDemoJobs(DEMO_JOBS);
    setJobs(getAllJobs());
  }, []);

  const handleNewJob = () => {
    startNewJob('');
    navigate('/record');
  };

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      {/* Header */}
      <header className="px-5 pt-12 pb-2">
        <h1 className="font-heading text-3xl text-black leading-tight">
          Kia ora, {USER_NAME}
        </h1>
        <p className="text-sm text-charcoal mt-1">
          Talk for 2 minutes. Job's written up.
        </p>
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
