# Sunny Interns OS — Claude Code Context (mis a jour le 13 avril 2026)

## Projet
OS interne de Sunny Interns (ex-Bali Interns). Remplace Airtable + FillOut + Squarespace.
- Fondateur : Sidney Ruby
- Directeur terrain : Charly Gestede (charly@bali-interns.com)
- Supabase project : djoqjgiyseobotsjqcgz (ap-southeast-2)
- GitHub : github.com/sunnyinterns/sunny-interns-os

## Regles ABSOLUES
1. Un sprint = une mission complete. Jamais de demi-sprint.
2. Ne jamais creer de fichier placeholder ou TODO. Si c'est dans le sprint, c'est implemente.
3. Ne jamais ajouter de dependances hors stack validee sans alerter Sidney.
4. Chaque commit = tests verts. Zero commit rouge.
5. Finir par : SPRINT-XXX DONE + [fichiers crees] + [tests] + [1 chose a verifier]
6. Ne jamais demander permission pour des decisions techniques mineures. Tranche seul.
7. Si bloque > 10min : liste le probleme + 3 solutions. Ne tourne pas en rond.

## Stack
- Next.js 15 App Router sur Vercel
- Supabase (PostgreSQL + Storage + Auth + Realtime)
- TypeScript strict
- Tailwind CSS v4
- next-intl (FR/EN)
- Resend + React Email
- react-pdf (server-side)
- Claude API (Anthropic) pour AI matching
- Remotion (video auto jobs)
- Web Push API natif
- @dnd-kit (drag & drop)
- Fillout (scheduling form externe)
- Google Calendar OAuth (sync RDVs)

## Design tokens
- sidebar : #111110
- accent : #c8a96e (or Sunny Interns)
- critical : #dc2626
- attention : #d97706
- success : #0d9e75
- surface : #fafaf7
- text : #1a1918

## URLs
- Prod: https://sunny-interns-os.vercel.app
- Vercel project: prj_Rx8XVuT5UXdByUbAyy1b8KFuSCt6

## Commandes dev
- Dev local: npm run dev (port 3000)
- Build check: npx tsc --noEmit
- Deploy: git push origin main (auto-deploy Vercel)
- Jamais arreter sur erreur non-critique
- Push apres chaque section complete

## Variables d'env (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://djoqjgiyseobotsjqcgz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[depuis Supabase Settings > API]
SUPABASE_SERVICE_ROLE_KEY=[depuis Supabase Settings > API]
GOOGLE_CLIENT_ID=[Google Cloud Console]
GOOGLE_CLIENT_SECRET=[Google Cloud Console]
GOOGLE_REFRESH_TOKEN=[OAuth refresh token Charly]
RESEND_API_KEY=[resend.com]
ANTHROPIC_API_KEY=[deja dans ~/.zshrc]
NEXT_PUBLIC_APP_URL=http://localhost:3000

## Variables d'env cles (dans Vercel)
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- NEXT_PUBLIC_APP_URL=https://sunny-interns-os.vercel.app

## Architecture pages (sidebar)
- /apply — Formulaire candidature (desktop + mobile)
- /fr/feed — Dashboard KPIs + Calendar widget
- /fr/leads — Leads multi-sources (formulaire, LinkedIn, Facebook...)
- /fr/cases — Liste candidats avec filtres par statut
- /fr/cases/[id] — Dossier candidat v2:
  * Header fixe: avatar LinkedIn, nom, age, pays, Gmail/WA buttons, timeline statuts
  * Onglets: Process | Profil | Staffing | Visa | Arrivee | Facturation
- /fr/pipeline — Kanban par statuts
- /fr/calendar — Calendrier RDVs Google
- /fr/activity — Feed activite temps reel
- /fr/todo — Alertes et taches prioritaires
- /fr/jobs — Offres de stage
- /portal/[token] — Portail candidat

## Structure src/
src/
  app/[locale]/(auth)/login/
  app/[locale]/(app)/feed/
  app/[locale]/(app)/leads/
  app/[locale]/(app)/pipeline/
  app/[locale]/(app)/cases/[id]/
  app/[locale]/(app)/jobs/
  app/[locale]/(app)/calendar/
  app/[locale]/(app)/activity/
  app/[locale]/(app)/todo/
  app/[locale]/(app)/settings/
  app/apply/                     (formulaire public)
  app/apply/mobile/              (MobileApply.tsx)
  app/portal/[token]/            (portail candidat)
  app/api/webhooks/fillout-rdv/  (webhook Fillout)
  app/api/calendar/google-sync/  (sync Google Calendar)
  components/layout/   (AppShell, Sidebar)
  components/ui/       (Button, Badge, Avatar, Card, Toast, DatePickerInput, DateSelectPicker, CommandPalette)
  components/cases/    (tabs/TabProcess, TabProfil, TabStaffing, TabVisa, TabArrivee, TabFacturation)
  lib/supabase/        (client.ts, server.ts, types.ts)
  lib/email/           (resend.ts — sendRdvConfirmation, sendNewLeadInternal, sendJobRetenu, etc.)
  lib/ai/              (claude.ts, prompts/)

