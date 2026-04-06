import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { CaseStatus } from '@/lib/types'
import { getDaysUntil } from '@/lib/retroplanning'
import { sendNewLeadInternal } from '@/lib/email/resend'

// ─── Kanban types ────────────────────────────────────────────────────────────

export interface KanbanCase {
  id: string
  firstName: string
  lastName: string
  status: CaseStatus
  arrivalDate: string | null
  daysUntil: number | null
  isCritical: boolean
  assignedTo: string | null
  destination: string | null
  internshipType: string | null
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
  notes: z.string().optional(),
  // Step 3 — Destination
  start_date: z.string().optional(),
  destination: z.string().optional(),
  dropoff_address: z.string().optional(),
})

// ─── GET /api/cases ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')
  const assignedTo = searchParams.get('assigned_to')
  const destination = searchParams.get('destination')
  const month = searchParams.get('month') // YYYY-MM
  const email = searchParams.get('email')

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
      .select('id, first_name, last_name, status, arrival_date, return_date, destination, assigned_to, created_at, internship_type')
      .order('arrival_date', { ascending: true })

    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    if (destination) query = query.ilike('destination', `%${destination}%`)
    if (month) {
      const start = `${month}-01`
      const end = `${month}-31`
      query = query.gte('arrival_date', start).lte('arrival_date', end)
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

      const daysUntil = c.arrival_date ? getDaysUntil(new Date(c.arrival_date)) : null
      col.push({
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        status: c.status as CaseStatus,
        arrivalDate: c.arrival_date ?? null,
        daysUntil,
        isCritical: daysUntil !== null && daysUntil <= 7,
        assignedTo: c.assigned_to ?? null,
        destination: c.destination ?? null,
        internshipType: (c as Record<string, unknown>).internship_type as string | null ?? null,
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
    destination,
    dropoff_address,
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
        phone,
        nationality,
        birth_date,
        passport_number,
        passport_expiry,
      })
      .select()
      .single()

    if (internError) return NextResponse.json({ error: internError.message }, { status: 500 })

    // 3. Create case
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        intern_id: intern.id,
        status: 'lead',
        arrival_date: start_date ?? null,
        destination: destination ?? null,
        dropoff_address: dropoff_address ?? null,
        internship_type: internship_type ?? null,
        notes: notes ?? null,
        assigned_to: user.id,
      })
      .select()
      .single()

    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 500 })

    // 4. Log activity
    try {
      await supabase.from('activity_feed').insert({
        case_id: newCase.id,
        action_type: 'case_created',
        description: `Dossier créé pour ${first_name} ${last_name}`,
        created_by: user.id,
      })
    } catch {
      // Non-blocking
    }

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
