--- Migration 009: schools_pending + admin_notifications
--- Required for /apply refonte

-- ============================================================
-- TABLE: schools_pending
-- ============================================================
CREATE TABLE IF NOT EXISTS schools_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  website TEXT,
  submitted_by_email TEXT,
  status TEXT DEFAULT 'pending',
  merged_into_school_id UUID REFERENCES schools(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: admin_notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add name_fr, name_en, category_fr, category_en to job_types
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS category_fr TEXT;
ALTER TABLE job_types ADD COLUMN IF NOT EXISTS category_en TEXT;

-- Add school_country + nationalities + local_cv_url to interns
ALTER TABLE interns ADD COLUMN IF NOT EXISTS school_country TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS nationalities TEXT[] DEFAULT '{}';
ALTER TABLE interns ADD COLUMN IF NOT EXISTS local_cv_url TEXT;

-- RLS: public insert on schools_pending + admin_notifications (service role used)
ALTER TABLE schools_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access schools_pending" ON schools_pending
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access admin_notifications" ON admin_notifications
  FOR ALL USING (true) WITH CHECK (true);
