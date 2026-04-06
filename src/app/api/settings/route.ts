import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from("settings").select("key,value")
  return NextResponse.json(data || [])
}
