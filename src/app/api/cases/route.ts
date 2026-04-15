import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { CaseStatus } from '@/lib/types'
import { getDaysUntil } from '@/lib/retroplanning'
import { sendNewLeadInternal } from '@/lib/email/resend'
import { logActivity } from '@/lib/activity-logger'

// ─── Kanban types ────────────────────────────────────────────────────────────

export interface KanbanCase {
  id: string
  firstName: string
  lastName: string
  status: CaseStatus
  arrivalDate: string | null
  desired_start_date?: string | null
  actual_start_date?: string | null
  actual_end_date?: string | null
  daysUntil: number | null
  isCritical: boolean
  assignedTo: string | null
  assigned_manager_name?: string | null
  internshipType: string | null
  passportExpiry?: string | null
  passport_expiry?: string | null
  billet_avion?: boolean | null
  papiers_visas?: boolean | null
  visa_recu?: boolean | null
  convention_signee_check?: boolean | null
  chauffeur_reserve?: boolean | null
}

const FUNNEL_STATUSES: { status: CaseStatus; label: string }[] = [
  { status: 'lead', label: 'Lead' },
  { status: 'rdv_booked', label: 'RDV planifié' },
  { status: 'qualification_done', label: 'Qualifié' },
  { status: 'job_submitted', label: 'CV envoyé' },
  { status: 'job_retained', label: 'CV retenu' },
  { status: 'convention_signed', label: 'Convention signée' },
  { status: 'payment_pending', label: 'Paiement en attente' },
  { status: 'payment_received', label: 'Paiement reçu' },
  { status: 'visa_in_progress', label: 'Visa en cours' },
  { status: 'visa_received', label: 'Visa reçu' },
  { status: 'arrival_prep', label: 'Arrivée prévue' },
  { status: 'active', label: 'En stage' },
  { status: 'alumni', label: 'Alumni' },
]

// ─── Zod schema for case creation ────────────────────────────────────────────

const createCaseSchema = z.object({
  // Step 1 — Identité
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  birth_date: z.string().optional(),
  passport_number: z.string().optional(),
  passport_expiry: z.string().optional(),
  // Step 2 — Profil
  internship_type: z.string().optional(),
  duration_months: z.number().optional(),
  notes: z.string().optional(),
  // Step 3 — Projet
  start_date: z.string().optional(),
  dropoff_address: z.string().optional(),
  main_desired_job: z.string().optional(),
  school_name: z.string().optional(),
})

// ─── GET /api/cases ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type')
  const CANDIDATE_STATUSES = ['lead', 'rdv_booked', 'qualification_done', 'job_submitted', 'job_retained']
  const CLIENT_STATUSES_LIST = ['convention_signed', 'payment_pending', 'payment_received', 'visa_docs_sent', 'visa_submitted', 'visa_in_progress', 'visa_received', 'arrival_prep', 'active', 'alumni', 'completed']
  const view = searchParams.get('view')
  const assignedTo = searchParams.get('assigned_to')
  const month = searchParams.get('month') // YYYY-MM
  const email = searchParams.get('email')
  const statusFilter = searchParams.get('status')
  const statusesParam = searchParams.get('statuses')

  // Email duplicate check
  if (email) {
    try {
      const { data } = await supabase
        .from('interns')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      return NextResponse.json({ exists: !!data })
    } catch {
      return NextResponse.json({ exists: false })
    }
  }

  try {
    let query = supabase
      .from('cases')
      .select(`
        id, status, desired_start_date, actual_start_date, actual_end_date,
        created_at, updated_at, assigned_manager_name, desired_duration_months,
        billet_avion, papiers_visas, visa_recu,
        convention_signee_check, chauffeur_reserve,
        portal_token, intern_first_meeting_date, google_meet_link,
        package_id, payment_amount, payment_date,
        interns(first_name, last_name, email, nationality, nationalities, school_country, main_desired_job, cv_url, whatsapp, spoken_languages, birth_date, linkedin_url, avatar_url, passport_expiry),
        schools(name),
        packages(name, price_eur)
      `)
      .order('created_at', { ascending: false })
  if (typeFilter === 'candidate') query = query.in('status', CANDIDATE_STATUSES)
  else if (typeFilter === 'client') query = query.in('status', CLIENT_STATUSES_LIST)

    // Filter by specific status(es) or exclude terminated statuses by default
    if (statusesParam) {
      const list = statusesParam.split(',').map(s => s.trim()).filter(Boolean)
      if (list.length > 0) query = query.in('status', list)
    } else if (statusFilter) {
      query = query.eq('status', statusFilter)
    } else if (view !== 'all') {
      query = query.not('status', 'in', '(alumni,not_interested,no_job_found,lost)')
    }

    if (assignedTo) query = query.eq('assigned_manager_name', assignedTo)
    if (month) {
      const start = `${month}-01`
      const end = `${month}-31`
      query = query.gte('desired_start_date', start).lte('desired_start_date', end)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (view !== 'kanban') {
      return NextResponse.json(data ?? [])
    }

    // Build Kanban columns
    const columnMap = new Map<CaseStatus, KanbanCase[]>(
      FUNNEL_STATUSES.map(({ status }) => [status, []])
    )

    for (const c of data ?? []) {
      const col = columnMap.get(c.status as CaseStatus)
      if (!col) continue // dead-end statuses (not_interested, etc.)

      const intern = c.interns as {first_name?: string; last_name?: string; passport_expiry?: string} | null
      const startDate = c.actual_start_date || c.desired_start_date
      const daysUntil = startDate ? getDaysUntil(new Date(startDate)) : null
      col.push({
        id: c.id,
        firstName: intern?.first_name ?? '',
        lastName: intern?.last_name ?? '',
        status: c.status as CaseStatus,
        arrivalDate: startDate ?? null,
        desired_start_date: c.desired_start_date ?? null,
        actual_start_date: c.actual_start_date ?? null,
        actual_end_date: c.actual_end_date ?? null,
        daysUntil,
        isCritical: daysUntil !== null && daysUntil <= 7,
        assignedTo: c.assigned_manager_name ?? null,
        assigned_manager_name: c.assigned_manager_name ?? null,
        internshipType: null,
        passportExpiry: intern?.passport_expiry ?? null,
        passport_expiry: intern?.passport_expiry ?? null,
        billet_avion: c.billet_avion,
        papiers_visas: c.papiers_visas,
        visa_recu: c.visa_recu,
        convention_signee_check: c.convention_signee_check,
        chauffeur_reserve: c.chauffeur_reserve,
      })
    }

    const columns = FUNNEL_STATUSES.map(({ status, label }) => ({
      status,
      label,
      cases: columnMap.get(status) ?? [],
    }))

    return NextResponse.json(columns)
  } catch {
    return NextResponse.json(view === 'kanban' ? [] : [])
  }
}

