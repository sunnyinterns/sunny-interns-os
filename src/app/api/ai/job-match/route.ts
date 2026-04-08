import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface JobMatchResult {
  job_id: string
  score: number
  reason: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { case_id } = await request.json() as { case_id: string }
  if (!case_id) return NextResponse.json({ error: 'case_id requis' }, { status: 400 })

  // Fetch case + intern profile
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('*, interns(*)')
    .eq('id', case_id)
    .single()

  if (caseError || !caseData) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

  const intern = caseData.interns as Record<string, unknown> | null

  // Fetch open jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, public_title, public_description, description, department, job_departments(name)')
    .eq('status', 'open')
    .limit(50)

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ results: [], message: 'Aucune offre ouverte disponible' })
  }

  const internProfile = `
Prénom: ${String(intern?.first_name ?? '')}
Métier souhaité: ${String(intern?.main_desired_job ?? 'Non précisé')}
Langues: ${Array.isArray(intern?.spoken_languages) ? (intern.spoken_languages as string[]).join(', ') : 'Non précisées'}
Stage idéal: ${String(intern?.stage_ideal ?? String(caseData.notes ?? 'Non précisé'))}
Niveau: ${String(intern?.intern_level ?? 'Non précisé')}
LinkedIn: ${String(intern?.linkedin_url ?? 'Non fourni')}
`

  const jobsList = jobs.map((j) => ({
    id: j.id,
    title: j.public_title ?? j.title,
    description: j.public_description ?? j.description ?? '',
    sector: (j.job_departments as unknown as { name: string } | null)?.name ?? (j.department as string | null | undefined) ?? '',
  }))

  const prompt = `Tu es un expert en placement de stagiaires à Bali.

Voici le profil du candidat:
${internProfile}

Voici la liste des offres de stage disponibles:
${JSON.stringify(jobsList, null, 2)}

Classe les 5 offres les plus pertinentes pour ce profil. Sois précis et personnalisé dans les explications.
Retourne uniquement un JSON valide (tableau), sans aucun texte avant ou après:
[{"job_id": "uuid", "score": 95, "reason": "Explication courte et personnalisée en français (max 2 phrases)"}]`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Format JSON invalide')

    const results: JobMatchResult[] = JSON.parse(jsonMatch[0]) as JobMatchResult[]

    // Enrich with job titles
    const enriched = results.map((r) => {
      const job = jobs.find((j) => j.id === r.job_id)
      return {
        ...r,
        title: job?.public_title ?? job?.title ?? 'Offre sans titre',
        sector: (job?.job_departments as unknown as { name: string } | null)?.name ?? (job?.department as string | null | undefined) ?? null,
      }
    })

    return NextResponse.json({ results: enriched })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
