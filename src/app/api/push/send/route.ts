import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendPushToAll } from '@/lib/push-notifications'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin/superuser
  const { data: appUser } = await supabase
    .from('app_users')
    .select('role')
    .eq('email', user.email!)
    .single()

  if (!appUser || !['admin', 'superuser'].includes(appUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as { title: string; body: string; url?: string }
  if (!body.title || !body.body) {
    return NextResponse.json({ error: 'title et body requis' }, { status: 400 })
  }

  await sendPushToAll({ title: body.title, body: body.body, url: body.url })
  return NextResponse.json({ ok: true })
}
