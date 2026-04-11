-- Table leads: prospects avant candidature complète
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  whatsapp text,
  source text NOT NULL DEFAULT 'manual',
  -- Sources: website_form_unfinished, linkedin, facebook, jobboard,
  --          landing_page, whatsapp_inbound, referral, manual, newsletter
  sub_source text,
  -- Ex: "facebook_group_bali_interns", "linkedin_dm", "instagram_bio"
  status text NOT NULL DEFAULT 'new',
  -- Status: new, contacted, nurturing, converted, dead
  abandon_reason text,
  -- Ex: "form_step_1", "form_step_2", "no_rdv", "price_objection"
  form_step_abandoned integer,
  -- L'étape du formulaire où le candidat s'est arrêté (0-4)
  desired_jobs text[],
  desired_start_date date,
  school_country text,
  spoken_languages text[],
  touchpoint text,
  notes text,
  intern_id uuid REFERENCES interns(id) ON DELETE SET NULL,
  -- Si ce lead devient candidat, on lie l'intern
  converted_case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  converted_at timestamptz,
  last_contacted_at timestamptz,
  email_sequence_step integer DEFAULT 0,
  -- Pour les séquences email/whatsapp de nurturing
  unsubscribed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
