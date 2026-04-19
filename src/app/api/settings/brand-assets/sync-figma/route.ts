import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const FIGMA_FILE_KEY = 'nuNpKunExoHegVl6P5XvfL'
const FIGMA_API = 'https://api.figma.com/v1'
const CACHE_HOURS = 4 // ne pas appeler Figma plus d'1x toutes les 4h

const FRAME_MAP: Record<string, string> = {
  logo_landscape_white: 'logo_landscape_white',
  logo_landscape_black: 'logo_landscape_black',
  logo_portrait_white:  'logo_portrait_white',
  logo_portrait_black:  'logo_portrait_black',
  logo_square_gradient: 'logo_square_gradient',
  logo_square_white:    'logo_square_white',
  logo_symbol_svg:      'logo_symbol_svg',
  logo_symbol_white:    'logo_symbol_white',
  logo_symbol_black:    'logo_symbol_black',
  favicon:              'favicon',
  email_logo:           'email_logo',
  og_image:             'og_image',
}

function figmaHeaders() {
  const token = process.env.FIGMA_ACCESS_TOKEN
  if (!token) throw new Error('FIGMA_ACCESS_TOKEN not set')
  return { 'X-Figma-Token': token }
}

export async function GET() {
  return NextResponse.json({
    configured: !!process.env.FIGMA_ACCESS_TOKEN,
    file_key: FIGMA_FILE_KEY,
    figma_url: `https://www.figma.com/design/${FIGMA_FILE_KEY}/bali_interns`,
    frames_mapped: Object.keys(FRAME_MAP).length,
    cache_hours: CACHE_HOURS,
  })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = svc(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── Vérifier le cache : pas de sync si < CACHE_HOURS ──────────────────────
  const { data: lastSync } = await sb
    .from('settings')
    .select('value, updated_at')
    .eq('key', 'figma_last_sync')
    .single()

  if (lastSync?.updated_at) {
    const hoursSince = (Date.now() - new Date(lastSync.updated_at).getTime()) / 3600000
    if (hoursSince < CACHE_HOURS) {
      return NextResponse.json({
        cached: true,
        message: `Dernière sync il y a ${Math.round(hoursSince * 10) / 10}h. Prochaine sync possible dans ${Math.round((CACHE_HOURS - hoursSince) * 10) / 10}h.`,
        last_sync: lastSync.updated_at,
      })
    }
  }

  try {
    const headers = figmaHeaders()

    // ── Utiliser /v1/files/:key/nodes plutôt que le fichier entier ──────────
    // On passe directement par la liste des composants (beaucoup plus légère)
    // On utilise depth=1 sur la page principale seulement
    const fileRes = await fetch(`${FIGMA_API}/files/${FIGMA_FILE_KEY}?depth=1`, { headers })

    if (fileRes.status === 429) {
      const retryAfter = fileRes.headers.get('Retry-After') ?? '60'
      return NextResponse.json({
        error: 'rate_limited',
        message: `Figma API rate limit atteint. Réessaie dans ${retryAfter}s.`,
        retry_after_seconds: parseInt(retryAfter),
      }, { status: 429 })
    }

    if (!fileRes.ok) throw new Error(`Figma file API ${fileRes.status}: ${await fileRes.text()}`)

    const fileData = await fileRes.json() as {
      document: { children: Array<{ id: string; name: string }> }
    }

    // Trouver la page principale (première page)
    const mainPage = fileData.document.children[0]
    if (!mainPage) throw new Error('No pages found in Figma file')

    // ── Récupérer les nodes de cette page seulement ────────────────────────
    const pageRes = await fetch(
      `${FIGMA_API}/files/${FIGMA_FILE_KEY}/nodes?ids=${mainPage.id}&depth=2`,
      { headers }
    )

    if (pageRes.status === 429) {
      return NextResponse.json({
        error: 'rate_limited',
        message: 'Figma API rate limit atteint. Réessaie dans 60s.',
        retry_after_seconds: 60,
      }, { status: 429 })
    }

    if (!pageRes.ok) throw new Error(`Figma nodes API ${pageRes.status}`)

    const pageData = await pageRes.json() as {
      nodes: Record<string, { document: { children: Array<{ id: string; name: string; type: string }> } }>
    }

    const pageDoc = pageData.nodes[mainPage.id]?.document
    if (!pageDoc) throw new Error('Could not fetch page nodes')

    // Map frame name → node id
    const nodeMap: Record<string, string> = {}
    for (const node of (pageDoc.children ?? [])) {
      if (FRAME_MAP[node.name]) {
        nodeMap[node.name] = node.id
      }
    }

    if (!Object.keys(nodeMap).length) {
      return NextResponse.json({ error: 'No matching frames found in Figma file' }, { status: 404 })
    }

    // ── Export URLs ────────────────────────────────────────────────────────
    const ids = Object.values(nodeMap).join(',')
    const imgRes = await fetch(
      `${FIGMA_API}/images/${FIGMA_FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=2`,
      { headers }
    )

    if (imgRes.status === 429) {
      return NextResponse.json({
        error: 'rate_limited',
        message: 'Figma API rate limit atteint sur export images. Réessaie dans 60s.',
        retry_after_seconds: 60,
      }, { status: 429 })
    }

    if (!imgRes.ok) throw new Error(`Figma images API ${imgRes.status}`)
    const imgData = await imgRes.json() as { images: Record<string, string> }

    // ── Download + upload Supabase ─────────────────────────────────────────
    const updates: { key: string; url: string }[] = []

    for (const [frameName, nodeId] of Object.entries(nodeMap)) {
      const tempUrl = imgData.images[nodeId]
      if (!tempUrl) continue
      const assetKey = FRAME_MAP[frameName]
      if (!assetKey) continue

      try {
        const imgBuffer = await fetch(tempUrl)
        if (!imgBuffer.ok) continue
        const blob = await imgBuffer.arrayBuffer()

        const storagePath = `logos/${assetKey}.png`
        const { error: uploadErr } = await sb.storage
          .from('brand-assets')
          .upload(storagePath, blob, { contentType: 'image/png', upsert: true })

        if (uploadErr) { console.error(`Upload error for ${assetKey}:`, uploadErr.message); continue }

        const { data: urlData } = sb.storage.from('brand-assets').getPublicUrl(storagePath)
        const permanentUrl = `${urlData.publicUrl}?v=${Date.now()}`

        await sb.from('brand_assets').update({
          url: permanentUrl,
          figma_frame_id: nodeId,
          figma_url: `https://www.figma.com/design/${FIGMA_FILE_KEY}/bali_interns?node-id=${nodeId.replace(':', '-')}`,
        }).eq('key', assetKey)

        updates.push({ key: assetKey, url: permanentUrl })
      } catch (e) {
        console.error(`Error processing ${assetKey}:`, e)
      }
    }

    // ── Mettre à jour le cache ─────────────────────────────────────────────
    await sb.from('settings').upsert({
      key: 'figma_last_sync',
      value: JSON.stringify({ synced: updates.length, frames: updates.map(u => u.key) }),
    })

    return NextResponse.json({ success: true, synced: updates.length, details: updates })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('FIGMA_ACCESS_TOKEN')) {
      return NextResponse.json({
        error: 'Token manquant',
        help: 'Ajoute FIGMA_ACCESS_TOKEN dans Vercel → Settings → Environment Variables',
      }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
