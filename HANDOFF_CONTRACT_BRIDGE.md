# État du projet — Bali Interns / Sunny Interns OS
Dernière mise à jour : session du 5 sept. 2026

## Architecture actuelle (décision confirmée)
Airtable reste la SEULE source de vérité pour tout (candidats, jobs, sociétés, visas).
L'OS (sunny-interns-os, Next.js/Supabase/Vercel) sert de "moteur satellite" pour les
fonctionnalités qu'Airtable ne sait pas faire nativement — pour l'instant : la signature
électronique du Partnership Agreement employeur.

Site vitrine (bali-interns-website) → formulaire FillOut (inchangé) → Airtable → automations.

## Ce qui est fait et déployé

### Nettoyage des automations Airtable (bug corrigé)
6 automations envoyaient des emails/mettaient à jour des statuts sans vérifier si le
candidat était "N'est plus intéressé" — corrigé en ajoutant une garde de statut :
- When Date of Arrival in 1/4/7 days (rappels internes à Charly)
- Rappel de 1er rdv (candidat)
- When internships is ending, send email to intern (candidat)
- Internships Ends Update Intern Status (écrasait le statut silencieusement — le pire des 6)

### Pont signature de contrat Airtable ↔ OS
1. Cron OS `/api/cron/airtable-agreement-sync` (toutes les 15 min) — repère les Interns
   avec "Convention Signée" coché et pas encore de lien envoyé, crée un dossier Supabase
   isolé (statut `airtable_bridge`, invisible aux 11 autres crons OS), envoie l'email de
   signature directement (Resend), écrit le lien dans Airtable.
2. Route `/api/webhooks/airtable-agreement` — crée Company/Contact/Intern/Job/Case minimaux
   dans Supabase + le token de portail employeur.
3. `/api/portal/employer/[token]` (page existante, inchangée niveau UI) — génère le PDF via
   le moteur de templates existant (3 variantes A/B/C selon nationalité société/dirigeant),
   capture la signature (canvas, pas de vidéo/audit trail — "signature simple" comme demandé),
   puis renvoie webhook + PDF vers Airtable.
4. Automation Airtable "Webhook: Partnership Agreement Signed (from OS)" — reçoit la
   confirmation, mais **⚠️ NON ACTIVÉE (undeployed)** — à faire manuellement dans l'UI Airtable.

### Champs Airtable ajoutés
- Companies : Legal Entity Type, NIB, Notary Name, Deed Number/Date, AHU Number/Date,
  Signature Image, Contract Variant (formule auto A/B/C)
- Contacts : Date of Birth, Place of Birth, ID Document Type, ID Document Number
- Interns : Partnership Agreement Sent At / Signing URL / Signed PDF / Signed By

### Sponsor configuré
PT Bintang Beruntung Indonesia (Companies) + Muhammad Fauzan Najmi (Contacts, directeur,
KTP) — données légales confirmées par Sidney, présentes à la fois dans Airtable et Supabase.

## ⚠️ À faire manuellement (aucun outil API ne peut le faire)
1. **Activer l'automation "Webhook: Partnership Agreement Signed (from OS)"** dans Airtable
2. Désactiver l'automation en double "Lettre d'engagement du stagiaire when Chekbox"
   (garder "When 'Envoi Lettre au Stagiaire Form' is checked")
3. Tester le flow complet : cocher "Convention Signée" sur un stagiaire test avec un Job
   Retenu → Contact → Company complets, vérifier l'email + la signature + le retour Airtable

## Audit précédent — points encore ouverts (non traités cette session)
- 63/85 sociétés sans Certificate of Registration, 30/85 sans Country of Registration
- Job_Submissions_Status jamais mis à jour automatiquement (84% bloqués sur "Envoyé")
- Table "Imported table" orpheline (doublon de Visas), à supprimer
- 11 doublons d'emails dans Interns (2 comptes de test + 9 candidatures probablement dupliquées)

## Dashboard custom — décision d'architecture (nouvelle, cette session)
Décidé : pas de dashboard Airtable Interface, pas de projet séparé "Bali Interns OS".
Le dashboard vit dans **bali-interns-website** (même projet Vercel que le site vitrine),
sous `/dashboard`, sans aucun lien de navigation depuis les pages publiques. Lit/écrit
Airtable directement via API — donc interactif (boutons = vraies actions Airtable), pas
juste un rapport en lecture seule.

### Déjà codé (fichiers sur disque, PAS ENCORE commités/pushés)
- `src/lib/airtable.ts` — client Airtable (listAllRecords, updateRecord, getRecord)
- `src/lib/dashboard-auth.ts` — auth par mot de passe partagé (cookie httpOnly, sha256)
- `src/app/dashboard/layout.tsx` — layout protégé, redirige vers /login si non authentifié
- `src/app/dashboard/login/page.tsx` — formulaire de connexion
- `src/app/dashboard/page.tsx` — funnel pipeline (12 vrais statuts Intern_Status,
  funnel actif + sorties séparées), + 3 cartes chiffres clés
- Build vérifié OK (`npm run build` sans erreur), rien n'est en prod

### À faire dans Claude Code, dans l'ordre
1. `git add src/lib/airtable.ts src/lib/dashboard-auth.ts src/app/dashboard/` + commit + push
2. Vercel → projet **bali-interns-website** → Settings → Environment Variables :
   ajouter `AIRTABLE_API_KEY` (même valeur que sunny-interns-os) et `DASHBOARD_PASSWORD`
3. Déployer, vérifier `/dashboard` en prod (login puis funnel)
4. Backlog dans l'ordre : vue "Documents manquants" par société → vue "Anomalies"
   (Convention Signée sans Job/Package) → suivi entretien + pré-sélection jobs →
   bouton envoi manuel email récapitulatif

