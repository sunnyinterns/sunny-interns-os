import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// One batch of 6 languages per API call to avoid timeout
const BATCHES = [
  [['fr','French'],['es','Spanish'],['de','German'],['pt','Portuguese (European)'],['it','Italian'],['nl','Dutch']],
  [['pl','Polish'],['sv','Swedish'],['da','Danish'],['ro','Romanian'],['cs','Czech'],['hu','Hungarian']],
  [['el','Greek'],['bg','Bulgarian'],['hr','Croatian'],['sk','Slovak'],['fi','Finnish'],['no','Norwegian']],
  [['lt','Lithuanian'],['lv','Latvian'],['et','Estonian'],['sl','Slovenian']],
] as [string,string][][]

export async function POST(req: Request) {
  const body = await req.json() as { secret?: string; batch?: number; post_id?: string }
  if (body.secret !== 'bali2026') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

  const db = sb()
  const batchIndex = body.batch ?? 0 // 0-3 for the 4 language batches

  // Get ONE post missing translation
  let query = db.from('blog_posts')
    .select('id, title_en, excerpt_en, body_en, seo_title_en, seo_desc_en, category')
    .eq('status', 'published')
    .is('title_es', null)
    .limit(1)
  
  if (body.post_id) {
    query = db.from('blog_posts')
      .select('id, title_en, excerpt_en, body_en, seo_title_en, seo_desc_en, category')
      .eq('id', body.post_id)
      .limit(1)
  }

  const { data: posts, error: fetchErr } = await query
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!posts?.length) return NextResponse.json({ message: 'All posts translated', done: true })

  const post = posts[0] as {
    id: string; title_en: string; excerpt_en: string;
    body_en: string; seo_title_en: string; seo_desc_en: string; category: string
  }
  
  const batch = BATCHES[batchIndex]
  if (!batch) return NextResponse.json({ error: 'Invalid batch index' }, { status: 400 })
  
  const langList = batch.map(([c, n]) => `${n} (${c})`).join(', ')
  const keys = batch.map(([c]) => c).join(', ')
  
  const prompt = `Translate from English to: ${langList}.
Return ONLY valid JSON with keys [${keys}]. Each key: {"title":"","excerpt":"","seo_title":"","seo_desc":"","body":""}.
No markdown, no extra text, no preamble.
---
Title: ${post.title_en}
SEO Title: ${post.seo_title_en || post.title_en}
Excerpt: ${(post.excerpt_en || '').slice(0, 300)}
SEO Desc: ${(post.seo_desc_en || post.excerpt_en || '').slice(0, 200)}
Body: ${(post.body_en || '').slice(0, 600)}`

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!aiRes.ok) {
    const errText = await aiRes.text()
    return NextResponse.json({ error: `Claude API error: ${aiRes.status} ${errText.slice(0,200)}` }, { status: 500 })
  }
  
  const aiData = await aiRes.json() as { content?: Array<{ text?: string }> }
  const raw = (aiData.content?.[0]?.text ?? '').replace(/```json[\s\S]*?```|```/g, '').trim()
  
  let parsed: Record<string, Record<string, string>> = {}
  try { parsed = JSON.parse(raw) as Record<string, Record<string, string>> }
  catch { return NextResponse.json({ error: `JSON parse failed: ${raw.slice(0,200)}` }, { status: 500 }) }

  const updates: Record<string, string> = {}
  for (const [lang, fields] of Object.entries(parsed)) {
    if (fields.title) updates[`title_${lang}`] = fields.title
    if (fields.excerpt) updates[`excerpt_${lang}`] = fields.excerpt
    if (fields.seo_title) updates[`seo_title_${lang}`] = fields.seo_title
    if (fields.seo_desc) updates[`seo_desc_${lang}`] = fields.seo_desc
    if (fields.body) updates[`body_${lang}`] = fields.body
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await db.from('blog_posts').update(updates).eq('id', post.id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    post_id: post.id,
    title: post.title_en,
    batch: batchIndex,
    fields_updated: Object.keys(updates).length,
    next_batch: batchIndex < 3 ? batchIndex + 1 : null,
    done: batchIndex >= 3,
  })
}
