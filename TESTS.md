# TESTS.md — Sunny Interns OS
## Handoff complet → conversation "SunnyInterns Test"
## Dernière mise à jour : 22 avril 2026

---

## 🎯 Objectif de la session de test

Dérouler un test **de bout en bout** sur le Workflow Séquence A avec :
- Un **profil seed demo** dont les données sont complétées progressivement à chaque étape
- Un **agent visa** et un **sponsor** définis en paramètre du dossier
- Une **règle Agreement critique** : si l'employeur modifie sa nationalité ou localisation dans son portail → le bon variant (A, B ou C) doit être sélectionné dans l'agreement
- Des **emails branchés sur les templates DB** → vérifier que le bon email part à la bonne personne avec les bonnes variables
- La vérification à chaque étape du **portail candidat**, du **portail employeur**, du **portail agent visa** et de **l'OS admin**

---

## 🌍 Contexte & URLs

| Outil | URL |
|-------|-----|
| OS Admin | https://sunny-interns-os.vercel.app/fr/feed |
| Apply form | https://sunny-interns-os.vercel.app/apply |
| Supabase | https://supabase.com/dashboard/project/djoqjgiyseobotsjqcgz |
| GitHub | https://github.com/sunnyinterns/sunny-interns-os |

---

## 👤 PROFIL SEED DEMO — "Camille Rousseau"

Le profil seed est **incomplet au départ** — les données sont ajoutées étape par étape pour simuler le vrai flux de travail.

### Données de départ (minimales)
```
Prénom : Camille
Nom : Rousseau
Email : sidney.ruby@gmail.com   ← reçoit TOUS les emails de test
WhatsApp : +33 6 00 00 00 00
Source : Instagram
```

### Paramètres fixes pour ce test
```
Agent visa : BIBI CONSULTANT (agent par défaut)
Sponsor company : PT The Abundance Guild (Ubud, Bali)
Destination : Bali
Package : [sélectionner un package C22 Visa actif en DB]
```

### Données ajoutées progressivement
| Étape | Donnée ajoutée |
|-------|---------------|
| RDV | Date entretien + Google Meet link |
| Qualification | Nationalité française, niveau Licence 3, secteur Marketing |
| Qualification | CV uploadé, LinkedIn, notes de qualification |
| Convention | École, contact école, adresse |
| Convention | Passeport : numéro, expiration, ville de délivrance |
| Payment | Montant, entité de facturation, IBAN |
| Visa | Date de vol souhaitée, ville de départ |
| Arrival | Numéro de vol, heure d'arrivée, dernier transit |

---

## ⚠️ RÈGLE CRITIQUE — VARIANT AGREEMENT (A / B / C)

L'agreement (convention de stage) a **3 variants** selon la situation juridique de l'employeur.
Le variant correct est déterminé par la **nationalité du contact employeur** ET la **localisation (pays) de la société**.

### Matrice de sélection
| Nationalité contact | Pays société | → Variant |
|--------------------|-------------|-----------|
| Française | France | **A** — Convention franco-française |
| Française ou EU | Hors France (ex: Indonésie) | **B** — Convention internationale FR |
| Non-française | Hors France | **C** — Convention internationale EN |

### ⚠️ Point de test CRITIQUE
L'employeur peut **modifier sa nationalité et la localisation de sa société** dans son portail.
Si ces modifications changent le variant applicable → **l'OS doit proposer (ou forcer) le bon variant**.

**Test à effectuer :**
1. Créer le dossier avec employeur PT Abundance Guild → pays = Indonesia → contact = Andy Jansson (nationality = à vérifier)
2. Vérifier quel variant est proposé dans l'onglet Convention
3. Dans le portail employeur → modifier la nationalité du contact (ex: mettre "French")
4. Retourner dans l'OS → vérifier que le variant a changé
5. Modifier le pays de la société (ex: "France") → vérifier à nouveau

