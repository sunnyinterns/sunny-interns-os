# Sunny Interns OS � Claude Code Context

## Projet
OS interne de Sunny Interns (ex-Bali Interns). Remplace Airtable + FillOut + Squarespace.
- Fondateur : Sidney Ruby
- Directeur terrain : Charly Gestede (charly@bali-interns.com)
- Supabase project : djoqjgiyseobotsjqcgz (ap-southeast-2)
- GitHub : github.com/sunnyinterns/sunny-interns-os

## R�gles ABSOLUES
1. Un sprint = une mission compl�te. Jamais de demi-sprint.
2. Ne jamais cr�er de fichier placeholder ou TODO. Si c'est dans le sprint, c'est impl�ment�.
3. Ne jamais ajouter de d�pendances hors stack valid�e sans alerter Sidney.
4. Chaque commit = tests verts. Z�ro commit rouge.
5. Finir par : SPRINT-XXX DONE ? � [fichiers cr��s] � [tests] � [1 chose � v�rifier]
6. Ne jamais demander permission pour des d�cisions techniques mineures. Tranche seul.
7. Si bloqu� > 10min : liste le probl�me + 3 solutions. Ne tourne pas en rond.

## Stack
- Next.js 16 App Router sur Vercel
- Supabase (PostgreSQL + Storage + Auth + Realtime)
- TypeScript strict
- Tailwind CSS v4
- next-intl (FR/EN)
- Resend + React Email
- react-pdf (server-side)
- Claude API (Anthropic) pour AI matching
- Remotion (vid�o auto jobs)
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
ANTHROPIC_API_KEY=[d�j� dans ~/.zshrc]
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
+ �tats: not_interested, not_qualified, on_hold, suspended, visa_refused, archived, completed

## R�tro-planning (depuis date d'arriv�e)
- J-40 : billet confirm� (ATTENTION)
- J-30 : paiement re�u (CRITIQUE)
- J-30 : visa soumis agent (CRITIQUE)
- J-7  : visa re�u (CRITIQUE)
- J-2  : chauffeur notifi� (ATTENTION)
- J-0  : chauffeur rappel (ATTENTION)

## R�gles m�tier CRITIQUES
1. Dur�e s�jour MAX 175j (visa B211A). Alerte � 165j. Calcul EXACT :
   Math.floor((returnDate - arrivalDate) / (1000 * 60 * 60 * 24))
   TEST: 3 avril ? 16 septembre = 166j (pas 197j � bug Airtable corrig�)
2. Facture envoy�e APR�S paiement confirm�. Jamais avant.
3. PT THE ABUNDANCE GUILD = is_active:false � alerte rouge dans billing
4. Automations arriv�e bloqu�es si visa_received_at IS NULL ou flight_number IS NULL
5. Email unique � doublon bloqu� � la soumission
6. Suppression prot�g�e � company/school/job li�s � dossiers actifs
7. Passeport 6 mois apr�s date d'arriv�e � v�rification auto
8. IBAN li� � l'entit� l�gale � s�lectable par client, UK par d�faut
9. FillOut supprim� � tout est natif dans l'OS
10. Tous les templates �ditables dans l'interface admin (emails, contrats, PDFs, WhatsApp)

## Activity Feed � 4 zones
1. Aujourd'hui � deadlines du jour
2. � faire maintenant � tri�es par urgence J-X
3. En attente � bloqu� externement
4. Compl�t� aujourd'hui � visible gris�

## Sprints P0 (ordre d'ex�cution)
S001 ? Supabase schema SQL + seed (migrations d�j� pr�tes dans supabase/migrations/)
S002 ? Auth Next.js + middleware + Google OAuth
S003 ? Design System + AppShell + Sidebar
S004 ? Activity Feed 4 zones + donn�es Supabase
S005 ? Actions contextuelles + mutations optimistes
S006 ? R�tro-planning engine (correctif bug dur�e s�jour)
S007 ? Notifications Resend + Web Push
S008 ? Pipeline Kanban
S009 ? Fiche Dossier 6 tabs
S010 ? Cr�ation/�dition dossier
S012 ? Jobs Board
S014 ? Submissions + r�ponses employeurs
S015 ? Visa tracking + checklist docs
S022 ? Arriv�e + WhatsApp chauffeur auto-g�n�r�
S023 ? Moteur email + templates �ditables WYSIWYG
S035 ? Google Calendar API (remplace FillOut � P0)

## Git flow
main ? production (Vercel)
develop ? staging
sprint/XXX-nom ? PR vers develop

## Message WhatsApp chauffeur (template)
Bonjour [nom_chauffeur],
Stagiaire : {first_name} {last_name}
T�l : {intern_bali_phone}
Vol : {flight_number} ({last_stopover_city} ? Denpasar)
Arriv�e : {flight_arrival_datetime}
D�poser � : {dropoff_address}
Tracking :
? https://www.flightradar24.com/{flight_number}
? https://www.flightaware.com/live/flight/{flight_number}

## Email nouveau candidat (format confirmé)
Objet: Nouveau stagiaire ! [Prénom] [Nom] a candidaté
Contenu: date démarrage, durée, lien /app/cases/[id], ✓/✗ passeport, secteurs, commentaire

## Commandes
- Dev local: npm run dev
- Build: npm run build
- Deploy: git push origin main (Vercel auto-deploy)

## Variables d'env clés (dans Vercel)
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- NEXT_PUBLIC_APP_URL=https://sunny-interns-os.vercel.app

## Règles de dev
- Ne jamais stopper sur une erreur non-bloquante
- Push après chaque section
- Toujours build + tsc --noEmit avant push final
- Ne jamais réinitialiser la DB sans vérification explicite

## Architecture routes
- /apply — Formulaire candidature (desktop + mobile)
- /fr/leads — Leads multi-sources
- /fr/cases — Liste candidats
- /fr/cases/[id] — Dossier candidat (6 onglets)
- /fr/feed — Dashboard
- /fr/calendar — Calendrier RDVs
- /fr/todo — Todo alertes
- /fr/activity — Feed activité
- /portal/[token] — Portail candidat

## Fillout
- Form ID: gn4Zg9eydFus (scheduling 45min)
- Webhook: https://sunny-interns-os.vercel.app/api/webhooks/fillout-rdv
- URL params: Email, Name (déclarés dans Fillout Settings)

## Resend
- Domain: bali-interns.com (pending verification — DNS propagés)
- FROM: Charly de Bali Interns <team@bali-interns.com>