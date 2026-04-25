import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/admin/translate-all-blog
// Translates all blog posts to all 22 languages in batches

const LANGS = ['fr','es','de','pt','it','nl','pl','sv','da','ro','cs','hu','el','bg','hr','sk','fi','no','lt','lv','et','sl']
const BATCHES = [
  [['fr','French'],['es','Spanish'],['de','German'],['pt','Portuguese'],['it','Italian'],['nl','Dutch']],
  [['pl','Polish'],['sv','Swedish'],['da','Danish'],['ro','Romanian'],['cs','Czech'],['hu','Hungarian']],
  [['el','Greek'],['bg','Bulgarian'],['hr','Croatian'],['sk','Slovak'],['fi','Finnish'],['no','Norwegian']],
  [['lt','Lithuanian'],['lv','Latvian'],['et','Estonian'],['sl','Slovenian']],
] as [string,string][][]

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function makePrompt(langs: [string,string][], title: string, excerpt: string, body: string, seoTitle: string, seoDesc: string): string {
  const langList = langs.map(([c,n]) => `${n} (${c})`).join(', ')
  const keys = langs.map(([c]) => c).join(', ')
  return `Translate from English to: ${langList}.
Return ONLY valid JSON with keys [${keys}]. Each key: {"title":"","excerpt":"","seo_title":"","seo_desc":"","body":""}.
No markdown, no preamble, no trailing commas.
---
Title: ${title}
SEO Title: ${seoTitle || title}
Excerpt: ${(excerpt || '').slice(0,300)}
SEO Desc: ${(seoDesc || excerpt || '').slice(0,200)}
Body: ${(body || '').slice(0, 600)}`
}

export async function POST(req: Request) {
  const { secret, post_id } = await req.json() as { secret?: string; post_id?: string }
  if (secret !== (process.env.ADMIN_SECRET ?? 'bali2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = admin()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // Get posts that need translation (ES missing = not translated yet)
  let query = db.from('blog_posts')
    .select('id,slug,title_en,excerpt_en,body_en,seo_title_en,seo_desc_en,title_es')
    .eq('status', 'published')
    .is('title_es', null)

  if (post_id) query = db.from('blog_posts')
    .select('id,slug,title_en,excerpt_en,body_en,seo_title_en,seo_desc_en,title_es')
    .eq('id', post_id)

  const { data: posts } = await query

  if (!posts?.length) return NextResponse.json({ message: 'All translated', count: 0 })

  const results: { slug: string; batches: number; error?: string }[] = []

  for (const post of posts.slice(0, 5)) { // Process max 5 at a time to avoid timeout
    const allUpdates: Record<string, string> = {}
    let batchCount = 0

    for (const batch of BATCHES) {
      try {
        const prompt = makePrompt(
          batch,
          post.title_en || '',
          post.excerpt_en || '',
          post.body_en || '',
          post.seo_title_en || '',
          post.seo_desc_en || ''
        )

        const msg = await anthropic.messages.create({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })

        const raw = (msg.content[0] as { text: string }).text.replace(/```json[\s\S]*?```|```/g, '').trim()
        
        // Fix truncated JSON
        let fixed = raw
        if (!fixed.endsWith('}')) {
          const opens = (fixed.match(/\{/g) || []).length
          const closes = (fixed.match(/\}/g) || []).length
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
        batchCount++
      } catch (e) {
        console.error(`Batch error for ${post.slug}:`, e)
      }
    }

    if (Object.keys(allUpdates).length > 0) {
      await db.from('blog_posts').update(allUpdates).eq('id', post.id)
    }

    results.push({ slug: post.slug, batches: batchCount })
    await new Promise(r => setTimeout(r, 1000)) // 1s between posts
  }

  const remaining = (posts.length - results.length)
  return NextResponse.json({
    results,
    translated: results.length,
    remaining,
    total: posts.length,
    note: remaining > 0 ? 'Call again to translate more' : 'Done'
  })
}
