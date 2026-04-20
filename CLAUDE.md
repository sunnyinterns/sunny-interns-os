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

## 🧪 Test E2E — Dossier de référence

- **Intern** : Test Stagiaire — `sidney.ruby@gmail.com`
- **Case ID** : `cf00ef63-f634-4aad-808e-28cf33ffba3f`
- **Portal token** : `f90af311-4a0a-40d9-8b6d-5ee9bf7898f8`
- **Statut de départ test** : `rdv_booked`
- **QA Widget** : accessible via `?qa=1` dans l'URL (persiste en localStorage)

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
