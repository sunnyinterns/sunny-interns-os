'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import { FunnelKPIs } from '@/components/dashboard/FunnelKPIs'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'

interface LeadItem {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  source: string | null
  status: string | null
  created_at: string
}

interface PendingPaymentCase {
  id: string
  status: string
  interns: { first_name: string; last_name: string } | null
  payment_amount: number | null
}

export default function FeedPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [pendingLeads, setPendingLeads] = useState<LeadItem[]>([])
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentCase[]>([])

  useEffect(() => {
    // Leads en attente de conversion (status = new ou contacted)
    fetch('/api/leads?status=new&limit=10')
      .then(r => r.ok ? r.json() : [])
      .then(d => setPendingLeads(Array.isArray(d) ? d : d.leads ?? []))
      .catch(() => null)

    // Clients avec paiement en attente
    fetch('/api/cases?status=payment_pending&limit=10')
      .then(r => r.ok ? r.json() : [])
      .then(d => setPendingPayments(Array.isArray(d) ? d : []))
      .catch(() => null)
  }, [])

  function handleCaseCreated() {
    setShowModal(false)
    setToast({ message: 'Dossier créé avec succès', type: 'success' })
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafaf9' }}>
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl font-bold text-[#1a1918]">Dashboard</h1>
              <p className="text-xs text-zinc-500 capitalize">{today}</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
              + Nouveau dossier
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <FunnelKPIs locale={locale} />

        {/* Grid 2x2 desktop, stack mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activité récente */}
          <section className="bg-white rounded-xl border border-zinc-100 p-4 min-h-[320px]">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Activite recente</h2>
            <ActivityFeed locale={locale} showFilters={false} initialLimit={10} />
          </section>

          {/* Prochains RDVs (7 jours) */}
          <section className="bg-white rounded-xl border border-zinc-100 p-4 min-h-[320px]">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Prochains RDVs</h2>
            <CalendarWidget locale={locale} />
          </section>

          {/* Leads en attente */}
          <section className="bg-white rounded-xl border border-zinc-100 p-4 min-h-[200px]">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Leads en attente {pendingLeads.length > 0 && <span className="text-zinc-300 font-normal">({pendingLeads.length})</span>}
            </h2>
            {pendingLeads.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4">Aucun lead en attente</p>
            ) : (
              <div className="divide-y divide-zinc-50">
                {pendingLeads.slice(0, 5).map(lead => (
                  <Link
                    key={lead.id}
                    href={`/${locale}/leads`}
                    className="flex items-center justify-between px-2 py-2.5 hover:bg-zinc-50 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1a1918]">
                        {lead.first_name ?? ''} {lead.last_name ?? lead.email}
                      </p>
                      <p className="text-xs text-zinc-400">{lead.source ?? 'apply_form'} &middot; {new Date(lead.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                      {lead.status === 'contacted' ? 'Contacte' : 'Nouveau'}
                    </span>
                  </Link>
                ))}
                {pendingLeads.length > 5 && (
                  <Link href={`/${locale}/leads`} className="block px-2 py-2 text-xs text-center text-[#c8a96e] font-medium hover:bg-zinc-50 rounded">
                    Voir tous les leads ({pendingLeads.length})
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Paiements en attente */}
          <section className="bg-white rounded-xl border border-zinc-100 p-4 min-h-[200px]">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Paiements en attente {pendingPayments.length > 0 && <span className="text-zinc-300 font-normal">({pendingPayments.length})</span>}
            </h2>
            {pendingPayments.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4">Aucun paiement en attente</p>
            ) : (
              <div className="divide-y divide-zinc-50">
                {pendingPayments.map(c => (
                  <Link
                    key={c.id}
                    href={`/${locale}/cases/${c.id}`}
                    className="flex items-center justify-between px-2 py-2.5 hover:bg-zinc-50 rounded transition-colors"
                  >
                    <p className="text-sm font-medium text-[#1a1918]">
                      {c.interns ? `${c.interns.first_name} ${c.interns.last_name}` : c.id}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-[#dc2626] font-medium">
                      {c.payment_amount ? `${c.payment_amount}\u20AC` : 'En attente'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {showModal && (
        <NewCaseModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCaseCreated}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
