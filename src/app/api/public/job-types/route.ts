import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const VITRINE_ORIGINS = ["https://bali-interns-website.vercel.app","https://bali-interns.com","https://www.bali-interns.com","http://localhost:3001","http://localhost:3000"];
function corsH(req?: Request) {
  const o = req?.headers.get("origin") ?? "";
  const a = VITRINE_ORIGINS.includes(o) ? o : "*";
  return { "Access-Control-Allow-Origin": a, "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}
export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsH(req) });
}


function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('job_types')
    .select('id, name_fr, name_en, category_fr, category_en, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('job_types error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  // Normalize: add 'name' as alias for name_fr for compatibility
  const normalized = (data ?? []).map(j => ({ ...j, name: j.name_fr }))
  return NextResponse.json(normalized)
}