## Statuts dossiers (enum case_status)
lead -> rdv_booked -> qualification_done -> job_submitted -> job_retained ->
convention_signed -> payment_pending -> payment_received -> visa_docs_sent ->
visa_submitted -> visa_in_progress -> visa_received -> arrival_prep -> active -> alumni -> completed
+ etats: not_interested, not_qualified, on_hold, suspended, visa_refused, archived

## Retro-planning (depuis date d'arrivee)
- J-40 : billet confirme (ATTENTION)
- J-30 : paiement recu (CRITIQUE)
- J-30 : visa soumis agent (CRITIQUE)
- J-7  : visa recu (CRITIQUE)
- J-2  : chauffeur notifie (ATTENTION)
- J-0  : chauffeur rappel (ATTENTION)

## Regles metier CRITIQUES
1. Duree sejour MAX 175j (visa B211A). Alerte a 165j. Calcul EXACT :
   Math.floor((returnDate - arrivalDate) / (1000 * 60 * 60 * 24))
   TEST: 3 avril -> 16 septembre = 166j (pas 197j — bug Airtable corrige)
2. Facture envoyee APRES paiement confirme. Jamais avant.
3. PT THE ABUNDANCE GUILD = is_active:false -> alerte rouge dans billing
4. Automations arrivee bloquees si visa_received_at IS NULL ou flight_number IS NULL
5. Email unique — doublon bloque a la soumission
6. Suppression protegee — company/school/job lies a dossiers actifs
7. Passeport 6 mois apres date d'arrivee — verification auto
8. IBAN lie a l'entite legale — selectable par client, UK par defaut
9. FillOut supprime — tout est natif dans l'OS (sauf scheduling = Fillout iframe)
10. Tous les templates editables dans l'interface admin (emails, contrats, PDFs, WhatsApp)

## Formulaire /apply
- Desktop: 6 etapes (Ce que tu cherches -> Identite -> Profil -> Stage ideal -> Prix -> RDV Fillout)
- Mobile: MobileApply.tsx — meme ordre que desktop (question par question)
- Capture lead: onBlur email -> POST /api/applications/capture-email -> table leads
- UPSERT atomique (contrainte UNIQUE email+source) — plus de doublons
- Etape finale: iframe Fillout https://form.fillout.com/t/gn4Zg9eydFus?Email=xxx&Name=xxx
- Fillout page Fields (champs caches Name/Email) -> Schedule -> Confirmation

## Fillout config
- Form: gn4Zg9eydFus
- Webhook: POST https://sunny-interns-os.vercel.app/api/webhooks/fillout-rdv (200 OK)
- Integration Webhook activee et publiee
- Page Fields: Name + Email (Hidden, Default = URL params) -> Booking page Respondent name/email relies

## Resend
- Domaine: bali-interns.com — STATUS: verified
- Domain ID: c29683c9-dba6-4cb3-8a4b-aa8aaa37d9ae
- FROM: Charly de Bali Interns <team@bali-interns.com>
- Emails: sendRdvConfirmation, sendNewLeadInternal, sendJobRetenu, sendJobSubmittedEmployer, sendPaymentRequest, sendWelcomeKit, sendAppAllIndonesia, sendAlerteArrivee, sendDossierPretAgent, sendNewCustomerFazza

## DB (Supabase)
- Tables principales: interns, cases, leads, jobs, companies, schools, calendar_events, activity_feed, case_logs, admin_notifications, cv_feedback_history, job_submissions, packages, visa_agents
- Contrainte UNIQUE: leads(email, source)
- Statuts case: voir section Statuts dossiers ci-dessus
- Statuts lead: new -> contacted -> nurturing -> converted | dead (convertis masques dans /fr/leads)

## Activity Feed — 4 zones
1. Aujourd'hui — deadlines du jour
2. A faire maintenant — triees par urgence J-X
3. En attente — bloque externement
4. Complete aujourd'hui — visible grise

## Git flow
main -> production (Vercel auto-deploy)
Commits directs sur main (pas de branches pour l'instant)

## Message WhatsApp chauffeur (template)
Bonjour [nom_chauffeur],
Stagiaire : {first_name} {last_name}
Tel : {intern_bali_phone}
Vol : {flight_number} ({last_stopover_city} -> Denpasar)
Arrivee : {flight_arrival_datetime}
Deposer a : {dropoff_address}
Tracking :
- https://www.flightradar24.com/{flight_number}
- https://www.flightaware.com/live/flight/{flight_number}

## Email nouveau candidat (format confirme)
Objet: Nouveau stagiaire ! [Prenom] [Nom] a candidate
Contenu: date demarrage, duree, lien /app/cases/[id], passeport valide/invalide, secteurs, commentaire

## Regles de dev
- Ne jamais stopper sur une erreur non-bloquante
- Push apres chaque section
- Toujours build + tsc --noEmit avant push final
- Ne jamais reinitialiser la DB sans verification explicite
- Status initial nouveau candidat = 'rdv_booked' (pas 'lead')
- Leads convertis masques dans /fr/leads (dans /fr/cases a la place)
