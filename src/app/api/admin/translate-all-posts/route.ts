import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const LANGS = [
  ['fr','French'],['es','Spanish'],['de','German'],['pt','Portuguese (European)'],['it','Italian'],['nl','Dutch'],
  ['pl','Polish'],['sv','Swedish'],['da','Danish'],['ro','Romanian'],['cs','Czech'],['hu','Hungarian'],
  ['el','Greek'],['bg','Bulgarian'],['hr','Croatian'],['sk','Slovak'],['fi','Finnish'],['no','Norwegian'],
  ['lt','Lithuanian'],['lv','Latvian'],['et','Estonian'],['sl','Slovenian'],
]

const BATCHES = [
  LANGS.slice(0,6), LANGS.slice(6,12), LANGS.slice(12,18), LANGS.slice(18),
] as [string,string][][]

async function translatePost(
  post: { id: string; title_en: string; excerpt_en: string; body_en: string; seo_title_en: string; seo_desc_en: string; category: string },
  apiKey: string
): Promise<Record<string, string>> {
  const updates: Record<string, string> = {}
  
  for (const batch of BATCHES) {
    const langList = batch.map(([c, n]) => `${n} (${c})`).join(', ')
    const keys = batch.map(([c]) => c).join(', ')
    
    const prompt = `Translate from English to: ${langList}.
Return ONLY valid JSON with keys [${keys}]. Each key: {"title":"","excerpt":"","seo_title":"","seo_desc":"","body":""}.
No markdown, no extra text.
Title: ${post.title_en}
SEO Title: ${post.seo_title_en || post.title_en}
Excerpt: ${(post.excerpt_en || '').slice(0, 300)}
SEO Desc: ${(post.seo_desc_en || post.excerpt_en || '').slice(0, 200)}
Body: ${(post.body_en || '').slice(0, 600)}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
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
      
      if (!res.ok) continue
      const data = await res.json() as { content?: Array<{ text?: string }> }
      const raw = (data.content?.[0]?.text ?? '').replace(/```json[\s\S]*?```|```/g, '').trim()
      
      let parsed: Record<string, Record<string, string>> = {}
      try { parsed = JSON.parse(raw) as Record<string, Record<string, string>> } catch { continue }
      
      for (const [lang, fields] of Object.entries(parsed)) {
        if (fields.title) updates[`title_${lang}`] = fields.title
        if (fields.excerpt) updates[`excerpt_${lang}`] = fields.excerpt
        if (fields.seo_title) updates[`seo_title_${lang}`] = fields.seo_title
        if (fields.seo_desc) updates[`seo_desc_${lang}`] = fields.seo_desc
        if (fields.body) updates[`body_${lang}`] = fields.body
      }
      
      await new Promise(r => setTimeout(r, 500))
    } catch { continue }
  }
  
  return updates
}

export async function POST(req: Request) {
  const { secret, limit = 5 } = await req.json() as { secret?: string; limit?: number }
  if (secret !== 'bali2026') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })
  
  const db = sb()
  
  // Get posts missing translations (check es as proxy for "not translated")
  const { data: posts } = await db
    .from('blog_posts')
    .select('id, title_en, excerpt_en, body_en, seo_title_en, seo_desc_en, category, title_es')
    .eq('status', 'published')
    .is('title_es', null)
    .limit(limit)
  
  if (!posts?.length) return NextResponse.json({ message: 'All posts translated', count: 0 })
  
  const results = []
  for (const post of posts) {
    try {
      const updates = await translatePost(post as Parameters<typeof translatePost>[0], apiKey)
      if (Object.keys(updates).length > 0) {
        await db.from('blog_posts').update(updates).eq('id', post.id)
        results.push({ id: post.id, title: post.title_en, languages: Object.keys(updates).length, status: 'ok' })
      }
      await new Promise(r => setTimeout(r, 1000))
    } catch (e) {
      results.push({ id: post.id, title: post.title_en, status: 'error', error: String(e) })
    }
  }
  
  return NextResponse.json({ results, translated: results.filter(r => r.status === 'ok').length, total: posts.length })
}
