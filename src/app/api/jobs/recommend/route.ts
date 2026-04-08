import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { case_id } = await request.json() as { case_id: string }

    // Fetch intern profile
    const { data: caseData } = await supabase
      .from('cases')
      .select('*, interns(*)')
      .eq('id', case_id)
      .single()

    // Fetch open jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title, public_title, description, department, missions, wished_start_date, wished_end_date, wished_duration_months, companies(name)')
      .eq('status', 'open')
      .limit(20)

    const intern = caseData?.interns as Record<string, string> | null
    const jobsList = (jobs ?? []).map((j: Record<string, unknown>, i: number) =>
      `${i + 1}. [${j.id}] ${j.title} chez ${(j.companies as Record<string, unknown>)?.name ?? 'N/A'} — ${j.department ?? ''}`
    ).join('\n')

    const prompt = `Tu es un expert en matching stagiaires/entreprises pour Sunny Interns.

Profil stagiaire:
- Nom: ${intern?.first_name ?? ''} ${intern?.last_name ?? ''}
- École: ${intern?.school ?? 'Non précisé'}
- Secteurs souhaités: ${(caseData as Record<string, unknown>)?.sectors ?? 'Non précisé'}
- Durée: ${(caseData as Record<string, unknown>)?.duration_weeks ?? '?'} semaines
- Niveau: ${intern?.education_level ?? 'Non précisé'}
- Notes: ${(caseData as Record<string, unknown>)?.notes ?? ''}

Jobs disponibles:
${jobsList || 'Aucun job disponible'}

Retourne EXACTEMENT ce JSON (rien d'autre):
{
  "recommendations": [
    {"job_id": "uuid", "score": 85, "reason": "Explication courte en français (1-2 phrases)"},
    ...
  ]
}

Maximum 5 recommandations, triées par score décroissant. Score entre 0 et 100.`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const result = JSON.parse(text) as { recommendations: Array<{ job_id: string; score: number; reason: string }> }

    // Enrich with job details
    const enriched = (result.recommendations ?? []).map((rec) => {
      const job = (jobs ?? []).find((j: Record<string, unknown>) => j.id === rec.job_id)
      return { ...rec, job }
    })

    return NextResponse.json({ recommendations: enriched })
  } catch (e) {
    return NextResponse.json({ error: String(e), recommendations: [] }, { status: 500 })
  }
}
