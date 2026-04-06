import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { caseId } = await params
  try {
    const body = await request.json() as {
      type: string
      status: string
      url?: string
      rejection_reason?: string
    }

    // Upsert document record
    const { data, error } = await supabase
      .from('visa_tracking')
      .upsert({
        case_id: caseId,
        document_type: body.type,
        status: body.status,
        document_url: body.url ?? null,
        rejection_reason: body.rejection_reason ?? null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'case_id,document_type' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
