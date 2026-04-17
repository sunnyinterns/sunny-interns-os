'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface StatusActionPanelProps {
  caseData: {
    id: string
    status: string
    portal_token?: string | null
    google_meet_link?: string | null
    google_meet_cancel_link?: string | null
    qualification_notes?: string | null
    intern_level?: string | null
    diploma_track?: string | null
    note_for_agent?: string | null
    billet_avion?: boolean | null
    papiers_visas?: boolean | null
    visa_submitted_to_agent_at?: string | null
    app_all_indonesia_sent_at?: string | null
    actual_start_date?: string | null
    actual_end_date?: string | null
    driver_booked?: boolean | null
    housing_reserved?: boolean | null
    scooter_reserved?: boolean | null
    whatsapp_ambassador_bali_msg?: string | null
    whatsapp_ambassador_done_msg?: string | null
    interns?: {
      first_name?: string | null
      last_name?: string | null
      email?: string | null
      whatsapp?: string | null
      passport_page4_url?: string | null
      photo_id_url?: string | null
      bank_statement_url?: string | null
      return_plane_ticket_url?: string | null
    } | null
    job_submissions?: Array<{
      id: string
      job_title?: string
      company_name?: string
      status?: string
      intern_interested?: boolean | null
    }> | null
  }
  onRefresh?: () => void
}

interface ActionButton {
  label: string
  onClick: () => void
  variant: 'primary' | 'secondary' | 'danger'
  loadingKey: string
}

function getButtons(
  status: string,
  caseData: StatusActionPanelProps['caseData'],
  patchStatus: (s: string, extra?: Record<string, unknown>) => Promise<void>,
  sendPaymentEmail: () => Promise<void>,
  sendVisaDocsEmail: () => Promise<void>,
): ActionButton[] {
  switch (status) {
    case 'lead': return [
      { label: '📅 Booker RDV', onClick: () => { void patchStatus('rdv_booked') }, variant: 'primary', loadingKey: 'rdv_booked' },
      { label: '❌ Pas intéressé', onClick: () => { void patchStatus('not_interested') }, variant: 'danger', loadingKey: 'not_interested' },
    ]
    case 'rdv_booked': return [
      ...(caseData.google_meet_link ? [{ label: '🎥 Ouvrir Meet', onClick: () => window.open(caseData.google_meet_link!, '_blank'), variant: 'primary' as const, loadingKey: 'meet' }] : []),
      { label: '✅ Qualif faite', onClick: () => { void patchStatus('qualification_done') }, variant: 'primary', loadingKey: 'qualification_done' },
      { label: '❌ Pas intéressé', onClick: () => { void patchStatus('not_interested') }, variant: 'danger', loadingKey: 'not_interested' },
    ]
    case 'qualification_done': return [
      { label: '📋 Proposer un job', onClick: () => { void patchStatus('job_submitted') }, variant: 'primary', loadingKey: 'job_submitted' },
      { label: '🚫 No job found', onClick: () => { void patchStatus('no_job_found') }, variant: 'danger', loadingKey: 'no_job_found' },
    ]
    case 'job_submitted': return [
      { label: '🎉 Job retenu', onClick: () => { void patchStatus('job_retained') }, variant: 'primary', loadingKey: 'job_retained' },
    ]
    case 'job_retained': return [
      { label: '📝 Convention signée', onClick: () => { void patchStatus('convention_signed') }, variant: 'primary', loadingKey: 'convention_signed' },
    ]
    case 'convention_signed': return [
      { label: '📧 Envoyer demande paiement', onClick: () => { void sendPaymentEmail() }, variant: 'primary', loadingKey: 'send_payment_email' },
      { label: '💳 Paiement en attente', onClick: () => { void patchStatus('payment_pending') }, variant: 'secondary', loadingKey: 'payment_pending' },
    ]
    case 'payment_pending': return [
      { label: '✅ Paiement reçu', onClick: () => { void patchStatus('payment_received', { payment_date: new Date().toISOString().slice(0, 10) }) }, variant: 'primary', loadingKey: 'payment_received' },
    ]
    case 'payment_received': return [
      { label: '📋 Demander docs visa', onClick: () => { void sendVisaDocsEmail() }, variant: 'primary', loadingKey: 'send_visa_docs' },
      { label: '🚀 Envoyer à l\'agent visa', onClick: () => { void patchStatus('visa_in_progress') }, variant: 'secondary', loadingKey: 'visa_in_progress' },
    ]
    case 'visa_in_progress': return [
      { label: '✅ Visa reçu', onClick: () => { void patchStatus('visa_received') }, variant: 'primary', loadingKey: 'visa_received' },
      { label: '❌ Visa refusé', onClick: () => { void patchStatus('visa_refused') }, variant: 'danger', loadingKey: 'visa_refused' },
    ]
    case 'visa_submitted': return [
      { label: '🛂 Visa reçu', onClick: () => { void patchStatus('visa_received') }, variant: 'primary', loadingKey: 'visa_received' },
    ]
    case 'visa_received': return [
      { label: '🛫 Préparer départ', onClick: () => { void patchStatus('arrival_prep') }, variant: 'primary', loadingKey: 'arrival_prep' },
    ]
    case 'arrival_prep': return [
      { label: '🌴 Stage démarré', onClick: () => { void patchStatus('active') }, variant: 'primary', loadingKey: 'active' },
    ]
    case 'active': return [
      { label: '🎓 Stage terminé', onClick: () => { void patchStatus('alumni') }, variant: 'primary', loadingKey: 'alumni' },
    ]
    case 'not_interested':
    case 'no_job_found':
    case 'lost': return [
      { label: '🔄 Réactiver', onClick: () => { void patchStatus('lead') }, variant: 'secondary', loadingKey: 'lead' },
    ]
    default: return []
  }
}

export default function StatusActionPanel({ caseData, onRefresh }: StatusActionPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const s = caseData.status

  async function patchStatus(newStatus: string, extra?: Record<string, unknown>) {
    setLoading(newStatus)
    await fetch(`/api/cases/${caseData.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, ...extra }),
    }).catch(() => null)
    setLoading(null)
    onRefresh?.()
    router.refresh()
  }

  async function sendPaymentEmail() {
    setLoading('send_payment_email')
    await fetch(`/api/cases/${caseData.id}/send-payment-email`, { method: 'POST' }).catch(() => null)
    await fetch(`/api/cases/${caseData.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'payment_pending' }),
    }).catch(() => null)
    setLoading(null)
    onRefresh?.()
    router.refresh()
  }

  async function sendVisaDocsEmail() {
    setLoading('send_visa_docs')
    await fetch(`/api/cases/${caseData.id}/send-visa-docs`, { method: 'POST' }).catch(() => null)
    setLoading(null)
    onRefresh?.()
  }

  const btns = getButtons(s, caseData, patchStatus, sendPaymentEmail, sendVisaDocsEmail)
  if (!btns.length) return null

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {btns.map((b) => (
        <button
          key={b.label}
          onClick={b.onClick}
          disabled={!!loading}
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50',
            b.variant === 'primary' ? 'bg-[#c8a96e] text-white hover:bg-[#b8945a]' :
            b.variant === 'danger' ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' :
            'bg-white text-[#1a1918] border border-[#e4e4e7] hover:bg-zinc-50'
          ].join(' ')}
        >
          {loading === b.loadingKey && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          {b.label}
        </button>
      ))}
    </div>
  )
}
