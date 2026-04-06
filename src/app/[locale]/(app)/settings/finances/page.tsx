'use client'

import { useEffect, useState } from 'react'

interface ChartPoint {
  month: string
  label: string
  revenue: number
}

interface FinanceStats {
  currentMonthRevenue: number
  prevMonthRevenue: number
  pending: number
  invoicesIssued: number
  chartData: ChartPoint[]
}

interface Invoice {
  id: string
  amount_ttc: number
  paid_at: string | null
  created_at: string | null
  cases?: {
    interns?: {
      first_name?: string
      last_name?: string
    } | null
  } | null
}

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function MetricCard({
  label,
  value,
  sub,
  critical,
}: {
  label: string
  value: string
  sub?: string
  critical?: boolean
}) {
  return (
    <div className="bg-white border border-zinc-100 rounded-xl p-5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${critical ? 'text-[#dc2626]' : 'text-[#1a1918]'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  )
}

function RevenueChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1)
  const chartHeight = 120

  return (
    <div className="bg-white border border-zinc-100 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[#1a1918] mb-4">CA 6 derniers mois</h3>
      <div className="flex items-end gap-2 h-[120px]">
        {data.map((d) => {
          const barH = Math.max(4, Math.round((d.revenue / max) * chartHeight))
          return (
            <div key={d.month} className="flex flex-col items-center flex-1 gap-1">
              {d.revenue > 0 && (
                <span className="text-[10px] text-zinc-500 font-medium">
                  {new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(d.revenue)}
                </span>
              )}
              <div
                className="w-full rounded-t-md transition-all"
                style={{ height: `${barH}px`, backgroundColor: '#c8a96e' }}
                title={`${d.label}: ${formatEur(d.revenue)}`}
              />
              <span className="text-[10px] text-zinc-400 text-center leading-tight">{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function FinancesPage() {
  const [stats, setStats] = useState<FinanceStats | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const [monthFilter, setMonthFilter] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetch('/api/finances/stats')
      .then((r) => r.json())
      .then((d: unknown) => { setStats(d as FinanceStats) })
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  useEffect(() => {
    setLoadingInvoices(true)
    const qs = new URLSearchParams()
    if (statusFilter !== 'all') qs.set('status', statusFilter)
    if (monthFilter) qs.set('month', monthFilter)
    fetch(`/api/finances/invoices?${qs.toString()}`)
      .then((r) => r.json())
      .then((d: unknown) => { if (Array.isArray(d)) setInvoices(d as Invoice[]) })
      .catch(() => setInvoices([]))
      .finally(() => setLoadingInvoices(false))
  }, [statusFilter, monthFilter])

  async function handleExportCSV() {
    setExporting(true)
    try {
      const qs = new URLSearchParams({ format: 'csv' })
      if (statusFilter !== 'all') qs.set('status', statusFilter)
      if (monthFilter) qs.set('month', monthFilter)
      const res = await fetch(`/api/finances/invoices?${qs.toString()}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'factures.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent
    } finally {
      setExporting(false)
    }
  }

  const delta = stats
    ? stats.prevMonthRevenue > 0
      ? Math.round(((stats.currentMonthRevenue - stats.prevMonthRevenue) / stats.prevMonthRevenue) * 100)
      : null
    : null

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-[#1a1918]">Finances</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Vue d&apos;ensemble des revenus et factures</p>
      </div>

      {/* Metrics */}
      {loadingStats ? (
        <div className="grid grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-zinc-100 rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="CA mois en cours"
            value={formatEur(stats.currentMonthRevenue)}
            sub={delta !== null ? `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% vs mois précédent` : undefined}
          />
          <MetricCard
            label="CA mois précédent"
            value={formatEur(stats.prevMonthRevenue)}
          />
          <MetricCard
            label="Factures émises"
            value={String(stats.invoicesIssued)}
          />
          <MetricCard
            label="Montant en attente"
            value={formatEur(stats.pending)}
            critical={stats.pending > 0}
          />
        </div>
      ) : null}

      {/* Chart */}
      {stats && stats.chartData.length > 0 && (
        <RevenueChart data={stats.chartData} />
      )}

      {/* Invoices list */}
      <div className="bg-white border border-zinc-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-[#1a1918]">Factures</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')}
              className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white"
            >
              <option value="all">Tous statuts</option>
              <option value="paid">Payées</option>
              <option value="pending">En attente</option>
            </select>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white"
            />
            {monthFilter && (
              <button
                onClick={() => setMonthFilter('')}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Effacer
              </button>
            )}
            <button
              onClick={() => { void handleExportCSV() }}
              disabled={exporting}
              className="px-3 py-1.5 text-xs font-medium bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] disabled:opacity-50 transition-colors"
            >
              {exporting ? 'Export…' : 'Export CSV'}
            </button>
          </div>
        </div>

        {loadingInvoices ? (
          <div className="p-5 space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-zinc-100 rounded-lg" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-400">Aucune facture</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-2.5">Stagiaire</th>
                <th className="text-right px-5 py-2.5">Montant TTC</th>
                <th className="text-left px-5 py-2.5">Statut</th>
                <th className="text-left px-5 py-2.5">Date paiement</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const intern = inv.cases?.interns
                const name = intern
                  ? `${intern.first_name ?? ''} ${intern.last_name ?? ''}`.trim()
                  : 'N/A'
                const isPaid = !!inv.paid_at
                return (
                  <tr key={inv.id} className="border-t border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3 text-[#1a1918] font-medium">{name}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {formatEur(inv.amount_ttc)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isPaid
                            ? 'bg-green-100 text-[#0d9e75]'
                            : 'bg-amber-100 text-[#d97706]'
                        }`}
                      >
                        {isPaid ? 'Payée' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">
                      {inv.paid_at
                        ? new Date(inv.paid_at).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
