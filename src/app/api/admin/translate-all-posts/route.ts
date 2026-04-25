import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const BATCHES: string[][] = [
  ['French (fr)', 'Spanish (es)', 'German (de)', 'Portuguese European (pt)', 'Italian (it)', 'Dutch (nl)'],
  ['Polish (pl)', 'Swedish (sv)', 'Danish (da)', 'Romanian (ro)', 'Czech (cs)', 'Hungarian (hu)'],
  ['Greek (el)', 'Bulgarian (bg)', 'Croatian (hr)', 'Slovak (sk)', 'Finnish (fi)', 'Norwegian (no)'],
  ['Lithuanian (lt)', 'Latvian (lv)', 'Estonian (et)', 'Slovenian (sl)'],
]
const CODES: Record<string, string> = {
  'French (fr)': 'fr', 'Spanish (es)': 'es', 'German (de)': 'de',
  'Portuguese European (pt)': 'pt', 'Italian (it)': 'it', 'Dutch (nl)': 'nl',
  'Polish (pl)': 'pl', 'Swedish (sv)': 'sv', 'Danish (da)': 'da',
  'Romanian (ro)': 'ro', 'Czech (cs)': 'cs', 'Hungarian (hu)': 'hu',
  'Greek (el)': 'el', 'Bulgarian (bg)': 'bg', 'Croatian (hr)': 'hr',
  'Slovak (sk)': 'sk', 'Finnish (fi)': 'fi', 'Norwegian (no)': 'no',
  'Lithuanian (lt)': 'lt', 'Latvian (lv)': 'lv', 'Estonian (et)': 'et',
  'Slovenian (sl)': 'sl',
}

function fixJson(text: string): string {
  let s = text.replace(/```json|```/g, '').trim()
  const opens = (s.match(/\{/g) || []).length
  const closes = (s.match(/\}/g) || []).length
  if (opens > closes) s += '}'.repeat(opens - closes)
  return s
}

export async function POST(req: Request) {
  const { secret, slug } = await req.json() as { secret?: string; slug?: string }
  if (secret !== (process.env.ADMIN_SECRET ?? 'bali2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Get posts to translate
  let query = db.from('blog_posts')
    .select('id,slug,title_en,excerpt_en,seo_title_en,seo_desc_en,title_es')
    .eq('status', 'published')

  if (slug) {
    query = query.eq('slug', slug)
  } else {
    query = query.is('title_es', null)
  }

  const { data: posts } = await query
  if (!posts?.length) return NextResponse.json({ message: 'All translated', count: 0 })

  const results: Record<string, string>[] = []

  for (const post of posts) {
    const updates: Record<string, string> = {}

    for (const batch of BATCHES) {
      const codes = batch.map(l => CODES[l])
      const prompt = `Translate this blog content from English to: ${batch.join(', ')}.
Return ONLY valid JSON with ISO codes as keys (${codes.join(', ')}).
Each key: {"title":"","excerpt":"","seo_title":"","seo_desc":""}
No markdown, no preamble.
---
Title: ${post.title_en}
Excerpt: ${post.excerpt_en || post.title_en}
SEO Title: ${post.seo_title_en || post.title_en}
SEO Desc: ${post.seo_desc_en || post.excerpt_en || post.title_en}`

      try {
        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        })
        const text = (msg.content[0] as { text: string }).text
        const parsed = JSON.parse(fixJson(text)) as Record<string, Record<string, string>>

        for (const [code, fields] of Object.entries(parsed)) {
          if (fields.title) updates[`title_${code}`] = fields.title
          if (fields.excerpt) updates[`excerpt_${code}`] = fields.excerpt
          if (fields.seo_title) updates[`seo_title_${code}`] = fields.seo_title
          if (fields.seo_desc) updates[`seo_desc_${code}`] = fields.seo_desc
        }
      } catch (e) {
        console.error(`Batch ${batch[0]} for ${post.slug}:`, e)
      }
    }

    if (Object.keys(updates).length) {
      await db.from('blog_posts').update(updates).eq('id', post.id)
    }
    results.push({ slug: post.slug, fields: String(Object.keys(updates).length) })
  }

  return NextResponse.json({ results, total: posts.length })
}
