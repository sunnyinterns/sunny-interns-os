import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM
  const status = searchParams.get('status') // paid | pending | all
  const format = searchParams.get('format') // csv

  try {
    let query = supabase
      .from('billing')
      .select('id, amount_ttc, paid_at, created_at, cases(id, interns(first_name, last_name))')
      .order('created_at', { ascending: false })

    if (month) {
      query = query.gte('created_at', `${month}-01`).lt('created_at', nextMonth(month))
    }
    if (status === 'paid') {
      query = query.not('paid_at', 'is', null)
    } else if (status === 'pending') {
      query = query.is('paid_at', null)
    }

    const { data, error } = await query
    if (error) throw error

    const invoices = (data ?? []) as Array<Record<string, unknown>>

    if (format === 'csv') {
      const rows = ['Stagiaire,Montant TTC,Statut,Date paiement,Date création']
      for (const inv of invoices) {
        const caseData = inv.cases as Record<string, unknown> | null
        const intern = caseData?.interns as Record<string, string> | null
        const name = intern ? `${intern.first_name ?? ''} ${intern.last_name ?? ''}`.trim() : 'N/A'
        const amount = Number(inv.amount_ttc || 0).toFixed(2)
        const paidStatus = inv.paid_at ? 'Payé' : 'En attente'
        const paidAt = inv.paid_at ? new Date(String(inv.paid_at)).toLocaleDateString('fr-FR') : ''
        const createdAt = inv.created_at ? new Date(String(inv.created_at)).toLocaleDateString('fr-FR') : ''
        rows.push(`"${name}",${amount},${paidStatus},${paidAt},${createdAt}`)
      }
      return new NextResponse(rows.join('\n'), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="factures.csv"',
        },
      })
    }

    return NextResponse.json(invoices)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function nextMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  const d = new Date(y, m, 1) // month is 0-indexed in Date, so this gives next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
