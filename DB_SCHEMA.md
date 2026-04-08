# DB SCHEMA — Source de vérité Supabase
# Généré automatiquement — NE PAS MODIFIER MANUELLEMENT

## cases
id, intern_id, destination_id, assigned_to, status, case_type,
desired_start_date, actual_start_date, actual_end_date,
school_id, group_id, intern_level, diploma_track,
desired_sectors(ARRAY), desired_duration_months, qualification_notes, skip_reason,
touchpoint_j3_sent_at, touchpoint_j30_sent_at, touchpoint_j60_sent_at, touchpoint_end_sent_at,
intern_card_url, intern_card_generated_at, created_at, updated_at,
intern_first_meeting_date, google_meet_link, google_meet_cancel_link,
fillout_booking_link, fillout_visa_form_url, fillout_plane_ticket_url,
fillout_housing_scooter_url, fillout_contract_solo_url, fillout_engagement_letter_url,
fillout_bill_form_url, fillout_employer_docs_url, fillout_ambassador_url,
visa_submitted_to_agent_at, note_for_agent,
convention_signed, convention_signed_at, convention_signed_by, convention_pdf_url, convention_signed_date,
engagement_letter_sent, welcome_kit_sent_at, app_all_indonesia_sent_at,
driver_booked, housing_reserved, scooter_reserved, guesthouse_preselection(ARRAY),
whatsapp_ambassador_sent, whatsapp_ambassador_bali_msg, whatsapp_ambassador_done_msg,
billet_avion, papiers_visas, visa_recu,
logement_scooter_formulaire, logement_reserve, scooter_reserve_check, convention_signee_check, chauffeur_reserve,
payment_amount, payment_date, payment_type, discount_percentage, invoice_number,
alert_j7_sent, alert_j4_sent, portal_token,
employer_contact_id, package_id, visa_type_id, assigned_manager_id, assigned_manager_name,
fazza_transfer_sent, fazza_transfer_amount_idr, fazza_transfer_date,
flight_number, flight_departure_city, flight_arrival_time_local, flight_last_stopover, form_language

### FK valides sur cases (PostgREST joins)
- interns(id) via intern_id
- schools(id) via school_id
- packages(id) via package_id
- visa_types(id) via visa_type_id
- destinations(id) via destination_id
- contacts(id) via employer_contact_id
- app_users(id) via assigned_manager_id
- app_users(id) via assigned_to
- activity_feed(case_id) reverse FK
- job_submissions(case_id) reverse FK

