-- Security: Remove plaintext password column from cases table
-- PREREQUISITE: Update src/app/api/portal/[token]/auth/route.ts,
--               src/app/api/cases/[id]/send-qualification-email/route.ts,
--               src/app/api/cases/[id]/status/route.ts
-- before applying this migration — these routes select/write portal_temp_password.
ALTER TABLE cases DROP COLUMN IF EXISTS portal_temp_password;

SELECT 'portal_temp_password removed from cases' AS status;
