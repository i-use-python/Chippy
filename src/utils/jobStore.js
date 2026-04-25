/**
 * jobStore.js — localStorage-based state management for Chippy.
 *
 * Keys:
 *   chippy_current_job      → the job currently being created (in-progress flow)
 *   chippy_jobs              → array of all completed/saved jobs (shown on Home)
 *   chippy_business_profile  → one-time business/tradie profile
 *   chippy_job_counter       → auto-incrementing counter for job reference numbers
 */

const CURRENT_JOB_KEY = 'chippy_current_job';
const JOBS_KEY = 'chippy_jobs';
const PROFILE_KEY = 'chippy_business_profile';
const COUNTER_KEY = 'chippy_job_counter';

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

// ── Business Profile ──

const DEFAULT_PROFILE = {
  businessName: "Mike's Building Co.",
  tagline: 'BUILDING · RENOVATIONS · NZ',
  phone: '021 488 6723',
  email: 'mike@mikesbuilding.co.nz',
  lbpNumber: 'BP122475',
  nzbn: '9429048627104',
  tradieName: 'Mike Turner',
};

export function getBusinessProfile() {
  const data = localStorage.getItem(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveBusinessProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function seedBusinessProfile() {
  if (!getBusinessProfile()) {
    saveBusinessProfile(DEFAULT_PROFILE);
  }
}

// ── Job Reference Number ──

function nextJobReference() {
  const year = new Date().getFullYear();
  const raw = localStorage.getItem(COUNTER_KEY);
  let counter = raw ? parseInt(raw, 10) : 0;
  counter += 1;
  localStorage.setItem(COUNTER_KEY, String(counter));
  return `JR-${year}-${String(counter).padStart(4, '0')}`;
}

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
    ref: nextJobReference(),
    address,
    clientName: '',
    clientAddress: '',
    clientPhone: '',
    jobTitle: '',
    jobLocation: '',
    date: new Date().toISOString(),
    transcript: '',
    photos: [],       // [{ id, dataUrl, label }]
    report: null,
    status: 'draft',
    startTime: null,  // ISO timestamp — set when recording begins
    finishTime: null, // ISO timestamp — set when recording stops
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
