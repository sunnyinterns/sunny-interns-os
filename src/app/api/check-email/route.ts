import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const VITRINE_ORIGINS = ["https://bali-interns-website.vercel.app","https://bali-interns.com","https://www.bali-interns.com","http://localhost:3001","http://localhost:3000"];
function corsH(req?: Request) {
  const o = (req as Request | undefined)?.headers?.get("origin") ?? "";
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

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ exists: false }, { headers: corsH() })

  const supabase = getServiceClient()
  const { data } = await supabase
    .from('interns')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  return NextResponse.json({ exists: !!data }, { headers: corsH() })
}
