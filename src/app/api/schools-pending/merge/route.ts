import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/schools-pending/merge
// Body: { pending_id: string, school_id: string }
// Marque la pending school comme fusionnée avec une école existante
export async function POST(req: Request) {
  try {
    const { pending_id, school_id } = await req.json() as { pending_id: string; school_id: string }
    if (!pending_id || !school_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const admin = createAdminClient()

    // Marquer la pending school comme merged
    const { error } = await admin.from('schools_pending').update({
      status: 'merged',
      merged_into_school_id: school_id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', pending_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Mettre à jour les interns qui avaient cette école pending (school_name)
    // On ne peut pas faire plus sans connaître le school_name original,
    // mais on peut mettre à jour leur school_id vers l'école validée
    const { data: pendingSchool } = await admin.from('schools_pending')
      .select('name, submitted_by_email').eq('id', pending_id).maybeSingle()

    if (pendingSchool?.name) {
      await admin.from('interns').update({ school_id })
        .ilike('school_name', pendingSchool.name).is('school_id', null)
        .then(() => null, () => null)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
