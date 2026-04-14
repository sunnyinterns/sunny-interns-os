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
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, ...ctx } = await request.json() as { action: string } & Record<string, string>

  const promptFn = PROMPTS[action]
  if (!promptFn) return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY manquante' }, { status: 500 })

  const prompt = promptFn(ctx)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: 'Erreur API Claude', details: err }, { status: 500 })
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  const text = data.content.find(c => c.type === 'text')?.text?.trim() ?? ''

  return NextResponse.json({ result: text })
}
