import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: cases } = await supabase
    .from('cases')
    .select('id, status')
    .in('status', ['job_retained', 'convention_signed', 'payment_pending', 'visa_docs_sent', 'visa_submitted'])

  if (!cases?.length) { console.log('❌ Aucun case trouvé. Lance seed-demo d\'abord.'); process.exit(1) }

  // Supprimer les items non résolus existants pour repartir propre
  await supabase.from('en_attente').delete().is('resolved_at', null)

  const now = new Date()
  const items: Record<string, unknown>[] = []

  for (const c of cases) {
    if (c.status === 'job_retained') {
      items.push({ case_id: c.id, type: 'convention', waiting_for: 'school',
        notes: 'Signature convention de stage par l\'école',
        due_date: new Date(now.getTime() + 7 * 86400000).toISOString() })
    }
    if (c.status === 'convention_signed') {
      items.push({ case_id: c.id, type: 'payment', waiting_for: 'intern',
        notes: 'Paiement package visa en attente',
        due_date: new Date(now.getTime() + 3 * 86400000).toISOString() })
    }
    if (c.status === 'payment_pending') {
      items.push({ case_id: c.id, type: 'engagement_letter', waiting_for: 'employer',
        notes: 'Lettre invitation employeur pour le visa',
        due_date: new Date(now.getTime() + 5 * 86400000).toISOString() })
    }
    if (c.status === 'visa_docs_sent') {
      items.push({ case_id: c.id, type: 'visa_docs', waiting_for: 'agent',
        notes: 'Confirmation réception dossier par l\'agent visa',
        due_date: new Date(now.getTime() + 2 * 86400000).toISOString() })
    }
    if (c.status === 'visa_submitted') {
      items.push({ case_id: c.id, type: 'visa_docs', waiting_for: 'manager',
        notes: 'Retour visa immigration indonésienne',
        due_date: new Date(now.getTime() + 10 * 86400000).toISOString() })
    }
  }

  if (!items.length) { console.log('⚠️ Aucun item à insérer.'); return }

  const { error } = await supabase.from('en_attente').insert(items)
  if (error) { console.error('❌', error.message); process.exit(1) }

  console.log(`✅ ${items.length} items en_attente insérés`)
  const g = items.reduce((a: Record<string, number>, i) => { a[i.waiting_for as string] = (a[i.waiting_for as string] ?? 0) + 1; return a }, {})
  Object.entries(g).forEach(([w, n]) => console.log(`   → ${w}: ${n}`))
}

main().catch(console.error)
