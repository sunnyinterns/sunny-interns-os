import { createClient as srv } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
function admin() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }
export async function POST(req: Request) {
  const supabase = await srv()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { title, category, slug } = await req.json()
  const geminiKey = process.env.GEMINI_API_KEY
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sunny-interns-os.vercel.app'
  const fallbackUrl = `${baseUrl}/api/og/blog-card?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`
  if (!geminiKey) return NextResponse.json({ url: fallbackUrl, source: 'fallback' })
  try {
    const prompt = `Professional blog cover image for "${title}" about internships in Bali Indonesia. Category: ${category}. Warm tropical colors, cinematic, editorial. NO text. 16:9.`
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
    if (!res.ok) return NextResponse.json({ url: fallbackUrl, source: 'fallback' })
    const data = await res.json()
    const imgPart = data?.candidates?.[0]?.content?.parts?.find((p: Record<string, unknown>) => p.inlineData)
    if (imgPart?.inlineData?.data) {
      const buf = Buffer.from(imgPart.inlineData.data, 'base64')
      const fileName = `blog-ai-${slug}-${Date.now()}.png`
      const { error } = await admin().storage.from('website-assets').upload(fileName, buf, { contentType: 'image/png', upsert: true })
      if (!error) {
        const { data: u } = admin().storage.from('website-assets').getPublicUrl(fileName)
        return NextResponse.json({ url: u.publicUrl, source: 'gemini' })
      }
    }
    return NextResponse.json({ url: fallbackUrl, source: 'fallback' })
  } catch { return NextResponse.json({ url: fallbackUrl, source: 'fallback' }) }
}
