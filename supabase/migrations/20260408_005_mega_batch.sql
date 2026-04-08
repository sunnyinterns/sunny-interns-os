-- Migration 005: MEGA BATCH FINAL
-- affiliate_codes, cv_versions, alert_configs, form_abandonments, media_assets, job_types
-- + colonnes sur cases, interns, jobs

-- ============================================================
-- COLONNES CASES
-- ============================================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS commitment_price_accepted BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS commitment_budget_accepted BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS commitment_terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS commitment_accepted_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS commitment_ip TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS referred_by_code TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS alert_sent_flags JSONB DEFAULT '{}';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS rdv_start_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS rdv_end_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS rdv_google_meet TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- ============================================================
-- COLONNES INTERNS
-- ============================================================
ALTER TABLE interns ADD COLUMN IF NOT EXISTS referred_by_code TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS cv_revision_requested BOOLEAN DEFAULT false;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS stage_ideal TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS desired_duration TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS desired_end_date DATE;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS how_found TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS additional_docs TEXT[];
ALTER TABLE interns ADD COLUMN IF NOT EXISTS intern_card_generated_at TIMESTAMPTZ;

-- ============================================================
-- COLONNES JOBS
-- ============================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_description TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_title TEXT;

-- ============================================================
-- COLONNES JOB_SUBMISSIONS
-- ============================================================
ALTER TABLE job_submissions ADD COLUMN IF NOT EXISTS intern_interested BOOLEAN;
ALTER TABLE job_submissions ADD COLUMN IF NOT EXISTS intern_responded_at TIMESTAMPTZ;

-- ============================================================
-- TABLE: affiliate_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  intern_id UUID REFERENCES interns(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  commission_eur NUMERIC(10,2) DEFAULT 100.00,
  total_referred INTEGER DEFAULT 0,
  total_paid INTEGER DEFAULT 0,
  pending_payout NUMERIC(10,2) DEFAULT 0,
  paid_out NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: cv_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS cv_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID REFERENCES interns(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT,
  uploaded_by TEXT DEFAULT 'intern',
  version_number INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: alert_configs
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  days_offset INTEGER NOT NULL DEFAULT 0,
  reference_field TEXT NOT NULL DEFAULT 'desired_start_date',
  email_recipients TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO alert_configs (key, label, days_offset, reference_field, email_recipients, is_active) VALUES
  ('flight_j40', 'Billet avion J-40', -40, 'arrival_date', ARRAY['charly@bali-interns.com'], true),
  ('payment_j30', 'Paiement J-30', -30, 'arrival_date', ARRAY['charly@bali-interns.com'], true),
  ('visa_submit_j30', 'Visa soumis agent J-30', -30, 'arrival_date', ARRAY['charly@bali-interns.com'], true),
  ('visa_received_j7', 'Visa reçu J-7', -7, 'arrival_date', ARRAY['charly@bali-interns.com'], true),
  ('driver_j2', 'Chauffeur notifié J-2', -2, 'arrival_date', ARRAY['charly@bali-interns.com'], true),
  ('driver_j0', 'Chauffeur rappel J-0', 0, 'arrival_date', ARRAY['charly@bali-interns.com'], true)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- TABLE: form_abandonments
-- ============================================================
CREATE TABLE IF NOT EXISTS form_abandonments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  step_reached INTEGER NOT NULL DEFAULT 1,
  data_collected JSONB DEFAULT '{}',
  relance_1_at TIMESTAMPTZ,
  relance_2_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: media_assets
-- ============================================================
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'logo',
  variant TEXT,
  url TEXT NOT NULL,
  size_bytes INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: job_types (configurable)
-- ============================================================
CREATE TABLE IF NOT EXISTS job_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO job_types (name, sort_order) VALUES
  ('Assistant marketing digital', 1),
  ('Création de contenu', 2),
  ('Community Manager', 3),
  ('Stratégie social media', 4),
  ('SEO/SEA', 5),
  ('Email CRM', 6),
  ('RP/Events', 7),
  ('Études de marché', 8),
  ('Prospection B2B', 9),
  ('Négociation/sales', 10),
  ('Account manager', 11),
  ('Onboarding/support', 12),
  ('E-commerce', 13),
  ('Autre', 14)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_code ON affiliate_codes(code);
CREATE INDEX IF NOT EXISTS idx_cv_versions_intern_id ON cv_versions(intern_id);
CREATE INDEX IF NOT EXISTS idx_form_abandonments_email ON form_abandonments(email);
CREATE INDEX IF NOT EXISTS idx_cases_portal_token ON cases(portal_token);
