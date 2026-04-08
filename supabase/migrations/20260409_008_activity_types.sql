-- Migration 008: Extend activity_type enum + add missing columns to activity_feed
-- ============================================================

-- Add all needed activity types to the enum
DO $$
BEGIN
  -- Core types that may already exist
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'status_changed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'email_sent'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'email_received'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'visa_docs_completed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'visa_docs_ready'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'cv_uploaded'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'doc_uploaded'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'payment_received'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'payment_requested'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'visa_submitted'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'visa_received'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'note_added'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'note'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'rdv_booked'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'job_proposed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'job_submitted'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'job_retained'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'convention_signed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'document_generated'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'intern_arrived'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'intern_departed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'affiliation_commission'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'fazza_transfer'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'welcome_kit_sent'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'driver_booked'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'case_created'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END
$$;

-- Add missing columns to activity_feed (columns from DB_SCHEMA.md not in original migration)
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS days_until_due INTEGER;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'system';
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update priority check constraint to support more levels
ALTER TABLE activity_feed DROP CONSTRAINT IF EXISTS activity_feed_priority_check;
ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_priority_check CHECK (priority IN ('low', 'normal', 'high', 'critical'));

-- Update status check constraint
ALTER TABLE activity_feed DROP CONSTRAINT IF EXISTS activity_feed_status_check;
ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_status_check CHECK (status IN ('pending', 'done', 'snoozed'));
