import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { caseId } = await params
  try {
    const { data, error } = await supabase
      .from('billing')
      .select('*, billing_entities(id, name, is_active, is_default)')
      .eq('case_id', caseId)
      .maybeSingle()
    if (error) throw error
    return NextResponse.json(data ?? null)
  } catch {
    return NextResponse.json(null)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { caseId } = await params
  try {
    const body = await request.json() as Record<string, unknown>
    // Upsert billing record
    const { data, error } = await supabase
      .from('billing')
      .upsert({ ...body, case_id: caseId, updated_at: new Date().toISOString() }, { onConflict: 'case_id' })
      .select()
      .single()
    if (error) throw error

    if (body.paid_at) {
      // Trigger invoice generation ONLY after payment confirmed
      console.log('[PDF] Generating invoice for case', caseId, { amount: body.amount_ttc, entity: body.billing_entity_id })
      // Update case status to payment_received
      await supabase.from('cases').update({ status: 'payment_received', updated_at: new Date().toISOString() }).eq('id', caseId)
    }

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
