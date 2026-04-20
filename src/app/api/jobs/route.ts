import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const departmentId = searchParams.get('department_id')
    const view = searchParams.get('view')
    const parentId = searchParams.get('parent_id')

    let query = supabase
      .from('jobs')
      .select(`
        id, title, public_title, status, location, wished_duration_months,
        description, created_at, updated_at, company_id,
        public_hook, public_vibe, public_perks, public_hashtags,
        seo_slug, is_public, cv_drop_enabled, cover_image_url,
        companies(id, name, logo_url, website),
        contacts!jobs_contact_id_fkey(id, first_name, last_name, email, whatsapp, job_title)
      `)
      .order('created_at', { ascending: false })

    if (view === 'soon') {
      const in60 = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0]
      query = query.eq('status', 'staffed').not('actual_end_date', 'is', null).lte('actual_end_date', in60)
    } else {
      if (status && status !== 'all') query = query.eq('status', status)
    }
    if (departmentId) query = query.eq('job_department_id', departmentId)
    if (parentId) query = query.or(`parent_job_id.eq.${parentId},id.eq.${parentId}`)

    const { data, error } = await query
    if (error) {
      console.log('[JOBS_GET_500]', error.message, error.details ?? '', error.hint ?? '')
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
    }

    const jobs = (data ?? []).map(j => ({
      ...j,
      submissions_count: 0,
      company_name: (j.companies as unknown as { name: string } | null)?.name ?? null,
      contact_name: j.contacts ? `${(j.contacts as unknown as { first_name: string; last_name: string | null }).first_name} ${(j.contacts as unknown as { first_name: string; last_name: string | null }).last_name ?? ''}`.trim() : null,
      department_name: null,
    }))

    return NextResponse.json(jobs)
  } catch (err) {
    const msg = err instanceof Error ? err.message + '\n' + (err.stack ?? '') : String(err)
    console.log('[JOBS_GET_500]', msg)
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

    // Auto-fill company_id from contact if not provided
    if (body.contact_id && !body.company_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('company_id')
        .eq('id', body.contact_id as string)
        .single()
      if (contact?.company_id) body.company_id = contact.company_id
    }

    const safeBody: Record<string, unknown> = {
      ...body,
      wished_duration_months: body.wished_duration_months ? Number(body.wished_duration_months) : null,
      max_candidates: body.max_candidates ? Number(body.max_candidates) : 1,
      is_recurring: Boolean(body.is_recurring ?? false),
      required_languages: Array.isArray(body.required_languages) ? body.required_languages : [],
      missions: Array.isArray(body.missions) ? body.missions : [],
      tools_required: Array.isArray(body.tools_required) ? body.tools_required : [],
      skills_required: Array.isArray(body.skills_required) ? body.skills_required : [],
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert(safeBody)
      .select('*, companies(id, name), contacts(id, first_name, last_name)')
      .single()

    if (error) {
      console.log('[JOBS_POST_500]', error.message, error.details ?? '', error.hint ?? '')
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message + '\n' + (err.stack ?? '') : String(err)
    console.log('[JOBS_POST_500]', msg)
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Internal error', detail: msg }, { status: 500 })
  }
}
