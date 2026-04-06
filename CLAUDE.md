# Sunny Interns OS — Claude Code Context

## Projet
OS interne de Sunny Interns (ex-Bali Interns). Remplace Airtable + FillOut + Squarespace.
- Fondateur : Sidney Ruby
- Directeur terrain : Charly Gestede (charly@bali-interns.com)
- Supabase project : djoqjgiyseobotsjqcgz (ap-southeast-2)
- GitHub : github.com/sunnyinterns/sunny-interns-os

## Règles ABSOLUES
1. Un sprint = une mission complète. Jamais de demi-sprint.
2. Ne jamais créer de fichier placeholder ou TODO. Si c'est dans le sprint, c'est implémenté.
3. Ne jamais ajouter de dépendances hors stack validée sans alerter Sidney.
4. Chaque commit = tests verts. Zéro commit rouge.
5. Finir par : SPRINT-XXX DONE ? — [fichiers créés] — [tests] — [1 chose à vérifier]
6. Ne jamais demander permission pour des décisions techniques mineures. Tranche seul.
7. Si bloqué > 10min : liste le problème + 3 solutions. Ne tourne pas en rond.

## Stack
- Next.js 16 App Router sur Vercel
- Supabase (PostgreSQL + Storage + Auth + Realtime)
- TypeScript strict
- Tailwind CSS v4
- next-intl (FR/EN)
- Resend + React Email
- react-pdf (server-side)
- Claude API (Anthropic) pour AI matching
- Remotion (vidéo auto jobs)
- Web Push API natif

## Design tokens
- sidebar : #111110
- accent : #c8a96e (or Sunny Interns)
- critical : #dc2626
- attention : #d97706
- success : #0d9e75
- surface : #fafaf7
- text : #1a1918

## Variables d'environnement (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://djoqjgiyseobotsjqcgz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[depuis Supabase Settings > API]
SUPABASE_SERVICE_ROLE_KEY=[depuis Supabase Settings > API]
GOOGLE_CLIENT_ID=[Google Cloud Console]
GOOGLE_CLIENT_SECRET=[Google Cloud Console]
RESEND_API_KEY=[resend.com]
ANTHROPIC_API_KEY=[déjà dans ~/.zshrc]
NEXT_PUBLIC_APP_URL=http://localhost:3000

## Structure src/
src/
  app/[locale]/(auth)/login/
  app/[locale]/(app)/feed/
  app/[locale]/(app)/pipeline/
  app/[locale]/(app)/cases/[id]/
  app/[locale]/(app)/jobs/
  app/[locale]/(app)/settings/
  components/layout/   (AppShell, Sidebar)
  components/ui/       (Button, Badge, Avatar, Card, Toast)
  components/feed/     (ActivityCard, FeedZone)
  components/cases/    (KanbanBoard, ProcessTimeline)
  lib/supabase/        (client.ts, server.ts, types.ts)
  lib/email/           (resend.ts, templates/)
  lib/ai/              (claude.ts, prompts/)

## Statuts dossiers (enum case_status)
lead ? rdv_booked ? qualification_done ? job_submitted ? job_retained ?
convention_signed ? payment_pending ? payment_received ? visa_in_progress ?
visa_received ? arrival_prep ? active ? alumni
+ états: not_interested, not_qualified, on_hold, suspended, visa_refused, archived, completed

## Rétro-planning (depuis date d'arrivée)
- J-40 : billet confirmé (ATTENTION)
- J-30 : paiement reçu (CRITIQUE)
- J-30 : visa soumis agent (CRITIQUE)
- J-7  : visa reçu (CRITIQUE)
- J-2  : chauffeur notifié (ATTENTION)
- J-0  : chauffeur rappel (ATTENTION)

## Règles métier CRITIQUES
1. Durée séjour MAX 175j (visa B211A). Alerte à 165j. Calcul EXACT :
   Math.floor((returnDate - arrivalDate) / (1000 * 60 * 60 * 24))
   TEST: 3 avril ? 16 septembre = 166j (pas 197j — bug Airtable corrigé)
2. Facture envoyée APRÈS paiement confirmé. Jamais avant.
3. PT THE ABUNDANCE GUILD = is_active:false — alerte rouge dans billing
4. Automations arrivée bloquées si visa_received_at IS NULL ou flight_number IS NULL
5. Email unique — doublon bloqué à la soumission
6. Suppression protégée — company/school/job liés à dossiers actifs
7. Passeport 6 mois après date d'arrivée — vérification auto
8. IBAN lié à l'entité légale — sélectable par client, UK par défaut
9. FillOut supprimé — tout est natif dans l'OS
10. Tous les templates éditables dans l'interface admin (emails, contrats, PDFs, WhatsApp)

## Activity Feed — 4 zones
1. Aujourd'hui — deadlines du jour
2. À faire maintenant — triées par urgence J-X
3. En attente — bloqué externement
4. Complété aujourd'hui — visible grisé

## Sprints P0 (ordre d'exécution)
S001 ? Supabase schema SQL + seed (migrations déjà prêtes dans supabase/migrations/)
S002 ? Auth Next.js + middleware + Google OAuth
S003 ? Design System + AppShell + Sidebar
S004 ? Activity Feed 4 zones + données Supabase
S005 ? Actions contextuelles + mutations optimistes
S006 ? Rétro-planning engine (correctif bug durée séjour)
S007 ? Notifications Resend + Web Push
S008 ? Pipeline Kanban
S009 ? Fiche Dossier 6 tabs
S010 ? Création/édition dossier
S012 ? Jobs Board
S014 ? Submissions + réponses employeurs
S015 ? Visa tracking + checklist docs
S022 ? Arrivée + WhatsApp chauffeur auto-généré
S023 ? Moteur email + templates éditables WYSIWYG
S035 ? Google Calendar API (remplace FillOut — P0)

## Git flow
main ? production (Vercel)
develop ? staging
sprint/XXX-nom ? PR vers develop

## Message WhatsApp chauffeur (template)
Bonjour [nom_chauffeur],
Stagiaire : {first_name} {last_name}
Tél : {intern_bali_phone}
Vol : {flight_number} ({last_stopover_city} ? Denpasar)
Arrivée : {flight_arrival_datetime}
Déposer à : {dropoff_address}
Tracking :
? https://www.flightradar24.com/{flight_number}
? https://www.flightaware.com/live/flight/{flight_number}

## Email nouveau candidat (format confirmé)
Objet: Nouveau stagiaire ! [Prénom] [Nom] a candidaté
Contenu: date démarrage, durée, lien /app/cases/[id], ?/? passeport, secteurs, commentaire