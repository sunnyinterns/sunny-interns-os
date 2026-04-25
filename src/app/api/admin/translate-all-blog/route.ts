import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const BATCHES: [string,string][][] = [
  [['fr','French'],['es','Spanish'],['de','German'],['pt','Portuguese'],['it','Italian'],['nl','Dutch']],
  [['pl','Polish'],['sv','Swedish'],['da','Danish'],['ro','Romanian'],['cs','Czech'],['hu','Hungarian']],
  [['el','Greek'],['bg','Bulgarian'],['hr','Croatian'],['sk','Slovak'],['fi','Finnish'],['no','Norwegian']],
  [['lt','Lithuanian'],['lv','Latvian'],['et','Estonian'],['sl','Slovenian']],
]

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function makePrompt(langs: [string,string][], title: string, excerpt: string, body: string, seoTitle: string, seoDesc: string): string {
  const langList = langs.map(([c,n]) => `${n} (${c})`).join(', ')
  const keys = langs.map(([c]) => c).join(', ')
  return `Translate from English to: ${langList}.
Return ONLY valid JSON with keys [${keys}]. Each: {"title":"","excerpt":"","seo_title":"","seo_desc":"","body":""}.
No markdown, no preamble.
---
Title: ${title}
SEO Title: ${seoTitle || title}
Excerpt: ${(excerpt||'').slice(0,200)}
Body: ${(body||'').slice(0,400)}`
}

export const maxDuration = 60 // Vercel Pro: 60s max

export async function POST(req: Request) {
  const body = await req.json() as { secret?: string; post_id?: string; batch_index?: number }
  if (body.secret !== (process.env.ADMIN_SECRET ?? 'bali2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = admin()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // Get next untranslated post or specific post
  let post: Record<string,string> | null = null
  
  if (body.post_id) {
    const { data } = await db.from('blog_posts')
      .select('id,slug,title_en,excerpt_en,body_en,seo_title_en,seo_desc_en')
      .eq('id', body.post_id).single()
    post = data as Record<string,string>
  } else {
    const { data } = await db.from('blog_posts')
      .select('id,slug,title_en,excerpt_en,body_en,seo_title_en,seo_desc_en,title_es')
      .eq('status', 'published').is('title_es', null).limit(1).single()
    post = data as Record<string,string>
  }

  if (!post) return NextResponse.json({ message: 'All translated', done: true })

  // Process ONE batch per call to avoid timeout
  const batchIndex = body.batch_index ?? 0
  const batch = BATCHES[batchIndex]
  if (!batch) return NextResponse.json({ message: 'All batches done', done: true, post_id: post.id })

  const allUpdates: Record<string, string> = {}

  try {
    const prompt = makePrompt(batch, post.title_en||'', post.excerpt_en||'', post.body_en||'', post.seo_title_en||'', post.seo_desc_en||'')
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    })
    const raw = (msg.content[0] as {text:string}).text.replace(/```json[\s\S]*?```|```/g, '').trim()
    let fixed = raw
    if (!fixed.endsWith('}')) {
      const opens = (fixed.match(/\{/g)||[]).length
      const closes = (fixed.match(/\}/g)||[]).length
      fixed += '}'.repeat(Math.max(0, opens - closes))
    }
    const translations = JSON.parse(fixed) as Record<string, Record<string, string>>
    for (const [lang, fields] of Object.entries(translations)) {
      if (fields.title) allUpdates[`title_${lang}`] = fields.title
      if (fields.excerpt) allUpdates[`excerpt_${lang}`] = fields.excerpt
      if (fields.seo_title) allUpdates[`seo_title_${lang}`] = fields.seo_title
      if (fields.seo_desc) allUpdates[`seo_desc_${lang}`] = fields.seo_desc
      if (fields.body) allUpdates[`body_${lang}`] = fields.body
    }
  } catch (e) {
    return NextResponse.json({ error: String(e), post_id: post.id, batch_index: batchIndex }, { status: 500 })
  }

  if (Object.keys(allUpdates).length > 0) {
    await db.from('blog_posts').update(allUpdates).eq('id', post.id)
  }

  const nextBatch = batchIndex + 1
  const isLastBatch = nextBatch >= BATCHES.length
  
  // Count remaining
  const { count } = await db.from('blog_posts').select('*', {count:'exact'}).eq('status','published').is('title_es',null)

  return NextResponse.json({
    slug: post.slug,
    post_id: post.id,
    batch_index: batchIndex,
    langs_translated: Object.keys(allUpdates).length,
    next_batch: isLastBatch ? null : nextBatch,
    post_done: isLastBatch,
    remaining_posts: count ?? 0,
  })
}
