import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const body = await req.json() as { outcome: string; recontact_month?: string; notes?: string }
  const { outcome, recontact_month, notes } = body

  const casePatch: Record<string, unknown> = { status: outcome }
  if (recontact_month) casePatch.recontact_month = recontact_month
  if (notes) casePatch.recontact_reason = notes

  const { error: caseErr } = await sb.from('cases').update(casePatch).eq('id', caseId)
  if (caseErr) return NextResponse.json({ error: caseErr.message }, { status: 500 })

  if (outcome === 'to_recontact' && recontact_month) {
    const { data: caseData } = await sb
      .from('cases')
      .select('interns(first_name, last_name)')
      .eq('id', caseId)
      .single()
    const intern = (caseData?.interns as { first_name?: string; last_name?: string } | null)
    const internName = intern ? `${intern.first_name ?? ''} ${intern.last_name ?? ''}`.trim() : 'Candidat'
    const [year, month] = recontact_month.split('-').map(Number)
    const alertDate = new Date(year, month - 1, 1, 9, 0, 0).toISOString()

    await sb.from('admin_notifications').insert({
      type: 'todo',
      title: `📅 Relancer ${internName}`,
      message: `${internName} était à recontacter en ${new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}. Envoyer un message de relance.`,
      case_id: caseId,
      action_url: `/fr/cases/${caseId}`,
      scheduled_for: alertDate,
      is_read: false,
    })
  }

  try {
    await sb.from('case_logs').insert({
      case_id: caseId,
      event_type: 'status_change',
      description: `Débrief entretien — issue : ${outcome}${recontact_month ? ` · relance : ${recontact_month}` : ''}${notes ? ` · notes : ${notes.slice(0, 100)}` : ''}`,
      created_by: user.id,
    })
  } catch { /* case_logs non bloquant */ }

  return NextResponse.json({ success: true, outcome, recontact_month })
}
