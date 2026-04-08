-- Migration 007: Contract templates, generated documents, activity_feed table

-- ============================================================
-- TABLE: contract_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('facture', 'lettre_engagement', 'lettre_partenariat', 'contrat_sponsor')),
  language TEXT DEFAULT 'fr',
  html_content TEXT,
  docx_url TEXT,
  variables_detected TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default facture template
INSERT INTO contract_templates (name, type, html_content, variables_detected, is_active) VALUES
  ('Facture standard', 'facture', '<html><body><div style="font-family:Arial;max-width:800px;margin:0 auto;padding:40px"><div style="display:flex;justify-content:space-between;margin-bottom:40px"><div><h1 style="color:#c8a96e;margin:0">FACTURE</h1><p style="color:#666;margin:4px 0">{{invoice_number}}</p><p style="color:#666;margin:4px 0">Date: {{invoice_date}}</p></div><div style="text-align:right"><h2 style="margin:0">{{entity_name}}</h2><p style="color:#666;margin:4px 0">{{entity_address}}</p><p style="color:#666;margin:4px 0">IBAN: {{entity_iban}}</p><p style="color:#666;margin:4px 0">BIC: {{entity_bic}}</p></div></div><div style="margin-bottom:30px;padding:20px;background:#f9f9f9;border-radius:8px"><h3 style="margin:0 0 10px">Client</h3><p style="margin:4px 0"><strong>{{intern_name}}</strong></p><p style="margin:4px 0">{{intern_email}}</p><p style="margin:4px 0">{{intern_school}}</p></div><table style="width:100%;border-collapse:collapse;margin-bottom:30px"><thead><tr style="background:#f3f3f3"><th style="text-align:left;padding:10px;border-bottom:2px solid #ddd">Description</th><th style="text-align:right;padding:10px;border-bottom:2px solid #ddd">Montant</th></tr></thead><tbody><tr><td style="padding:10px;border-bottom:1px solid #eee">Package {{package_name}} — Stage {{job_title}} ({{duration_months}} mois)<br/><small style="color:#666">Du {{start_date}} au {{end_date}}</small></td><td style="text-align:right;padding:10px;border-bottom:1px solid #eee">{{amount}}€</td></tr></tbody><tfoot><tr><td style="text-align:right;padding:10px;font-weight:bold">Total TTC</td><td style="text-align:right;padding:10px;font-weight:bold;color:#c8a96e;font-size:18px">{{amount}}€</td></tr></tfoot></table><p style="color:#999;font-size:12px;text-align:center">{{entity_registration}}</p></div></body></html>',
   ARRAY['invoice_number','invoice_date','entity_name','entity_address','entity_iban','entity_bic','entity_registration','intern_name','intern_email','intern_school','package_name','job_title','duration_months','start_date','end_date','amount'], true),
  ('Lettre engagement', 'lettre_engagement', '<html><body><div style="font-family:Arial;max-width:800px;margin:0 auto;padding:40px"><h1 style="color:#c8a96e;text-align:center">LETTRE D''ENGAGEMENT</h1><p style="text-align:right;color:#666">{{invoice_date}}</p><p>Je soussigné(e) <strong>{{intern_name}}</strong>, né(e) le {{intern_birth_date}}, de nationalité {{intern_nationality}}, étudiant(e) à <strong>{{intern_school}}</strong>, m''engage par la présente à effectuer un stage à Bali, Indonésie, organisé par {{entity_name}}.</p><h3>Détails du stage</h3><ul><li>Poste : {{job_title}} chez {{company_name}}</li><li>Durée : {{duration_months}} mois</li><li>Dates : du {{start_date}} au {{end_date}}</li><li>Package : {{package_name}}</li><li>Montant : {{amount}}€</li></ul><h3>Engagements</h3><p>Je confirme avoir lu et accepté les conditions générales de Bali Interns.</p><div style="margin-top:60px;display:flex;justify-content:space-between"><div><p>Fait à {{intern_signing_city}}</p><p>Le {{invoice_date}}</p><p style="margin-top:40px">Signature :</p></div></div></div></body></html>',
   ARRAY['intern_name','intern_birth_date','intern_nationality','intern_school','entity_name','job_title','company_name','duration_months','start_date','end_date','package_name','amount','intern_signing_city','invoice_date'], true),
  ('Lettre partenariat', 'lettre_partenariat', '<html><body><div style="font-family:Arial;max-width:800px;margin:0 auto;padding:40px"><h1 style="color:#c8a96e;text-align:center">CONVENTION DE PARTENARIAT</h1><p>Entre {{entity_name}}, {{entity_address}} (ci-après "Bali Interns")</p><p>Et {{company_name}}, {{company_address}} (ci-après "l''Entreprise")</p><h3>Objet</h3><p>La présente convention définit les modalités de partenariat entre Bali Interns et l''Entreprise pour l''accueil de stagiaires internationaux.</p><h3>Obligations de l''Entreprise</h3><ul><li>Accueillir le(s) stagiaire(s) dans de bonnes conditions</li><li>Fournir un encadrement adapté</li><li>Respecter la durée convenue du stage</li></ul><div style="margin-top:60px;display:flex;justify-content:space-between"><div><p>Pour Bali Interns</p><p style="margin-top:40px">________________</p></div><div><p>Pour l''Entreprise</p><p style="margin-top:40px">________________</p></div></div></div></body></html>',
   ARRAY['entity_name','entity_address','company_name','company_address'], true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLE: generated_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: activity_feed (persistent feed items)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'snoozed')),
  snoozed_until TIMESTAMPTZ,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CASES: fazza columns
-- ============================================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fazza_transfer_sent BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fazza_transfer_amount_idr BIGINT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS fazza_transfer_date DATE;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contract_templates_type ON contract_templates(type);
CREATE INDEX IF NOT EXISTS idx_generated_documents_case ON generated_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_case ON activity_feed(case_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_status ON activity_feed(status);
