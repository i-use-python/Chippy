/**
 * jobStore.js — localStorage-based state management for Chippy.
 *
 * Two keys:
 *   chippy_current_job  → the job currently being created (in-progress flow)
 *   chippy_jobs          → array of all completed/saved jobs (shown on Home)
 */

const CURRENT_JOB_KEY = 'chippy_current_job';
const JOBS_KEY = 'chippy_jobs';

// ── One-time migration from old "sitenote_*" keys ──

function migrateFromSiteNote() {
  const OLD_CURRENT = 'sitenote_current_job';
  const OLD_JOBS = 'sitenote_jobs';

  const oldCurrent = localStorage.getItem(OLD_CURRENT);
  if (oldCurrent !== null) {
    if (localStorage.getItem(CURRENT_JOB_KEY) === null) {
      localStorage.setItem(CURRENT_JOB_KEY, oldCurrent);
    }
    localStorage.removeItem(OLD_CURRENT);
  }

  const oldJobs = localStorage.getItem(OLD_JOBS);
  if (oldJobs !== null) {
    if (localStorage.getItem(JOBS_KEY) === null) {
      localStorage.setItem(JOBS_KEY, oldJobs);
    }
    localStorage.removeItem(OLD_JOBS);
  }
}

// Run migration on module load
migrateFromSiteNote();

// ── Current Job (the one being recorded right now) ──

export function getCurrentJob() {
  const data = localStorage.getItem(CURRENT_JOB_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveCurrentJob(job) {
  localStorage.setItem(CURRENT_JOB_KEY, JSON.stringify(job));
}

export function clearCurrentJob() {
  localStorage.removeItem(CURRENT_JOB_KEY);
}

export function startNewJob(address = '') {
  const job = {
    id: Date.now().toString(36),
    address,
    client: '',
    description: '',
    date: new Date().toISOString(),
    transcript: '',
    photos: [],       // [{ id, dataUrl, label }]
    report: null,
    status: 'draft',
  };
  saveCurrentJob(job);
  return job;
}

// ── All Jobs (saved history shown on Home) ──

export function getAllJobs() {
  const data = localStorage.getItem(JOBS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveJobToHistory(job) {
  const jobs = getAllJobs();
  const index = jobs.findIndex((j) => j.id === job.id);
  if (index >= 0) {
    jobs[index] = job;
  } else {
    jobs.unshift(job); // newest first
  }
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

export function seedDemoJobs(demoJobs) {
  const existing = getAllJobs();
  if (existing.length === 0) {
    localStorage.setItem(JOBS_KEY, JSON.stringify(demoJobs));
  }
}
