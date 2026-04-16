-- Migration: 20260417_partnership_agreement.sql
-- Run in Supabase SQL Editor → https://supabase.com/dashboard/project/djoqjgiyseobotsjqcgz/sql

-- 1. Extend contract_templates type enum to include new types
ALTER TABLE public.contract_templates
  DROP CONSTRAINT IF EXISTS contract_templates_type_check;

ALTER TABLE public.contract_templates
  ADD CONSTRAINT contract_templates_type_check
  CHECK (type IN ('facture','lettre_engagement','lettre_partenariat','contrat_sponsor','partnership_agreement','mission_letter'));

-- 2. Sponsors: signature image + legal details
ALTER TABLE public.sponsors
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS legal_details JSONB DEFAULT NULL;

-- legal_details JSONB structure for sponsors:
-- {
--   "director_name": "...",
--   "director_nationality": "Indonesian",
--   "director_dob": "1980-01-01",
--   "director_dob_place": "Jakarta",
--   "director_id_type": "ktp" | "passport",
--   "director_id_number": "...",
--   "notary_name": "...",
--   "deed_number": "...",
--   "deed_date": "2020-01-01",
--   "ahu_number": "AHU-...",
--   "ahu_date": "2020-01-15"
-- }

-- 2. Companies: legal details (for host company in partnership agreement)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS legal_details JSONB DEFAULT NULL;

-- legal_details JSONB structure for companies (same as sponsors above)

-- 3. Storage bucket for signatures (if not already created)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signatures', 'signatures', false, 5242880, ARRAY['image/png','image/jpeg','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- RLS: service role can manage signatures
CREATE POLICY "Service role manages signatures" ON storage.objects
  FOR ALL USING (bucket_id = 'signatures')
  WITH CHECK (bucket_id = 'signatures');

SELECT 'Migration 20260417 applied successfully' AS status;
