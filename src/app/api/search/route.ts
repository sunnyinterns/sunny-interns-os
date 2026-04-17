import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ interns: [], companies: [], jobs: [], contacts: [], total: 0 })

  // Use server-side RPC with unaccent for proper accent-insensitive search
  const { data, error } = await supabase.rpc('global_search', { q })

  if (error) {
    console.error('[search] RPC error:', error.message)
    return NextResponse.json({ interns: [], companies: [], jobs: [], contacts: [], total: 0, error: error.message })
  }

  const result = (data as { interns?: unknown[]; contacts?: unknown[]; companies?: unknown[]; jobs?: unknown[] }) ?? {}
  const interns  = result.interns  ?? []
  const contacts = result.contacts ?? []
  const companies= result.companies ?? []
  const jobs     = result.jobs     ?? []

  return NextResponse.json({
    interns, contacts, companies, jobs,
    total: interns.length + contacts.length + companies.length + jobs.length,
  })
}
