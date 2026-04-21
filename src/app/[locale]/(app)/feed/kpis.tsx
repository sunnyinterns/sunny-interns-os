'use client'

import { useEffect, useState } from 'react'

interface KPIData {
  leads_this_month: number
  cases_total: number
  clients_total: number
  conversion_lead_to_rdv: number
  conversion_rdv_to_payment: number
  revenue_total: number
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-100 rounded ${className}`} />
}

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-4 flex flex-col gap-1">
      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-[#1a1918]">{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

export function KPIsSection() {
  const [data, setData] = useState<KPIData | null>(null)

  useEffect(() => {
    fetch('/api/kpis')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setData(d) })
      .catch(() => null)
  }, [])

  const now = new Date()
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long' })

  return (
    <section>
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">KPIs</h2>
      {!data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            label={`Leads ${monthLabel}`}
            value={String(data.leads_this_month)}
            sub="ce mois"
          />
          <KPICard
            label="Candidats actifs"
            value={String(data.cases_total)}
            sub="rdv → convention"
          />
          <KPICard
            label="Clients"
            value={String(data.clients_total)}
            sub="paiement → alumni"
          />
          <KPICard
            label="Conv. lead→RDV"
            value={`${data.conversion_lead_to_rdv}%`}
            sub="ce mois"
          />
          <KPICard
            label="Conv. RDV→paiement"
            value={`${data.conversion_rdv_to_payment}%`}
            sub="global"
          />
          <KPICard
            label="Revenu total"
            value={`${(data.revenue_total / 1000).toFixed(1)}k€`}
            sub="factures payées"
          />
        </div>
      )}
    </section>
  )
}
