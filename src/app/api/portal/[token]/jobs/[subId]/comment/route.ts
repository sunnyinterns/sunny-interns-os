import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendInternCommentNotification } from '@/lib/email/resend'

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
  const body = await request.json() as { comment?: string }

  if (!body.comment?.trim()) {
    return NextResponse.json({ error: 'Comment required' }, { status: 400 })
  }

  const admin = getAdmin()

  // Validate token
  const { data: caseRow } = await admin
    .from('cases')
    .select('id, interns(first_name, last_name, email)')
    .eq('portal_token', token)
    .single()

  if (!caseRow) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const caseId = (caseRow as Record<string, unknown>).id as string
  const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; last_name?: string; email?: string } | null

  // Update job_submission
  await admin
    .from('job_submissions')
    .update({
      intern_comment: body.comment,
      intern_comment_at: new Date().toISOString(),
    })
    .eq('id', subId)
    .eq('case_id', caseId)

  // Get job title for activity log
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
    type: 'intern_comment',
    title: `Commentaire étudiant sur ${jobTitle}`,
    description: body.comment.slice(0, 200),
    priority: 'normal',
    status: 'done',
    source: 'portal',
    metadata: { sub_id: subId, comment: body.comment },
  })

  // Notify manager
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'
  void sendInternCommentNotification({
    managerEmail: 'charly@bali-interns.com',
    prenom: intern?.first_name ?? 'Stagiaire',
    nom: intern?.last_name ?? '',
    jobTitle,
    comment: body.comment,
    caseUrl: `${appUrl}/fr/cases/${caseId}`,
    interested: null,
  })

  return NextResponse.json({ success: true })
}
