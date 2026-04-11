-- Job submissions: extend for candidate classement + employer workflow
ALTER TABLE job_submissions ADD COLUMN IF NOT EXISTS intern_priority INTEGER;
ALTER TABLE job_submissions ADD COLUMN IF NOT EXISTS cv_revision_requested BOOLEAN DEFAULT false;
ALTER TABLE job_submissions ADD COLUMN IF NOT EXISTS cv_revision_done BOOLEAN DEFAULT false;
ALTER TABLE job_submissions ADD COLUMN IF NOT EXISTS employer_response TEXT;
ALTER TABLE job_submissions ADD COLUMN IF NOT EXISTS notes_charly TEXT;
ALTER TABLE job_submissions ADD COLUMN IF NOT EXISTS proposed_during_interview BOOLEAN DEFAULT false;
ALTER TABLE job_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Interns: local CV url (manager-validated version)
ALTER TABLE interns ADD COLUMN IF NOT EXISTS local_cv_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS private_comment_for_employer TEXT;

CREATE INDEX IF NOT EXISTS idx_job_submissions_intern_priority ON job_submissions(case_id, intern_priority);
