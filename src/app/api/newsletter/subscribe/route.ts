import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { email, source = 'website', locale = 'en' } = await req.json() as {
    email: string; source?: string; locale?: string
  }
  
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const supabase = db()
  
  // Use dedup function
  const { data, error } = await supabase.rpc('upsert_newsletter_subscriber', {
    p_email: email.toLowerCase().trim(),
    p_source: source,
    p_locale: locale,
  })
  
  if (error) {
    // Fallback: direct insert
    await supabase.from('newsletter_subscribers').upsert(
      { email: email.toLowerCase().trim(), source, created_at: new Date().toISOString() },
      { onConflict: 'email' }
    )
  }

  return NextResponse.json({ success: true, lead_id: (data as {lead_id:string})?.lead_id })
}
