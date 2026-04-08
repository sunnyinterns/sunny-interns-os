import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const from = url.searchParams.get('from') || `${new Date().getFullYear()}-01`
  const to = url.searchParams.get('to') || `${new Date().getFullYear()}-12`
  const fromDate = `${from}-01`
  const toDate = `${to}-31`

  const { data: cases } = await supabase
    .from('cases')
    .select('id, status, payment_amount, payment_date, payment_type, discount_percentage, invoice_number, fazza_transfer_amount_idr, interns(first_name, last_name), packages(name)')
    .not('payment_date', 'is', null)
    .gte('payment_date', fromDate)
    .lte('payment_date', toDate)
    .order('payment_date', { ascending: false })

  const header = 'Stagiaire,Package,Montant,Remise%,Visa IDR,Date paiement,Type,N° Facture\n'
  const rows = (cases ?? []).map(c => {
    const intern = c.interns as unknown as { first_name: string; last_name: string } | null
    const pkg = c.packages as unknown as { name: string } | null
    return [
      intern ? `${intern.first_name} ${intern.last_name}` : '',
      pkg?.name ?? '',
      c.payment_amount ?? 0,
      c.discount_percentage ?? 0,
      c.fazza_transfer_amount_idr ?? 0,
      c.payment_date ?? '',
      c.payment_type ?? '',
      c.invoice_number ?? '',
    ].join(',')
  }).join('\n')

  const csv = header + rows
  const filename = `sunny-interns-finances-${from}-${to}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
