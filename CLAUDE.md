# ⚠️ PROJET : SUNNY INTERNS OS — Bali Interns
> **Sidney Ruby** | Plateforme de gestion de stages à Bali, Indonésie
> **Ce n'est PAS un autre projet.** Lire ce fichier EN ENTIER avant toute action.
> Mis à jour le 14 avril 2026.

---

## 🎯 IDENTITÉ DU PROJET (à lire en premier)

| Champ | Valeur |
|-------|--------|
| **Nom produit** | Sunny Interns OS |
| **Business** | Bali Interns — placement de stagiaires français à Bali |
| **Fondateur** | Sidney Ruby — sidney.ruby@gmail.com |
| **Admin login** | sidney.ruby@gmail.com / SunnyInterns2026! |
| **URL prod** | https://sunny-interns-os.vercel.app |
| **Repo** | github.com/sunnyinterns/sunny-interns-os |
| **Email envoi** | team@bali-interns.com (Resend ✅ vérifié) |
| **WhatsApp** | +33 6 43 48 77 36 |
| **Stack** | Next.js 15 + Supabase + Vercel + Resend + Fillout |

---

## RÈGLES ABSOLUES

1. **NE JAMAIS S'ARRÊTER** sur une erreur non-critique — continuer et corriger
2. **TOUJOURS** `npx tsc --noEmit` avant de push — zéro erreur TS tolérée
3. **TOUJOURS** push après chaque section terminée
4. **JAMAIS** toucher aux migrations Supabase manuellement — utiliser `supabase/migrations/`
5. **JAMAIS** committer des secrets ou API keys

---

## PROJET

**Nom:** Sunny Interns OS  
**Domaine:** Plateforme de gestion de stages à Bali (Bali Interns)  
**URL prod:** https://sunny-interns-os.vercel.app  
**Login admin:** sidney.ruby@gmail.com / SunnyInterns2026!  
**Repo:** github.com/sunnyinterns/sunny-interns-os  
**Branch:** main (auto-deploy Vercel)

---

## STACK

- **Framework:** Next.js 15 App Router (`src/app/`)
- **Auth:** Supabase Auth
- **DB:** Supabase PostgreSQL (projet: `djoqjgiyseobotsjqcgz`, région: ap-southeast-2)
- **Storage:** Supabase Storage (bucket: `intern-cvs`)
- **Email:** Resend (`re_iVgsct7X_5D9V3WBUcMkasGKoMufamXfp`) FROM: `Charly de Bali Interns <team@bali-interns.com>`
- **Deploy:** Vercel (`prj_Rx8XVuT5UXdByUbAyy1b8KFuSCt6` / team `team_0lWgPrvXiZcdCgp1xc2uV8Ff`)
- **i18n:** `/fr/` (locale par défaut)

---

## INFOS CLÉS

| Service | Valeur |
|---------|--------|
| Supabase URL | `https://djoqjgiyseobotsjqcgz.supabase.co` |
| Fillout Form ID | `gn4Zg9eydFus` (RDV 45min) |
| WhatsApp Bali | `+33643487736` |
| Destination ID | `fc9ece85-e5d5-41d2-9142-79054244bbce` |
| Resend domain | `bali-interns.com` ✅ VERIFIED |

---

## ARCHITECTURE CANDIDATS VS CLIENTS

### CANDIDAT (`/fr/cases/[id]`)
Statuts: `lead → rdv_booked → qualification_done → job_submitted → job_retained → convention_signed`

Onglets: **👤 Profil | 💼 Staffing | 📋 Historique**
- Pas de Facturation/Visa/Arrivée (→ dans Clients)
- À `convention_signed`: bannière orange "→ Voir la fiche client"

### CLIENT (`/fr/clients/[id]`)
Statuts: `convention_signed → payment_pending → payment_received → visa_docs_sent → visa_submitted → visa_in_progress → visa_received → arrival_prep → active → alumni → completed`

