import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [employers, partners, suppliers] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('is_employer', true),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('is_partner', true),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('is_supplier', true),
  ])

  return NextResponse.json({
    employers: employers.count ?? 0,
    partners: partners.count ?? 0,
    suppliers: suppliers.count ?? 0,
    total: (employers.count ?? 0) + (partners.count ?? 0) + (suppliers.count ?? 0),
  })
}