---

## 📧 EMAILS TEMPLATES — Matrice de vérification

Tous les emails sont branchés sur la table `email_templates`.
Chaque email doit être vérifié : **bon template** → **bonnes variables substituées** → **bonne(s) adresse(s) de destination**.

### Matrice complète par étape

| Étape | Slug template | Destinataire(s) | Variables clés à vérifier |
|-------|--------------|----------------|--------------------------|
| Lead reçu | `new_lead_internal` | charly@bali-interns.com | `{{first_name}}`, `{{source}}`, `{{score}}` |
| RDV confirmé | `rdv_confirmation_intern` | Camille (sidney.ruby@gmail.com) | `{{meeting_date}}`, `{{google_meet_link}}` |
| RDV confirmé | `rdv_internal_alert` | charly@bali-interns.com | `{{first_name}}`, `{{meeting_date}}` |
| Qualification → portail | `portal_invitation` | Camille | `{{portal_url}}`, `{{first_name}}` |
| Job soumis | `job_submission_employer` | Employeur (andy@...) | `{{intern_name}}`, `{{job_title}}`, profil |
| Job retenu | `job_retained_intern` | Camille | `{{company_name}}`, `{{job_title}}` |
| Convention à signer | `convention_ready` | Camille | `{{convention_url}}`, `{{amount}}` |
| Convention signée | `convention_signed_internal` | charly@bali-interns.com | `{{intern_name}}`, `{{company_name}}` |
| Paiement demandé | `invoice_intern` | Camille | `{{amount}}`, `{{iban}}`, `{{invoice_number}}` |
| Paiement reçu | `payment_confirmed_intern` | Camille | `{{first_name}}`, montant |
| Paiement reçu | `payment_confirmed_internal` | charly@bali-interns.com | `{{intern_name}}`, `{{amount}}` |
| Dossier visa envoyé | `visa_agent_submission` | Agent BIBI | `{{intern_name}}`, `{{passport_number}}`, `{{visa_type}}` |
| Visa reçu | `visa_received_intern` | Camille | `{{first_name}}`, `{{visa_expiry}}` |
| Pré-départ | `all_indonesia` | Camille | welcome kit, infos Bali |
| Arrivée | `arrival_confirmation` | Camille | `{{flight_number}}`, `{{driver_name}}` |

### Comment vérifier
1. Déclencher l'action dans l'OS
2. Vérifier la boîte `sidney.ruby@gmail.com` (et `charly@bali-interns.com` si différent)
3. Vérifier que les `{{variables}}` sont substituées (pas affichées brutes)
4. Vérifier le sujet de l'email
5. Si email manquant → vérifier les logs Resend dans Supabase ou dashboard Resend

---

## 🔄 SÉQUENCE A — TEST COMPLET ÉTAPE PAR ÉTAPE

---

### ÉTAPE 0 — Création du lead

**Action :**
- Ouvrir https://sunny-interns-os.vercel.app/apply en navigation privée
- Remplir : Camille / Rousseau / sidney.ruby@gmail.com / +33600000000
- Source : Instagram

**Vérifications OS :**
- [ ] Lead visible sur `/fr/leads`
- [ ] Score calculé (0-100)
- [ ] Pas de case créé

**Vérifications email :**
- [ ] Email `new_lead_internal` → charly@bali-interns.com
  - Variables : prénom ✓, source ✓, score ✓

**Vérifications portail :**
- Aucun portail à ce stade

---

### ÉTAPE 1 — RDV booké → `rdv_booked`

**Données à saisir dans l'OS :**
```
intern_first_meeting_date : [date dans 3 jours]
google_meet_link : https://meet.google.com/test-camille
```

**Action :** Convertir le lead → créer un case → statut `rdv_booked`

