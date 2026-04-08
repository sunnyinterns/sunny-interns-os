-- Migration 006: Batch 4 - app_users, push_subscriptions, ugc, company onboarding

-- ============================================================
-- TABLE: app_users (internal team members)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'account_manager' CHECK (role IN ('admin', 'superuser', 'account_manager')),
  is_active BOOLEAN DEFAULT true,
  avatar_color TEXT DEFAULT '#c8a96e',
  auth_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO app_users (email, full_name, role, is_active, avatar_color) VALUES
  ('sidney.ruby@gmail.com', 'Sidney Ruby', 'admin', true, '#c8a96e'),
  ('charly@bali-interns.com', 'Charly Gestede', 'superuser', true, '#0d9e75')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- TABLE: push_subscriptions (web push browser subscriptions)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: ugc_submissions (user generated content)
-- ============================================================
CREATE TABLE IF NOT EXISTS ugc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID REFERENCES interns(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'testimonial' CHECK (type IN ('testimonial', 'photo', 'video', 'google_review', 'linkedin')),
  content TEXT,
  media_url TEXT,
  google_review_url TEXT,
  linkedin_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- COLONNES CASES: assigned_manager_id
-- ============================================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_manager_id UUID REFERENCES app_users(id);

-- ============================================================
-- COLONNES COMPANIES: onboarding
-- ============================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS npwp TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nib TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS domiciliation TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_country TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hr_contact_title TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hr_contact_linkedin TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hr_contact_whatsapp TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS partnership_signed_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS partnership_signer_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS partnership_signer_title TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_registration_number TEXT;

-- ============================================================
-- SETTINGS: idr_eur_rate + google_review_url + fazza_whatsapp
-- ============================================================
INSERT INTO settings (key, value) VALUES ('idr_eur_rate', '16500') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('google_review_url', 'https://search.google.com/local/writereview?placeid=ChIJbULRDyBH0i0RZSEMbmBIQ') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('fazza_whatsapp', '+6281339889898') ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_email ON push_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_ugc_intern_id ON ugc_submissions(intern_id);
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_token ON companies(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_manager ON cases(assigned_manager_id);
