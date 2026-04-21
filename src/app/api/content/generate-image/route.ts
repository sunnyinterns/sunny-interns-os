import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'

const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const apiKey = (process.env.GOOGLE_AI_STUDIO_KEY ?? '').trim()
    if (!apiKey) {
      console.error('[generate-image] GOOGLE_AI_STUDIO_KEY manquante')
      return NextResponse.json({ error: 'GOOGLE_AI_STUDIO_KEY non configurée (clé Google AI Studio manquante)' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({})) as { prompt?: string; job_id?: string; platform?: string }
    const { prompt, job_id, platform } = body
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt manquant ou vide' }, { status: 400 })
    }

    console.log('[generate-image] job_id=%s platform=%s prompt_len=%d', job_id ?? '—', platform ?? '—', prompt.length)

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`
    let geminiRes: Response
    try {
      geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      })
    } catch (fetchErr) {
      console.error('[generate-image] fetch failed', fetchErr)
      return NextResponse.json({ error: `Erreur réseau Gemini: ${fetchErr instanceof Error ? fetchErr.message : 'inconnue'}` }, { status: 502 })
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '')
      console.error('[generate-image] Gemini status=%d body=%s', geminiRes.status, errText.slice(0, 500))
      const msg = geminiRes.status === 400 ? `Modèle refusé (vérifier ${GEMINI_IMAGE_MODEL})` :
                  geminiRes.status === 429 ? '💳 Quota Gemini dépassé — recharger sur aistudio.google.com' :
                  geminiRes.status === 403 ? '🔒 Clé Google AI Studio invalide ou sans accès au modèle image' :
                  `Gemini erreur ${geminiRes.status}`
      return NextResponse.json({ error: msg, detail: errText.slice(0, 300) }, { status: 500 })
    }

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{ content: { parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> } }>
    }

    const parts = geminiData.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find(p => p.inlineData)
    if (!imagePart?.inlineData) {
      console.error('[generate-image] no image in response — parts count=%d', parts.length)
      return NextResponse.json({ error: 'Aucune image retournée par Gemini — le prompt a peut-être été refusé (contenu sensible ?)' }, { status: 500 })
    }

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!sbUrl || !sbKey) {
      console.error('[generate-image] Supabase env missing')
      return NextResponse.json({ error: 'Configuration Supabase incomplète' }, { status: 500 })
    }
    const sb = svc(sbUrl, sbKey)
    const buf = Buffer.from(imagePart.inlineData.data, 'base64')
    const path = `content/${job_id ?? 'x'}/${platform ?? 'post'}_${Date.now()}.png`

    const { error: upErr } = await sb.storage.from('brand-assets').upload(path, buf, { contentType: 'image/png', upsert: true })
    if (upErr) {
      console.error('[generate-image] storage upload failed', upErr)
      return NextResponse.json({ error: `Upload Supabase: ${upErr.message}` }, { status: 500 })
    }

    const { data: u } = sb.storage.from('brand-assets').getPublicUrl(path)
    console.log('[generate-image] OK path=%s bytes=%d', path, buf.byteLength)
    return NextResponse.json({ success: true, image_url: u.publicUrl, prompt })
  } catch (err) {
    console.error('[generate-image] unhandled error', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur inconnue'
    return NextResponse.json({ error: `Erreur serveur: ${message}` }, { status: 500 })
  }
}
