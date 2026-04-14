-- Migration 20260414_003: Visa system overhaul
-- visa_agents as partner companies, visa_types with dynamic fields, packages with direct client flow, portal access

-- visa_agents: partner-company schema
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS contact_emails text[] DEFAULT '{}';
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS country text DEFAULT 'Indonesia';
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS registration_number text;
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS tax_number text;
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS portal_token text UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE visa_agents ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Backfill company_name from name when empty
UPDATE visa_agents SET company_name = name WHERE company_name IS NULL AND name IS NOT NULL;

-- visa_types: dynamic fields and documents
ALTER TABLE visa_types ADD COLUMN IF NOT EXISTS required_fields jsonb DEFAULT '[]';
ALTER TABLE visa_types ADD COLUMN IF NOT EXISTS required_documents jsonb DEFAULT '[]';

-- packages: direct client flow
ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_direct_client boolean DEFAULT false;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS direct_client_form_token text UNIQUE;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS type text DEFAULT 'standard';

-- visa_agent_portal_access: one-time visa dossier links
CREATE TABLE IF NOT EXISTS visa_agent_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_agent_id uuid REFERENCES visa_agents(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  sent_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visa_agent_portal_access_token ON visa_agent_portal_access(token);
CREATE INDEX IF NOT EXISTS idx_visa_agent_portal_access_case ON visa_agent_portal_access(case_id);

-- RLS: public read of portal access by token (used by unauthenticated portal page via API)
ALTER TABLE visa_agent_portal_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_portal_access" ON visa_agent_portal_access;
CREATE POLICY "authenticated_all_portal_access" ON visa_agent_portal_access FOR ALL USING (auth.role() = 'authenticated');
