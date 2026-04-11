-- UX batch: cv feedback + formation notes
ALTER TABLE cases ADD COLUMN IF NOT EXISTS cv_feedback text;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS intern_level_notes text;
