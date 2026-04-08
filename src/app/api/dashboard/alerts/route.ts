import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface Alert {
  id: string
  type: 'critical' | 'attention'
  message: string
  case_id: string
  intern_name: string
  action_url: string
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const alerts: Alert[] = []
  const now = new Date()

  // Get all active cases with intern info
  const { data: cases } = await supabase
    .from('cases')
    .select('id, status, created_at, desired_start_date, actual_start_date, payment_date, visa_submitted_to_agent_at, driver_booked, papiers_visas, flight_number, intern_id, interns(first_name, last_name, passport_expiry)')
    .not('status', 'in', '(not_interested,no_job_found,lost,alumni,completed,archived)')

  if (!cases) return NextResponse.json([])

  for (const c of cases) {
    const intern = c.interns as unknown as { first_name: string; last_name: string; passport_expiry?: string } | null
    const name = intern ? `${intern.first_name} ${intern.last_name}` : 'Inconnu'

    // Passeport expire dans < 6 mois
    if (intern?.passport_expiry) {
      const expiry = new Date(intern.passport_expiry)
      const monthsLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (monthsLeft < 6 && monthsLeft > 0) {
        alerts.push({
          id: `passport-${c.id}`,
          type: 'critical',
          message: `Passeport de ${name} expire le ${new Date(intern.passport_expiry).toLocaleDateString('fr-FR')} — vérifier avant le visa`,
          case_id: c.id,
          intern_name: name,
          action_url: `/fr/cases/${c.id}`,
        })
      }
    }

    // RDV booked > 5 jours sans qualif
    if (c.status === 'rdv_booked') {
      const created = new Date(c.created_at)
      const daysSince = Math.floor((now.getTime() - created.getTime()) / 86400000)
      if (daysSince > 5) {
        alerts.push({
          id: `rdv-stale-${c.id}`,
          type: 'attention',
          message: `RDV de ${name} passé il y a ${daysSince} jours — qualifier ou fermer`,
          case_id: c.id,
          intern_name: name,
          action_url: `/fr/cases/${c.id}`,
        })
      }
    }

    // Payment pending > 7 jours
    if (c.status === 'payment_pending') {
      const created = new Date(c.created_at)
      const daysSince = Math.floor((now.getTime() - created.getTime()) / 86400000)
      if (daysSince > 7) {
        alerts.push({
          id: `payment-late-${c.id}`,
          type: 'critical',
          message: `Paiement de ${name} en attente depuis ${daysSince} jours`,
          case_id: c.id,
          intern_name: name,
          action_url: `/fr/cases/${c.id}`,
        })
      }
    }

    // Visa submitted > 30 jours
    if (c.visa_submitted_to_agent_at) {
      const submitted = new Date(c.visa_submitted_to_agent_at)
      const daysSince = Math.floor((now.getTime() - submitted.getTime()) / 86400000)
      if (daysSince > 30 && c.status === 'visa_submitted') {
        alerts.push({
          id: `visa-late-${c.id}`,
          type: 'critical',
          message: `Dossier visa de ${name} soumis il y a ${daysSince} jours — relancer FAZZA`,
          case_id: c.id,
          intern_name: name,
          action_url: `/fr/cases/${c.id}`,
        })
      }
    }

    // Arrival < 7 jours sans chauffeur
    const arrivalDate = c.actual_start_date || c.desired_start_date
    if (arrivalDate && ['arrival_prep', 'visa_received'].includes(c.status)) {
      const arrival = new Date(arrivalDate)
      const daysUntil = Math.floor((arrival.getTime() - now.getTime()) / 86400000)
      if (daysUntil <= 7 && daysUntil >= 0 && !c.driver_booked) {
        alerts.push({
          id: `driver-${c.id}`,
          type: 'critical',
          message: `${name} arrive dans ${daysUntil} jours — chauffeur non confirmé`,
          case_id: c.id,
          intern_name: name,
          action_url: `/fr/cases/${c.id}`,
        })
      }
    }

    // Docs visa incomplets > 7 jours
    if (['visa_docs_sent', 'payment_received'].includes(c.status) && !c.papiers_visas) {
      const created = new Date(c.created_at)
      const daysSince = Math.floor((now.getTime() - created.getTime()) / 86400000)
      if (daysSince > 7) {
        alerts.push({
          id: `docs-missing-${c.id}`,
          type: 'attention',
          message: `Docs visa manquants pour ${name} depuis ${daysSince} jours`,
          case_id: c.id,
          intern_name: name,
          action_url: `/fr/cases/${c.id}`,
        })
      }
    }
  }

  // Sort: critical first, then attention
  alerts.sort((a, b) => (a.type === 'critical' ? 0 : 1) - (b.type === 'critical' ? 0 : 1))

  return NextResponse.json(alerts)
}
