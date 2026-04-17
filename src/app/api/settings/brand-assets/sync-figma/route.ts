import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FIGMA_FILE_KEY = 'nuNpKunExoHegVl6P5XvfL'
const FIGMA_API = 'https://api.figma.com/v1'

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

  try {
    const headers = figmaHeaders()

    // 1. Get file structure to find node IDs by frame name
    const fileRes = await fetch(`${FIGMA_API}/files/${FIGMA_FILE_KEY}?depth=2`, { headers })
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

    // 2. Get export URLs @2x PNG
    const ids = Object.values(nodeMap).join(',')
    const imgRes = await fetch(
      `${FIGMA_API}/images/${FIGMA_FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=2`,
      { headers }
    )
    if (!imgRes.ok) throw new Error(`Figma images API ${imgRes.status}`)
    const imgData = await imgRes.json() as { images: Record<string, string> }

    // 3. Update brand_assets in DB
    const updates: { key: string; url: string }[] = []
    for (const [frameName, nodeId] of Object.entries(nodeMap)) {
      const url = imgData.images[nodeId]
      if (!url) continue
      const assetKey = Object.entries(FRAME_MAP).find(([, n]) => n === frameName)?.[0]
      if (!assetKey) continue
      await supabase.from('brand_assets').update({
        url,
        figma_frame_id: nodeId,
        figma_url: `https://www.figma.com/design/${FIGMA_FILE_KEY}/bali_interns?node-id=${nodeId.replace(':', '-')}`,
      }).eq('key', assetKey)
      updates.push({ key: assetKey, url })
    }

    return NextResponse.json({ success: true, synced: updates.length, details: updates })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('FIGMA_ACCESS_TOKEN')) {
      return NextResponse.json({
        error: 'Token manquant',
        help: 'Ajoute FIGMA_ACCESS_TOKEN dans Vercel → Settings → Environment Variables. Token disponible dans Figma → Settings → Personal access tokens.'
      }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
