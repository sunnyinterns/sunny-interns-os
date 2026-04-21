# WORKFLOW_TEST.md — Plan de test end-to-end
## Sunny Interns OS — Préparé pour le test final

---

## 🎯 Principe
Créer un candidat test via le formulaire `/apply`, puis le suivre de A à Z.
À chaque étape : vue admin (/fr/cases/[id]) + portail candidat + email reçu.

---

## 📋 Étapes du test

### ÉTAPE 0 — Lead entrant (apply form)
**Actions :**
- Ouvrir https://sunny-interns-os.vercel.app/apply en navigation privée
- Remplir avec : Prénom Test, Nom Candidat, email sidney.ruby@gmail.com

**Résultat attendu :**
- Lead créé dans table `leads` (visible sur /fr/leads)
- Email interne → charly@bali-interns.com : "Nouveau stagiaire !"
- Score calculé automatiquement
- Pas encore de case créé

---

### ÉTAPE 1 — Booking RDV → rdv_booked
**Actions admin :**
- Cliquer sur le lead → créer un case
- Passer le statut → rdv_booked
- Saisir la date du RDV et le lien Google Meet

**Résultat attendu :**
- Case créé avec statut rdv_booked
- Email candidat → "Confirmation de ton entretien"
- Email interne → "RDV planifié avec [prénom]"
- Notification admin dans le feed
- Todo "RDV à confirmer" dans en_attente
- **Portail candidat** : "Bonjour Test !", "Ton entretien le [date]", 0 action requise

---

### ÉTAPE 2 — Qualification → qualification_done
**Actions admin :**
- Ouvrir le dossier
- Saisir les notes de qualification
- Passer le statut → qualification_done

**Résultat attendu :**
- Email interne → "Profil qualifié, proposer des jobs"
- Todo "Job à matcher" dans en_attente
- **Portail candidat** : "Profil validé", recherche de stage en cours

---

### ÉTAPE 3 — Proposer des jobs → job_submitted
**Actions admin :**
- Dans l'onglet Staffing, ajouter 1-2 job submissions
- Passer statut → job_submitted

**Résultat attendu :**
- Email employeur → profil candidat envoyé
- Todo "Retour employeur attendu" dans en_attente
- **Portail candidat** : liste des offres proposées avec boutons OUI/NON
- **Portail employeur** : profil du candidat visible

---

### ÉTAPE 4 — Job retenu → job_retained
**Actions admin :**
- Marquer un job submission comme "retenu"
- Passer statut → job_retained

**Résultat attendu :**
- Email candidat → "Félicitations, tu es retenu chez [entreprise] !"
- Email interne → convention à préparer
- **Portail candidat** : "Poste retenu 🎉", détails de l'entreprise

---

### ÉTAPE 5 — Convention + Paiement → convention_signed → payment_received
**Actions admin :**
- Préparer et envoyer la convention
- Marquer convention comme signée → payment_pending
- Confirmer le paiement → payment_received

**Résultat attendu :**
- Email candidat → facture + demande paiement
- Email interne → paiement confirmé
- **Portail candidat** : facture visible, notification paiement reçu
- Actions requises débloquées : billet d'avion, engagement letter

---

### ÉTAPE 6 — Visa → visa_in_progress → visa_received
**Actions admin :**
- Vérifier que les docs sont uploadés dans le portail candidat
- Envoyer le dossier à l'agent visa
- Portail agent : marquer comme reçu, puis visa obtenu

**Résultat attendu :**
- **Portail candidat** : upload docs visa ✅
- **Portail agent visa** (EN/ID) : dossier visible, tous docs validés
- Email interne → "Dossier prêt à envoyer à l'agent"
- Email agent → dossier complet

---

### ÉTAPE 7 — Arrivée → active → alumni
**Actions admin :**
- Saisir infos vol → arrival_prep
- Confirmer arrivée → active
- Fin de stage → alumni

**Résultat attendu :**
- Email candidat → welcome kit + infos pratiques Bali
- **Portail candidat** : bienvenue à Bali, infos logement/chauffeur
- Alumni : visible sur /fr/alumni

---

## 🔑 Données de test
- **Email tous les candidats test** : sidney.ruby@gmail.com
- **Email interne (Charly)** : charly@bali-interns.com
- **Agent visa** : BIBI CONSULTANT (sidney.ruby@gmail.com)
- **Apply form** : https://sunny-interns-os.vercel.app/apply

## 🌐 Multilangue à tester
- Portail candidat FR : toggle → EN → vérifier que tout est traduit
- Portail agent EN → toggle ID → vérifier traduction indonésien
- OS admin : toggle FR → EN (dans settings)

