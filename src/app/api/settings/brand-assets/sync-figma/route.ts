import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const FIGMA_FILE_KEY = 'nuNpKunExoHegVl6P5XvfL'
const FIGMA_API = 'https://api.figma.com/v1'

// Figma frame name → brand_asset key
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

  try {
    const headers = figmaHeaders()

    // 1. Get file structure to find node IDs by frame name
    const fileRes = await fetch(`${FIGMA_API}/files/${FIGMA_FILE_KEY}?depth=3`, { headers })
    if (!fileRes.ok) throw new Error(`Figma file API ${fileRes.status}: ${await fileRes.text()}`)
    const fileData = await fileRes.json() as {
      document: { children: Array<{ children: Array<{ id: string; name: string; type: string }> }> }
    }

    // Map frame name → node id
    const nodeMap: Record<string, string> = {}
    for (const page of fileData.document.children) {
      for (const node of (page.children ?? [])) {
        if (node.type === 'FRAME' && FRAME_MAP[node.name]) {
          nodeMap[node.name] = node.id
        }
      }
    }

    if (!Object.keys(nodeMap).length) {
      return NextResponse.json({ error: 'No matching frames found in Figma file' }, { status: 404 })
    }

    // 2. Get export URLs @2x PNG from Figma (temporary URLs)
    const ids = Object.values(nodeMap).join(',')
    const imgRes = await fetch(
      `${FIGMA_API}/images/${FIGMA_FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=2`,
      { headers }
    )
    if (!imgRes.ok) throw new Error(`Figma images API ${imgRes.status}`)
    const imgData = await imgRes.json() as { images: Record<string, string> }

    // 3. Download each image + upload to Supabase Storage (permanent)
    const updates: { key: string; url: string }[] = []

    for (const [frameName, nodeId] of Object.entries(nodeMap)) {
      const tempUrl = imgData.images[nodeId]
      if (!tempUrl) continue

      const assetKey = FRAME_MAP[frameName]
      if (!assetKey) continue

      try {
        // Download from Figma temp URL
        const imgBuffer = await fetch(tempUrl)
        if (!imgBuffer.ok) continue
        const blob = await imgBuffer.arrayBuffer()

        // Upload to Supabase Storage (brand-assets bucket)
        const storagePath = `logos/${assetKey}.png`
        const { error: uploadErr } = await sb.storage
          .from('brand-assets')
          .upload(storagePath, blob, {
            contentType: 'image/png',
            upsert: true,
          })

        if (uploadErr) {
          console.error(`Upload error for ${assetKey}:`, uploadErr.message)
          continue
        }

        // Get permanent public URL with cache-buster so browser always loads fresh
        const { data: urlData } = sb.storage
          .from('brand-assets')
          .getPublicUrl(storagePath)

        const permanentUrl = `${urlData.publicUrl}?v=${Date.now()}`

        // Update brand_assets with permanent URL
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

    return NextResponse.json({
      success: true,
      synced: updates.length,
      details: updates,
    })

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
