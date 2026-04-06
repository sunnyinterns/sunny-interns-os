import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from("billing_entities").select("*").order("is_default",{ascending:false})
  return NextResponse.json(data||[])
}
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { id, ...body } = await req.json()
  if (body.is_default) await supabase.from("billing_entities").update({is_default:false}).neq("id",id)
  const { data } = await supabase.from("billing_entities").update(body).eq("id",id).select().single()
  return NextResponse.json(data)
}
