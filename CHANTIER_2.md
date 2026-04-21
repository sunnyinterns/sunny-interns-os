Lis CLAUDE.md en premier.

## CHANTIER 1 — Screenshots dans les tests Playwright

Le problème: les tests Playwright ne capturent pas de screenshots et ne les uploadent pas dans test_steps.screenshot_url (colonne existe en DB).

### Ce que tu dois faire:

1. Lire src/app/[locale]/(app)/tests/page.tsx pour comprendre comment les test_steps sont affichés
2. Lire les fichiers tests/workflow/*.spec.ts pour voir le pattern actuel
3. Lire tests/workflow/helpers.ts

4. Dans helpers.ts, ajouter une fonction uploadScreenshot(page, stepId, supabaseUrl, supabaseKey):
   - Prend un screenshot avec page.screenshot()
   - Upload dans le bucket Supabase 'screenshots' via l'API REST Supabase Storage
   - Met à jour test_steps.screenshot_url avec l'URL publique
   - Utiliser les env vars NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY depuis .env.local

5. Dans chaque spec file, après chaque test (afterEach ou dans le test), appeler uploadScreenshot si le test a un run_id et step_id
   - Le run_id et step_id sont dans la DB via les tables test_runs et test_steps
   - Chercher comment le run_id est transmis aux specs (peut être via env var TEST_RUN_ID)

6. Dans src/app/[locale]/(app)/tests/page.tsx:
   - Si un test_step a screenshot_url non null, afficher un thumbnail cliquable <img>
   - Au clic, afficher en modal/lightbox (ou nouvelle fenêtre)
   - Si pas de screenshot, afficher un placeholder gris avec texte "Pas de screenshot"

7. Créer le bucket Supabase 'screenshots' s'il n'existe pas:
   - Via /api route qui appelle supabase.storage.createBucket ou directement en SQL via migration

Contraintes:
- 0 erreur TypeScript
- npx tsc --noEmit avant commit
- Commiter: "feat: screenshots Playwright → upload Supabase + affichage dans /fr/tests"

## CHANTIER 2 — Workflow end-to-end test candidat

Il y a 1 seul case en DB avec status 'qualification_done'.
Le workflow complet doit être testable depuis l'OS.

1. Vérifier que /fr/tests affiche bien les étapes du workflow dans l'ordre:
   - Lead → rdv_booked → qualification_done → job_submitted → job_retained → convention_signed → payment_received → visa_in_progress → visa_received → arrival_prep → active → alumni
   
2. La page /fr/tests doit avoir un bouton "Lancer les tests" qui:
   - Crée un test_run en DB
   - Lance les tests Playwright via /api/tests/run (route existante ou à créer)
   - Affiche les résultats en temps réel (polling toutes les 2s sur test_steps)
   - Affiche les screenshots au fur et à mesure qu'ils arrivent

3. Chaque test step doit avoir:
   - Statut badge (passed/failed/running/pending)
   - Screenshot thumbnail si disponible
   - Bouton pour ajouter un commentaire (table test_comments)
   - Erreur message si failed

Contraintes:
- 0 erreur TypeScript
- Réutiliser le design system existant (#c8a96e, rounded-xl, etc.)
- Commiter par chantier
