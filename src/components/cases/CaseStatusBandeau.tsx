'use client'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import { DebriefModal } from '@/components/cases/DebriefModal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InternData = Record<string, any>

function daysFromNow(dateStr: string): { days: number; label: string; urgent: boolean } {
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  let label = ''
  if (d < 0) label = 'passé'
  else if (d === 0) label = "aujourd'hui"
  else if (d === 1) label = 'demain'
  else if (d <= 2) label = `dans ${d} jours`
  else label = `dans ${d} jours`
  return { days: d, label, urgent: d <= 1 && d >= 0 }
}

function formatRdvDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  }) + ' à ' + new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
  }) + ' WITA'
}

interface BandeauProps {
  caseData: CaseData
  intern: InternData
  onAction: () => void
  onSendPortal: () => void
  sendingPortal: boolean
  onPatchStatus: (status: string) => void
  locale: string
}

// Note: pending_cancellation_emails handled in TabStaffing cancellation section

export function CaseStatusBandeau({ caseData, intern, onSendPortal, sendingPortal, onPatchStatus, locale }: BandeauProps) {
  const status = caseData.status as string
  const [patchingConvention, setPatchingConvention] = useState(false)
  const [debriefOpen, setDebriefOpen] = useState(false)

  const handleConventionSigned = useCallback(async () => {
    if (patchingConvention) return
    const ok = window.confirm('Confirm that the internship agreement has been signed?\n\nThis will trigger the payment request email (with IBAN).')
    if (!ok) return
    setPatchingConvention(true)
    try {
      const r = await fetch(`/api/cases/${caseData.id as string}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'payment_pending' }),
      })
      if (r.ok) onPatchStatus('payment_pending')
    } finally { setPatchingConvention(false) }
  }, [caseData.id, patchingConvention, onPatchStatus])

  const pill = (label: string, color: string, bg: string) => (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: bg, color }}>{label}</span>
  )

  const modal = debriefOpen ? (
    <DebriefModal
      caseId={caseData.id as string}
      internName={intern ? `${intern.first_name ?? ''} ${intern.last_name ?? ''}`.trim() : undefined}
      onClose={() => setDebriefOpen(false)}
      onSaved={() => { setDebriefOpen(false); window.location.reload() }}
    />
  ) : null

  const bandeau = (bg: string, border: string, content: React.ReactNode, notif?: React.ReactNode) => (
    <>
      {modal}
      <div className="mb-2 rounded-xl overflow-hidden" style={{ border: `0.5px solid ${border}` }}>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ background: bg }}>
          {content}
        </div>
        {notif && (
          <div className="flex items-start gap-2 px-4 py-2 bg-white border-t text-xs text-zinc-500" style={{ borderColor: border }}>
            {notif}
          </div>
        )}
      </div>
    </>
  )

  // ── RDV ANNULÉ PAR LE CANDIDAT ──
  if (status === 'rdv_booked' && caseData.rdv_cancelled_by_intern_at) {
    const cancelledAt = new Date(caseData.rdv_cancelled_by_intern_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    return bandeau('#fef2f2', '#fca5a5',
      <>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-0.5">Candidat a annulé l'entretien</p>
          <p className="text-sm font-medium text-red-900">{cancelledAt} · {caseData.rdv_cancelled_reason ?? 'Aucune raison indiquée'}</p>
        </div>
        <a href={caseData.intern_first_meeting_reschedule_link ?? '#'} target="_blank" rel="noopener noreferrer"
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#c8a96e] text-white whitespace-nowrap">
          Replanifier →
        </a>
      </>,
      <><span>🔔</span><span>Notification envoyée · <strong>Todo :</strong> Rappeler {intern.first_name ?? 'le candidat'}</span></>
    )
  }

  // ── RDV BOOKÉ — date de l'entretien ──
  if (status === 'rdv_booked' && caseData.intern_first_meeting_date) {
    const { label: dayLabel, urgent } = daysFromNow(caseData.intern_first_meeting_date)
    const isToday = dayLabel === "aujourd'hui"
    return bandeau(
      isToday ? '#fdf8f0' : '#f8fafc',
      isToday ? '#c8a96e60' : '#e2e8f0',
      <>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: isToday ? '#c8a96e' : '#64748b' }}>
            Entretien de qualification
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#1a1918]">{formatRdvDate(caseData.intern_first_meeting_date)}</span>
            {pill(dayLabel, urgent ? '#92400e' : '#1d4ed8', urgent ? '#fef3c7' : '#dbeafe')}
          </div>
          {caseData.intern_first_meeting_link && (
            <p className="text-xs text-zinc-400 mt-0.5">Google Meet · <a href={caseData.intern_first_meeting_link} target="_blank" rel="noopener noreferrer" className="text-[#c8a96e] hover:underline">Ouvrir le lien</a></p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {isToday && caseData.intern_first_meeting_link && (
            <a href={caseData.intern_first_meeting_link} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1a73e8] text-white">
              Rejoindre Meet
            </a>
          )}
          {caseData.intern_first_meeting_reschedule_link && (
            <a href={caseData.intern_first_meeting_reschedule_link} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-600 bg-white">
              Reprogrammer
            </a>
          )}
          {caseData.google_meet_cancel_link ? (
            <a href={caseData.google_meet_cancel_link as string} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 bg-red-50">
              Annuler
            </a>
          ) : null}
          <button onClick={() => setDebriefOpen(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1a1918] text-[#c8a96e] whitespace-nowrap">
            ✏️ Débrief
          </button>
        </div>
      </>,
      <><span>📋</span><span><strong>Todo :</strong> Préparer la fiche entretien · Vérifier le CV · Confirmer le créneau avec le candidat</span></>
    )
  }

  // ── RDV BOOKÉ sans date ──
  if (status === 'rdv_booked') {
    return bandeau('#f8fafc', '#e2e8f0',
      <>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Entretien à planifier</p>
          <p className="text-sm font-medium text-[#1a1918]">Aucune date d'entretien configurée — ajouter dans le profil</p>
        </div>
        <Link href={`/${locale}/cases/${caseData.id as string}`}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#c8a96e] text-white">Profil →</Link>
      </>
    )
  }

  // ── QUALIFICATION DONE : 4 sous-états ──
  if (status === 'qualification_done') {
    const cvMissing = !intern.cv_url
    const cvNotValidated = intern.cv_url && !intern.cv_validated_at
    const jobsNotSent = !caseData.jobs_sent_to_employers_at

    // 2A — CV manquant
    if (cvMissing) {
      return bandeau('#fffbeb', '#fcd34d',
        <>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">CV manquant — action requise</p>
            <p className="text-sm font-medium text-[#1a1918]">Email portail envoyé · En attente de l'upload du CV par le candidat</p>
            <p className="text-xs text-zinc-400 mt-0.5">Le candidat voit ses jobs pré-sélectionnés (anonymisés) mais ne peut pas être soumis aux employeurs</p>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white">📧 Relancer</button>
            <button className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 text-zinc-600 bg-white">Uploader CV</button>
          </div>
        </>,
        <><span>⏳</span><span><strong>Todo :</strong> Relancer si pas d'upload après 48h · Portail actif — jobs visibles anonymisés</span></>
      )
    }

    // 2B — CV uploadé, pas validé
    if (cvNotValidated) {
      return bandeau('#fdf8f0', '#c8a96e60',
        <>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#c8a96e' }}>Nouveau CV reçu — validation requise</p>
            <p className="text-sm font-medium text-[#1a1918]">{intern.first_name ?? 'Le candidat'} a uploadé un CV · À valider avant envoi aux employeurs</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 bg-red-50">✗ Refuser</button>
            <button onClick={() => onSendPortal()} disabled={sendingPortal}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#c8a96e] text-white disabled:opacity-60">
              {sendingPortal ? '…' : 'Valider CV →'}
            </button>
          </div>
        </>,
        <><span>🔔</span><span><strong>Todo :</strong> Valider le CV · Envoyer le portail candidat après validation</span></>
      )
    }

    // 2C — CV OK, pas encore envoyé aux employeurs
    if (jobsNotSent) {
      return bandeau('#f5f3ff', '#c4b5fd60',
        <>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-0.5">CV validé · Candidature prête</p>
            <p className="text-sm font-medium text-[#1a1918]">Envoyer les candidatures aux employeurs depuis les jobs sélectionnés</p>
            <p className="text-xs text-zinc-400 mt-0.5">L'employeur recevra le CV + présentation anonymisée · Portail employeur créé à l'envoi</p>
          </div>
          <Link href={`/${locale}/cases/${caseData.id as string}?tab=staffing`}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 text-white whitespace-nowrap">
            Envoyer aux employeurs →
          </Link>
        </>,
        <><span>ℹ️</span><span>Double aveugle activé — l'employeur et le candidat ne connaissent pas la décision de l'autre</span></>
      )
    }

    // 2D — Candidatures envoyées
    return bandeau('#eff6ff', '#bfdbfe60',
      <>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-0.5">Candidatures envoyées · En attente retours</p>
          <p className="text-sm font-medium text-[#1a1918]">Employeurs contactés · Délai 6 jours</p>
          {caseData.jobs_sent_to_employers_at && (
            <p className="text-xs text-zinc-400 mt-0.5">
              Envoyé le {new Date(caseData.jobs_sent_to_employers_at).toLocaleDateString('en-GB')} · {Math.max(0, 6 - Math.ceil((Date.now() - new Date(caseData.jobs_sent_to_employers_at).getTime()) / 86400000))}j restants
            </p>
          )}
        </div>
        <Link href={`/${locale}/cases/${caseData.id as string}?tab=staffing`}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 text-zinc-600 bg-white whitespace-nowrap">
          Voir les retours
        </Link>
      </>,
      <><span>⏰</span><span><strong>Todo J+6 :</strong> Relancer les employeurs sans réponse · Vérifier les intérêts candidat dans le portail</span></>
    )
  }

  // ── JOB SUBMITTED ──
  if (status === 'job_submitted') {
    return bandeau('#fffbeb', '#fde68a60',
      <>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">Candidatures soumises · En attente retours employeurs</p>
          <p className="text-sm font-medium text-[#1a1918]">Les employeurs ont 6 jours pour répondre</p>
        </div>
        <Link href={`/${locale}/cases/${caseData.id as string}?tab=staffing`}
          className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 text-zinc-600 bg-white whitespace-nowrap">
          Voir Staffing
        </Link>
      </>,
      <><span>⏳</span><span><strong>Todo :</strong> Relancer si pas de retour après 7 jours · Mettre à jour le verdict employeur depuis le portail ou manuellement</span></>
    )
  }

  // ── JOB RETAINED ──
  if (status === 'job_retained') {
    const conventionUrl = (caseData as Record<string, unknown>).convention_url as string | null
    return bandeau('#f0fdf4', '#bbf7d060',
      <>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mb-0.5">
            Internship confirmed — Convention de stage
          </p>
          <p className="text-sm font-medium text-[#1a1918]">
            The school must sign the internship agreement (convention de stage).
            Once signed, confirm below to trigger invoicing.
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Upload optional — you only need to confirm it was signed.
          </p>
          {conventionUrl && (
            <a href={conventionUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#0d9e75] underline mt-1 inline-block">
              📎 View uploaded convention
            </a>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-col items-end">
          {/* Optional upload */}
          <label className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 text-zinc-600 bg-white cursor-pointer whitespace-nowrap">
            {conventionUrl ? '📎 Replace document' : '📎 Upload (optional)'}
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !caseData.id) return
                const formData = new FormData(); formData.append('file', file); formData.append('case_id', String(caseData.id))
                const r = await fetch('/api/cases/upload-convention', { method: 'POST', body: formData })
                if (r.ok) window.location.reload()
              }} />
          </label>
          {/* Main action */}
          <button
            onClick={async () => {
              const ok = window.confirm('Confirm that the internship agreement (convention de stage) has been signed by the school?\n\nThis will trigger invoicing and the payment request email.')
              if (!ok) return
              const r = await fetch(`/api/cases/${caseData.id as string}/status`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'convention_signed' }),
              })
              if (r.ok) onPatchStatus('convention_signed')
            }}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0d9e75] text-white hover:bg-green-700 whitespace-nowrap"
          >
            ✅ Convention signed
          </button>
        </div>
      </>,
      <><span>📄</span><span><strong>Waiting for:</strong> School to sign the convention de stage · Once received, confirm above</span></>
    )
  }

  // ── CONVENTION SIGNED → payment pending auto-triggered via status route ──
  if (status === 'convention_signed') {
    return bandeau('#f0fdf4', '#16a34a40',
      <>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mb-0.5">
            Convention signed ✅ — Invoice & payment request sent
          </p>
          <p className="text-sm font-medium text-[#1a1918]">
            The internship agreement was confirmed.
            Payment request email + IBAN sent to the intern automatically.
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Waiting for intern to make the transfer and notify you.
          </p>
        </div>
      </>,
      <><span>⚡</span><span><strong>Triggered automatically:</strong> Invoice generated · Payment request + IBAN sent · Admin notification sent</span></>
    )
  }

  // ── PAYMENT PENDING — avec notification intern si applicable ──
  if (status === 'payment_pending') {
    const notifiedAt = (caseData as Record<string, unknown>).payment_notified_by_intern_at as string | null
    const notifiedNote = (caseData as Record<string, unknown>).payment_notified_by_intern_note as string | null
    if (notifiedAt) {
      const notifDate = new Date(notifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      return bandeau('#fffbeb', '#fcd34d',
        <>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">
              💰 Payment notified by intern — {notifDate}
            </p>
            <p className="text-sm font-medium text-[#1a1918]">
              {intern?.first_name ?? 'The intern'} says they have made the transfer.
              {notifiedNote ? ` Note: "${notifiedNote}"` : ''}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">Check your bank account, then confirm the payment below.</p>
          </div>
          <button
            onClick={async () => {
              const r = await fetch(`/api/cases/${caseData.id as string}/status`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'payment_received' }),
              })
              if (r.ok) onPatchStatus('payment_received')
            }}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#FFCC00] text-[#1A1A1A] hover:bg-[#E6B800] whitespace-nowrap flex-shrink-0">
            ✅ Confirm payment received
          </button>
        </>,
        <><span>⚠️</span><span><strong>Action required:</strong> Check bank transfer then confirm — intern card & visa access will be unlocked</span></>
      )
    }
    return bandeau('#fafaf9', '#e5e7eb',
      <>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Payment pending</p>
          <p className="text-sm font-medium text-[#1a1918]">
            Payment request sent to {intern?.first_name ?? 'intern'} — waiting for bank transfer.
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">Intern will notify you once done. You can also confirm manually below.</p>
        </div>
        <button
          onClick={async () => {
            const ok = window.confirm('Confirm payment received? This will unlock the intern card and visa process.')
            if (!ok) return
            const r = await fetch(`/api/cases/${caseData.id as string}/status`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'payment_received' }),
            })
            if (r.ok) onPatchStatus('payment_received')
          }}
          className="px-4 py-1.5 text-xs rounded-lg border border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50 whitespace-nowrap flex-shrink-0">
          Mark as paid ✓
        </button>
      </>,
      <><span>⏳</span><span><strong>Waiting for:</strong> Bank transfer from intern · Auto-alert after 5 days</span></>
    )
  }

  // ── VISA RECEIVED ──
  if (status === 'visa_received') {
    const visaUrl = (caseData as Record<string, unknown>).visa_url as string | null
    const internWA = (intern as Record<string, unknown> | null)?.whatsapp as string | null
    const waNum = internWA?.replace(/\D/g, '') ?? ''
    const waText = encodeURIComponent(
      `Hi ${intern?.first_name ?? 'there'}! 🎉 Great news — your visa has been received! ` +
      (visaUrl ? `You can download it here: ${visaUrl} ` : '') +
      `Please find it also in your intern portal. ` +
      `Next step: we'll prepare your arrival to Bali. 🌴`
    )
    return bandeau('#f0fdf4', '#bbf7d060',
      <>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mb-0.5">
            🛂 Visa received — send to intern
          </p>
          {visaUrl ? (
            <p className="text-sm font-medium text-[#1A1A1A]">
              Visa document ready.
              <a href={visaUrl} target="_blank" rel="noopener noreferrer" className="text-[#0d9e75] underline ml-2">
                View visa ↗
              </a>
            </p>
          ) : (
            <p className="text-sm font-medium text-[#1A1A1A]">
              Upload the visa document received by email or WA.
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-0.5">
            Next step: prepare intern arrival → arrival_prep
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-col items-end">
          {/* Upload visa */}
          {!visaUrl && (
            <label className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0d9e75] text-white cursor-pointer whitespace-nowrap">
              📎 Upload visa
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !caseData.id) return
                  const form = new FormData(); form.append('file', file); form.append('case_id', String(caseData.id)); form.append('source', 'charly')
                  const r = await fetch('/api/cases/upload-visa', { method: 'POST', body: form })
                  if (r.ok) { window.location.reload() }
                }} />
            </label>
          )}
          {/* WA pré-rédigé */}
          {waNum && (
            <a href={`https://wa.me/${waNum}?text=${waText}`} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#25D366] text-white whitespace-nowrap">
              💬 Send visa via WA
            </a>
          )}
        </div>
      </>,
      <><span>⚡</span><span><strong>Available in intern portal</strong> · {visaUrl ? 'Visa uploaded ✅' : 'Upload required'}</span></>
    )
  }

  // ── TO RECONTACT ──
  if (status === 'to_recontact') {
    const recontactMonth = (caseData as any).recontact_month as string | null
    const monthLabel = recontactMonth
      ? new Date(recontactMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : '—'
    const isPast = recontactMonth ? new Date(recontactMonth + '-01') <= new Date() : false
    return bandeau(
      isPast ? '#fffbeb' : '#fdf8f0',
      isPast ? '#fcd34d' : '#c8a96e60',
      <>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: isPast ? '#d97706' : '#c8a96e' }}>
            {isPast ? '⚠️ À relancer maintenant' : '📅 À recontacter'}
          </p>
          <p className="text-sm font-medium text-[#1a1918]">
            {intern?.first_name ?? 'Ce candidat'} sera à relancer en <strong>{monthLabel}</strong>
          </p>
          {(caseData as any).recontact_reason && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{(caseData as any).recontact_reason}</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setDebriefOpen(true)}
            className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 text-zinc-600 bg-white whitespace-nowrap">
            Modifier →
          </button>
          {isPast && (
            <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#c8a96e] text-white whitespace-nowrap">
              📧 Envoyer relance
            </button>
          )}
        </div>
      </>,
      isPast
        ? <><span>🔔</span><span><strong>Alerte :</strong> Le mois de relance est arrivé — contacter {intern?.first_name ?? 'le candidat'} maintenant</span></>
        : <><span>📅</span><span>Alerte To-Do créée · Relance prévue en {monthLabel}</span></>
    )
  }

  // Aucun bandeau pour les autres statuts (client — géré dans /fr/clients)
  return null
}
