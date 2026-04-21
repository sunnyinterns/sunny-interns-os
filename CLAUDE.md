# CLAUDE.md — Sunny Interns OS
## À lire en PREMIER avant toute modification de code

---

## 🏗️ Stack technique (NON NÉGOCIABLE)
- **Frontend** : Next.js 15 App Router, TypeScript, Tailwind
- **DB** : Supabase PostgreSQL (`djoqjgiyseobotsjqcgz`, région ap-southeast-2)
- **Déploiement** : Vercel (`prj_Rx8XVuT5UXdByUbAyy1b8KFuSCt6`)
- **Repo** : github.com/sunnyinterns/sunny-interns-os
- **Email** : Resend (`team@bali-interns.com`)
- **Contrainte absolue** : Zéro développeur permanent. Tout doit être no-code ou gérable par Sidney sans aide technique.

---

## 📊 Modèle de données — RÈGLES FONDAMENTALES

### Table `leads`
- Contient les **prospects non qualifiés** : formulaire site web, CV drop, campagne pub, LinkedIn, etc.
- Un lead N'A PAS encore pris de RDV
- Page : `/fr/leads`
- **Ne jamais mélanger avec la table `cases`**

### Table `cases`
- Contient les **dossiers CRM actifs**
- Un `case` est créé **uniquement quand le formulaire est complété ET le RDV est pris**
- Le statut de départ d'un `case` est **`rdv_booked`** — jamais `lead`
- Le statut `lead` dans `cases` n'est PAS utilisé dans le flux normal

### Workflow des statuts `cases` (dans l'ordre)
```
rdv_booked → qualification_done → job_submitted → job_retained
→ convention_signed → payment_pending → payment_received
→ visa_in_progress → visa_received → arrival_prep → active → alumni
```

---

## 🗂️ Navigation — RÈGLES D'AFFICHAGE

| Menu | Route | Table | Statuts affichés |
|------|-------|-------|-----------------|
| Leads | `/fr/leads` | `leads` | Tous les leads non convertis |
| Candidats | `/fr/cases` | `cases` | `rdv_booked` → `convention_signed` |
| Clients | `/fr/clients` | `cases` | `payment_received` → `alumni` |
| Alumni | `/fr/alumni` | `cases` | `alumni` |

### Règles absolues
- **Un lead n'apparaît JAMAIS dans Candidats**
- **Les cases avec statut `lead` n'existent pas dans le flux normal**
- **Ne jamais créer d'onglets ou de bandeaux supplémentaires** sans validation explicite de Sidney

---

## 💶 Facturation — RÈGLES

- **TabFacturation** = tout ce qui est financier : package, prix, remise, IBAN, entité légale, confirmation paiement
- **TabVisa** = opérationnel visa uniquement : documents, passeport, agent, dates
- Le package se sélectionne **uniquement dans TabFacturation** — TabVisa affiche en lecture seule
- L'IBAN vient de la table `billing_companies`, jamais hardcodé
- Entité facturante par défaut : SIDLYS LLC

---

## 🛂 Visa — RÈGLES

- L'agent visa par défaut est **BIBI CONSULTANT**
- Le montant du virement à l'agent = `package.visa_cost_idr` (auto depuis le package, non modifiable manuellement)
- Convention de stage signée = déclencheur commercial → paiement obligatoire avant traitement visa

---


## 🌐 Multilangue — Système i18n

| Contexte | Langues | Storage | Fichier |
|---------|---------|---------|---------|
| OS admin | FR/EN | `localStorage:admin_lang` | `src/lib/i18n.ts` |
| Portail candidat | FR/EN | `localStorage:portal_lang` | `src/lib/i18n.ts` |
| Portail agent visa | EN/ID | `localStorage:agent_lang` | `src/lib/i18n.ts` |
| Portail employeur | EN uniquement | — | hardcodé |

### Fonctions clés
- `tp(lang, key)` → traduction portail candidat
- `ta(lang, key)` → traduction portail agent visa
- `getPortalLang()` / `setPortalLang()` → persistence candidat
- `getAgentLang()` / `setAgentLang()` → persistence agent
- `getAdminLang()` / `setAdminLang()` → persistence admin

### Composants
- `<LangToggle onLangChange={setLang} />` → FR/EN dans les portails candidat
- `<AgentLangToggle onLangChange={setLang} />` → EN/ID dans le portail agent


## 🌐 Portails

| Portail | Route | Audience |
|---------|-------|----------|
| Intern | `/portal/[token]` | Stagiaire |
| Employer | `/portal/employer/[token]` | Entreprise |
| Agent visa | `/portal/agent/[token]` | BIBI CONSULTANT |

