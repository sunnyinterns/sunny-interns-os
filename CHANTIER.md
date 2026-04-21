Lis d'abord CLAUDE.md entier avant de commencer.

Ensuite execute ce chantier en 5 commits logiques séparés:

## CHANTIER 1 — LISTE JOBS
Fichier: src/app/[locale]/(app)/jobs/page.tsx
Transformer la vue grid cards en vue LISTE DENSE identique au design de cases/page.tsx.
- Chaque ligne: titre job | entreprise | département | statut badge | nb candidats | badge publié/brouillon | date souhaitée
- Supprimer la grid <div className="grid gap-3 sm:grid-cols-2"> actuelle
- Remplacer par une liste <div className="divide-y divide-zinc-100 bg-white rounded-xl border border-zinc-100">
- Garder le header existant (filtres, search, bouton créer) et la modale de création inchangés
- Chaque ligne cliquable router.push vers /fr/jobs/[id]
- Commit: "feat: jobs liste dense — vue liste identique à cases (suppr grid cards)"

## CHANTIER 2 — FICHE JOB ONGLETS
Fichier: src/app/[locale]/(app)/jobs/[id]/page.tsx
Refondre en 6 onglets avec le MEME design que cases/[id]/page.tsx.
Type: 'infos' | 'publication' | 'media' | 'posts' | 'candidatures' | 'activite'

ONGLET INFOS (déjà existant, garder):
- Missions, outils, profil recherché, description interne, contact employeur
- Garder la barre de publication dans le header (toggle publié + lien slug) - NE PAS déplacer dans un onglet

ONGLET PUBLICATION (déjà existant, garder):
- Hook, vibe, perks, slug, is_public, description publique EN, bouton IA Générer tout

ONGLET IMAGE & VIDEO (déplacer depuis marketing/jobs):
- Cover image: afficher l'image existante + bouton "Générer" qui appelle /api/content/generate-image
  Prompt de génération: "Professional internship job cover image for [job.title] at [company.name] in Bali Indonesia. Modern, vibrant, tropical professional atmosphere. 16:9 ratio."
- 4 formats réseaux: Instagram carré, Story (9:16), LinkedIn (1.91:1), TikTok (9:16)
  Chaque format: bouton générer individuel + aperçu si image existante
- Section Vidéo: placeholder "Bientôt — Creatomate" avec bouton disabled

ONGLET POSTS (déplacer la logique depuis marketing/jobs):
- Sélecteur réseau: Instagram | LinkedIn | TikTok | Facebook
- Sélecteur langue: FR | EN
- Sélecteur ton: Professionnel | Casual | Énergique
- Bouton "Générer" pour chaque réseau via /api/ai-assist action raw_prompt
- Affichage du texte généré avec bouton copier
- Hashtags extraits automatiquement

ONGLET CANDIDATURES (garder existant):
- Submissions en cours, proposer candidat

ONGLET ACTIVITE (nouveau):
- Fetch /api/activity?job_id=[id] ou adapter /api/cases/[id]/activity
- Liste chronologique des événements liés à ce job

Commit: "feat: jobs/[id] 6 onglets — Image/Posts/Activité ajoutés, design cases/[id]"

## CHANTIER 3 — MARKETING/JOBS → POSTING CALENDAR
Fichier: src/app/[locale]/(app)/marketing/jobs/page.tsx
Transformer en calendrier de posts UNIQUEMENT.
- Supprimer toute la logique de génération d'image et de posts (déplacée dans jobs/[id])
- Garder uniquement: vue liste des posts depuis /api/content/posts et /api/content/publications
- Colonnes: thumbnail job | titre job | réseau | contenu (tronqué 100 chars) | statut (draft/scheduled/published) | date programmée | boutons (publier, supprimer)
- Filtre par réseau, statut, période
- Bouton "Publier maintenant" (placeholder pour l'instant)
Commit: "feat: marketing/jobs → Posting Calendar — suppression génération déplacée dans fiche job"

## CHANTIER 4 — SETTINGS MARKETING
Nouveau fichier: src/app/[locale]/(app)/settings/marketing/page.tsx
Interface de connexion aux réseaux sociaux:
- Section "Connexions": Instagram (Meta API), LinkedIn, TikTok, Facebook
  Pour chaque: statut connecté/déconnecté, bouton "Connecter" (placeholder href externe)
- Section "Auto-posting": champ URL webhook n8n, champ URL webhook Buffer
- Section "Branding posts": couleur primaire (hex), URL logo watermark
Sauvegarder via /api/settings avec key=marketing_config

Ajouter dans src/components/layout/Sidebar.tsx le lien sous la section Settings existante.

Commit: "feat: settings/marketing — page connexions réseaux sociaux + webhook + branding"

## CHANTIER 5 — FIX /api/content/generate-image
Fichier: src/app/api/content/generate-image/route.ts
- Ajouter try/catch global autour de tout le handler
- Logger: console.log('[generate-image] apiKey present:', !!apiKey, 'job_id:', job_id, 'platform:', platform)
- Logger la réponse Gemini: console.log('[generate-image] Gemini status:', geminiRes.status)
- Si pas d'image retournée: console.error('[generate-image] No inlineData in parts:', JSON.stringify(parts).slice(0,300))
- Retourner des messages d'erreur JSON explicites à chaque étape
Commit: "fix: generate-image — try/catch global + logs détaillés pour debug"

## CONTRAINTES ABSOLUES
- npx tsc --noEmit avant chaque commit — 0 erreur autorisée
- Ne jamais modifier StatusActionPanel, TabStaffing, ou les routes API cases
- Réutiliser exactement: couleur #c8a96e, rounded-xl, text-zinc-400, border-zinc-100
- Lire chaque fichier entier avant de le modifier
- Git add -A && git commit && git push après chaque chantier
