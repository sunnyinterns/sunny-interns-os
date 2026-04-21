-- Security: Enable RLS on all critical tables + service_role policy
-- API routes use service_role key → bypasses RLS by default, not affected

-- ============================================================
-- CASES
-- ============================================================
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON cases;
CREATE POLICY "service_role_full" ON cases TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- INTERNS
-- ============================================================
ALTER TABLE interns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON interns;
CREATE POLICY "service_role_full" ON interns TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- COMPANIES
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON companies;
CREATE POLICY "service_role_full" ON companies TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- CONTACTS
-- ============================================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON contacts;
CREATE POLICY "service_role_full" ON contacts TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- BILLING
-- ============================================================
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON billing;
CREATE POLICY "service_role_full" ON billing TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- BILLING_ENTRIES
-- ============================================================
ALTER TABLE billing_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON billing_entries;
CREATE POLICY "service_role_full" ON billing_entries TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- VISA_TRACKING
-- ============================================================
ALTER TABLE visa_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON visa_tracking;
CREATE POLICY "service_role_full" ON visa_tracking TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- JOB_SUBMISSIONS
-- ============================================================
ALTER TABLE job_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON job_submissions;
CREATE POLICY "service_role_full" ON job_submissions TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- LEADS
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON leads;
CREATE POLICY "service_role_full" ON leads TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- WEBSITE_LEADS
-- ============================================================
ALTER TABLE website_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON website_leads;
CREATE POLICY "service_role_full" ON website_leads TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- ACTIVITY_FEED
-- ============================================================
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON activity_feed;
CREATE POLICY "service_role_full" ON activity_feed TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- CASE_LOGS
-- ============================================================
ALTER TABLE case_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON case_logs;
CREATE POLICY "service_role_full" ON case_logs TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- ADMIN_NOTIFICATIONS (RLS already enabled in migration 009)
-- Replace open policy with service_role-scoped policy
-- ============================================================
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON admin_notifications;
DROP POLICY IF EXISTS "Service role full access admin_notifications" ON admin_notifications;
CREATE POLICY "service_role_full" ON admin_notifications TO service_role USING (true) WITH CHECK (true);

SELECT 'RLS enabled on all critical tables' AS status;