### COLONNES QUI N'EXISTENT PAS SUR CASES (ne jamais utiliser)
❌ first_name, last_name (→ interns.first_name, interns.last_name)
❌ arrival_date (→ actual_start_date ou desired_start_date)
❌ return_date (→ actual_end_date)
❌ assigned_to as string (→ assigned_manager_name)
❌ destination as string (→ destinations.name)
❌ internship_type (→ case_type)
❌ visa_agent_id (n'existe pas sur cases)
❌ billing_entity_id (n'existe pas sur cases)
❌ guesthouse_id (→ guesthouse_preselection)
❌ flight_arrival_datetime (→ flight_arrival_time_local)
❌ dropoff_address, last_stopover_city, intern_bali_phone (n'existent pas)
❌ arrival_date (n'existe pas)

## interns
id, first_name, last_name, email, email_normalized, whatsapp,
birth_date, gender, nationality,
passport_number, passport_expiry, passport_issue_city, passport_issue_date,
linkedin_url, cv_url, photo_id_url, spoken_languages(ARRAY), english_level,
source, created_at, updated_at,
intern_level, diploma_track, main_desired_job, desired_sectors(ARRAY),
qualification_debrief,
school_contact_name, school_contact_email,
emergency_contact_name, emergency_contact_phone, insurance_company,
intern_address, intern_signing_city,
mother_first_name, mother_last_name,
housing_budget, housing_city, wants_scooter,
intern_bank_name, intern_bali_bank_name, intern_bali_bank_number, intern_bank_iban,
touchpoint, return_plane_ticket_url, bank_statement_url, passport_page4_url,
portfolio_url, private_comment_for_employer,
affiliate_id, affiliate_code_id, referred_by_code,
numero_passeport, sexe,
commitment_price_accepted, commitment_budget_accepted, commitment_terms_accepted,
commitment_accepted_at, commitment_ip,
stage_ideal, desired_end_date, preferred_language

### COLONNES QUI N'EXISTENT PAS SUR INTERNS
❌ phone (→ whatsapp)
❌ avatar_url (n'existe pas)
❌ qualification_debrief (EXISTE bien)
❌ passport_issue_date (EXISTE bien)

## activity_feed
id, case_id, type, priority, title, description,
assigned_to, status, completed_at, completed_by,
due_date, is_overdue, days_until_due, actions(jsonb),
source, metadata(jsonb), created_at, updated_at

### COLONNES QUI N'EXISTENT PAS SUR ACTIVITY_FEED
❌ action_type (→ type)
❌ created_by (→ n'existe pas)
❌ author_name (n'existe pas)

## jobs
id, destination_id, company_id, contact_id,
title, public_title, job_private_name, description, public_description,
department, missions(ARRAY), status, location, remote_work, remote_ok,
required_languages(ARRAY), required_level,
wished_start_date, wished_end_date, wished_duration_months,
is_recurring, parent_job_id,
video_url, video_generated_at, placid_image_url, placid_generated_post,
created_at, updated_at

### FK valides sur jobs
- companies(id) via company_id
- contacts(id) via contact_id
### COLONNES QUI N'EXISTENT PAS SUR JOBS
❌ job_departments (table n'existe pas, utiliser jobs.department text)

## job_submissions
id, case_id, job_id, status, employer_response, proposed_during_interview,
submitted_at, created_by, created_at, updated_at,
intern_interested, cv_version_sent, cv_revision_requested, cv_revision_done, notes_charly

### STATUS VALIDES: proposed, sent, interview, retained, rejected, cancelled

## companies
id, destination_id, name, type, category, address, city, country,
registration_number, tax_number, logo_url, website, phone,
google_maps_url, registration_doc_url, tax_doc_url, other_docs_url,
promo_partner_offer, internship_city, is_active, created_at, updated_at,
domiciliation, npwp, nib, legal_address, legal_country, company_size,
onboarding_form_sent_at, onboarding_completed_at, partnership_letter_signed,
notes_internal, onboarding_token, onboarding_token_expires_at,
vat_number, registration_country, company_type, sponsor_company_id

## contacts
id, company_id, first_name, last_name, job_title, email, whatsapp, nationality, is_primary, created_at
### COLONNES QUI N'EXISTENT PAS SUR CONTACTS
❌ contact_type (n'existe pas)
❌ type (n'existe pas)

## packages
id, name, visa_type_id, visa_agent_id, package_type, price_eur, visa_cost_idr,
gross_margin_eur, max_stay_days, validity_label, processing_days,
eligibility, required_documents, is_visa_only, is_active, destination_id, created_at

## billing_entities
id, name, legal_type, country, address, registration_number, tax_number,
bank_name, bank_iban, bank_swift, logo_url, email, is_active, is_default,
created_at, legal_name, vat_number, iban, bic

## app_users
id, email, full_name, role, avatar_url, auth_user_id, is_active, created_at

## affiliate_codes
id, code, intern_id, referred_interns(ARRAY), total_commissions, pending_payout, paid_out, created_at

## schools
id, name, name_normalized, category, city, country, website,
contact_first_name, contact_last_name, contact_email, contact_phone, contact_job_title,
contact_linkedin_url, is_active, created_at, phone, postal_code, address,
google_maps_url, logo_url, total_staffed_interns, is_priority

## visa_types
id, code, name, classification, validity_days, validity_label, publish_price_idr,
timeline_days, requirements, process_steps, notes, is_extendable, max_stay_days, is_active, created_at

## visa_agents
id, company_name, contact_name, email, whatsapp, is_active, is_default, notes, created_at

## contract_templates
id, name, type, language, docx_url, html_content, variables_detected(ARRAY),
variables_available(jsonb), version, is_active, modified_by, last_preview_case_id,
created_at, updated_at

## generated_documents
id, case_id, company_id, intern_id, type, language, url, version,
generated_at, generated_by, template_id, signed_natively, signed_at,
signer_ip, signed_pdf_url

## push_subscriptions
id, user_email, endpoint, p256dh, auth, created_at
