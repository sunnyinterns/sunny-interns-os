'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { NewCaseModal } from '@/components/cases/NewCaseModal'
import { Toast } from '@/components/ui/Toast'
import { CalendarWidget } from '@/components/dashboard/CalendarWidget'
import { FunnelKPIs } from '@/components/dashboard/FunnelKPIs'

export default function FeedPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <FunnelKPIs locale={locale} />

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">📅 Prochains entretiens</h2>
          <CalendarWidget locale={locale} />
        </section>
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
