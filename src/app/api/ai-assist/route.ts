import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PROMPTS: Record<string, (ctx: Record<string, string>) => string> = {
  generate_public_title: (ctx) =>
    `You work for Bali Interns, an internship placement agency in Bali, Indonesia.
Generate ONE catchy, professional internship job title IN ENGLISH for: "${ctx.title ?? ''}".
Company: ${ctx.company_name ?? ''}. Department: ${ctx.department ?? ''}.
Max 8 words, engaging, mention Bali if relevant. Reply ONLY with the title, no quotes.`,

  generate_description: (ctx) =>
    `You work for Bali Interns in Bali. Write a concise internal description (3-4 sentences) IN ENGLISH for: "${ctx.title ?? ''}".
Company: ${ctx.company_name ?? ''}. Missions: ${ctx.missions ?? ''}. Profile: ${ctx.profile_sought ?? ''}.
Professional tone. Reply only with the description IN ENGLISH.`,

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
    `You are an assistant for Bali Interns. Generate a JSON with company info for "${ctx.website ?? ''}".
Reply ONLY with valid JSON:
{"name":"Official name","description":"Short description (2-3 sentences)","industry":"Industry","company_type":"Type","city":"City if Bali","instagram":null,"linkedin":null}
If info is missing, use null. JSON only, no explanation.`,

  improve_text: (ctx) =>
    `Improve this text for an internship offer in Bali. Make it more attractive and professional IN ENGLISH.
Text: "${ctx.text ?? ''}". Context: ${ctx.context ?? ''}. Same length. Reply only with the improved text IN ENGLISH.`,

  improve_description: (ctx) =>
    `Improve this internal description for an internship offer in Bali. Professional tone, IN ENGLISH.
Text: "${ctx.text ?? ''}". Reply only with the improved text IN ENGLISH.`,

  improve_profile: (ctx) =>
    `Improve this candidate profile for an internship offer in Bali. Precise and attractive, IN ENGLISH.
Text: "${ctx.text ?? ''}". Reply only with the improved text IN ENGLISH.`,

  generate_hook: (ctx) =>
    `You work for Bali Interns in Bali. Generate ONE short hook (max 80 characters) IN ENGLISH for: "${ctx.title ?? ''}".
Company: ${ctx.company_name ?? ''}. Style: direct, emotional. Ex: "Ready to work in a 5⭐ resort in Bali?".
Reply ONLY with the hook, no quotes, IN ENGLISH.`,

  generate_vibe: (ctx) =>
    `You work for Bali Interns. Generate a company vibe / culture description (1-2 sentences) IN ENGLISH for: "${ctx.title ?? ''}".
Company: ${ctx.company_name ?? ''}. Type: ${ctx.company_type ?? ''}.
Style: casual, concrete. Ex: "Surf startup, international team, ocean view office". No trailing punctuation.`,

  generate_perks: (ctx) =>
    `You work for Bali Interns. Generate 3 concrete perks IN ENGLISH for: "${ctx.title ?? ''}".
Company: ${ctx.company_name ?? ''}. Ex: "Housing arranged", "Ocean view", "International team".
Reply with EXACTLY 3 perks, one per line, no bullets.`,

  generate_slug: (ctx) =>
    `Generate an SEO slug (lowercase, hyphens) for: "${ctx.title ?? ''}".
Duration: ${ctx.duration ?? ''}. Department: ${ctx.department ?? ''}. Max 60 characters.
Ex: "social-media-manager-bali-4months". Reply ONLY with the slug.`,

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
            model: 'claude-haiku-4-5-20251001',
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }],
          }),
        })
        if (res.ok) {
          const data = await res.json() as { content: Array<{ type: string; text: string }> }
          const text = data.content?.find(c => c.type === 'text')?.text?.trim() ?? ''
          console.log('[ai-assist] Anthropic OK, text length:', text.length)
          if (text) return NextResponse.json({ result: text })
          console.warn('[ai-assist] Anthropic OK but empty text')
        } else {
          const errText = await res.text()
          const errJson = JSON.parse(errText) as { error?: { type?: string; message?: string } }
          const msg = errJson?.error?.message ?? errText
          console.warn('[ai-assist] Anthropic failed:', res.status, msg.slice(0, 200))
          // Crédit épuisé — retourner erreur explicite immédiatement
          if (res.status === 400 && msg.includes('credit balance')) {
            return NextResponse.json({ error: 'Crédit Anthropic épuisé — recharger sur console.anthropic.com/settings/billing', code: 'BILLING' }, { status: 402 })
          }
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
