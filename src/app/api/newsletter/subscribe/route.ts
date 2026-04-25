import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Newsletter subscription → create/merge lead
// Dedup strategy: email is the primary key across all sources
// If lead exists → add 'newsletter' to sources, update status if needed
// If new → create lead with source=newsletter

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json() as { email: string; source?: string; locale?: string }
  const { email, source = 'newsletter', locale = 'fr' } = body

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Upsert newsletter_subscribers
  await db.from('newsletter_subscribers').upsert(
    { email: email.toLowerCase().trim(), source, locale, status: 'active' },
    { onConflict: 'email', ignoreDuplicates: false }
  )

  // 2. Check if lead/case already exists
  const { data: existingLead } = await db
    .from('website_leads')
    .select('id, source, touchpoints')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (existingLead) {
    // Merge: add newsletter to touchpoints
    const touchpoints = Array.isArray(existingLead.touchpoints) ? existingLead.touchpoints : []
    if (!touchpoints.includes('newsletter')) {
      touchpoints.push('newsletter')
    }
    await db.from('website_leads').update({
      touchpoints,
      updated_at: new Date().toISOString(),
    }).eq('id', existingLead.id)
    
    return NextResponse.json({ status: 'merged', lead_id: existingLead.id })
  }

  // 3. Create new lead with source=newsletter
  const { data: newLead } = await db.from('website_leads').insert({
    email: email.toLowerCase().trim(),
    source: 'newsletter',
    touchpoints: ['newsletter'],
    lead_status: 'lead',
    locale,
    score: 10, // newsletter subscribers are warm leads
    created_at: new Date().toISOString(),
  }).select('id').single()

  return NextResponse.json({ status: 'created', lead_id: newLead?.id })
}