**Vérifications OS :**
- [ ] Case visible sur `/fr/cases` (section Candidats)
- [ ] Lead disparu de `/fr/leads` (ou marqué converti)
- [ ] Feed `/fr/feed` → notification RDV
- [ ] `/fr/en-attente` → "RDV à confirmer"
- [ ] Header dossier → bandeau date RDV + délai affiché

**Vérifications email :**
- [ ] `rdv_confirmation_intern` → Camille (sidney.ruby@gmail.com)
  - Variables : date ✓, lien Meet ✓, prénom ✓
- [ ] `rdv_internal_alert` → charly@bali-interns.com
  - Variables : prénom ✓, date ✓

**Vérifications portail candidat** (`/portal/[token]`) :
- [ ] Accessible via le token (généré automatiquement ?)
- [ ] Affiche "Bonjour Camille !"
- [ ] Affiche la date du RDV
- [ ] Aucune action requise pour le candidat à ce stade

---

### ÉTAPE 2 — Qualification → `qualification_done`

**Données à saisir progressivement dans l'OS (fiche candidat) :**
```
nationality : Française
intern_level : Licence 3
desired_sectors : Marketing, Communication
spoken_languages : FR, EN
english_level : B2
qualification_debrief : "Profil très motivé, bonne présentation..."
cv_url : [uploader un PDF test]
linkedin_url : https://linkedin.com/in/camille-test
```

**Action :** Passer statut → `qualification_done`

**Vérifications OS :**
- [ ] `/fr/en-attente` → "Job à matcher"
- [ ] Header → pipeline étape "Qualif" complétée (vert)
- [ ] Bandeau 2A si CV manquant, 2B si CV non validé, 2C si CV validé

**Vérifications email :**
- [ ] Email interne → "Profil qualifié" → charly@bali-interns.com

**Vérifications portail candidat :**
- [ ] "Profil validé ✓"
- [ ] "Recherche de stage en cours..."
- [ ] Si token d'invitation envoyé → candidat peut se connecter

---

### ÉTAPE 3 — Jobs soumis → `job_submitted`

**Données à saisir :**
```
Job : Community Manager (celui en DB)
Employeur : PT The Abundance Guild / Andy Jansson
Job submission status : sent
```

**⚠️ TEST VARIANT AGREEMENT ici (première occurrence) :**
- Andy Jansson → vérifier sa nationalité dans DB
- PT The Abundance Guild → country = Indonesia
- → Quel variant est affiché dans l'onglet Convention ?
- Documenter le variant initial

**Action :** Ajouter job submission → passer statut → `job_submitted`

**Vérifications OS :**
- [ ] `/fr/en-attente` → "Retour employeur attendu"
- [ ] Pipeline → étape "Jobs" active

**Vérifications email :**
- [ ] `job_submission_employer` → email Andy Jansson
  - Variables : nom candidat ✓, titre poste ✓, profil ✓
- [ ] Pas d'email au candidat à cette étape

**Vérifications portail candidat :**
- [ ] Liste des offres proposées visible
- [ ] Boutons OUI / NON fonctionnels

**Vérifications portail employeur** (`/portal/employer/[token]`) :
- [ ] Profil Camille visible
- [ ] CV accessible
- [ ] Boutons "Intéressé" / "Pas intéressé"

---

### ÉTAPE 4 — Job retenu → `job_retained`

**Action :** Marquer la soumission comme "retained" → passer statut → `job_retained`

**⚠️ TEST VARIANT AGREEMENT — Modification côté employeur :**
1. Aller sur le portail employeur `/portal/employer/[token]`
2. Modifier la nationalité du contact : passer à "French"
3. Retourner dans l'OS → onglet Convention
4. **Vérifier que le variant a changé** (A si FR + hors France, B si autre config)
5. Modifier le pays de la société → "France"
6. **Vérifier que le variant change à nouveau** (A si FR + France)
7. Remettre les valeurs originales (Indonesia + non-français) → variant C

**Vérifications OS :**
- [ ] `/fr/en-attente` → "Convention à préparer"
- [ ] Pipeline → étape "Match" complétée

