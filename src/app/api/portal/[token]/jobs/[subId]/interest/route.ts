import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string; subId: string }> }
) {
  const { token, subId } = await params
  const body = await request.json() as { interested?: boolean }

  if (typeof body.interested !== 'boolean') {
    return NextResponse.json({ error: 'interested (boolean) required' }, { status: 400 })
  }

  const admin = getAdmin()

  // Validate token
  const { data: caseRow } = await admin
    .from('cases')
    .select('id, interns(first_name, last_name)')
    .eq('portal_token', token)
    .single()

  if (!caseRow) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const caseId = (caseRow as Record<string, unknown>).id as string
  const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; last_name?: string } | null

  // Update job_submission
  await admin
    .from('job_submissions')
    .update({ intern_interested: body.interested })
    .eq('id', subId)
    .eq('case_id', caseId)

  // Get job title
  const { data: subData } = await admin
    .from('job_submissions')
    .select('jobs(title, public_title)')
    .eq('id', subId)
    .single()

  const job = (subData as Record<string, unknown>)?.jobs as { title?: string; public_title?: string } | null
  const jobTitle = job?.public_title ?? job?.title ?? 'offre'

  // Log activity
  await admin.from('activity_feed').insert({
    case_id: caseId,
    type: 'intern_interest',
    title: `${intern?.first_name ?? 'Étudiant'} ${body.interested ? 'est intéressé par' : 'n\'est pas intéressé par'} ${jobTitle}`,
    description: `Intérêt : ${body.interested ? 'Oui' : 'Non'}`,
    priority: 'normal',
    status: 'done',
    source: 'portal',
    metadata: { sub_id: subId, interested: body.interested },
  })

  return NextResponse.json({ success: true })
}
