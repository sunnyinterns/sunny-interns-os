import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const BATCHES: [string, string][][] = [
  [['fr','French'],['es','Spanish'],['de','German'],['pt','Portuguese (European)'],['it','Italian'],['nl','Dutch']],
  [['pl','Polish'],['sv','Swedish'],['da','Danish'],['ro','Romanian'],['cs','Czech'],['hu','Hungarian']],
  [['el','Greek'],['bg','Bulgarian'],['hr','Croatian'],['sk','Slovak'],['fi','Finnish'],['no','Norwegian']],
  [['lt','Lithuanian'],['lv','Latvian'],['et','Estonian'],['sl','Slovenian']],
]

export const maxDuration = 300

export async function POST(req: Request) {
  const { secret } = await req.json() as { secret?: string }
  if (secret !== 'bali2026') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { data: posts } = await db
    .from('blog_posts')
    .select('id, slug, title_en, excerpt_en, body_en, seo_title_en, seo_desc_en')
    .eq('status', 'published')
    .is('title_es', null)

  if (!posts?.length) return NextResponse.json({ message: 'All posts already translated', count: 0 })

  const results: { slug: string; status: string }[] = []

  for (const post of posts) {
    const updates: Record<string, string> = {}

    for (const batch of BATCHES) {
      const langList = batch.map(([c,n]) => `${n} (${c})`).join(', ')
      const keys = batch.map(([c]) => c).join(', ')
      try {
        const msg = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1800,
          messages: [{ role: 'user', content: `Translate from English to: ${langList}.
Return ONLY valid JSON with keys [${keys}]. Each: {"title":"","excerpt":"","seo_title":"","seo_desc":""}.
No markdown.
Title: ${post.title_en}
SEO Title: ${post.seo_title_en || post.title_en}
Excerpt: ${(post.excerpt_en || '').slice(0, 200)}
SEO Desc: ${(post.seo_desc_en || post.excerpt_en || '').slice(0, 200)}` }]
        })
        const raw = (msg.content[0] as { text: string }).text.replace(/```json|```/g, '').trim()
        const json = JSON.parse(raw) as Record<string, Record<string, string>>
        for (const [lang, fields] of Object.entries(json)) {
          if (fields.title) updates[`title_${lang}`] = fields.title
          if (fields.excerpt) updates[`excerpt_${lang}`] = fields.excerpt
          if (fields.seo_title) updates[`seo_title_${lang}`] = fields.seo_title
          if (fields.seo_desc) updates[`seo_desc_${lang}`] = fields.seo_desc
        }
      } catch { /* skip */ }
      await new Promise(r => setTimeout(r, 300))
    }

    if (Object.keys(updates).length > 0) {
      await db.from('blog_posts').update(updates).eq('id', post.id)
      results.push({ slug: post.slug, status: 'ok' })
    } else {
      results.push({ slug: post.slug, status: 'no_updates' })
    }
  }

  return NextResponse.json({ results, total: posts.length, translated: results.filter(r => r.status === 'ok').length })
}
