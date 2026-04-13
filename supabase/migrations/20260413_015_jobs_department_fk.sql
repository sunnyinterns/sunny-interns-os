-- S1: Add job_department_id FK and missing fields to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_department_id uuid REFERENCES job_departments(id),
  ADD COLUMN IF NOT EXISTS notes_internal text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_candidates integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS compensation_type text DEFAULT 'gratification',
  ADD COLUMN IF NOT EXISTS compensation_amount numeric,
  ADD COLUMN IF NOT EXISTS skills_required text[],
  ADD COLUMN IF NOT EXISTS profile_sought text;
