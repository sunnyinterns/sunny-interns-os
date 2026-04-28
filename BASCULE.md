# 🚀 Plan de Bascule — Sunny Interns OS

> Mis à jour : 28 avril 2026 Ce fichier recense TOUTES les actions restantes avant et après le go-live production.

---

## 🔴 BLOQUANT — Ne pas lancer sans ces éléments

### DNS & Domaines

- \[ \] **DNS [bali-interns.com](http://bali-interns.com) → Vercel** : ajouter A record `76.76.21.21`
- \[ \] **Vercel vitrine** → ajouter domaine custom `bali-interns.com`
- \[ \] **Vercel OS** → ajouter domaine custom `os.bali-interns.com`
- \[ \] **Variables d'environnement** mettre à jour après DNS :
  - Vitrine : `NEXT_PUBLIC_SITE_URL=https://bali-interns.com`
  - OS : `NEXT_PUBLIC_APP_URL=https://os.bali-interns.com`
  - OS : `NEXT_PUBLIC_SUPABASE_URL` (déjà set — vérifier)
- \[ \] **Supabase Auth** → Settings → URL Configuration → Site URL → `https://os.bali-interns.com`
- \[ \] **Google Cloud OAuth** → Authorized redirect URIs → ajouter `https://os.bali-interns.com/auth/callback` et publier l'app (sortir du mode test)

### Scheduling

- \[ \] **Google token [team@bali-interns.com](mailto:team@bali-interns.com)** → OS Settings → Scheduling → connecter le compte Google OAuth pour `team@bali-interns.com` → puis exécuter en DB : `UPDATE scheduling_managers SET is_active = true WHERE email = 'team@bali-interns.com'`

---

## 🟡 AVANT OUVERTURE — Obligatoire pour un go-live propre

### Portails — Redirections critiques

- \[ \] **Portail candidat** : vérifier que toutes les URLs dans le code pointent vers `https://os.bali-interns.com/portal/[token]` (pas `sunny-interns-os.vercel.app`)
- \[ \] **Portail employeur** : idem pour `/portal/employer/[token]`
- \[ \] **Portail agent visa** : idem pour `/portal/agent/[token]`
- \[ \] **Variable** `OS_URL` **dans vitrine** : `src/lib/config.ts` → `https://os.bali-interns.com` (actuellement `sunny-interns-os.vercel.app`)
- \[ \] **OS /apply page** interne : toujours liée à Fillout pour le step RDV → déprécier ou pointer vers `https://bali-interns.com/fr/apply`

### Validation workflow candidat E2E

- \[ \] **Test complet de bout en bout** avec une vraie candidature (pas email de test) :
  - Soumettre sur `bali-interns.com/fr/apply`
  - Vérifier case créé en `lead` dans OS `/fr/cases`
  - Confirmer le scheduling → case passe en `rdv_booked` + `intern_first_meeting_date` set
  - Vérifier email de confirmation reçu (template `apply_confirmation_en`)
  - Vérifier email RDV confirmé reçu (template `booking_confirmation`)
  - Vérifier notification admin dans OS
- \[ \] **Numéro passeport** : vérifier que l'upload passeport dans le portail candidat extrait bien le numéro via OCR et le stocke dans `interns.passport_number`

### Crons — Validation prod

- \[ \] **Tester chaque cron** avec `Authorization: Bearer <CRON_SECRET>` (récupérer la valeur dans Vercel env) :

  ```bash
  curl -H "Authorization: Bearer <secret>" https://os.bali-interns.com/api/cron/alerts
  curl -H "Authorization: Bearer <secret>" https://os.bali-interns.com/api/cron/activate-stages
  curl -H "Authorization: Bearer <secret>" https://os.bali-interns.com/api/cron/rdv-reminders
  curl -H "Authorization: Bearer <secret>" https://os.bali-interns.com/api/cron/j3-notifications
  curl -H "Authorization: Bearer <secret>" https://os.bali-interns.com/api/cron/alumni-welcome
  curl -H "Authorization: Bearer <secret>" https://os.bali-interns.com/api/cron/j45-restaffing
  ```

### Contenu vitrine

- \[ \] **Réseaux sociaux** — brancher les vrais handles dans le CMS `/settings/website` :
  - Instagram : `https://instagram.com/bali.interns`
  - LinkedIn : `https://linkedin.com/company/bali-interns`
  - TikTok : `https://tiktok.com/@bali.interns`
  - Facebook : `https://facebook.com/bali.interns`
- \[ \] **Témoignages** — uploader via `/settings/website` :
  - 5 vraies photos stagiaires (Théo, Marine, Carlos, Ashley, Nina)
  - 5 vraies citations (actuellement placeholders)
  - Vidéos si disponibles
- \[ \] **GA4** → `NEXT_PUBLIC_GA4_ID=G-XXXXXXX` dans Vercel vitrine
- \[ \] **Blog covers** × 14 manquants → uploader dans Supabase storage ou CMS blog

### Push Notifications

- \[ \] **Tester les push web** : VAPID keys configurées dans Vercel (4 variables). Ouvrir l'OS dans Chrome, accepter la permission push, déclencher un événement et vérifier la réception de la notification.

---

## 🟢 POST-BASCULE — Dans les 2 semaines après go-live

### OS — Améliorations en attente

- \[ \] **OS /apply page** : rediriger vers la vitrine ou remplacer le step Fillout par `NativeBookingEmbed`
- \[ \] **Translations Supabase** — remplir les clés `col.*` / `hub.*` / `nbh.*` pour FR puis EN
- \[ \] **Email templates** — remplir tous les templates vides restants (certains ont encore des variables `{{placeholder}}` sans contenu)
- \[ \] **sendDossierPretAgent** — tester en conditions réelles : envoyer un vrai dossier à l'agent visa BIBI CONSULTANT, vérifier que l'email arrive avec les bonnes PJ et le bon lien portail

### Monitoring & Alertes

- \[ \] **Configurer les alertes cron** dans Vercel : Vercel → Project → Settings → Cron Jobs → activer les notifications d'échec
- \[ \] **Vérifier les alertes opérationnelles en DB** : s'assurer que `alert_sent_flags` se peuple bien après la première exécution quotidienne du cron alerts

### Contenu & SEO

- \[ \] **Sitemap vitrine** : vérifier que `bali-interns.com/sitemap.xml` est accessible et soumis dans Google Search Console
- \[ \] **Meta Pixel** → `NEXT_PUBLIC_META_PIXEL_ID=XXXXXXX` si campagnes Meta actives

---

## ✅ DÉJÀ FAIT — Ce sprint (27-28 avril 2026)

### Workflow candidat — 13 corrections

- \[x\] `extra_docs_urls` migration DB
- \[x\] `preferred_language: 'en'` dans applications route
- \[x\] `status: 'lead'` à la soumission, `rdv_booked` à la confirmation scheduling
- \[x\] `school_not_found` + `school_custom_name` dans le submit body
- \[x\] `desired_sectors` stocke labels EN (plus UUIDs)
- \[x\] `assigned_manager_name` fetchée dynamiquement
- \[x\] Email confirmation via template `apply_confirmation_en` (plus HTML inline FR)
- \[x\] Google Calendar try/catch dans scheduling/confirm
- \[x\] Idempotency (email + start_at) sur bookings
- \[x\] `lang: 'en'` par défaut dans scheduling
- \[x\] `apply_confirmation_en` template utilisé
- \[x\] Fillout webhook comment supprimé
- \[x\] Double-submit protection

### Crons & Alertes

- \[x\] Cron alerts : auth Vercel `Authorization: Bearer` + colonnes DB corrigées (`alert_key`, `reference`, `recipient_emails`)
- \[x\] Migration `cases.alert_sent_flags jsonb`
- \[x\] Migration `cases.rdv_reminder_sent_at`
- \[x\] Alert recipients : `team@` → `charly@bali-interns.com`
- \[x\] Cron j3-notifications : template EN (`sendAppAllIndonesia`) + notif admin
- \[x\] Cron activate-stages : admin_notifications + activity_feed + case_logs
- \[x\] Nouveau cron `rdv-reminders` (J-1) + schedule vercel.json

### Variables Vercel configurées

- \[x\] `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- \[x\] `VAPID_PUBLIC_KEY`
- \[x\] `VAPID_PRIVATE_KEY`
- \[x\] `VAPID_EMAIL`
- \[x\] `CRON_SECRET` (32 bytes hex sécurisé)

### Code

- \[x\] HTTP 300 job_submissions : colonnes Airtable-era supprimées + FK ambiguë résolue
- \[x\] `sendFromTemplate` exportée + `sendRdvReminder()` ajouté
- \[x\] `sendApplyConfirmationEN()` ajouté
- \[x\] Legacy stubs Fillout supprimés
- \[x\] Settings/general : `fillout_form_id` supprimé
- \[x\] Schools page : Merge ↔, Approve ✓, Reject ✕, Duplicates detection
- \[x\] API `/schools-pending/merge` créée
- \[x\] `sendDossierPretAgent()` : envoie au vrai agent + toutes les variables + PJ

---

## 📋 BACKLOG — Futures sessions

- \[ \] **Content Machine Sprint 3** : n8n self-hosted + pipeline Claude API contenu → multi-plateforme
- \[ \] [**Make.com**](http://Make.com) **automations Sprint 0-2** : lead nurturing, relances, convention trigger
- \[ \] **Portail candidat** : page upload documents (passeport, photo, relevé bancaire)
- \[ \] **Passport number** : champ dans le portail intern + OCR extraction
- \[ \] **Mexico / Dubai** : architecture multi-destination (destinations table, agent model)
- \[ \] **Softr portails publics** : si nécessaire pour les partenaires écoles
- \[ \] **Multi-user OS** : `admin_notifications.user_id` pour scoping par manager

---

> **Règle** : ce fichier est mis à jour à chaque fin de session. Toute action terminée est cochée `[x]`. Toute nouvelle découverte est ajoutée dans la section appropriée.
