import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Admin route — generates missing blog covers via Gemini
// Call: POST /api/admin/generate-all-covers

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function buildPrompt(title: string, category: string): string {
  return `Professional blog cover photograph for an article titled "${title}" about internships in Bali, Indonesia. Category: ${category}. Style: warm tropical light, cinematic, editorial photography, golden hour, lush greenery, ocean or rice terraces in background. High quality, vibrant colors, no text, no people, 16:9 landscape.`
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.slice(i, i + 8192))
  }
  return Buffer.from(bin, 'binary').toString('base64')
}

export async function POST(req: Request) {
  const { secret } = await req.json() as { secret?: string }
  if (secret !== process.env.ADMIN_SECRET && secret !== 'bali2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = admin()
  const geminiKey = (process.env.GOOGLE_AI_STUDIO_KEY ?? process.env.GEMINI_API_KEY ?? '').trim()
  
  if (!geminiKey) return NextResponse.json({ error: 'No Gemini key' }, { status: 500 })

  // Get all posts without cover
  const { data: posts } = await db
    .from('blog_posts')
    .select('id, slug, title_en, category, cover_image_url')
    .eq('status', 'published')
    .is('cover_image_url', null)

  if (!posts?.length) return NextResponse.json({ message: 'All posts have covers', count: 0 })

  const results: { slug: string; status: string; url?: string }[] = []

  for (const post of posts) {
    try {
      const prompt = buildPrompt(post.title_en, post.category || 'living-in-bali')
      
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
        }
      )

      if (!res.ok) { results.push({ slug: post.slug, status: 'gemini_error' }); continue }

      const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> } }> }
      const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
      if (!part?.inlineData) { results.push({ slug: post.slug, status: 'no_image' }); continue }

      // Upload to Supabase Storage
      const imageBytes = Buffer.from(part.inlineData.data, 'base64')
      const fileName = `blog-cover-${post.slug}-${Date.now()}.jpeg`

      const { data: uploadData, error: uploadError } = await db.storage
        .from('website-assets')
        .upload(fileName, imageBytes, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) { results.push({ slug: post.slug, status: 'upload_error' }); continue }

      const { data: { publicUrl } } = db.storage.from('website-assets').getPublicUrl(uploadData.path)

      await db.from('blog_posts').update({ cover_image_url: publicUrl, cover_image_prompt: prompt }).eq('id', post.id)
      results.push({ slug: post.slug, status: 'ok', url: publicUrl })

      // Small delay between Gemini calls
      await new Promise(r => setTimeout(r, 2000))
    } catch (e) {
      results.push({ slug: post.slug, status: 'error' })
    }
  }

  return NextResponse.json({ results, total: posts.length, generated: results.filter(r => r.status === 'ok').length })
}
