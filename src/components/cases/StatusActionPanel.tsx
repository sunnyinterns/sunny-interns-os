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
    job_submissions?: Array<{ id: string; job_title?: string; company_name?: string; status?: string }> | null
  }
  onRefresh?: () => void
}

function btn(label: string, color: string, onClick?: () => void) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        cursor: onClick ? 'pointer' : 'not-allowed',
        fontSize: '14px',
        fontWeight: 500,
        background: onClick ? color : '#d1d5db',
        color: 'white',
        marginRight: '8px',
        marginBottom: '8px',
        opacity: onClick ? 1 : 0.7,
      }}
    >
      {label}
    </button>
  )
}

export default function StatusActionPanel({ caseData, onRefresh }: StatusActionPanelProps) {
  const router = useRouter()
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [bookingDate, setBookingDate] = useState('')
  const [jobs, setJobs] = useState<{ id: string; title?: string; company?: { name?: string } }[]>([])
  const [noteText, setNoteText] = useState('')

  function handleStatusChange(newStatus: string, extraData?: Record<string, unknown>) {
    fetch('/api/cases/' + caseData.id + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, ...extraData }),
    })
      .then(() => { onRefresh?.(); router.refresh() })
      .catch(() => null)
  }

  function sendEmail(template: string) {
    fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, caseId: caseData.id }),
    }).catch(() => null)
  }

  async function openJobModal() {
    const res = await fetch('/api/jobs?status=open').catch(() => null)
    if (res?.ok) {
      const data = await res.json() as typeof jobs
      setJobs(data)
    }
    setShowJobModal(true)
  }

  async function handleBookRdv() {
    if (!bookingDate) return
    await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: caseData.id,
        internEmail: caseData.interns?.email ?? '',
        internName: `${caseData.interns?.first_name ?? ''} ${caseData.interns?.last_name ?? ''}`.trim(),
        startDateTime: bookingDate,
        endDateTime: (() => {
          const d = new Date(bookingDate)
          d.setMinutes(d.getMinutes() + 45)
          return d.toISOString()
        })(),
      }),
    }).catch(() => null)
    handleStatusChange('rdv_booked')
    setShowBookingModal(false)
  }

  const s = caseData.status

  return (
    <div style={{ background: '#fafaf7', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
        Actions — {s}
      </p>

      {/* ── LEAD ── */}
      {s === 'lead' && (
        <>
          {btn('📞 Booker un RDV', '#c8a96e', () => setShowBookingModal(true))}
          {btn('❌ Pas intéressé', '#ef4444', () => handleStatusChange('not_interested'))}
          {showBookingModal && (
            <div style={{ marginTop: '12px', padding: '16px', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 10px' }}>Choisir la date/heure du RDV</p>
              <input
                type="datetime-local"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                {btn('Confirmer', '#c8a96e', () => { void handleBookRdv() })}
                {btn('Annuler', '#6b7280', () => setShowBookingModal(false))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── RDV_BOOKED ── */}
      {s === 'rdv_booked' && (
        <>
          {caseData.google_meet_link && (
            <a href={caseData.google_meet_link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '8px 16px', borderRadius: '8px', background: '#1a73e8', color: 'white', fontWeight: 500, fontSize: '14px', textDecoration: 'none', marginRight: '8px', marginBottom: '8px' }}>
              🟢 Lien Google Meet
            </a>
          )}
          {caseData.google_meet_cancel_link && (
            <a href={caseData.google_meet_cancel_link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '8px 16px', borderRadius: '8px', background: 'white', color: '#374151', fontWeight: 500, fontSize: '14px', textDecoration: 'none', border: '1px solid #e5e7eb', marginRight: '8px', marginBottom: '8px' }}>
              Modifier / Annuler
            </a>
          )}
          {btn('✅ Entretien fait → Qualifier', '#10b981', () => handleStatusChange('qualification_done'))}
          {btn('❌ Perdu', '#ef4444', () => handleStatusChange('lost'))}
        </>
      )}

      {/* ── QUALIFICATION_DONE ── */}
      {s === 'qualification_done' && (
        <>
          {caseData.qualification_notes && (
            <p style={{ fontStyle: 'italic', color: '#888', fontSize: '13px', marginBottom: '10px' }}>{caseData.qualification_notes}</p>
          )}
          {btn('➕ Proposer un job', '#c8a96e', () => { void openJobModal() })}
          {btn('❌ Incapable de trouver', '#ef4444', () => handleStatusChange('no_job_found'))}
          {showJobModal && (
            <div style={{ marginTop: '12px', padding: '16px', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 10px' }}>Sélectionner les offres</p>
              {jobs.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '13px' }}>Aucune offre ouverte</p> : jobs.map((j) => (
                <label key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) {
                      fetch('/api/job-submissions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ caseId: caseData.id, jobId: j.id }),
                      }).catch(() => null)
                    }
                  }} />
                  <span style={{ fontSize: '13px' }}>{j.title ?? 'Offre'} — {j.company?.name ?? ''}</span>
                </label>
              ))}
              <div style={{ marginTop: '10px' }}>
                {btn('Soumettre', '#c8a96e', () => { handleStatusChange('job_submitted'); setShowJobModal(false) })}
                {btn('Annuler', '#6b7280', () => setShowJobModal(false))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── JOB_SUBMITTED ── */}
      {s === 'job_submitted' && (
        <>
          {(caseData.job_submissions ?? []).map((sub) => (
            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#374151' }}>{sub.job_title ?? 'Offre'} — {sub.company_name ?? ''}</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: sub.status === 'hired' ? '#d1fae5' : '#f3f4f6', color: sub.status === 'hired' ? '#065f46' : '#6b7280', fontWeight: 600 }}>
                {sub.status ?? 'en attente'}
              </span>
              {sub.status === 'hired' && btn('🍾 Confirmer Retenu', '#10b981', () => handleStatusChange('job_retained', { company_name: sub.company_name }))}
            </div>
          ))}
          {btn('➕ Proposer autre job', '#6b7280', () => { void openJobModal() })}
        </>
      )}

      {/* ── JOB_RETAINED ── */}
      {s === 'job_retained' && (
        <>
          {btn('📧 Félicitations + Lettre engagement', '#c8a96e', () => { sendEmail('job_retenu'); handleStatusChange('convention_signed') })}
          {btn('📄 Renvoyer lettre seulement', '#6b7280', () => sendEmail('engagement'))}
        </>
      )}

      {/* ── CONVENTION_SIGNED ── */}
      {s === 'convention_signed' && (
        <>
          {btn('💳 Demander le paiement', '#c8a96e', () => { sendEmail('payment_request'); handleStatusChange('payment_pending') })}
        </>
      )}

      {/* ── PAYMENT_PENDING ── */}
      {s === 'payment_pending' && (
        <>
          <div style={{ background: '#f9f5ec', border: '1px solid #c8a96e', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>IBAN Revolut</p>
            <p style={{ margin: '4px 0', fontWeight: 600, fontFamily: 'monospace', fontSize: '14px' }}>GB76REVO00996903517949</p>
            <button onClick={() => { void navigator.clipboard.writeText('GB76REVO00996903517949') }}
              style={{ fontSize: '12px', color: '#c8a96e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
              Copier
            </button>
          </div>
          {btn('✅ Paiement reçu', '#10b981', () => handleStatusChange('payment_received', { payment_date: new Date().toISOString().slice(0, 10) }))}
          {btn('📧 Renvoyer email paiement', '#6b7280', () => sendEmail('payment_request'))}
        </>
      )}

      {/* ── PAYMENT_RECEIVED ── */}
      {s === 'payment_received' && (
        <>
          {[
            { label: 'Passeport page 4', key: 'passport_page4_url' as const },
            { label: 'Photo fond blanc', key: 'photo_id_url' as const },
            { label: 'Relevé bancaire', key: 'bank_statement_url' as const },
            { label: 'Billet avion', key: 'return_plane_ticket_url' as const },
          ].map((item) => {
            const ok = !!(caseData.interns?.[item.key])
            return (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: ok ? '#0d9e75' : '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: ok ? '#065f46' : '#dc2626' }}>{item.label}</span>
              </div>
            )
          })}
          {caseData.portal_token && (
            <div style={{ margin: '12px 0', padding: '10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <code style={{ fontSize: '12px', color: '#374151' }}>/portal/{caseData.portal_token}</code>
              <button onClick={() => { void navigator.clipboard.writeText(window.location.origin + '/portal/' + caseData.portal_token) }}
                style={{ marginLeft: '10px', fontSize: '12px', color: '#c8a96e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                Copier
              </button>
            </div>
          )}
          {(() => {
            const allDocsOk = !!(caseData.interns?.passport_page4_url && caseData.interns?.photo_id_url && caseData.interns?.bank_statement_url && caseData.interns?.return_plane_ticket_url)
            return btn(
              allDocsOk ? '📁 Docs OK → Envoi visa' : '📁 Docs manquants (voir ci-dessus)',
              allDocsOk ? '#10b981' : '#9ca3af',
              allDocsOk ? () => handleStatusChange('visa_docs_sent', { papiers_visas: true }) : undefined
            )
          })()}
        </>
      )}

      {/* ── VISA_DOCS_SENT ── */}
      {s === 'visa_docs_sent' && (
        <>
          {[
            { label: 'Billet avion', key: 'billet_avion' as const },
            { label: 'Papiers visa', key: 'papiers_visas' as const },
          ].map((item) => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px' }}>{caseData[item.key] ? '✅' : '❌'}</span>
              <span style={{ fontSize: '13px', color: '#374151' }}>{item.label}</span>
            </div>
          ))}
          <textarea
            placeholder="Note pour l'agent visa..."
            defaultValue={caseData.note_for_agent ?? ''}
            onBlur={(e) => {
              fetch('/api/cases/' + caseData.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note_for_agent: e.target.value }),
              }).catch(() => null)
            }}
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', marginBottom: '8px', resize: 'vertical', boxSizing: 'border-box' }}
            rows={3}
          />
          {(() => {
            const canSend = !!(caseData.billet_avion && caseData.papiers_visas)
            return btn(
              canSend ? '🚩 Envoyer dossier à FAZZA' : '🚩 Envoyer à FAZZA (docs incomplets)',
              canSend ? '#c8a96e' : '#9ca3af',
              canSend ? () => {
                fetch('/api/cases/' + caseData.id + '/send-to-agent', { method: 'POST' }).catch(() => null)
                handleStatusChange('visa_submitted')
              } : undefined
            )
          })()}
        </>
      )}

      {/* ── VISA_SUBMITTED ── */}
      {s === 'visa_submitted' && (
        <>
          {caseData.visa_submitted_to_agent_at && (
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
              Soumis le {new Date(caseData.visa_submitted_to_agent_at).toLocaleDateString('fr-FR')} —
              J+{Math.floor((Date.now() - new Date(caseData.visa_submitted_to_agent_at).getTime()) / 86400000)}
            </p>
          )}
          {btn('🛂 Visa reçu ✓', '#10b981', () => handleStatusChange('visa_received', { visa_recu: true }))}
          {btn('⚠️ Problème visa', '#ef4444', () => setShowNoteModal(true))}
          {showNoteModal && (
            <div style={{ marginTop: '12px', padding: '16px', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 10px' }}>Note sur le problème</p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }}
              />
              <div style={{ marginTop: '10px' }}>
                {btn('Enregistrer', '#ef4444', () => {
                  fetch('/api/cases/' + caseData.id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ note_for_agent: noteText }),
                  }).catch(() => null)
                  handleStatusChange('visa_refused')
                  setShowNoteModal(false)
                })}
                {btn('Annuler', '#6b7280', () => setShowNoteModal(false))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── VISA_RECEIVED ── */}
      {s === 'visa_received' && (
        <>
          {btn('🏠 Copier lien logement/scooter', '#6b7280', () => {
            void navigator.clipboard.writeText(window.location.origin + '/portal/' + (caseData.portal_token ?? '') + '/logement').then(() => alert('Lien copié !'))
          })}
          {btn('🌴 Welcome Kit (J-14)', '#c8a96e', () => {
            fetch('/api/cases/' + caseData.id + '/retroplanning', { method: 'POST' }).catch(() => null)
            handleStatusChange('arrival_prep')
          })}
        </>
      )}

      {/* ── ARRIVAL_PREP ── */}
      {s === 'arrival_prep' && (
        <>
          {caseData.actual_start_date && (
            <span style={{ display: 'inline-block', padding: '4px 10px', background: '#fef3c7', color: '#92400e', borderRadius: '6px', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
              J-{Math.max(0, Math.floor((new Date(caseData.actual_start_date).getTime() - Date.now()) / 86400000))} avant arrivée
            </span>
          )}
          {[
            { label: 'Chauffeur confirmé', key: 'driver_booked' as const },
            { label: 'Logement réservé', key: 'housing_reserved' as const },
            { label: 'Scooter réservé', key: 'scooter_reserved' as const },
          ].map((item) => (
            <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!caseData[item.key]}
                onChange={(e) => {
                  fetch('/api/cases/' + caseData.id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [item.key]: e.target.checked }),
                  }).then(() => onRefresh?.()).catch(() => null)
                }}
              />
              <span style={{ fontSize: '13px', color: '#374151' }}>{item.label}</span>
            </label>
          ))}
          {!caseData.app_all_indonesia_sent_at && btn('📱 App All Indonesia J-2', '#6b7280', () => sendEmail('app_all_indonesia'))}
        </>
      )}

      {/* ── ACTIVE ── */}
      {s === 'active' && (
        <>
          {caseData.actual_end_date && (
            <span style={{ display: 'inline-block', padding: '4px 10px', background: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
              En stage — J-{Math.max(0, Math.floor((new Date(caseData.actual_end_date).getTime() - Date.now()) / 86400000))} avant fin
            </span>
          )}
          {btn('💬 WhatsApp Encore à Bali', '#25d366', () => {
            const wa = 'https://wa.me/' + (caseData.interns?.whatsapp?.replace(/\D/g, '') ?? '') + '?text=' + encodeURIComponent(caseData.whatsapp_ambassador_bali_msg ?? 'Hello, ton stage à Bali est en cours !')
            window.open(wa)
          })}
          {btn('🎓 Marquer Alumni', '#c8a96e', () => handleStatusChange('alumni'))}
        </>
      )}

      {/* ── ALUMNI ── */}
      {s === 'alumni' && (
        <>
          {btn('💬 WhatsApp Stage terminé', '#25d366', () => {
            const wa = 'https://wa.me/' + (caseData.interns?.whatsapp?.replace(/\D/g, '') ?? '') + '?text=' + encodeURIComponent(caseData.whatsapp_ambassador_done_msg ?? 'Hello, ton stage à Bali est terminé !')
            window.open(wa)
          })}
          {btn('🔗 Formulaire Ambassadeur', '#6b7280', () => window.open('/portal/' + (caseData.portal_token ?? '') + '/ambassadeur'))}
        </>
      )}

      {/* ── CLOSED ── */}
      {(s === 'not_interested' || s === 'no_job_found' || s === 'lost') && (
        <>
          <span style={{ color: '#ef4444', fontWeight: 500, fontSize: '14px', marginRight: '12px' }}>Dossier fermé</span>
          {btn('🔄 Réactiver', '#6b7280', () => handleStatusChange('lead'))}
        </>
      )}
    </div>
  )
}
