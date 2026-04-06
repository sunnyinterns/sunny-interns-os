# Mission Claude Code — Démarrage autonome

Lis CLAUDE.md en entier. Tu as accès aux plugins GitHub, Supabase et Vercel.

## Contexte
- Projet : ~/sunny-interns-os (Next.js 16 + Tailwind déjà bootstrappé)
- Supabase project ref : djoqjgiyseobotsjqcgz (DB schema déjà créé)
- .env.local : déjà configuré avec les vraies clés Supabase + Anthropic
- GitHub org : sunnyinterns

## Blocs à exécuter en séquence — SANS t'arrêter entre chaque

### BLOC 1 — Setup repo GitHub
1. git init dans ~/sunny-interns-os (si pas encore fait)
2. git add -A && git commit -m "feat: init Sunny Interns OS — Next.js 16 + Supabase schema"
3. Crée le repo "sunny-interns-os" sur github.com/sunnyinterns via le plugin GitHub
4. git remote add origin git@github.com:sunnyinterns/sunny-interns-os.git
5. git push -u origin main

### BLOC 2 — SPRINT-002 : Auth + Middleware
Installe : npm install @supabase/ssr @supabase/supabase-js next-intl

Crée ces fichiers :
- src/lib/supabase/client.ts — createBrowserClient
- src/lib/supabase/server.ts — createServerClient  
- src/middleware.ts — protège /app/* routes, redirect → /login si non auth
- src/app/[locale]/layout.tsx — layout racine avec next-intl
- src/app/[locale]/(auth)/login/page.tsx — page login simple (email + Google OAuth)
- src/app/[locale]/(app)/layout.tsx — layout protégé
- src/app/[locale]/(app)/feed/page.tsx — page feed placeholder "Feed en construction"

Configure Supabase Auth dans le dashboard (plugin Supabase) :
- Active Google OAuth provider
- Redirect URL : http://localhost:3000/auth/callback

### BLOC 3 — SPRINT-003 : Design System
Crée :
- src/lib/tokens.ts — design tokens (sidebar:#111110, accent:#c8a96e, critical:#dc2626, attention:#d97706, success:#0d9e75)
- src/components/layout/AppShell.tsx — shell avec sidebar dark
- src/components/layout/Sidebar.tsx — navigation (Feed, Pipeline, Cases, Jobs, Companies, Settings)
- src/components/ui/Button.tsx, Badge.tsx, Avatar.tsx, Card.tsx, Toast.tsx
- tailwind.config.ts — extend avec les tokens Sunny Interns
- src/app/globals.css — variables CSS + base styles

### BLOC 4 — SPRINT-004 : Activity Feed
Crée :
- src/app/[locale]/(app)/feed/page.tsx — page complète avec 4 zones
- src/components/feed/FeedZone.tsx — zone avec header + count + items
- src/components/feed/ActivityCard.tsx — card avec avatar, badge priorité, actions, tag J-X
- src/app/api/feed/route.ts — GET /api/feed → Supabase activity_feed ordered by priority
- src/lib/retroplanning.ts — fonction calculateRetroPlanning() + calculate_stay_duration() (TEST : 3 avril → 16 sept = 166j)

### BLOC 5 — Vérification + Deploy
1. npm run build — vérifie zéro erreur TypeScript
2. git add -A && git commit -m "feat: SPRINT-002/003/004 — Auth + Shell + Feed"
3. git push origin main
4. Connecte le repo à Vercel via plugin Vercel et déclenche le deploy

## Règles
- Ne jamais créer de placeholder vide. Chaque fichier est fonctionnel.
- Zéro console.error en prod.
- Teste npm run build avant chaque commit.
- Si erreur TypeScript : corrige avant de continuer.
- Termine par : BLOCS 1-5 DONE ✓ — URL Vercel : https://xxx.vercel.app
