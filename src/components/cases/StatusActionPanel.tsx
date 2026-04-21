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
  openRecontactModal: () => void,
): ActionButton[] {
  switch (status) {
    case 'lead': return [
      { label: '📅 Booker RDV', onClick: () => { void patchStatus('rdv_booked') }, variant: 'primary', loadingKey: 'rdv_booked' },
      { label: '🔄 À recontacter', onClick: openRecontactModal, variant: 'secondary', loadingKey: 'to_recontact' },
      { label: '❌ Pas intéressé', onClick: () => { void patchStatus('not_interested') }, variant: 'danger', loadingKey: 'not_interested' },
    ]
    case 'rdv_booked': return [
      ...(caseData.google_meet_link ? [{ label: '🎥 Ouvrir Meet', onClick: () => window.open(caseData.google_meet_link!, '_blank'), variant: 'primary' as const, loadingKey: 'meet' }] : []),
      { label: '✅ Qualif faite', onClick: () => { void patchStatus('qualification_done') }, variant: 'primary', loadingKey: 'qualification_done' },
      { label: '🔄 À recontacter', onClick: openRecontactModal, variant: 'secondary', loadingKey: 'to_recontact' },
      { label: '❌ Pas intéressé', onClick: () => { void patchStatus('not_interested') }, variant: 'danger', loadingKey: 'not_interested' },
    ]
    case 'qualification_done': return [
      { label: '💼 Proposer des jobs', onClick: () => { void patchStatus('job_submitted') }, variant: 'primary', loadingKey: 'job_submitted' },
      { label: '🔄 À recontacter', onClick: openRecontactModal, variant: 'secondary', loadingKey: 'to_recontact' },
      { label: '🚫 No job found', onClick: () => { void patchStatus('no_job_found') }, variant: 'danger', loadingKey: 'no_job_found' },
    ]
    case 'job_submitted': return [
      { label: '🎉 Job retenu', onClick: () => { void patchStatus('job_retained') }, variant: 'primary', loadingKey: 'job_retained' },
      { label: '🔄 À recontacter', onClick: openRecontactModal, variant: 'secondary', loadingKey: 'to_recontact' },
    ]
    case 'job_retained': return [
      { label: '📝 Convention signée', onClick: () => { void patchStatus('convention_signed') }, variant: 'primary', loadingKey: 'convention_signed' },
    ]
    case 'convention_signed': return [
      { label: '💳 Demander paiement', onClick: sendPaymentEmail, variant: 'primary', loadingKey: 'payment_pending' },
    ]
    case 'payment_pending': return [
      { label: '✅ Paiement reçu', onClick: () => { void patchStatus('payment_received', { payment_date: new Date().toISOString().slice(0, 10) }) }, variant: 'primary', loadingKey: 'payment_received' },
    ]
    case 'payment_received': return [
      { label: '🛂 Envoyer docs visa', onClick: sendVisaDocsEmail, variant: 'secondary', loadingKey: 'send_visa_docs' },
      { label: '🚀 Visa en cours', onClick: () => { void patchStatus('visa_in_progress') }, variant: 'primary', loadingKey: 'visa_in_progress' },
    ]
    case 'visa_docs_sent': return [
      { label: '🚀 Visa en cours', onClick: () => { void patchStatus('visa_in_progress') }, variant: 'primary', loadingKey: 'visa_in_progress' },
    ]
    case 'visa_submitted': return [
      { label: '✅ Visa reçu', onClick: () => { void patchStatus('visa_received') }, variant: 'primary', loadingKey: 'visa_received' },
      { label: '❌ Visa refusé', onClick: () => { void patchStatus('visa_refused') }, variant: 'danger', loadingKey: 'visa_refused' },
    ]
    case 'visa_in_progress': return [
      { label: '✅ Visa reçu', onClick: () => { void patchStatus('visa_received') }, variant: 'primary', loadingKey: 'visa_received' },
      { label: '❌ Visa refusé', onClick: () => { void patchStatus('visa_refused') }, variant: 'danger', loadingKey: 'visa_refused' },
    ]
    case 'visa_received': return [
      { label: '🛫 Préparer arrivée', onClick: () => { void patchStatus('arrival_prep') }, variant: 'primary', loadingKey: 'arrival_prep' },
    ]
    case 'arrival_prep': return [
      { label: '🌴 Stage démarré', onClick: () => { void patchStatus('active') }, variant: 'primary', loadingKey: 'active' },
    ]
    case 'active': return [
      { label: '🎓 Stage terminé', onClick: () => { void patchStatus('alumni') }, variant: 'primary', loadingKey: 'alumni' },
    ]
    case 'to_recontact': return [
      { label: '📅 Booker RDV', onClick: () => { void patchStatus('rdv_booked') }, variant: 'primary', loadingKey: 'rdv_booked' },
      { label: '❌ Pas intéressé', onClick: () => { void patchStatus('not_interested') }, variant: 'danger', loadingKey: 'not_interested' },
    ]
    case 'no_job_found':
    case 'not_interested':
    case 'lost':
    case 'visa_refused': return [
      { label: '🔄 Réactiver', onClick: () => { void patchStatus('lead') }, variant: 'secondary', loadingKey: 'lead' },
    ]
    default: return []
  }
}

export function StatusActionPanel({ caseData, onRefresh }: StatusActionPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showRecontactModal, setShowRecontactModal] = useState(false)
  const [recontactDate, setRecontactDate] = useState('')
  const [recontactNote, setRecontactNote] = useState('')
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
    setLoading('payment_pending')
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

  async function confirmRecontact() {
    if (!recontactDate) return
    setLoading('to_recontact')
    await fetch(`/api/cases/${caseData.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'to_recontact', recontact_at: recontactDate, recontact_note: recontactNote || null }),
    }).catch(() => null)
    setLoading(null)
    setShowRecontactModal(false)
    setRecontactDate('')
    setRecontactNote('')
    onRefresh?.()
    router.refresh()
  }

  const btns = getButtons(s, caseData, patchStatus, sendPaymentEmail, sendVisaDocsEmail, () => setShowRecontactModal(true))
  if (!btns.length) return null

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {btns.map((b) => (
          <button key={b.label} onClick={b.onClick} disabled={!!loading}
            className={['inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50',
              b.variant === 'primary' ? 'bg-[#c8a96e] text-white hover:bg-[#b8945a]' :
              b.variant === 'danger' ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' :
              'bg-white text-[#1a1918] border border-[#e4e4e7] hover:bg-zinc-50'
            ].join(' ')}>
            {loading === b.loadingKey && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {b.label}
          </button>
        ))}
      </div>

      {/* Modale À recontacter */}
      {showRecontactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setShowRecontactModal(false) }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="text-sm font-bold text-[#1a1918]">🔄 À recontacter</h3>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date de recontact *</label>
              <input type="date" value={recontactDate} onChange={e => setRecontactDate(e.target.value)} min={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-[#c8a96e]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Note (optionnel)</label>
              <textarea value={recontactNote} onChange={e => setRecontactNote(e.target.value)} rows={2} placeholder="Raison du report..."
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl resize-none focus:outline-none focus:border-[#c8a96e]" />
            </div>
            <div className="flex gap-2">
              <button onClick={confirmRecontact} disabled={!recontactDate || loading === 'to_recontact'}
                className="flex-1 py-2.5 text-sm font-bold bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a] disabled:opacity-40">
                {loading === 'to_recontact' ? '…' : 'Confirmer'}
              </button>
              <button onClick={() => setShowRecontactModal(false)} className="px-4 py-2.5 text-sm border border-zinc-200 rounded-xl text-zinc-500">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