Onglets: **👤 Profil | 💶 Facturation | 🛂 Visa | 🛫 Arrivée | 📋 Historique**

### APIs de filtrage
- `GET /api/cases?type=candidate` → statuts candidats uniquement
- `GET /api/cases?type=client` → statuts clients uniquement

---

## FLUX COMPLET

```
/apply → lead (DB) → [Fillout booking] → rdv_booked
→ Débrief entretien (TabStaffing) → qualification_done
→ Jobs proposés (DnD Staffing) → job_submitted
→ Retenu par employeur → job_retained
→ Convention signée → convention_signed → /fr/clients/[id]
→ Paiement → payment_received
→ Documents visa → visa_docs_sent → visa_in_progress → visa_received
→ Arrivée → arrival_prep → active → alumni → completed
```

---

## NAVIGATION

### Desktop
Sidebar latérale gauche — tous les liens

### Mobile (nouveau)
- **Bottom nav fixe**: Dashboard | Activité | To Do | Calendrier | ☰
- **Drawer hamburger**: tout le reste (Pipeline, Candidats, Clients, Jobs, etc.)
- `<main>` a `pb-20 md:pb-0` pour compenser

---

## STRUCTURE DES PAGES

```
src/app/
├── [locale]/(app)/
│   ├── feed/          # Dashboard
│   ├── activity/      # Fil d'activité
│   ├── todo/          # Tâches
│   ├── calendar/      # Calendrier
│   ├── pipeline/      # Kanban candidats (type=candidate uniquement)
│   ├── leads/         # Leads non convertis
│   ├── cases/         # Liste candidats
│   │   └── [id]/      # Fiche candidat
│   ├── clients/       # Liste clients
│   │   └── [id]/      # Fiche client
│   ├── jobs/          # Offres de stage
│   │   └── [id]/      # Fiche offre
│   ├── contacts/
│   ├── companies/
│   ├── schools/
│   ├── finances/
│   └── settings/      # Hub: packages, visa-agents, visa-types, job-departments, etc.
├── apply/             # Formulaire candidature public
│   └── confirmation/  # Page de confirmation
├── portal/[token]/    # Portail étudiant
└── api/
    ├── cases/[id]/
    │   ├── route.ts             # GET/PATCH/DELETE dossier
    │   ├── intern/route.ts      # PATCH champs intern
    │   ├── job-submissions/     # GET soumissions + [subId]/send-to-employer
    │   ├── activity/route.ts    # GET historique dossier
    │   ├── cv-feedback-history/ # GET/POST commentaires CV
    │   └── send-qualification-email/route.ts
    ├── cases/route.ts           # GET liste (type=candidate|client)
    ├── jobs/[id]/route.ts       # GET/PATCH/DELETE offre
    ├── job-submissions/route.ts # POST créer soumission
    ├── job-departments/         # CRUD métiers
    ├── leads/route.ts
    ├── activity/route.ts
    ├── upload/route.ts          # Upload fichiers vers Supabase Storage
    ├── settings/route.ts
    └── webhooks/fillout-rdv/route.ts
```

---

## COMPOSANTS CLÉS

```
src/components/
├── layout/
│   ├── Sidebar.tsx      # Desktop sidebar + mobile bottom nav + drawer
│   └── AppShell.tsx     # Layout wrapper (main pb-20 md:pb-0)
└── cases/tabs/
    ├── TabProfil.tsx    # Identité (prénom/nom/email/WA/passeport) + Formation
    ├── TabStaffing.tsx  # Stage idéal + CV + Jobs DnD + Débrief entretien
    ├── TabVisa.tsx      # 8 sections visa (passeport, photo, mère, école, urgence, bancaire, billet, genre)
    ├── TabFacturation.tsx
    ├── TabArrivee.tsx
    └── TabHistorique.tsx # Timeline verticale activités avec filtres
```

---

## SCHÉMA DB — TABLES PRINCIPALES

