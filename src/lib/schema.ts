/** Idempotent schema. Runs on first DB access (both PGlite and Postgres/Supabase). */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  employer TEXT NOT NULL,
  employer_slug TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  job_kind TEXT NOT NULL DEFAULT 'other',
  location TEXT,
  work_mode TEXT NOT NULL DEFAULT 'unknown',
  experience_min REAL,
  experience_max REAL,
  salary TEXT,
  posted_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'unverified',
  license_req TEXT NOT NULL DEFAULT 'unknown',
  nationality_req TEXT,
  eligibility_note TEXT,
  description TEXT,
  apply_url TEXT,
  practice_areas JSONB NOT NULL DEFAULT '[]',
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified TIMESTAMPTZ,
  verification_note TEXT,
  origin TEXT NOT NULL DEFAULT 'discovery',
  is_new BOOLEAN NOT NULL DEFAULT true,
  saved BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  match_score INTEGER,
  match_detail JSONB
);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_employer_idx ON jobs(employer_slug);

CREATE TABLE IF NOT EXISTS job_sources (
  id SERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  external_id TEXT,
  publisher TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, source_url)
);

CREATE TABLE IF NOT EXISTS job_status_history (
  id SERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS firm_state (
  slug TEXT PRIMARY KEY,
  watch BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  page_hash TEXT,
  last_checked TIMESTAMPTZ,
  last_check_status TEXT,
  last_check_detail TEXT,
  signals JSONB NOT NULL DEFAULT '[]',
  last_changed TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  content_b64 TEXT NOT NULL,
  extracted_text TEXT,
  application_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  firm_slug TEXT,
  title TEXT NOT NULL,
  employer TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'discovered',
  is_speculative BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  follow_up_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_events (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_outputs (
  id SERIAL PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  content JSONB NOT NULL,
  engine TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_outputs_subject_idx ON ai_outputs(subject_type, subject_id);

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'daily',
  channel_email BOOLEAN NOT NULL DEFAULT false,
  params JSONB NOT NULL DEFAULT '{}',
  last_sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  rule_id TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  dedupe TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  emailed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS discovery_runs (
  id SERIAL PRIMARY KEY,
  trigger TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  ok BOOLEAN,
  sources JSONB NOT NULL DEFAULT '[]',
  new_jobs INTEGER NOT NULL DEFAULT 0,
  updated_jobs INTEGER NOT NULL DEFAULT 0,
  closed_jobs INTEGER NOT NULL DEFAULT 0,
  note TEXT
);
`;
