-- CV feedback versioning table
CREATE TABLE IF NOT EXISTS cv_feedback_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  feedback text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by text DEFAULT 'manager'
);

CREATE INDEX IF NOT EXISTS cv_feedback_history_case_id_idx ON cv_feedback_history(case_id);
