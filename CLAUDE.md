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

## 🚫 Ce qu'il NE FAUT PAS faire

1. **Ne pas ajouter de statut `lead` aux `CANDIDATE_STATUSES`** dans `/api/cases`
2. **Ne pas créer de tabs "Leads/Candidats"** dans `/fr/cases` — la séparation est faite par les routes
3. **Ne pas toucher à `/fr/leads/page.tsx`** sans validation — page complexe et fragile
4. **Ne pas hardcoder les IBAN** — toujours depuis `billing_companies`
5. **Ne pas dupliquer les sélecteurs** (ex: package dans TabVisa ET TabFacturation)
6. **Ne pas déployer sans `npx tsc --noEmit` à 0 erreur**

---

## 🧪 Test E2E — Dossier de référence

- **Intern** : Test Stagiaire — `sidney.ruby@gmail.com`
- **Case ID** : `8ebc87da-3de7-4f8c-82fe-fdf60995a6d4`
- **Portal token** : `9776c61e-152e-48fd-bc8b-f6faa13d8ed7`
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
