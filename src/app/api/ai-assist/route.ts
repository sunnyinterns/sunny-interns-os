import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PROMPTS: Record<string, (ctx: Record<string, string>) => string> = {
  generate_public_title: (ctx) =>
    `Tu travailles pour Bali Interns, une agence de placement de stagiaires à Bali.
Génère UN titre d'offre de stage accrocheur et professionnel en français pour ce poste: "${ctx.title ?? ''}".
Entreprise: ${ctx.company_name ?? 'non précisée'}. Département: ${ctx.department ?? 'non précisé'}.
Le titre doit être court (max 8 mots), vendeur, et mentionner Bali si pertinent.
Réponds UNIQUEMENT avec le titre, sans guillemets ni explication.`,

  generate_description: (ctx) =>
    `Tu travailles pour Bali Interns à Bali, Indonésie.
Rédige une description interne de 3-4 phrases pour cette offre de stage: "${ctx.title ?? ''}".
Entreprise: ${ctx.company_name ?? ''}. Missions: ${ctx.missions ?? ''}.
Profil: ${ctx.profile_sought ?? ''}. Outils: ${ctx.tools ?? ''}.
Ton professionnel et direct. Réponds uniquement avec la description.`,

  generate_public_description: (ctx) =>
    `Tu travailles pour Bali Interns. Rédige une description publique attractive (visible par les candidats)
pour ce stage à Bali: "${ctx.public_title ?? ctx.title ?? ''}".
Entreprise type: ${ctx.company_type ?? 'entreprise locale'}.
Missions: ${(ctx.missions ?? '').split(',').slice(0,3).join(', ')}.
Outils utilisés: ${ctx.tools ?? ''}.
Max 5 phrases. Ton enthousiaste et inspirant. Mentionne l'expérience Bali.
Réponds uniquement avec la description.`,

  generate_profile: (ctx) =>
    `Rédige un profil recherché pour un stagiaire pour ce poste: "${ctx.title ?? ''}".
Département: ${ctx.department ?? ''}. Niveau: ${ctx.required_level ?? 'Bac+3'}.
Outils requis: ${ctx.tools ?? ''}. Langues: ${ctx.languages ?? 'FR, EN'}.
2-3 phrases max. Direct et précis. Réponds uniquement avec le profil.`,

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
