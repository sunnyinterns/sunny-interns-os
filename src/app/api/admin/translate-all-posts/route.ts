import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

const LANGS = [
  {code:'es',name:'Spanish'},{code:'de',name:'German'},{code:'pt',name:'Portuguese (European)'},
  {code:'it',name:'Italian'},{code:'nl',name:'Dutch'},{code:'pl',name:'Polish'},
  {code:'sv',name:'Swedish'},{code:'da',name:'Danish'},{code:'ro',name:'Romanian'},
  {code:'cs',name:'Czech'},{code:'hu',name:'Hungarian'},{code:'el',name:'Greek'},
  {code:'bg',name:'Bulgarian'},{code:'hr',name:'Croatian'},{code:'sk',name:'Slovak'},
  {code:'fi',name:'Finnish'},{code:'no',name:'Norwegian'},{code:'lt',name:'Lithuanian'},
  {code:'lv',name:'Latvian'},{code:'et',name:'Estonian'},{code:'sl',name:'Slovenian'},
]

const BATCHES = [
  LANGS.slice(0,6), LANGS.slice(6,12), LANGS.slice(12,18), LANGS.slice(18),
]

async function translatePost(
  client: Anthropic,
  post: {id:string;title_en:string;excerpt_en:string;body_en:string;seo_title_en:string;seo_desc_en:string},
  batch: {code:string;name:string}[]
): Promise<Record<string,Record<string,string>>> {
  const langList = batch.map(l => `${l.name} (${l.code})`).join(', ')
  const keys = batch.map(l => l.code).join(', ')
  const prompt = `Translate from English to: ${langList}.
Return ONLY valid JSON with keys [${keys}]. Each key: {"title":"","excerpt":"","seo_title":"","seo_desc":"","body":""}.
No markdown, no preamble.
---
Title: ${post.title_en}
SEO Title: ${post.seo_title_en || post.title_en}
Excerpt: ${(post.excerpt_en || '').slice(0,300)}
SEO Desc: ${(post.seo_desc_en || post.excerpt_en || '').slice(0,200)}
Body: ${(post.body_en || '').slice(0,1200)}`

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = (msg.content[0] as {text:string}).text.replace(/```json|```/g,'').trim()
  // Auto-fix truncated JSON
  let fixed = raw
  if (!fixed.endsWith('}')) {
    const opens = (fixed.match(/\{/g)||[]).length
    const closes = (fixed.match(/\}/g)||[]).length
    fixed += '}'.repeat(Math.max(0, opens - closes))
  }
  return JSON.parse(fixed) as Record<string,Record<string,string>>
}

export async function POST(req: Request) {
  const { secret, post_id } = await req.json() as {secret?:string;post_id?:string}
  if (secret !== (process.env.ADMIN_SECRET ?? 'bali2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const query = db.from('blog_posts')
    .select('id,slug,title_en,excerpt_en,body_en,seo_title_en,seo_desc_en')
    .eq('status', 'published')
  
  if (post_id) query.eq('id', post_id)
  
  const { data: posts } = await query
  if (!posts?.length) return NextResponse.json({ message: 'No posts', count: 0 })

  const results: {slug:string;status:string;langs_updated?:number}[] = []

  for (const post of posts) {
    try {
      const updates: Record<string,string> = {}
      
      for (const batch of BATCHES) {
        // Skip if already translated (check first lang of batch)
        const firstLang = batch[0].code
        const { data: existing } = await db.from('blog_posts')
          .select(`title_${firstLang}`)
          .eq('id', post.id)
          .single()
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((existing as any)?.[`title_${firstLang}`]) continue

        const translations = await translatePost(client, post, batch)
        for (const [lang, fields] of Object.entries(translations)) {
          if (fields.title) updates[`title_${lang}`] = fields.title
          if (fields.excerpt) updates[`excerpt_${lang}`] = fields.excerpt
          if (fields.seo_title) updates[`seo_title_${lang}`] = fields.seo_title
          if (fields.seo_desc) updates[`seo_desc_${lang}`] = fields.seo_desc
          if (fields.body) updates[`body_${lang}`] = fields.body
        }
        await new Promise(r => setTimeout(r, 500))
      }

      if (Object.keys(updates).length) {
        await db.from('blog_posts').update(updates).eq('id', post.id)
        results.push({ slug: post.slug, status: 'ok', langs_updated: Object.keys(updates).length })
      } else {
        results.push({ slug: post.slug, status: 'already_translated' })
      }
    } catch (e) {
      results.push({ slug: post.slug, status: 'error' })
      console.error(e)
    }
  }

  return NextResponse.json({
    results,
    total: posts.length,
    translated: results.filter(r => r.status === 'ok').length,
  })
}
