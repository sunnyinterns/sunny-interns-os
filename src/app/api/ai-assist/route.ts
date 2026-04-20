import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PROMPTS: Record<string, (ctx: Record<string, string>) => string> = {
  generate_public_title: (ctx) =>
    `You work for Bali Interns, an internship placement agency in Bali, Indonesia.
Generate ONE catchy, professional internship job title IN ENGLISH for this position: "${ctx.title ?? ''}".
Company: ${ctx.company_name ?? 'not specified'}. Department: ${ctx.department ?? 'not specified'}.
Max 8 words, engaging, mention Bali if relevant.
Reply ONLY with the title IN ENGLISH, no quotes, no explanation.`,

  generate_description: (ctx) =>
    `Tu travailles pour Bali Interns à Bali, Indonésie.
Rédige une description interne de 3-4 phrases pour cette offre de stage: "${ctx.title ?? ''}".
Entreprise: ${ctx.company_name ?? ''}. Missions: ${ctx.missions ?? ''}.
Profil: ${ctx.profile_sought ?? ''}. Outils: ${ctx.tools ?? ''}.
Ton professionnel et direct. Réponds uniquement avec la description.`,

  generate_public_description: (ctx) =>
    `You work for Bali Interns in Bali, Indonesia. Write an attractive PUBLIC description IN ENGLISH (visible to student candidates)
for this internship: "${ctx.public_title ?? ctx.title ?? ''}".
Company type: ${ctx.company_type ?? 'local company'}.
Missions: ${(ctx.missions ?? '').split(',').slice(0,3).join(', ')}.
Tools: ${ctx.tools ?? ''}.
Max 5 sentences. Enthusiastic tone. Mention the Bali experience.
Reply only with the description IN ENGLISH.`,

  generate_profile: (ctx) =>
    `Write a candidate profile IN ENGLISH for this internship position: "${ctx.title ?? ''}".
Department: ${ctx.department ?? ''}. Level: ${ctx.required_level ?? 'Bac+3'}.
Required tools: ${ctx.tools ?? ''}. Languages: ${ctx.languages ?? 'FR, EN'}.
2-3 sentences max. Direct and precise. Reply only with the profile IN ENGLISH.`,

  prefill_company: (ctx) =>
    `Tu es un assistant pour Bali Interns. À partir du site web "${ctx.website ?? ''}",
génère un JSON avec les infos de l'entreprise. Réponds UNIQUEMENT avec ce JSON valide:
{
  "name": "Nom officiel de l'entreprise",
  "description": "Description courte de l'activité (2-3 phrases max)",
  "industry": "Secteur d'activité (Marketing/Tech/Hôtellerie/Tourisme/Finance/Autre)",
  "company_type": "Type d'entreprise (Agence digitale, Restaurant, Surf school...)",
  "city": "Ville principale si à Bali",
  "instagram": "URL Instagram si trouvé ou null",
  "linkedin": "URL LinkedIn si trouvé ou null"
}
Si tu ne trouves pas l'info, mets null. Pas d'explication, JSON uniquement.`,

  improve_text: (ctx) =>
    `Améliore ce texte pour une offre de stage à Bali. Rends-le plus attractif et professionnel.
Texte original: "${ctx.text ?? ''}". Contexte: ${ctx.context ?? ''}.
Réponds uniquement avec le texte amélioré, même longueur approximative.`,

  // Aliases dédiés pour tracking individuel par bouton
  improve_description: (ctx) =>
    `Améliore cette description interne pour une offre de stage à Bali. Ton professionnel et direct.
Texte: "${ctx.text ?? ''}". Réponds uniquement avec le texte amélioré.`,

  improve_profile: (ctx) =>
    `Améliore ce profil recherché pour une offre de stage à Bali. Précis et attractif.
Texte: "${ctx.text ?? ''}". Réponds uniquement avec le texte amélioré.`,

  generate_hook: (ctx) =>
    `Tu travailles pour Bali Interns à Bali, Indonésie.
Génère UNE accroche courte et percutante (max 80 caractères) pour cette offre de stage: "${ctx.title ?? ''}".
Entreprise: ${ctx.company_name ?? ''}. Département: ${ctx.department ?? ''}.
Style: direct, émotionnel, donne envie. Peut commencer par "Tu veux...", "Envie de...", etc.
EXEMPLES: "Tu veux bosser dans un resort 5⭐ à Bali ?", "Marketing dans un café face mer — ça te parle ?".
Réponds UNIQUEMENT avec l'accroche, sans guillemets.`,

  generate_vibe: (ctx) =>
    `Tu travailles pour Bali Interns à Bali, Indonésie.
Génère une description courte de l'ambiance / culture d'entreprise (1-2 phrases max) pour: "${ctx.title ?? ''}".
Entreprise: ${ctx.company_name ?? ''}. Type: ${ctx.company_type ?? ''}.
Style: décontracté, authentique, concret. Ex: "Startup surf, équipe internationale, bureau face mer".
Réponds UNIQUEMENT avec l'ambiance, pas de ponctuation finale.`,

  generate_perks: (ctx) =>
    `Tu travailles pour Bali Interns à Bali, Indonésie.
Génère 3 avantages concrets et attractifs pour cette offre de stage: "${ctx.title ?? ''}".
Entreprise: ${ctx.company_name ?? ''}. Département: ${ctx.department ?? ''}.
Exemples d'avantages: "Logement géré par l'agence", "Vue sur mer depuis le bureau", "Équipe internationale", "Surf sessions".
Réponds avec EXACTEMENT 3 avantages, un par ligne, sans puces ni numéros.`,

  generate_slug: (ctx) =>
    `Génère un slug SEO en minuscules avec tirets pour cette offre de stage à Bali: "${ctx.title ?? ''}".
Durée: ${ctx.duration ?? ''}. Département: ${ctx.department ?? ''}.
Format: [metier]-[entreprise-optionnel]-bali-[duree-optionnel]. Max 60 caractères.
Exemples: "social-media-manager-bali-4mois", "marketing-digital-resort-bali", "ux-designer-startup-bali".
Réponds UNIQUEMENT avec le slug (lettres minuscules, chiffres, tirets uniquement).`,

  // Action générique — accepte un prompt pré-construit, max_tokens plus élevé pour les posts
  raw_prompt: (ctx) => ctx.prompt ?? '',
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, ...ctx } = await request.json() as { action: string } & Record<string, string>

  const promptFn = PROMPTS[action]
  if (!promptFn) return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const geminiKey = process.env.GOOGLE_AI_STUDIO_KEY

  if (!anthropicKey && !geminiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })

  const prompt = promptFn(ctx)
  const maxTokens = action === 'raw_prompt' ? 800 : 400

  // Tenter Anthropic d'abord, fallback Gemini
  if (anthropicKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (res.ok) {
      const data = await res.json() as { content: Array<{ type: string; text: string }> }
      const text = data.content.find(c => c.type === 'text')?.text?.trim() ?? ''
      return NextResponse.json({ result: text })
    }
  }

  // Fallback Gemini Flash
  const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
    }),
  })

  if (!gemRes.ok) {
    const err = await gemRes.text()
    return NextResponse.json({ error: 'Erreur API IA', details: err }, { status: 500 })
  }

  const gemData = await gemRes.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> }
  const text = gemData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  return NextResponse.json({ result: text })
}
