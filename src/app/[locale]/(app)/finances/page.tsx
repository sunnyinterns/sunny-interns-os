'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface FinanceRow {
  id: string
  intern_name: string
  package_name: string
  tarif: number
  discount: number
  amount_ht: number
  tva: number
  amount_ttc: number
  visa_idr: number
  visa_eur: number
  marge: number
  payment_date: string
  payment_type: string
  invoice_number: string
}

interface FinanceData {
  kpis: {
    totalEncaisse: number
    totalVisaEur: number
    margeBrute: number
    nbPlacements: number
    ticketMoyen: number
  }
  rows: FinanceRow[]
  idr_rate: number
  period: { from: string; to: string }
}

interface Supplier {
  id: string
  name: string
  website: string | null
  industry: string | null
  company_type: string | null
  contact_email: string | null
}

export default function FinancesPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/finances?from=${month}&to=${month}`)
      .then(r => r.ok ? r.json() as Promise<FinanceData> : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [month])

  useEffect(() => {
    fetch('/api/companies?role=supplier')
      .then(r => r.ok ? r.json() as Promise<Supplier[]> : [])
      .then(s => setSuppliers(Array.isArray(s) ? s : []))
      .catch(() => setSuppliers([]))
  }, [])

  function exportCsv() {
    window.open(`/api/finances/export?from=${month}&to=${month}`, '_blank')
  }

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1918]">Finances</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Reporting financier {data ? `· Taux IDR/EUR: ${fmt(data.idr_rate)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
          />
          <button
            onClick={exportCsv}
            className="px-4 py-2 bg-[#c8a96e] text-white rounded-lg text-sm font-semibold hover:bg-[#b89a5e]"
          >
            Exporter CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total encaissé', value: `${fmt(data.kpis.totalEncaisse)}€`, color: '#0d9e75' },
            { label: 'Total visa (EUR)', value: `${fmt(data.kpis.totalVisaEur)}€`, color: '#d97706' },
            { label: 'Marge brute', value: `${fmt(data.kpis.margeBrute)}€`, color: '#c8a96e' },
            { label: 'Placements', value: String(data.kpis.nbPlacements), color: '#3b82f6' },
            { label: 'Ticket moyen', value: `${fmt(data.kpis.ticketMoyen)}€`, color: '#6b7280' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-zinc-100 rounded-lg" />)}
        </div>
      ) : data && data.rows.length > 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium text-xs">Stagiaire</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium text-xs">Package</th>
                <th className="text-right px-3 py-2.5 text-zinc-500 font-medium text-xs">Montant</th>
                <th className="text-right px-3 py-2.5 text-zinc-500 font-medium text-xs">Visa IDR</th>
                <th className="text-right px-3 py-2.5 text-zinc-500 font-medium text-xs">Visa EUR</th>
                <th className="text-right px-3 py-2.5 text-zinc-500 font-medium text-xs">Marge</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium text-xs">Date</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium text-xs">N° Facture</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map(row => (
                <tr key={row.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer" onClick={() => window.location.href = `/fr/cases/${row.id}`}>
                  <td className="px-3 py-2.5 font-medium text-[#1a1918]">{row.intern_name}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{row.package_name}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{fmt(row.amount_ttc)}€</td>
                  <td className="px-3 py-2.5 text-right text-zinc-500">{row.visa_idr > 0 ? `${fmt(row.visa_idr)} IDR` : '-'}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-500">{row.visa_eur > 0 ? `${fmt(row.visa_eur)}€` : '-'}</td>
                  <td className="px-3 py-2.5 text-right font-medium" style={{ color: row.marge > 0 ? '#0d9e75' : '#dc2626' }}>
                    {fmt(row.marge)}€
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500">
                    {row.payment_date ? new Date(row.payment_date).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400 text-xs font-mono">{row.invoice_number || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center">
          <p className="text-zinc-400">Aucun paiement pour cette période</p>
        </div>
      )}

      {/* Fournisseurs */}
      <div className="mt-10">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">📦 Fournisseurs</h2>
        {suppliers.length === 0 ? (
          <div className="bg-white border border-dashed border-zinc-200 rounded-2xl p-8 text-center">
            <p className="text-zinc-400 text-sm">Aucun fournisseur — cochez <span className="font-medium">📦 Fournisseur</span> sur une fiche entreprise.</p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400">Fournisseur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400">Catégorie</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400">Contact</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1a1918]">{s.name}</p>
                      {s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c8a96e] hover:underline">{s.website}</a>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{s.industry ?? s.company_type ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{s.contact_email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/companies/${s.id}`} className="text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200">Fiche →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
