import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Récupérer l'intern_id du case
  const { data: caseRow } = await admin.from('cases').select('intern_id').eq('id', id).single()
  if (!caseRow?.intern_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Strip read-only fields
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => !['id', 'created_at'].includes(k))
  )

  const { data, error } = await admin
    .from('interns')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', caseRow.intern_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