**Vérifications email :**
- [ ] `job_retained_intern` → Camille
  - Variables : nom entreprise ✓, titre poste ✓, félicitations ✓
- [ ] Email interne → "Convention à préparer" → charly@bali-interns.com

**Vérifications portail candidat :**
- [ ] "🎉 Poste retenu !"
- [ ] Infos de l'entreprise visibles (sans révéler le nom si confidentiel)

---

### ÉTAPE 5 — Convention signée → `convention_signed`

**Données à saisir :**
```
school_id : [sélectionner une école en DB]
school_contact_name : Directrice des stages
school_contact_email : stages@ecole.fr
intern_address : 12 rue de la Paix, 75001 Paris
intern_signing_city : Paris
passport_number : 12AB34567
passport_expiry : 2030-01-01
passport_issue_city : Paris
```

**⚠️ Vérification variant final avant génération :**
- Employer pays = Indonesia, nationalité contact = Non-française → **Variant C attendu**
- Confirmer visuellement dans l'onglet Convention avant de générer

**Action :** Générer la convention → envoyer → marquer convention_signed → cliquer "✅ Convention signée"

**Vérifications OS :**
- [ ] Statut passe à `payment_pending`
- [ ] Onglet Facturation activé
- [ ] IBAN affiché depuis `billing_entities` (SIDLYS LLC par défaut)

**Vérifications email :**
- [ ] `convention_ready` → Camille : lien PDF convention ✓
- [ ] `convention_signed_internal` → charly@bali-interns.com ✓

**Vérifications portail candidat :**
- [ ] Convention PDF visible/téléchargeable
- [ ] Montant à payer affiché

---

### ÉTAPE 6 — Paiement reçu → `payment_received`

**Données à saisir dans l'onglet Facturation :**
```
payment_amount : [montant du package sélectionné]
payment_type : virement
payment_date : [aujourd'hui]
invoice_number : INV-2026-001
billing_entity : SIDLYS LLC (default)
```

**Action :** Confirmer paiement reçu → statut → `payment_received`

**Vérifications OS :**
- [ ] Dossier passe dans "Clients" (`/fr/clients`)
- [ ] Disparaît de "Candidats" (`/fr/cases`)
- [ ] Section logement/partenaires débloquée dans le portail
- [ ] `/fr/en-attente` → "Visa à traiter"

**Vérifications email :**
- [ ] `invoice_intern` → Camille : montant ✓, IBAN ✓, numéro facture ✓
- [ ] `payment_confirmed_intern` → Camille : confirmation ✓
- [ ] `payment_confirmed_internal` → charly@bali-interns.com ✓

**Vérifications portail candidat :**
- [ ] Facture PDF visible
- [ ] Section logement/scooter débloquée
- [ ] Section partenaires Bali visible

---

### ÉTAPE 7 — Visa soumis → `visa_in_progress`

**Données à saisir dans l'onglet Visa :**
```
Agent visa : BIBI CONSULTANT (paramètre fixe du test)
Package : [sélectionné en étape 0 — C22 Visa]
visa_type : C22 (ou selon package)
note_for_agent : "Départ prévu mi-juillet. Passeport valide 2030."
Date de vol souhaitée : 2026-07-15
```

**Action :** Envoyer dossier à l'agent → statut → `visa_in_progress`

**Vérifications OS :**
- [ ] `visa_submitted_to_agent_at` renseigné
- [ ] `/fr/en-attente` → "Attente visa"
- [ ] Montant transfert BIBI affiché (depuis `package.visa_cost_idr`)

**Vérifications email :**
- [ ] `visa_agent_submission` → BIBI CONSULTANT (email agent)
  - Variables : nom stagiaire ✓, numéro passeport ✓, type visa ✓
  - Note pour l'agent incluse ✓

