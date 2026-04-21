import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = getAdmin()

  const body = await request.json() as {
    agent_status?: string
    comments?: string
    received_at?: string
  }

  const { data: access } = await supabase
    .from('visa_agent_portal_access')
    .select('id')
    .eq('token', token)
    .maybeSingle()

  if (!access) {
    return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })
  }

  const update: Record<string, unknown> = {}
  if (body.agent_status !== undefined) update.agent_status = body.agent_status
  if (body.comments !== undefined) update.comments = body.comments
  if (body.received_at !== undefined) update.received_at = body.received_at

  if (Object.keys(update).length) {
    await supabase
      .from('visa_agent_portal_access')
      .update(update)
      .eq('id', access.id)
  }

  return NextResponse.json({ success: true })
}