### `interns` — colonnes importantes
```
cv_url, local_cv_url, portfolio_url, examples_url
desired_start_date, desired_end_date, desired_duration_months
school_name, school_country
school_contact_first_name, school_contact_last_name, school_contact_email, school_contact_phone
emergency_contact_name, emergency_contact_phone, emergency_contact_email
mother_first_name, mother_last_name
flight_departure_date, flight_return_date, flight_departure_city, flight_number
passport_number, passport_expiry, passport_page4_url
photo_id_url, bank_statement_url, return_plane_ticket_url
linkedin_url, avatar_url
qualification_debrief, private_comment_for_employer
```

### `cases` — colonnes importantes
```
status (enum), cv_status (pending|validated|to_redo)
intern_first_meeting_date, google_meet_link, google_calendar_event_id
school_id, package_id
payment_amount, payment_date, payment_type
portal_token, temp_password
```

### `job_submissions` — statuts enum
```
proposed → sent → interview → retained → rejected → cancelled
```
⚠️ JAMAIS utiliser 'pending' ou 'sent_to_employer' — invalides

### `jobs` — statuts enum
```
open → staffed → cancelled
```
Colonnes: `job_department_id` (FK → job_departments), `department` (text legacy)

### `job_departments`
```
id, name, slug, categories (text[]), is_active
```

---

## DONNÉES DEMO

### Offres de stage (9 offres, status=open)
Toutes avec `contact_email = sidney.ruby@gmail.com`

Entreprises demo: Bali Creative Agency, Surf & Co Bali, Warung Digital, Bali Luxury Villas, Green Bali Media, Bali Eats Restaurant Group

---

## EMAILS (Resend)

| Fonction | Déclencheur |
|----------|-------------|
| `sendLeadConfirmation()` | Soumission /apply |
| `sendRdvConfirmation()` | Webhook Fillout |
| `sendQualificationEmail()` | Bouton débrief Staffing |
| `sendJobSubmittedEmployer()` | Bouton "Envoyer à l'employeur" |
| `sendPaymentRequest()` | Statut payment_pending |
| `sendVisaDocsRequest()` | Statut visa_docs_sent |

---

## BUGS CONNUS / POINTS D'ATTENTION

1. **cv_url vide** : filtrer avec `cv_url?.trim() || null` — ne jamais sauvegarder `""`
2. **job_submissions status** : enum strict `proposed|sent|interview|retained|rejected|cancelled`
3. **activity_feed SELECT** : utiliser `id, type, title, description, created_at, metadata` seulement
4. **interns SELECT** : `desired_start_date` et `desired_duration_months` doivent être inclus (migration faite)
5. **school_name** : vient de `intern.school_name` — PAS `school_country`
6. **CV PDF** : utiliser Google Docs Viewer `https://docs.google.com/viewer?url=URL&embedded=true`
7. **TabKey** : `'profil' | 'staffing' | 'historique'` — PAS 'process' (supprimé)

---

## PORTAIL ÉTUDIANT

URL: `/portal/[token]`  
Login: token URL OU email + temp_password  
Fonctions: voir jobs proposés, donner avis (intéressé/pas), uploader documents

---

## COMMANDES UTILES

```bash
# Dev local
npm run dev

# Check TS
npx tsc --noEmit

# Push batch
claude --dangerously-skip-permissions < /tmp/batch_xxx.txt

# Voir les logs Vercel
npx vercel logs --follow

# Vérifier le dernier déploiement
npx vercel ls
```

---

## DERNIERS COMMITS (état au 14 avril 2026)

```
65294b9 fix: HTTP 500 candidat - migration desired_start_date + desired_duration_months
ea56ef8 fix: apply form responsive mobile
f34fed3 feat: responsive mobile - pages principales
cc3cb3d feat: navigation mobile - bottom nav + drawer hamburger  
3adf41c feat: cases/[id] header redesign 2 colonnes desktop
e389995 feat: UX overhaul - timeline, bandeau fusionné, débrief entretien
```