**Vérifications portail agent** (`/portal/agent/[token]`) :
- [ ] Dossier Camille visible dans la liste
- [ ] Tous les documents requis listés
- [ ] Statut "En cours de traitement"
- [ ] Toggle langue EN/ID fonctionnel

**Vérifications portail candidat :**
- [ ] "Dossier visa en cours de traitement 🔄"
- [ ] Checklist documents uploadés visible

---

### ÉTAPE 8 — Visa reçu → `visa_received`

**Action dans le portail agent :** Marquer visa comme obtenu → ou action admin dans OS

**Données à renseigner :**
```
visa_recu : true
[date de réception visa]
```

**Vérifications OS :**
- [ ] `/fr/en-attente` → "Billet d'avion à confirmer"
- [ ] `/fr/notifications` → notification visa reçu

**Vérifications email :**
- [ ] `visa_received_intern` → Camille : félicitations visa ✓
- [ ] Email interne → "Visa reçu pour Camille" → charly@bali-interns.com

**Vérifications portail candidat :**
- [ ] "✅ Visa obtenu !"
- [ ] Section vol activée (upload billet)

---

### ÉTAPE 9 — Préparation arrivée → `arrival_prep`

**Données à saisir :**
```
flight_number : QR 0025
flight_departure_city : Paris CDG
flight_arrival_time_local : 2026-07-15T22:30:00
flight_last_stopover : Doha
billet_avion : true
```

**Action :** Statut → `arrival_prep`

**Vérifications OS :**
- [ ] Header → bouton "Chauffeur WA" actif
- [ ] QR code chauffeur visible (si dans package)
- [ ] `/fr/en-attente` → checklist arrivée

**Vérifications email :**
- [ ] `all_indonesia` → Camille : welcome kit Bali ✓, infos pratiques ✓
- [ ] Détails vol inclus ✓

**Vérifications portail candidat :**
- [ ] Infos logement visibles (guesthouse pré-sélectionnée)
- [ ] Infos chauffeur / aéroport
- [ ] Checklist arrivée

---

### ÉTAPE 10 — Actif → `active`

**Action :** Confirmer arrivée → statut → `active`

**Vérifications OS :**
- [ ] Visible dans `/fr/clients` avec badge "Actif"
- [ ] Carte stagiaire générée (ou bouton de génération)
- [ ] Touchpoints J+3 / J+30 / J+60 planifiés

**Vérifications portail candidat :**
- [ ] "Bienvenue à Bali, Camille ! 🌴"
- [ ] Carte stagiaire téléchargeable

---

### ÉTAPE 11 — Alumni → `alumni`

**Action :** Fin de stage → statut → `alumni`

**Vérifications OS :**
- [ ] Visible sur `/fr/alumni`
- [ ] Disappear de `/fr/clients`

**Vérifications email :**
- [ ] Email fin de stage / témoignage → Camille

**Vérifications portail candidat :**
- [ ] Section témoignage visible
- [ ] Badge "Alumni 🎓"

---

---

## 🔑 PARAMÈTRES FIXES DU TEST

