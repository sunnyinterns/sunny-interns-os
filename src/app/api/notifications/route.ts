import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const unreadCount = (data ?? []).filter((n: { is_read: boolean }) => !n.is_read).length
    return NextResponse.json({ notifications: data ?? [], unread_count: unreadCount })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
