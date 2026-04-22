import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')
    let query = supabase
      .from('contacts')
      .select(`
        id, company_id, first_name, last_name, job_title, email, whatsapp,
        nationality, is_primary, created_at, linkedin_url, phone, notes,
        temperature, last_contacted_at, is_legal_signatory, signatory_title,
        companies!contacts_company_id_fkey(id, name, logo_url)
      `)
      .order('first_name')

    if (companyId) query = query.eq('company_id', companyId)
    const unlinked = searchParams.get('unlinked')
    const excludeLeft = searchParams.get('exclude_left')
    // left_company column does not exist — filter removed to avoid query crash
    void excludeLeft
    if (unlinked === 'true') query = query.is('company_id', null)

    const { data, error } = await query
    if (error) {
      console.log('[CONTACTS_GET_500]', error.message, error.details ?? '', error.hint ?? '')
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (err) {
    const msg = err instanceof Error ? err.message + '\n' + (err.stack ?? '') : String(err)
    console.log('[CONTACTS_GET_500]', msg)
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Internal error', detail: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as Record<string, unknown>
    const { data, error } = await supabase
      .from('contacts')
      .insert(body)
      .select('*, companies!company_id(id, name)')
      .single()

    if (error) {
      console.log('[CONTACTS_POST_500]', error.message, error.details ?? '', error.hint ?? '')
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message + '\n' + (err.stack ?? '') : String(err)
    console.log('[CONTACTS_POST_500]', msg)
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Internal error', detail: msg }, { status: 500 })
  }
}
