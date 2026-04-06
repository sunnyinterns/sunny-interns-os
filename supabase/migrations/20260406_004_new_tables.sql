-- Migration 004: New tables from full Airtable audit
-- contacts, school_programs, school_sessions, visa_types, packages, job_departments
-- + ALTER existing tables

-- ============================================================
-- TASK 1: CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  job_title TEXT,
  email TEXT,
  whatsapp TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_type TEXT DEFAULT 'employer' CHECK (contact_type IN ('employer', 'promo_partner', 'visa_agent', 'school_contact')),
  nationality TEXT,
  nib_from_company TEXT,
  npnw_certificate TEXT,
  certificate_of_registration TEXT,
  fillout_employer_docs_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS employer_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- ============================================================
-- TASK 2: SCHOOLS PROGRAMMES & SESSIONS
-- ============================================================
ALTER TABLE schools ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS total_staffed_interns INTEGER DEFAULT 0;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS school_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  level TEXT NOT NULL,
  duration_months INTEGER,
  year INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES school_programs(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  session_label TEXT NOT NULL,
  start_month TEXT,
  start_date DATE,
  end_date DATE,
  duration_months INTEGER,
  expected_students INTEGER,
  actual_students INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TASK 3: VISA TYPES & PACKAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS visa_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  classification TEXT,
  validity_days INTEGER,
  validity_label TEXT,
  publish_price_idr BIGINT,
  timeline_days TEXT,
  timeline_label TEXT,
  requirements TEXT,
  process_steps TEXT,
  notes TEXT,
  is_extendable BOOLEAN DEFAULT false,
  max_stay_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  visa_type_id UUID REFERENCES visa_types(id) ON DELETE SET NULL,
  visa_agent_id UUID REFERENCES visa_agents(id) ON DELETE SET NULL,
  package_type TEXT DEFAULT 'Standard' CHECK (package_type IN ('Standard', 'Express', 'VisaOnly')),
  price_eur NUMERIC(10,2) NOT NULL,
  visa_cost_idr BIGINT,
  gross_margin_eur NUMERIC(10,2),
  max_stay_days INTEGER,
  validity_label TEXT,
  processing_days INTEGER,
  eligibility TEXT,
  required_documents TEXT,
  is_visa_only BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  destination_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cases ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES packages(id) ON DELETE SET NULL;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS visa_type_id UUID REFERENCES visa_types(id) ON DELETE SET NULL;

-- ============================================================
-- TASK 4: VISA AGENTS — extend
-- ============================================================
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS agent_code TEXT;
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS commission_per_case NUMERIC(10,2);
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS avg_processing_days INTEGER;
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- ============================================================
-- TASK 5: PARTNERS — extend
-- ============================================================
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS offer_details TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS discount_percentage INTEGER;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS category TEXT;

-- ============================================================
-- TASK 7: JOB DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS job_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  categories TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES job_departments(id) ON DELETE SET NULL;

-- ============================================================
-- SEEDS: visa_types (9 visas réels)
-- ============================================================
INSERT INTO visa_types (code, name, classification, validity_days, validity_label, publish_price_idr, timeline_days, timeline_label, is_extendable, max_stay_days, is_active)
VALUES
  ('B211A_TOURISM', 'B211A Tourism', 'Social/Tourism', 60, '60 jours', 2750000, '7-10', '7 à 10 jours ouvrés', true, 60, true),
  ('B211A_BUSINESS', 'B211A Business', 'Business', 60, '60 jours', 2950000, '7-10', '7 à 10 jours ouvrés', true, 60, true),
  ('B211B_INTERNSHIP', 'B211B Internship', 'Stage', 180, '6 mois', 8000000, '7-10', '7 à 10 jours ouvrés', false, 180, true),
  ('C22A', 'C22A KITAS', 'KITAS', 180, '6 mois', 8500000, '3-8', 'Standard 8j / Express 3j', false, 180, true),
  ('C22B', 'C22B KITAS', 'KITAS', 180, '6 mois', 8250000, '3-8', 'Standard 8j / Express 3j', false, 180, true),
  ('C22B_VISA_ONLY', 'C22B Visa Only', 'KITAS Visa Only', 180, '6 mois', 6750000, '3-8', 'Standard 8j / Express 3j', false, 180, true),
  ('D12', 'D12 KITAP', 'KITAP', 365, '1 an extensible', 6000000, '7-10', '7 à 10 jours ouvrés', true, 365, true),
  ('B211A_TOURISM_2M', 'B211A Tourism 2 mois', 'Social/Tourism', 60, '60 jours', 2750000, '7-10', '7 à 10 jours ouvrés', true, 60, true),
  ('B211A_BUSINESS_2M', 'B211A Business 2 mois', 'Business', 60, '60 jours', 2950000, '7-10', '7 à 10 jours ouvrés', true, 60, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEEDS: job_departments (8 départements réels)
-- ============================================================
INSERT INTO job_departments (name, slug, categories)
VALUES
  ('Marketing & Communication', 'marketing-communication', ARRAY['Community Manager', 'Création de contenu', 'Marketing digital', 'Social media', 'SEO/SEA', 'Email CRM', 'RP/Events']),
  ('Business Dev / Sales', 'business-dev-sales', ARRAY['Études de marché', 'Prospection B2B', 'Négociation/cold email', 'Account manager', 'Onboarding clients', 'E-commerce']),
  ('Finance / Comptabilité', 'finance-comptabilite', ARRAY['Finance', 'Comptabilité', 'Contrôle de gestion']),
  ('Design / Graphisme / 3D', 'design-graphisme', ARRAY['Design graphique', 'Motion design', 'UI/UX', '3D', 'Illustration']),
  ('Développement Web / Tech', 'dev-web-tech', ARRAY['Développement web', 'Frontend', 'Backend', 'Fullstack', 'Mobile']),
  ('Ressources Humaines', 'ressources-humaines', ARRAY['RH', 'Recrutement', 'Formation', 'QVCT']),
  ('Architecture / Ingénierie', 'architecture-ingenierie', ARRAY['Architecture', 'BTP', 'Génie civil', 'Urbanisme']),
  ('Hôtellerie / Restauration / Immobilier', 'hotellerie-restauration-immobilier', ARRAY['Hôtellerie', 'Restauration', 'F&B', 'Immobilier'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: schools is_priority pour écoles commerce/marketing
-- ============================================================
UPDATE schools SET is_priority = true
WHERE LOWER(name) LIKE '%commerce%'
   OR LOWER(name) LIKE '%management%'
   OR LOWER(name) LIKE '%marketing%'
   OR LOWER(name) LIKE '%business%'
   OR LOWER(name) LIKE '%esc%'
   OR LOWER(name) LIKE '%em %';
