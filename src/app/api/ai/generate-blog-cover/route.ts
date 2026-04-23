import { createClient as srv } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function buildAutoPrompt(title: string, category: string): string {
  return `Professional blog cover photograph for an article titled "${title}" about internships in Bali, Indonesia. Category: ${category}. Style: warm tropical light, cinematic, editorial photography, golden hour, lush greenery, ocean or rice terraces in background. High quality, vibrant colors, no text, no people, 16:9 landscape.`
}

export async function POST(req: Request) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, category, slug, post_id, prompt: customPrompt } = await req.json() as {
    title: string; category: string; slug: string; post_id?: string; prompt?: string
  }

  const geminiKey = (process.env.GOOGLE_AI_STUDIO_KEY ?? process.env.GEMINI_API_KEY ?? '').trim()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sunny-interns-os.vercel.app'
  const fallbackUrl = `${baseUrl}/api/og/blog-card?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`

  // Use custom prompt if provided, else auto-generate
  const prompt = customPrompt?.trim() || buildAutoPrompt(title, category)

  // Save prompt to DB if post_id provided
  if (post_id) {
    await admin().from('blog_posts').update({ cover_image_prompt: prompt }).eq('id', post_id)
  }

  if (!geminiKey) {
    return NextResponse.json({ url: fallbackUrl, source: 'fallback', prompt })
  }

  try {
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
    if (!res.ok) return NextResponse.json({ url: fallbackUrl, source: 'fallback', prompt })

    const data = await res.json()
    const imgPart = data?.candidates?.[0]?.content?.parts?.find(
      (p: Record<string, unknown>) => p.inlineData
    )

    if (imgPart?.inlineData?.data) {
      const buf = Buffer.from(imgPart.inlineData.data, 'base64')
      const fileName = `blog-cover-${slug}-${Date.now()}.png`
      const { error } = await admin().storage
        .from('website-assets')
        .upload(fileName, buf, { contentType: 'image/png', upsert: true })

      if (!error) {
        const { data: u } = admin().storage.from('website-assets').getPublicUrl(fileName)
        return NextResponse.json({ url: u.publicUrl, source: 'gemini', prompt })
      }
    }

    return NextResponse.json({ url: fallbackUrl, source: 'fallback', prompt })
  } catch {
    return NextResponse.json({ url: fallbackUrl, source: 'fallback', prompt })
  }
}

// GET: returns auto-generated prompt for a given title+category
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || ''
  const category = searchParams.get('category') || ''
  return NextResponse.json({ prompt: buildAutoPrompt(title, category) })
}
