-- Migration 003: Real Airtable process fields (370 interns)
-- Safe: uses IF NOT EXISTS / ADD COLUMN only if missing

-- ─── INTERNS: new fields ─────────────────────────────────────────────────────

ALTER TABLE interns
  ADD COLUMN IF NOT EXISTS intern_level TEXT,
  ADD COLUMN IF NOT EXISTS diploma_track TEXT,
  ADD COLUMN IF NOT EXISTS main_desired_job TEXT,
  ADD COLUMN IF NOT EXISTS desired_sectors TEXT[],
  ADD COLUMN IF NOT EXISTS spoken_languages TEXT[],
  ADD COLUMN IF NOT EXISTS cv_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_id_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS qualification_debrief TEXT,
  ADD COLUMN IF NOT EXISTS school_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS school_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS insurance_company TEXT,
  ADD COLUMN IF NOT EXISTS intern_address TEXT,
  ADD COLUMN IF NOT EXISTS intern_signing_city TEXT,
  ADD COLUMN IF NOT EXISTS passport_issue_city TEXT,
  ADD COLUMN IF NOT EXISTS passport_issue_date DATE,
  ADD COLUMN IF NOT EXISTS mother_first_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_last_name TEXT,
  ADD COLUMN IF NOT EXISTS housing_budget TEXT,
  ADD COLUMN IF NOT EXISTS housing_city TEXT,
  ADD COLUMN IF NOT EXISTS wants_scooter BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS intern_bank_name TEXT,
  ADD COLUMN IF NOT EXISTS intern_bali_bank_name TEXT,
  ADD COLUMN IF NOT EXISTS intern_bali_bank_number TEXT,
  ADD COLUMN IF NOT EXISTS touchpoint TEXT,
  ADD COLUMN IF NOT EXISTS return_plane_ticket_url TEXT,
  ADD COLUMN IF NOT EXISTS bank_statement_url TEXT,
  ADD COLUMN IF NOT EXISTS passport_page4_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS private_comment_for_employer TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_id UUID;

-- ─── CASES: new process fields ──────────────────────────────────────────────

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS intern_first_meeting_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_meet_link TEXT,
  ADD COLUMN IF NOT EXISTS google_meet_cancel_link TEXT,
  ADD COLUMN IF NOT EXISTS fillout_booking_link TEXT,
  ADD COLUMN IF NOT EXISTS fillout_visa_form_url TEXT,
  ADD COLUMN IF NOT EXISTS fillout_plane_ticket_url TEXT,
  ADD COLUMN IF NOT EXISTS fillout_housing_scooter_url TEXT,
  ADD COLUMN IF NOT EXISTS fillout_contract_solo_url TEXT,
  ADD COLUMN IF NOT EXISTS fillout_engagement_letter_url TEXT,
  ADD COLUMN IF NOT EXISTS fillout_bill_form_url TEXT,
  ADD COLUMN IF NOT EXISTS fillout_employer_docs_url TEXT,
  ADD COLUMN IF NOT EXISTS fillout_ambassador_url TEXT,
  ADD COLUMN IF NOT EXISTS visa_submitted_to_agent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS note_for_agent TEXT,
  ADD COLUMN IF NOT EXISTS convention_signed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS convention_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS engagement_letter_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_kit_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS app_all_indonesia_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_booked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS housing_reserved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS scooter_reserved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS guesthouse_preselection TEXT[],
  ADD COLUMN IF NOT EXISTS whatsapp_ambassador_sent BOOLEAN DEFAULT false,
  -- 8 process checklist booleans
  ADD COLUMN IF NOT EXISTS billet_avion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS papiers_visas BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visa_recu BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS logement_scooter_formulaire BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS logement_reserve BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS scooter_reserve_check BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS convention_signee_check BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS chauffeur_reserve BOOLEAN DEFAULT false,
  -- Billing
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- ─── LEADS table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT DEFAULT 'lead',
  months_selected TEXT[],
  domains_selected TEXT[],
  english_level TEXT,
  verdict TEXT,
  score INTEGER DEFAULT 0,
  notes TEXT,
  intern_id UUID REFERENCES interns(id),
  r1_at TIMESTAMPTZ,
  r2_at TIMESTAMPTZ,
  r3_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── AFFILIATES table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID REFERENCES interns(id),
  referred_intern_ids UUID[] DEFAULT '{}',
  total_earned NUMERIC(10,2) DEFAULT 0,
  pending_payout NUMERIC(10,2) DEFAULT 0,
  bank_name TEXT,
  bank_iban TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Update CaseStatus enum to add new visa steps ───────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'visa_docs_sent'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'case_status')
  ) THEN
    ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'visa_docs_sent';
  END IF;
EXCEPTION WHEN others THEN
  -- type might be TEXT, not enum; skip silently
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'visa_submitted'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'case_status')
  ) THEN
    ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'visa_submitted';
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;
