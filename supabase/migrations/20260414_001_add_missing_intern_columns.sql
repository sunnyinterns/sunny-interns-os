-- Colonnes manquantes qui causaient le HTTP 500 sur /api/cases/[id]
ALTER TABLE interns 
  ADD COLUMN IF NOT EXISTS desired_start_date date,
  ADD COLUMN IF NOT EXISTS desired_duration_months integer;