// ─── POST /api/cases ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createCaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const {
    first_name,
    last_name,
    email,
    phone,
    nationality,
    birth_date,
    passport_number,
    passport_expiry,
    internship_type,
    notes,
    start_date,
    dropoff_address,
    main_desired_job,
    school_name,
  } = parsed.data

  // Passport 6-month check: expiry must be at least 6 months after arrival_date
  if (passport_expiry && start_date) {
    const arrivalDate = new Date(start_date)
    const expiryDate = new Date(passport_expiry)
    const sixMonthsAfterArrival = new Date(arrivalDate)
    sixMonthsAfterArrival.setMonth(sixMonthsAfterArrival.getMonth() + 6)
    if (expiryDate < sixMonthsAfterArrival) {
      return NextResponse.json(
        { error: 'Passeport invalide: doit être valide au moins 6 mois après l\'arrivée' },
        { status: 422 }
      )
    }
  }

  try {
    // 1. Check email uniqueness
    const { data: existing } = await supabase
      .from('interns')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })

    // 2. Create intern
    const { data: intern, error: internError } = await supabase
      .from('interns')
      .insert({
        first_name,
        last_name,
        email,
        whatsapp: phone ?? null,
        nationality,
        birth_date,
        passport_number,
        passport_expiry,
        ...(main_desired_job ? { main_desired_job } : {}),
      })
      .select()
      .single()

    if (internError) return NextResponse.json({ error: internError.message }, { status: 500 })

    // 3. Create case
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        intern_id: intern.id,
        destination_id: 'fc9ece85-e5d5-41d2-9142-79054244bbce',
        status: 'rdv_booked',
        desired_start_date: start_date ?? null,
        case_type: internship_type ?? null,
        qualification_notes: notes ?? null,
        assigned_manager_name: user.id,
      })
      .select()
      .single()

    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })

    // 4. Log activity
    await logActivity({
      caseId: newCase.id,
      type: 'case_created',
      title: `Nouveau dossier créé — ${first_name} ${last_name}`,
      description: `Candidature reçue de ${first_name} ${last_name} (${school_name ?? 'École non renseignée'})`,
      source: 'candidature',
    })

    // 5. Email interne Charly
    void sendNewLeadInternal({
      firstName: first_name,
      lastName: last_name,
      email,
      startDate: start_date ? new Date(start_date).toLocaleDateString('fr-FR') : null,
      passportExpiry: passport_expiry ?? null,
      startDateValue: start_date ?? null,
      caseId: newCase.id,
    })

    return NextResponse.json({ ...newCase, intern_id: intern.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
