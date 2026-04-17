/**
 * POST /api/finances/invoices/upload
 * 1. Reçoit un fichier (PDF ou image)
 * 2. Upload dans Supabase Storage bucket "invoices"
 * 3. Extrait les données avec Claude API (vision)
 * 4. Retourne les données extraites pour pré-remplir le formulaire
 */
import { createClient } from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return svcClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const CATEGORIES: Record<string, string> = {
  visa: 'visa_agent',
  immigration: 'visa_agent',
  voa: 'visa_agent',
  kitas: 'visa_agent',
  hébergement: 'accommodation',
  logement: 'accommodation',
  villa: 'accommodation',
  guesthouse: 'accommodation',
  transport: 'transport',
  driver: 'transport',
  chauffeur: 'transport',
  marketing: 'marketing',
  publicité: 'marketing',
  instagram: 'marketing',
  facebook: 'marketing',
  meta: 'marketing',
  tiktok: 'marketing',
  google: 'marketing',
  software: 'software',
  logiciel: 'software',
  abonnement: 'software',
  saas: 'software',
  vercel: 'software',
  supabase: 'software',
  notion: 'software',
  slack: 'software',
  comptable: 'tax',
  juridique: 'legal',
  notaire: 'legal',
  avocat: 'legal',
}

function guessCategory(text: string): string {
  const lower = text.toLowerCase()
  for (const [keyword, cat] of Object.entries(CATEGORIES)) {
    if (lower.includes(keyword)) return cat
  }
  return 'other'
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const sb = svc()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const storagePath = `invoices/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  // 1. Upload to Supabase Storage
  const bytes = await file.arrayBuffer()
  const { error: uploadErr } = await sb.storage
    .from('invoices')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadErr) {
    return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 })
  }

  const { data: urlData } = sb.storage.from('invoices').getPublicUrl(storagePath)

  // 2. Extract data with Claude
  let extracted: Record<string, string | null> = {}
  let confidence = 'low'

  try {
    const base64 = Buffer.from(bytes).toString('base64')
    const isPdf = file.type === 'application/pdf'
    const mediaType = isPdf ? 'application/pdf' : (file.type as 'image/jpeg' | 'image/png' | 'image/webp')

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You extract structured data from invoices/receipts. Return ONLY a JSON object, no markdown, no explanation. Extract these fields if present:
- invoice_number: string or null
- supplier_name: string (the company/person sending the invoice)
- invoice_date: string in YYYY-MM-DD format or null
- due_date: string in YYYY-MM-DD format or null
- amount_total: number in the main currency or null
- currency: 3-letter code (EUR, IDR, USD, SGD) or null
- amount_eur: number converted to EUR if possible, null if IDR or unknown
- description: short description of what the invoice is for (max 80 chars)
- confidence: "high" if you're sure of the main fields, "medium" if some uncertainty, "low" if very hard to read`,
        messages: [{
          role: 'user',
          content: [
            {
              type: isPdf ? 'document' : 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: 'Extract invoice data from this document. Return only JSON.',
            },
          ],
        }],
      }),
    })

    if (claudeRes.ok) {
      const claudeData = await claudeRes.json() as { content: Array<{ type: string; text: string }> }
      const text = claudeData.content.find(c => c.type === 'text')?.text ?? ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean) as Record<string, string | number | null>
      confidence = String(parsed.confidence ?? 'medium')
      extracted = {
        invoice_number: parsed.invoice_number ? String(parsed.invoice_number) : null,
        supplier_name: parsed.supplier_name ? String(parsed.supplier_name) : null,
        invoice_date: parsed.invoice_date ? String(parsed.invoice_date) : null,
        due_date: parsed.due_date ? String(parsed.due_date) : null,
        amount_total: parsed.amount_total != null ? String(parsed.amount_total) : null,
        currency: parsed.currency ? String(parsed.currency) : null,
        amount_eur: parsed.amount_eur != null ? String(parsed.amount_eur) : null,
        description: parsed.description ? String(parsed.description) : null,
      }
    }
  } catch (e) {
    console.error('[invoice-upload] Claude extraction failed:', e)
  }

  // 3. Auto-categorize
  const categoryGuess = guessCategory(
    [extracted.supplier_name, extracted.description].filter(Boolean).join(' ')
  )

  return NextResponse.json({
    file_path: storagePath,
    pdf_url: urlData.publicUrl,
    extracted,
    category: categoryGuess,
    confidence,
  })
}
