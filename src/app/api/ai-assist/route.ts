import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PROMPTS: Record<string, (ctx: Record<string, string>) => string> = {
  generate_public_title: (ctx) =>
    `You work for Bali Interns, an internship placement agency in Bali, Indonesia.
Generate ONE catchy, professional internship job title IN ENGLISH for: "${ctx.title ?? ''}".
Company: ${ctx.company_name ?? ''}. Department: ${ctx.department ?? ''}.
Max 8 words, engaging, mention Bali if relevant. Reply ONLY with the title, no quotes.`,

  generate_description: (ctx) =>
    `Tu travailles pour Bali Interns à Bali. Rédige une description interne de 3-4 phrases pour: "${ctx.title ?? ''}".
Entreprise: ${ctx.company_name ?? ''}. Missions: ${ctx.missions ?? ''}. Profil: ${ctx.profile_sought ?? ''}.
Ton professionnel. Réponds uniquement avec la description.`,

  generate_public_description: (ctx) =>
    `You work for Bali Interns in Bali. Write an attractive PUBLIC description IN ENGLISH (visible to student candidates)
for this internship: "${ctx.public_title ?? ctx.title ?? ''}".
Company type: ${ctx.company_type ?? 'local company'}. Missions: ${(ctx.missions ?? '').split(',').slice(0,3).join(', ')}.
Max 5 sentences. Enthusiastic tone. Mention the Bali experience. Reply only with the description IN ENGLISH.`,

  generate_profile: (ctx) =>
    `Write a candidate profile IN ENGLISH for: "${ctx.title ?? ''}".
Department: ${ctx.department ?? ''}. Level: ${ctx.required_level ?? 'Bac+3'}. Tools: ${ctx.tools ?? ''}.
2-3 sentences max. Reply only with the profile IN ENGLISH.`,

  prefill_company: (ctx) =>
    `Tu es un assistant pour Bali Interns. Génère un JSON avec les infos de l'entreprise "${ctx.website ?? ''}".
Réponds UNIQUEMENT avec ce JSON valide:
{"name":"Nom officiel","description":"Description courte (2-3 phrases)","industry":"Secteur","company_type":"Type","city":"Ville si Bali","instagram":null,"linkedin":null}
Si info manquante, mets null. JSON uniquement, sans explication.`,

  improve_text: (ctx) =>
    `Améliore ce texte pour une offre de stage à Bali. Rends-le plus attractif et professionnel.
Texte: "${ctx.text ?? ''}". Contexte: ${ctx.context ?? ''}. Même longueur. Réponds uniquement avec le texte amélioré.`,

  improve_description: (ctx) =>
    `Améliore cette description interne pour une offre de stage à Bali. Ton professionnel.
Texte: "${ctx.text ?? ''}". Réponds uniquement avec le texte amélioré.`,

  improve_profile: (ctx) =>
    `Améliore ce profil recherché pour une offre de stage à Bali. Précis et attractif.
Texte: "${ctx.text ?? ''}". Réponds uniquement avec le texte amélioré.`,

  generate_hook: (ctx) =>
    `Tu travailles pour Bali Interns à Bali. Génère UNE accroche courte (max 80 caractères) pour: "${ctx.title ?? ''}".
Entreprise: ${ctx.company_name ?? ''}. Style: direct, émotionnel. Ex: "Tu veux bosser dans un resort 5⭐ à Bali ?".
Réponds UNIQUEMENT avec l'accroche, sans guillemets.`,

  generate_vibe: (ctx) =>
    `Tu travailles pour Bali Interns. Génère une ambiance / culture d'entreprise (1-2 phrases) pour: "${ctx.title ?? ''}".
Entreprise: ${ctx.company_name ?? ''}. Type: ${ctx.company_type ?? ''}.
Style: décontracté, concret. Ex: "Startup surf, équipe internationale, bureau face mer". Sans ponctuation finale.`,

  generate_perks: (ctx) =>
    `Tu travailles pour Bali Interns. Génère 3 avantages concrets pour: "${ctx.title ?? ''}".
Entreprise: ${ctx.company_name ?? ''}. Ex: "Logement géré", "Vue sur mer", "Équipe internationale".
Réponds avec EXACTEMENT 3 avantages, un par ligne, sans puces.`,

  generate_slug: (ctx) =>
    `Génère un slug SEO (minuscules, tirets) pour: "${ctx.title ?? ''}".
Durée: ${ctx.duration ?? ''}. Département: ${ctx.department ?? ''}. Max 60 caractères.
Ex: "social-media-manager-bali-4mois". Réponds UNIQUEMENT avec le slug.`,

  raw_prompt: (ctx) => ctx.prompt ?? '',
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { action: string } & Record<string, string>
    const { action, ...ctx } = body

    const promptFn = PROMPTS[action]
    if (!promptFn) return NextResponse.json({ error: `Action inconnue: ${action}` }, { status: 400 })

    const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() || null
    const geminiKey = process.env.GOOGLE_AI_STUDIO_KEY?.trim() || null

    console.log('[ai-assist] action:', action, '| anthropic:', !!anthropicKey, '| gemini:', !!geminiKey)

    if (!anthropicKey && !geminiKey) {
      return NextResponse.json({ error: 'Clé API manquante — configurer GOOGLE_AI_STUDIO_KEY dans Vercel env' }, { status: 500 })
    }

    const prompt = promptFn(ctx)
    if (!prompt) return NextResponse.json({ error: 'Prompt vide' }, { status: 400 })

    const maxTokens = action === 'raw_prompt' ? 800 : 400

    // 1. Essai Anthropic
    if (anthropicKey) {
      try {
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
          const text = data.content?.find(c => c.type === 'text')?.text?.trim() ?? ''
          if (text) return NextResponse.json({ result: text })
        } else {
          const err = await res.text()
          console.warn('[ai-assist] Anthropic failed:', res.status, err.slice(0, 200))
        }
      } catch (e) {
        console.warn('[ai-assist] Anthropic exception:', e)
      }
    }

    // 2. Fallback Gemini
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini key manquante et Anthropic a échoué' }, { status: 500 })
    }

    try {
      const gemRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
          }),
        }
      )

      const gemText = await gemRes.text()

      if (!gemRes.ok) {
        console.error('[ai-assist] Gemini error:', gemRes.status, gemText.slice(0, 300))
        return NextResponse.json({ error: 'Gemini error', status: gemRes.status, details: gemText.slice(0, 200) }, { status: 500 })
      }

      const gemData = JSON.parse(gemText) as { candidates?: Array<{ content: { parts: Array<{ text: string }> } }> }
      const text = gemData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
      console.log('[ai-assist] Gemini OK, text length:', text.length)
      return NextResponse.json({ result: text })
    } catch (e) {
      console.error('[ai-assist] Gemini exception:', e)
      return NextResponse.json({ error: 'Gemini exception', details: String(e) }, { status: 500 })
    }

  } catch (e) {
    console.error('[ai-assist] Global exception:', e)
    return NextResponse.json({ error: 'Internal error', details: String(e) }, { status: 500 })
  }
}
