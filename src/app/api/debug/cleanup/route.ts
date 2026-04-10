import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const TEST_EMAIL_PATTERNS = [
  '%test%@example.com',
  '%trace.%@%',
  'jean.test%@%',
]

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const deleted: { interns: number; cases: number } = { interns: 0, cases: 0 }

  for (const pattern of TEST_EMAIL_PATTERNS) {
    // Find matching interns
    const { data: interns } = await admin
      .from('interns')
      .select('id')
      .ilike('email', pattern)

    if (interns && interns.length > 0) {
      const internIds = interns.map(i => i.id)

      // Delete cases linked to these interns
      const { count: casesDeleted } = await admin
        .from('cases')
        .delete({ count: 'exact' })
        .in('intern_id', internIds)

      deleted.cases += casesDeleted ?? 0

      // Delete the interns
      const { count: internsDeleted } = await admin
        .from('interns')
        .delete({ count: 'exact' })
        .in('id', internIds)

      deleted.interns += internsDeleted ?? 0
    }
  }

  return NextResponse.json({ ok: true, deleted })
}
