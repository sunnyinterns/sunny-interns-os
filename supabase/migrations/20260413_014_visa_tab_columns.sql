-- Migration 014: Add columns for restructured TabVisa
-- emergency_contact_email, school_contact_first/last/phone, flight fields

ALTER TABLE interns
  ADD COLUMN IF NOT EXISTS emergency_contact_email text,
  ADD COLUMN IF NOT EXISTS school_contact_first_name text,
  ADD COLUMN IF NOT EXISTS school_contact_last_name text,
  ADD COLUMN IF NOT EXISTS school_contact_phone text,
  ADD COLUMN IF NOT EXISTS flight_departure_date date,
  ADD COLUMN IF NOT EXISTS flight_return_date date,
  ADD COLUMN IF NOT EXISTS flight_departure_city text,
  ADD COLUMN IF NOT EXISTS flight_number text;
