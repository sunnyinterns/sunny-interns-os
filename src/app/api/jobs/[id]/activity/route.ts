import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string | null
  created_at: string
  source: string
}

/**
 * Activité d'un job — agrège trois sources (la table activity_feed n'a pas de job_id) :
 *   • job_submissions (propositions de candidats, changements de statut)
 *   • content_posts (posts générés par l'IA)
 *   • content_publications (publications programmées / envoyées)
 * Retourne un tableau trié desc par date.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const items: ActivityItem[] = []

  try {
    const [subsRes, postsRes, pubsRes] = await Promise.all([
      supabase
        .from('job_submissions')
        .select('id, status, created_at, updated_at, cases(interns(first_name, last_name))')
        .eq('job_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('content_posts')
        .select('id, platform, status, created_at')
        .eq('job_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('content_publications')
        .select('id, platform, status, scheduled_for, created_at')
        .eq('job_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    type SubRow = {
      id: string; status: string; created_at: string
      cases?: { interns?: { first_name?: string | null; last_name?: string | null } | null } | null
    }
    ;((subsRes.data ?? []) as unknown as SubRow[]).forEach(s => {
      const internName = s.cases?.interns
        ? `${s.cases.interns.first_name ?? ''} ${s.cases.interns.last_name ?? ''}`.trim()
        : 'Candidat'
      items.push({
        id: `sub_${s.id}`,
        type: `submission_${s.status}`,
        title: `👤 ${internName} — ${s.status}`,
        description: null,
        created_at: s.created_at,
        source: 'submissions',
      })
    })

    type PostRow = { id: string; platform: string; status: string; created_at: string }
    ;((postsRes.data ?? []) as PostRow[]).forEach(p => {
      items.push({
        id: `post_${p.id}`,
        type: `post_${p.status}`,
        title: `✍️ Post ${p.platform} généré (${p.status})`,
        description: null,
        created_at: p.created_at,
        source: 'posts',
      })
    })

    type PubRow = { id: string; platform: string; status: string; scheduled_for: string | null; created_at: string }
    ;((pubsRes.data ?? []) as PubRow[]).forEach(p => {
      const when = p.scheduled_for ? ` — programmé le ${new Date(p.scheduled_for).toLocaleDateString('fr-FR')}` : ''
      items.push({
        id: `pub_${p.id}`,
        type: `publication_${p.status}`,
        title: `📅 Publication ${p.platform} (${p.status})${when}`,
        description: null,
        created_at: p.created_at,
        source: 'publications',
      })
    })

    items.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return NextResponse.json(items)
  } catch (err) {
    console.error('[jobs/activity] error', err)
    return NextResponse.json([])
  }
}
