import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const filter = url.searchParams.get('filter') // all | mine | pending | high
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100)

  // Get user role for filtering
  const { data: appUser } = await supabase
    .from('app_users')
    .select('role, full_name')
    .eq('email', user.email!)
    .single()

  const role = appUser?.role || 'account_manager'

  let query = supabase
    .from('activity_feed')
    .select('*, cases(id, intern_id, assigned_manager_name, interns(first_name, last_name))')
    .or('snoozed_until.is.null,snoozed_until.lt.' + new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  // Account manager: only their cases
  if (role === 'account_manager' && appUser?.full_name) {
    query = query.eq('cases.assigned_manager_name', appUser.full_name)
  }

  // Filters
  if (filter === 'mine' && appUser?.full_name) {
    query = query.eq('assigned_to', appUser.full_name)
  } else if (filter === 'pending') {
    query = query.neq('status', 'done')
  } else if (filter === 'high') {
    query = query.eq('priority', 'high')
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Format items
  const items = (data ?? []).map(item => {
    const caseData = item.cases as { id: string; assigned_manager_name: string; interns: { first_name: string; last_name: string } | null } | null
    return {
      id: item.id,
      type: item.type,
      message: item.message,
      priority: item.priority || 'normal',
      status: item.status || 'pending',
      assigned_to: item.assigned_to || caseData?.assigned_manager_name || null,
      case_id: item.case_id,
      intern_name: caseData?.interns ? `${caseData.interns.first_name} ${caseData.interns.last_name}` : null,
      action_url: item.case_id ? `/fr/cases/${item.case_id}` : null,
      snoozed_until: item.snoozed_until,
      created_at: item.created_at,
    }
  })

  return NextResponse.json(items)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { id: string; status?: string; snoozed_until?: string }
  if (!body.id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = body.status
  if (body.snoozed_until) updates.snoozed_until = body.snoozed_until

  const { data, error } = await supabase
    .from('activity_feed')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
