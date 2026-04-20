import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_AI_STUDIO_KEY not configured' }, { status: 400 })

  const { prompt, job_id, platform } = await req.json() as { prompt: string; job_id?: string; platform?: string }
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    }
  )

  if (!geminiRes.ok) {
    const err = await geminiRes.text()
    return NextResponse.json({ error: `Gemini: ${err}` }, { status: 500 })
  }

  const geminiData = await geminiRes.json() as {
    candidates?: Array<{ content: { parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> } }>
  }

  const parts = geminiData.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find(p => p.inlineData)
  if (!imagePart?.inlineData) return NextResponse.json({ error: 'No image returned by Gemini' }, { status: 500 })

  const sb = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const buf = Buffer.from(imagePart.inlineData.data, 'base64')
  const path = `content/${job_id ?? 'x'}/${platform ?? 'post'}_${Date.now()}.png`

  const { error: upErr } = await sb.storage.from('brand-assets').upload(path, buf, { contentType: 'image/png', upsert: true })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: u } = sb.storage.from('brand-assets').getPublicUrl(path)
  return NextResponse.json({ success: true, image_url: u.publicUrl, prompt })
}
