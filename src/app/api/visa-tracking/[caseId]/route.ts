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
      .from('visa_tracking')
      .select('id, document_type, status, document_url, rejection_reason')
      .eq('case_id', caseId)
    if (error) throw error

    // Map to VisaDocument shape
    const docs = (data ?? []).map((row) => ({
      id: row.id,
      type: row.document_type,
      status: row.status,
      url: row.document_url ?? undefined,
      rejection_reason: row.rejection_reason ?? undefined,
    }))

    return NextResponse.json(docs)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