- Section logement + partenaires débloquée après `payment_received`
- IBAN du portail = depuis `billing_companies` du dossier

---

## 🎨 Header dossier candidat — RÈGLES

### Structure (3 lignes)
1. **Nav bar** : ← Retour + boutons contextuels (context-aware par statut)
2. **Identité** : Avatar + Nom + Badge statut + Email + Icônes Email/WA/LinkedIn + Pipeline 5 étapes
3. **Bandeau statut** : `CaseStatusBandeau` — composant dédié, un bandeau par statut

### Boutons context-aware (nav bar)
- `rdv_booked` → Récap entretien
- `qualification_done` + cv_url présent → Envoyer portail
- `qualification_done`+ → Portail candidat ↗ (lecture)
- `arrival_prep`/`active` avec vol → Chauffeur WA
- `active` → Carte stagiaire
- `isClient` → Fiche client →

### Pipeline (5 étapes candidat)
`RDV → Qualif → Jobs → Match → Convention`
- Étapes passées : fond vert (#0d9e75) + ✓
- Étape courante : bordure dorée (#c8a96e)
- Étapes à venir : gris clair

### Bandeaux par statut (CaseStatusBandeau.tsx)
- `rdv_booked` + `rdv_cancelled_by_intern_at` → Alerte annulation rouge
- `rdv_booked` + `intern_first_meeting_date` → Date RDV + délai + Reprogrammer/Annuler
- `qualification_done` + cv manquant → 2A CV manquant
- `qualification_done` + cv uploadé non validé → 2B Valider CV
- `qualification_done` + cv validé + pas envoyé → 2C Envoyer aux employeurs
- `qualification_done` + envoyé → 2D Attente retours (countdown 6j)
- `job_submitted` → Attente retours employeurs
- `job_retained` → Uploader convention
- `convention_signed` → **Bouton "✅ Convention signée" → patch payment_pending** (irréversible)

1. **Ne pas ajouter de statut `lead` aux `CANDIDATE_STATUSES`** dans `/api/cases`
2. **Ne pas créer de tabs "Leads/Candidats"** dans `/fr/cases` — la séparation est faite par les routes
3. **Ne pas toucher à `/fr/leads/page.tsx`** sans validation — page complexe et fragile
4. **Ne pas hardcoder les IBAN** — toujours depuis `billing_companies`
5. **Ne pas dupliquer les sélecteurs** (ex: package dans TabVisa ET TabFacturation)
6. **Ne pas déployer sans `npx tsc --noEmit` à 0 erreur**

---

## 🧪 Test E2E — Candidats de référence (seed réaliste)

### Candidats actifs en DB
| Prénom | Nom | Statut | Case ID | Portal Token |
|--------|-----|--------|---------|--------------|
| Emma | Dupont | rdv_booked | eee00001-0000-0000-0000-000000000001 | 3c11ad31-57b1-437f-a278-7ff5ba260327 |
| Lucas | Martin | qualification_done | eee00002-0000-0000-0000-000000000002 | 8b037cf4-e05b-49ee-9559-4c29077072dd |
| Chloé | Bernard | job_submitted | eee00003-0000-0000-0000-000000000003 | 0fc7ac33-d82e-43fe-b9ef-ae3b7a955768 |
| Antoine | Lefebvre | job_retained | eee00004-0000-0000-0000-000000000004 | 35c9388c-2d22-49f5-b8aa-da30cfb550e0 |
| Sarah | Moreau | payment_received | eee00005-0000-0000-0000-000000000005 | d08319f3-94b2-45b9-9d9a-12ef38d99fbe |
| Thomas | Rousseau | visa_received | eee00006-0000-0000-0000-000000000006 | 95be5cc7-fbec-4870-b280-58a1092de8e5 |
| Inès | Petit | active | eee00007-0000-0000-0000-000000000007 | 80bcd508-183c-4d50-91b3-a320c707d4f3 |
| Maxime | Girard | alumni | eee00008-0000-0000-0000-000000000008 | 6243baac-5964-4c5e-a8b4-b68236a87592 |

### Portails de test
- **Portail étudiant** : `/portal/[portal_token]`
- **Portail employeur Antoine** : `/portal/employer/2260fc81-5edc-4d98-b192-446b69944aac`
- **Portail agent visa Sarah** : `/portal/agent/5f583fce-d2c6-4829-b772-efd057952e09`
- **Agent BIBI CONSULTANT** (vue globale) : `/portal/agent/74de268c-cdd3-41c8-ad6f-24bda1b0a628`

### Leads de test
- Julie Lambert (Instagram, score 78), Théo Garcia (TikTok, 62), Camille Richard (Facebook, 71), Marie Fontaine (Parrainage, 85)

### Test candidat propre
- Utiliser le formulaire `/apply` pour créer un candidat test
- Tous les emails de test → `sidney.ruby@gmail.com`

### QA Widget
- Accessible via `?qa=1` dans l'URL (persiste en localStorage)

---

## 📋 Règle de travail pour Claude

**Avant chaque session :**
1. Lire ce fichier
2. Lire `git log --oneline -5` pour connaître l'état actuel
3. Faire `npx tsc --noEmit` avant de commencer
4. Ne jamais modifier une page existante qui fonctionne sans avoir vérifié qu'elle ne crashe pas

**Avant chaque commit :**
1. `npx tsc --noEmit` → 0 erreur obligatoire
2. Décrire précisément ce qui change dans le message de commit

---

## 🤖 IA — Patterns et routes

### Hook `useAIAssist` (`src/hooks/useAIAssist.ts`)
- **Retourne** : `{ assist, isLoading, loadingAction, loading }`
- **Usage** : `isLoading('action_name')` → true uniquement pour CE bouton (pas global)
- **NE PAS** utiliser `loading` (global) pour désactiver des boutons individuels
- **Toujours** : `disabled={isLoading('action_name') || !job.title}`

### Route `/api/ai-assist`
- Tente Anthropic (`ANTHROPIC_API_KEY`) en premier, fallback Gemini (`GOOGLE_AI_STUDIO_KEY`)
- Action `raw_prompt` : accepte `{ action: 'raw_prompt', prompt: 'mon prompt complet' }` → 800 tokens
- Autres actions : 400 tokens max
- **Ne pas** appeler `/api/anthropic/v1/messages` — cette route a été supprimée

### Hub Marketing Jobs & Contenu (`/fr/marketing/jobs`)
- Page principale : 5 onglets (Infos / Image / Vidéo / Posts / Publication)
- Génération posts : `fetch('/api/ai-assist', { action: 'raw_prompt', prompt: textPrompt(...) })`
- Génération images : `fetch('/api/content/generate-image', ...)`
- `/fr/marketing/social` → redirige vers `/fr/marketing/jobs` (doublon supprimé)

---

## 🔒 Sécurité API — Règles
- Toute route dans `src/app/api/(app)/` DOIT vérifier `await supabase.auth.getUser()`
- Routes légitimement publiques (sans auth) : `/api/public/*`, `/api/scheduling/*`, `/api/book`, `/api/leads/complete`, `/api/apply/*`, `/api/portal/*`
- Routes admin nécessitent auth même si elles utilisent `service_role_key`
- **Jamais** de `createClient()` Supabase sans vérifier l'utilisateur dans les routes admin

---

## 🤖 IA — PATTERNS ET CONVENTIONS

### Hook `useAIAssist` (`src/hooks/useAIAssist.ts`)
- Expose `assist(action, ctx)` → `Promise<string | null>`
- Expose `isLoading(action)` → `boolean` (par action, pas global !)
- Expose `loading` → `boolean` global
- **Pattern obligatoire** : `disabled={isLoading('mon_action')}` — jamais `disabled={loading}`
- Si la clé API manque en prod, `assist()` retourne `null` silencieusement → toujours vérifier `if (r)` avant `patchJob`

### Route `/api/ai-assist`
- Actions disponibles : `generate_public_title`, `generate_description`, `generate_public_description`, `generate_profile`, `prefill_company`, `improve_text`, `improve_description`, `improve_profile`, `generate_hook`, `generate_vibe`, `generate_perks`, `generate_slug`, `raw_prompt`
- Clés API : tente `ANTHROPIC_API_KEY` en premier, fallback sur `GOOGLE_AI_STUDIO_KEY` (Gemini Flash)
- `raw_prompt` : accepte `{action: 'raw_prompt', prompt: '...'}` → max 800 tokens (pour les posts sociaux)
- Toutes les autres actions : max 400 tokens

### Gemini Image
- Route : `/api/content/generate-image`
- Modèle : `gemini-2.0-flash-preview-image-generation`
- Retourne `{ image_url: string }` (uploadé dans Supabase Storage)

---

## 📱 HUB MARKETING — Jobs & Contenu (`/fr/marketing/jobs`)

### Architecture 5 onglets
| Onglet | Contenu | API |
|--------|---------|-----|
| 📋 Infos | hook/vibe/perks/slug/desc publiques | lecture `job` |
| 🖼 Image | Cover + 4 formats réseau (IA) | `/api/content/generate-image` |
| 🎬 Vidéo | Placeholder (à implémenter) | — |
| ✍️ Posts | Texte par réseau via IA | `/api/ai-assist` (raw_prompt) |
| 📅 Publication | Scheduling DB | `/api/content/publications` |

### Règles
- `/fr/marketing/social` redirige vers `/fr/marketing/jobs` (doublon supprimé)
- La génération de posts utilise **`/api/ai-assist` avec `action: 'raw_prompt'`** — JAMAIS `/api/anthropic/v1/messages`
- La route `/api/anthropic/v1/messages` a été supprimée

---

## 🔄 STATUTS CRM — StatusActionPanel

Statuts complets avec transitions :
```
lead → rdv_booked | to_recontact | not_interested
rdv_booked → qualification_done | to_recontact | not_interested
qualification_done → job_submitted | to_recontact | no_job_found
job_submitted → job_retained | to_recontact
job_retained → convention_signed
convention_signed → payment_pending (avec email)
payment_pending → payment_received
payment_received → visa_docs_sent | visa_in_progress
visa_in_progress → visa_received | visa_refused
visa_received → arrival_prep
arrival_prep → active
active → alumni
to_recontact → rdv_booked | not_interested
```

### Règle `to_recontact`
- **Toujours demander une date** avant de basculer via modale
- Colonne DB : `cases.recontact_at` (date)
- La modale est dans `StatusActionPanel` — `openRecontactModal()` 

---

## 🔒 SÉCURITÉ — Routes API

### Routes intentionnellement publiques (sans auth)
`/api/public/*`, `/api/scheduling/*`, `/api/calendar/slots`, `/api/book`, `/api/form-abandonments`

### Routes avec auth obligatoire
Toutes les autres routes admin. Pattern :
```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

---

## 📋 PATTERNS DE CODE IMPORTANTS

### patchJob (jobs/[id]/page.tsx)
Mise à jour **optimiste** : `setJob` est appelé AVANT le fetch réseau. Si erreur → rollback via `load()`.

### patchDescription (companies/[id]/page.tsx)
Édition inline de la description entreprise sans ouvrir la modale complète.

### Débrief entretien
- **Un seul endroit** : section `🎤 Débrief Entretien` dans `TabStaffing`
- Le bouton "📧 Récap entretien" du header cases a été **supprimé** (doublon)

### CLAUDE.md à mettre à jour
Faire une mise à jour de ce fichier en fin de session si des changements architecturaux ont été faits.

---

## 🗂️ ARCHITECTURE JOBS (mise à jour post-chantier)

### Liste `/fr/jobs`
Vue liste dense (comme `/fr/cases`) — colonnes: titre · entreprise · département · statut · candidats · publié · date.
**Plus de grid cards.**

### Fiche `/fr/jobs/[id]` — 6 onglets
```
📋 Infos       | missions, outils, profil, desc interne, contact employeur
🌐 Publication | hook, vibe, perks, slug, is_public, desc EN, IA Générer tout
🖼 Image&Vidéo | cover image Gemini, 4 formats réseaux (carré/story/LinkedIn/TikTok)
✍️ Posts       | génération texte par réseau via /api/ai-assist raw_prompt
👥 Candidatures| submissions + proposer candidat
📊 Activité    | logs chronologiques du job
```
- Barre publication (toggle + lien slug) dans le **header**, pas dans un onglet
- Type: `'infos' | 'publication' | 'media' | 'posts' | 'candidatures' | 'activite'`

### Marketing `/fr/marketing/jobs`
→ **Posting Calendar uniquement** — liste des posts schedulés (job/réseau/statut/date/actions).
Plus aucune logique de génération ici (déplacée dans la fiche job).

### Settings `/fr/settings/marketing`
Page connexions réseaux sociaux (Instagram, LinkedIn, TikTok, Facebook) + webhook n8n/Buffer + branding.
Lien dans sidebar sous section Marketing.

### Sidebar structure
```
Marketing
├── Posting Calendar  → /fr/marketing/jobs
├── Blog              → /fr/blog
└── ⚙️ Réseaux       → /fr/settings/marketing
```

---

## 🔧 API IMAGES

### `/api/content/generate-image`
- Modèle: `gemini-2.0-flash-preview-image-generation`
- Clé: `GOOGLE_AI_STUDIO_KEY`
- Stockage: bucket Supabase `brand-assets` (public)
- Path: `content/[job_id]/[platform]_[timestamp].png`
- Retourne: `{ success: true, image_url: string }`
- Try/catch global + logs détaillés (voir chantier 5)