### Emails de réception
| Rôle | Email |
|------|-------|
| Candidat test (Camille) | sidney.ruby@gmail.com |
| Admin interne (Charly) | charly@bali-interns.com |
| Employeur (Andy) | [email du contact Andy en DB] |
| Agent visa (BIBI) | [email de l'agent BIBI en DB] |

### Agent visa (paramètre)
```
Nom : BIBI CONSULTANT
→ Défini dans la table visa_agents (is_default = true)
→ À sélectionner manuellement dans l'onglet Visa du dossier
```

### Sponsor (paramètre)
```
Société : PT The Abundance Guild
Localisation : Ubud, Bali — Indonésie
Contact : Andy Jansson (CFO)
→ Déjà en DB (company_id connu)
→ Lier via employer_contact_id dans le case
```

---

## ✅ CHECKLIST DE VÉRIFICATION FINALE

### Workflow
- [ ] Les 12 statuts enchaînés correctement (pas de saut)
- [ ] Chaque transition met à jour `cases.status` en DB
- [ ] Chaque transition crée une entrée dans `activity_feed`
- [ ] `updated_at` mis à jour à chaque transition

### Emails (15 templates à valider)
- [ ] Aucune variable `{{placeholder}}` visible dans les emails reçus
- [ ] Tous les emails partent de `team@bali-interns.com`
- [ ] Tous les emails arrivent à la bonne adresse
- [ ] Les sujets sont cohérents avec l'étape

### Portail candidat
- [ ] Accessible via `/portal/[portal_token]`
- [ ] Toggle FR/EN fonctionne
- [ ] Chaque section se débloque au bon statut
- [ ] Upload de documents fonctionne

### Portail employeur
- [ ] Accessible via `/portal/employer/[token]`
- [ ] Profil candidat visible
- [ ] Modification nationalité/pays → visible dans l'OS
- [ ] Variant Agreement se met à jour en conséquence

### Portail agent visa
- [ ] Accessible via `/portal/agent/[token]`
- [ ] Toggle EN/ID fonctionne
- [ ] Dossier Camille visible avec tous les docs
- [ ] Action "Visa reçu" se reflète dans l'OS

### OS Admin
- [ ] Feed `/fr/feed` : notifications en temps réel
- [ ] En attente `/fr/en-attente` : les bonnes actions au bon moment
- [ ] Notifications `/fr/notifications` : alertes cohérentes
- [ ] Navigation Leads → Candidats → Clients → Alumni correcte

### Agreement Variant
- [ ] Variant A testé (FR + France)
- [ ] Variant B testé (FR + étranger)
- [ ] Variant C testé (non-FR + étranger = cas Camille/BIBI/Abundance Guild)
- [ ] Changement de variant via portail employeur fonctionne

---

## 🐛 BUGS À NOTER PENDANT LE TEST

Utiliser ce format pour documenter chaque bug :
```
BUG-001
Étape : [ex: Étape 5 — Convention]
Action : [ce qui a été fait]
Attendu : [ce qui devrait se passer]
Observé : [ce qui s'est passé]
URL : [URL exacte]
Screenshot : [si disponible]
Priorité : P0 / P1 / P2
```

---

## 📋 DONNÉES SEED EN DB (candidats existants)

Ces candidats existent déjà pour les tests Playwright automatisés (NE PAS modifier) :

| Prénom | Nom | Statut actuel | Case ID |
|--------|-----|--------------|---------|
| Emma | Dupont | rdv_booked | eee00001-... |
| Lucas | Martin | qualification_done | eee00002-... |
| Chloé | Bernard | job_submitted | eee00003-... |
| Antoine | Lefebvre | job_retained | eee00004-... |
| Sarah | Moreau | payment_received | eee00005-... |
| Thomas | Rousseau | visa_received | eee00006-... |
| Inès | Petit | active | eee00007-... |
| Maxime | Girard | alumni | eee00008-... |

**Camille Rousseau** est créée UNIQUEMENT pour ce test manuel — ne pas l'utiliser dans les tests Playwright.

---

## 🔄 RESET APRÈS TEST

Une fois le test terminé :
1. Supprimer le lead/case "Camille Rousseau" en DB si besoin de repartir
2. Ou le conserver à `alumni` comme preuve du test réussi
3. Vérifier que les candidats seed existants (Emma, Lucas...) sont intacts

```sql
-- Vérifier l'état des seeds après test
SELECT i.first_name, i.last_name, c.status 
FROM cases c JOIN interns i ON c.intern_id = i.id
WHERE c.id LIKE 'eee%'
ORDER BY c.status;
```

---

*Handoff préparé le 22 avril 2026 — Session 15*
*À reprendre dans la conversation dédiée : "SunnyInterns Test"*
