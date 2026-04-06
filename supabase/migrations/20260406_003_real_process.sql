-- Migration 003: Vrai process Bali Interns - base sur audit Airtable complet
ALTER TABLE interns ADD COLUMN IF NOT EXISTS intern_level TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS diploma_track TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS main_desired_job TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS desired_sectors TEXT[];
ALTER TABLE interns ADD COLUMN IF NOT EXISTS spoken_languages TEXT[];
ALTER TABLE interns ADD COLUMN IF NOT EXISTS cv_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS photo_id_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS qualification_debrief TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS school_contact_name TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS school_contact_email TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS insurance_company TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS intern_address TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS intern_signing_city TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS passport_issue_city TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS passport_issue_date DATE;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS mother_first_name TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS mother_last_name TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS housing_budget TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS housing_city TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS wants_scooter BOOLEAN DEFAULT false;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS intern_bank_name TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS intern_bali_bank_name TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS intern_bali_bank_number TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS touchpoint TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS return_plane_ticket_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS bank_statement_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS passport_page4_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS private_comment_for_employer TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS affiliate_id UUID;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS numero_passeport TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS sexe TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS intern_first_meeting_date TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS google_meet_link TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS google_meet_cancel_link TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fillout_booking_link TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fillout_visa_form_url TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fillout_plane_ticket_url TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fillout_housing_scooter_url TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fillout_contract_solo_url TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fillout_engagement_letter_url TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fillout_bill_form_url TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fillout_employer_docs_url TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fillout_ambassador_url TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS visa_submitted_to_agent_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS note_for_agent TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS convention_signed BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS convention_signed_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS engagement_letter_sent BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS welcome_kit_sent_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS app_all_indonesia_sent_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS driver_booked BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS housing_reserved BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS scooter_reserved BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS guesthouse_preselection TEXT[];
ALTER TABLE cases ADD COLUMN IF NOT EXISTS whatsapp_ambassador_sent BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS billet_avion BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS papiers_visas BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS visa_recu BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS logement_scooter_formulaire BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS logement_reserve BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS scooter_reserve_check BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS convention_signee_check BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS chauffeur_reserve BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'bank_transfer';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS invoice_number TEXT;
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT,
  status TEXT DEFAULT 'lead',
  months_selected TEXT[],
  domains_selected TEXT[],
  english_level TEXT,
  verdict TEXT,
  score INTEGER DEFAULT 0,
  notes TEXT,
  deadline_to_apply DATE,
  reminder_step INTEGER DEFAULT 0,
  reminders_active BOOLEAN DEFAULT true,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  intern_id UUID REFERENCES interns(id),
  r1_at TIMESTAMPTZ,
  r2_at TIMESTAMPTZ,
  r3_at TIMESTAMPTZ,
  r4_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID REFERENCES interns(id),
  referred_intern_ids UUID[] DEFAULT '{}',
  total_earned NUMERIC(10,2) DEFAULT 0,
  pending_payout NUMERIC(10,2) DEFAULT 0,
  bank_name TEXT,
  bank_iban TEXT,
  last_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
