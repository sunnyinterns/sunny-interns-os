import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      email?: string
      step_reached?: number
      data_collected?: Record<string, unknown>
    }
    const supabase = getServiceClient()
    await supabase.from('form_abandonments').insert({
      email: body.email ?? null,
      step_reached: body.step_reached ?? 1,
      data_collected: body.data_collected ?? {},
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // non-blocking
  }
}
