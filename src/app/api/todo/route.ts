import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface TodoItem {
  id: string
  type: 'action_required' | 'relance' | 'alerte'
  priority: 'urgent' | 'high' | 'normal'
  case_id: string
  intern_name: string
  title: string
  description: string
  cta_label?: string
  cta_url?: string
  days_waiting?: number
  status: string
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const todos: TodoItem[] = []
  const now = new Date()

  // 1. Leads sans RDV depuis plus de 2 jours
  const { data: oldLeads } = await adminClient
    .from('cases')
    .select('id, status, created_at, interns(first_name, last_name, email)')
    .eq('status', 'lead')
    .lt('created_at', new Date(Date.now() - 2 * 86400000).toISOString())
    .limit(20)

  oldLeads?.forEach(c => {
    const intern = (Array.isArray(c.interns) ? c.interns[0] : c.interns) as unknown as { first_name: string; last_name: string; email?: string } | null
    const days = Math.floor((now.getTime() - new Date(c.created_at).getTime()) / 86400000)
    todos.push({
      id: `lead-${c.id}`,
      type: 'action_required',
      priority: days > 5 ? 'urgent' : 'high',
      case_id: c.id,
      intern_name: `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim(),
      title: 'Booker un RDV de qualification',
      description: `Candidature reçue il y a ${days} jour${days > 1 ? 's' : ''} — aucun RDV planifié`,
      cta_label: 'Ouvrir le dossier',
      cta_url: `/fr/cases/${c.id}`,
      days_waiting: days,
      status: c.status,
    })
  })

  // 2. Qualification faite mais aucun job proposé depuis + 3 jours
  const { data: qualifDone } = await adminClient
    .from('cases')
    .select('id, status, updated_at, interns(first_name, last_name)')
    .eq('status', 'qualification_done')
    .lt('updated_at', new Date(Date.now() - 3 * 86400000).toISOString())
    .limit(20)

  qualifDone?.forEach(c => {
    const intern = (c.interns as unknown) as { first_name: string; last_name: string } | null
    const days = Math.floor((now.getTime() - new Date(c.updated_at).getTime()) / 86400000)
    todos.push({
      id: `qualif-${c.id}`,
      type: 'action_required',
      priority: days > 7 ? 'urgent' : 'high',
      case_id: c.id,
      intern_name: `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim(),
      title: 'Proposer des offres de stage',
      description: `Qualifié il y a ${days} jour${days > 1 ? 's' : ''} — aucune offre envoyée`,
      cta_label: 'Voir les offres',
      cta_url: `/fr/cases/${c.id}?tab=jobs`,
      days_waiting: days,
      status: c.status,
    })
  })

  // 3. Paiement en attente depuis + 5 jours
  const { data: pendingPay } = await adminClient
    .from('cases')
    .select('id, status, updated_at, interns(first_name, last_name)')
    .eq('status', 'payment_pending')
    .lt('updated_at', new Date(Date.now() - 5 * 86400000).toISOString())
    .limit(20)

  pendingPay?.forEach(c => {
    const intern = (c.interns as unknown) as { first_name: string; last_name: string } | null
    const days = Math.floor((now.getTime() - new Date(c.updated_at).getTime()) / 86400000)
    todos.push({
      id: `pay-${c.id}`,
      type: 'relance',
      priority: days > 10 ? 'urgent' : 'high',
      case_id: c.id,
      intern_name: `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim(),
      title: 'Relancer pour le paiement',
      description: `En attente de paiement depuis ${days} jour${days > 1 ? 's' : ''}`,
      cta_label: 'Ouvrir le dossier',
      cta_url: `/fr/cases/${c.id}`,
      days_waiting: days,
      status: c.status,
    })
  })

  // 4. Visa en cours depuis + 30 jours
  const { data: visaLong } = await adminClient
    .from('cases')
    .select('id, status, updated_at, interns(first_name, last_name)')
    .in('status', ['visa_submitted', 'visa_in_progress'])
    .lt('updated_at', new Date(Date.now() - 30 * 86400000).toISOString())
    .limit(20)

  visaLong?.forEach(c => {
    const intern = (c.interns as unknown) as { first_name: string; last_name: string } | null
    const days = Math.floor((now.getTime() - new Date(c.updated_at).getTime()) / 86400000)
    todos.push({
      id: `visa-${c.id}`,
      type: 'alerte',
      priority: days > 45 ? 'urgent' : 'high',
      case_id: c.id,
      intern_name: `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim(),
      title: 'Visa en cours depuis trop longtemps',
      description: `Visa soumis il y a ${days} jours — contacter l'agent visa`,
      cta_label: 'Voir le dossier visa',
      cta_url: `/fr/cases/${c.id}?tab=visa`,
      days_waiting: days,
      status: c.status,
    })
  })

  // 5. Documents visa à valider
  const { data: visaDocs } = await adminClient
    .from('cases')
    .select('id, status, updated_at, interns(first_name, last_name)')
    .eq('status', 'visa_docs_sent')
    .lt('updated_at', new Date(Date.now() - 2 * 86400000).toISOString())
    .limit(20)

  visaDocs?.forEach(c => {
    const intern = (c.interns as unknown) as { first_name: string; last_name: string } | null
    const days = Math.floor((now.getTime() - new Date(c.updated_at).getTime()) / 86400000)
    todos.push({
      id: `docs-${c.id}`,
      type: 'action_required',
      priority: 'normal',
      case_id: c.id,
      intern_name: `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim(),
      title: 'Valider les documents visa',
      description: `Documents reçus il y a ${days} jour${days > 1 ? 's' : ''} — à envoyer à Agent Visa`,
      cta_label: 'Voir les documents',
      cta_url: `/fr/cases/${c.id}?tab=visa`,
      days_waiting: days,
      status: c.status,
    })
  })

  // 6. RDV planifié mais qualification non faite (> 3j)
  const { data: rdvOld } = await adminClient
    .from('cases')
    .select('id, status, updated_at, interns(first_name, last_name)')
    .eq('status', 'rdv_booked')
    .lt('updated_at', new Date(Date.now() - 3 * 86400000).toISOString())
    .limit(20)

  rdvOld?.forEach(c => {
    const intern = (Array.isArray(c.interns) ? c.interns[0] : c.interns) as unknown as { first_name: string; last_name: string } | null
    const days = Math.floor((now.getTime() - new Date(c.updated_at).getTime()) / 86400000)
    todos.push({
      id: `rdv-${c.id}`,
      type: 'relance',
      priority: days > 7 ? 'urgent' : 'normal',
      case_id: c.id,
      intern_name: `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim(),
      title: 'RDV planifié mais qualification non faite',
      description: `RDV il y a ${days}j — qualifier ou replanifier`,
      cta_label: 'Voir le dossier',
      cta_url: `/fr/cases/${c.id}`,
      days_waiting: days,
      status: c.status,
    })
  })

  // 6b. Visa urgent — départ dans <30j et visa pas reçu
  const cutoff = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const { data: visaUrgent } = await adminClient
    .from('cases')
    .select('id, status, desired_start_date, updated_at, interns(first_name, last_name)')
    .in('status', ['visa_submitted', 'visa_docs_sent', 'visa_in_progress', 'payment_received'])
    .not('desired_start_date', 'is', null)
    .lt('desired_start_date', cutoff)
    .limit(20)

  visaUrgent?.forEach(c => {
    const intern = (Array.isArray(c.interns) ? c.interns[0] : c.interns) as unknown as { first_name: string; last_name: string } | null
    const daysLeft = Math.floor((new Date(c.desired_start_date as string).getTime() - now.getTime()) / 86400000)
    if (daysLeft < 0) return
    todos.push({
      id: `visa-urgent-${c.id}`,
      type: 'alerte',
      priority: daysLeft < 15 ? 'urgent' : 'high',
      case_id: c.id,
      intern_name: `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim(),
      title: `⚠️ Visa en cours — départ dans ${daysLeft}j`,
      description: `Départ prévu le ${new Date(c.desired_start_date as string).toLocaleDateString('fr-FR')} — visa pas encore reçu`,
      cta_label: 'Voir le dossier',
      cta_url: `/fr/cases/${c.id}?tab=visa`,
      days_waiting: daysLeft,
      status: c.status,
    })
  })

  // 7. Convention signée mais paiement non reçu (> 7j)
  const { data: convOld } = await adminClient
    .from('cases')
    .select('id, status, updated_at, interns(first_name, last_name)')
    .eq('status', 'convention_signed')
    .lt('updated_at', new Date(Date.now() - 7 * 86400000).toISOString())
    .limit(20)

  convOld?.forEach(c => {
    const intern = (Array.isArray(c.interns) ? c.interns[0] : c.interns) as unknown as { first_name: string; last_name: string } | null
    const days = Math.floor((now.getTime() - new Date(c.updated_at).getTime()) / 86400000)
    todos.push({
      id: `conv-${c.id}`,
      type: 'relance',
      priority: days > 14 ? 'urgent' : 'high',
      case_id: c.id,
      intern_name: `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim(),
      title: 'Convention signée — paiement non reçu',
      description: `Convention depuis ${days}j — relancer pour le paiement`,
      cta_label: 'Voir le dossier',
      cta_url: `/fr/cases/${c.id}`,
      days_waiting: days,
      status: c.status,
    })
  })

  // 8. Leads abandonnés depuis > 3j avec email (formulaire non terminé)
  const { data: abandonedLeads } = await adminClient
    .from('leads')
    .select('id, email, first_name, form_step')
    .eq('source', 'website_form_unfinished')
    .neq('status', 'converted')
    .lt('updated_at', new Date(Date.now() - 3 * 86400000).toISOString())
    .limit(10)

  abandonedLeads?.forEach(l => {
    todos.push({
      id: `lead-abandoned-${l.id}`,
      type: 'relance',
      priority: 'normal',
      case_id: '',
      intern_name: l.first_name ? `${l.first_name} (${l.email})` : (l.email ?? ''),
      title: `Lead abandonné à l'étape ${l.form_step ?? '?'}`,
      description: `Formulaire non terminé — relancer par email`,
      cta_label: 'Voir les leads',
      cta_url: '/fr/leads',
      status: 'abandoned',
    })
  })

  // Trier par priorité puis jours d'attente
  const priorityOrder = { urgent: 0, high: 1, normal: 2 }
  todos.sort((a, b) => {
    const pa = priorityOrder[a.priority]
    const pb = priorityOrder[b.priority]
    if (pa !== pb) return pa - pb
    return (b.days_waiting ?? 0) - (a.days_waiting ?? 0)
  })

  return NextResponse.json({ todos, count: todos.length })
}
