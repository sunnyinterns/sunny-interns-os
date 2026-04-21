Lis CLAUDE.md en premier. Tu es en charge de livrer 3 portails + le workflow admin fonctionnels aujourd'hui.

## CONTEXTE
- Supabase: djoqjgiyseobotsjqcgz
- Token de test étudiant: f90af311-4a0a-40d9-8b6d-5ee9bf7898f8
- Token employeur: c6993948-8110-43bc-80cb-03fb2c4c230c  
- Token agent visa: 84a57cf5-26cb-4002-bce4-64c714251890
- Case ID: cf00ef63-f634-4aad-808e-28cf33ffba3f

## BUG 1 — PORTAIL ÉTUDIANT retourne 404 (CRITIQUE)
Fichier: src/app/api/portal/[token]/route.ts

Le portail étudiant /portal/[token] affiche "Lien invalide ou expiré" alors que le token existe en DB.
L'API GET retourne 404.

1. Lire le fichier route.ts complet
2. Debugger: ajouter des console.log avant le .single() pour voir l'erreur Supabase exacte
3. La cause probable: la query nested avec billing_companies ou job_submissions échoue silencieusement
4. Fix: simplifier la query SELECT, séparer les nested selects si nécessaire
5. Aussi vérifier que interns (*) fonctionne (RLS activé sur interns récemment)
6. Tester avec curl ou fetch directement contre l'API locale si possible
7. Commiter: "fix: portail étudiant 404 — debug query + fix nested select"

## BUG 2 — ONGLETS jobs/[id] ne répondent pas aux clics
Fichier: src/app/[locale]/(app)/jobs/[id]/page.tsx

Les boutons de tabs sont dans le DOM (non-disabled) mais les clics ne changent pas l'onglet actif.
Cause probable: un élément du header (dropdown statut, barre publication) a position/z-index qui intercepte les clics.

1. Lire le fichier complet
2. Chercher dans le header: dropdown statut job, barre toggle publié, tout élément avec position:fixed/absolute ou z-index élevé
3. Fix: soit ajuster le z-index de la barre de tabs au-dessus, soit corriger le positionnement du dropdown
4. La barre de tabs doit avoir: relative z-10 minimum
5. 0 erreur TS, commiter: "fix: onglets jobs/[id] — z-index tabs au-dessus du dropdown statut"

## CHANTIER 3 — PORTAIL ÉTUDIANT complet et fonctionnel
Fichier: src/app/portal/[token]/page.tsx et sous-pages

Une fois le BUG 1 fixé, auditer les sous-pages du portail étudiant:
- /portal/[token]/ — page principale (dashboard stagiaire)
- /portal/[token]/jobs — liste des jobs proposés avec boutons d'intérêt/commentaire
- /portal/[token]/cv — upload CV
- /portal/[token]/engagement — signature lettre d'engagement
- /portal/[token]/visa — upload documents visa
- /portal/[token]/billet — infos billet d'avion
- /portal/[token]/facture — facture et notification paiement
- /portal/[token]/logement — préférences logement
- /portal/[token]/carte — carte étudiant

Pour chaque sous-page:
1. Lire le fichier
2. Vérifier que les API calls fonctionnent (chercher les routes /api/portal/[token]/*)
3. Vérifier que les fichiers sont uploadables (Supabase Storage)
4. Si une route API est manquante, la créer
5. Commiter par groupe: "fix: portal étudiant — [nom-section] fonctionnel"

## CHANTIER 4 — PORTAIL EMPLOYEUR fonctionnel
Fichier: src/app/portal/employer/[token]/page.tsx

Auditer et fixer le portail employeur:
1. Lire le fichier complet
2. Tester l'API /api/portal/employer/[token] 
3. Vérifier les fonctionnalités: voir les candidats proposés, donner un feedback, signer l'accord
4. L'employeur doit voir: nom du stagiaire, CV, profil, dates souhaitées
5. L'employeur doit pouvoir: accepter/refuser un candidat, signer le partenariat
6. Commiter: "fix: portail employeur — audit + corrections fonctionnelles"

## CHANTIER 5 — PORTAIL AGENT VISA fonctionnel  
Fichier: src/app/portal/agent/[token]/page.tsx

Auditer et fixer le portail agent visa:
1. Lire le fichier complet
2. Tester l'API /api/portal/agent/[token]
3. L'agent doit voir: dossier complet du stagiaire (passeport, photo ID, billet retour, relevé bancaire)
4. L'agent doit pouvoir: mettre à jour le statut du visa, ajouter des commentaires
5. Commiter: "fix: portail agent visa — audit + corrections fonctionnelles"

## CHANTIER 6 — WORKFLOW ADMIN protégé
Fichier: src/app/[locale]/(app)/cases/[id]/page.tsx + src/components/cases/StatusActionPanel.tsx

Le workflow admin est le cœur du business: Lead → RDV → Qualification → Job → Convention → Paiement → Visa → Arrivée → Actif → Alumni

1. Lire cases/[id]/page.tsx et StatusActionPanel.tsx complets
2. Tester chaque transition de statut: cliquer sur le dropdown statut, vérifier que le panel s'ouvre
3. Vérifier que chaque action envoie bien à la bonne API (/api/cases/[id]/status)
4. Vérifier que les notifications sont créées (table admin_notifications) à chaque changement
5. Ajouter des tests de smoke dans tests/workflow/ pour les transitions critiques:
   - convention_signed → payment_pending (test 06-convention.spec.ts)
   - payment_received → visa_in_progress (test 07-payment.spec.ts)
6. S'assurer que les tests passent en local: npx playwright test tests/workflow/06-convention.spec.ts

## CHANTIER 7 — TESTS de protection (isolation)
Créer src/app/[locale]/(app)/cases/[id]/README.md avec:
- Description du workflow
- Liste des statuts et transitions autorisées
- Règles métier (convention signée = paiement obligatoire avant visa)

Créer tests/smoke/portals.spec.ts:
- Test que /portal/[token] répond 200 avec data valide
- Test que /portal/employer/[token] répond 200
- Test que /portal/agent/[token] répond 200
- Ces tests ne doivent JAMAIS être modifiés sans validation Sidney

## CONTRAINTES ABSOLUES
- npx tsc --noEmit avant chaque commit — 0 erreurs
- Commiter par chantier avec messages explicites
- Ne PAS toucher: src/app/[locale]/(app)/leads/page.tsx
- git push après chaque commit
- Si un fix est bloquant, documenter le problème dans un commentaire et passer au suivant
