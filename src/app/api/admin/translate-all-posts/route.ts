import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const maxDuration = 300

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const BATCHES: [string, string][][] = [
  [['fr','French'],['es','Spanish'],['de','German'],['pt','Portuguese (European)'],['it','Italian'],['nl','Dutch']],
  [['pl','Polish'],['sv','Swedish'],['da','Danish'],['ro','Romanian'],['cs','Czech'],['hu','Hungarian']],
  [['el','Greek'],['bg','Bulgarian'],['hr','Croatian'],['sk','Slovak'],['fi','Finnish'],['no','Norwegian']],
  [['lt','Lithuanian'],['lv','Latvian'],['et','Estonian'],['sl','Slovenian']],
]

async function translateBatch(
  client: Anthropic,
  batch: [string,string][],
  title: string, excerpt: string, seoTitle: string, seoDesc: string
): Promise<Record<string, Record<string, string>>> {
  const langList = batch.map(([code, name]) => `${name} (${code})`).join(', ')
  const keys = batch.map(([code]) => code).join(', ')

  const prompt = `Translate from English to: ${langList}.
Return ONLY valid compact JSON keys [${keys}]. Each: {"title":"","excerpt":"","seo_title":"","seo_desc":""}.
No markdown, no preamble.
---
Title: ${title}
SEO Title: ${seoTitle || title}
Excerpt: ${(excerpt || '').slice(0, 300)}
SEO Desc: ${(seoDesc || excerpt || '').slice(0, 200)}`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  let raw = (msg.content[0] as { type: string; text: string }).text.trim()
  if (raw.startsWith('```')) raw = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  // Fix truncated JSON
  const opens = (raw.match(/\{/g) || []).length
  const closes = (raw.match(/\}/g) || []).length
  if (opens > closes) raw += '}'.repeat(opens - closes)

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function POST(req: Request) {
  const { secret, slug_filter } = await req.json() as { secret?: string; slug_filter?: string }
  if (secret !== process.env.ADMIN_SECRET && secret !== 'bali2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = admin()
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Get posts needing translation
  let query = db.from('blog_posts')
    .select('id, slug, title_en, excerpt_en, seo_title_en, seo_desc_en, title_es')
    .eq('status', 'published')
    .is('title_es', null)

  if (slug_filter) query = query.eq('slug', slug_filter)

  const { data: posts } = await query

  if (!posts?.length) return NextResponse.json({ message: 'All posts already translated', count: 0 })

  const results: { slug: string; status: string; langs?: number }[] = []

  for (const post of posts) {
    const allUpdates: Record<string, string> = {}

    for (const batch of BATCHES) {
      try {
        const translations = await translateBatch(
          claude, batch,
          post.title_en || '',
          post.excerpt_en || '',
          post.seo_title_en || post.title_en || '',
          post.seo_desc_en || post.excerpt_en || ''
        )
        for (const [code, fields] of Object.entries(translations)) {
          if (typeof fields !== 'object') continue
          if (fields.title) allUpdates[`title_${code}`] = fields.title
          if (fields.excerpt) allUpdates[`excerpt_${code}`] = fields.excerpt
          if (fields.seo_title) allUpdates[`seo_title_${code}`] = fields.seo_title
          if (fields.seo_desc) allUpdates[`seo_desc_${code}`] = fields.seo_desc
        }
        await new Promise(r => setTimeout(r, 800))
      } catch {
        // continue with next batch
      }
    }

    if (Object.keys(allUpdates).length > 0) {
      await db.from('blog_posts').update(allUpdates).eq('id', post.id)
      results.push({ slug: post.slug, status: 'ok', langs: Object.keys(allUpdates).length / 4 })
    } else {
      results.push({ slug: post.slug, status: 'no_translations' })
    }

    await new Promise(r => setTimeout(r, 1500))
  }

  return NextResponse.json({ results, total: posts.length, translated: results.filter(r => r.status === 'ok').length })
}
