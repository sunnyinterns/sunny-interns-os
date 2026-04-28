import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendInternCommentNotification } from '@/lib/email/resend'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'cron'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const in45 = new Date(); in45.setDate(in45.getDate() + 45)
  const in40 = new Date(); in40.setDate(in40.getDate() + 40)

  const { data: cases } = await supabase
    .from('cases')
    .select('id, actual_end_date, interns(first_name, last_name)')
    .in('status', ['active'])
    .gte('actual_end_date', in40.toISOString().split('T')[0])
    .lte('actual_end_date', in45.toISOString().split('T')[0])

  if ((cases?.length ?? 0) === 0) return NextResponse.json({ checked: 0 })

  const list = (cases ?? []).map(c => {
    const i = c.interns as { first_name?: string; last_name?: string } | null
    return `${i?.first_name ?? ''} ${i?.last_name ?? ''} — end: ${c.actual_end_date}`
  }).join('\n')

  try {
    // Internal notification — no template needed (sent to Charly only)
    await sendInternCommentNotification({
      prenom: 'Bali Interns OS',
      nom: '',
      comment: `⚠️ ${cases!.length} intern(s) ending in ~45 days:\n${list}\n\nConsider re-staffing outreach.`,
      caseId: undefined,
    })
  } catch (e) {
    console.error('[CRON J-45] notification error:', e)
  }

  return NextResponse.json({ checked: cases?.length ?? 0 })
}
