import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    // Try to list users via admin API (requires service role)
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) throw error
    return NextResponse.json(data.users.map((u) => ({
      id: u.id,
      email: u.email,
      role: (u.user_metadata as Record<string, unknown>)?.role ?? 'viewer',
      created_at: u.created_at,
    })))
  } catch {
    // Fallback: return current user only
    return NextResponse.json([{ id: user.id, email: user.email, role: 'admin' }])
  }
}
