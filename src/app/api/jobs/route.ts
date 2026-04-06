import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from("jobs").select("*, companies(name)").neq("status","cancelled").order("created_at",{ascending:false})
  const jobs = (data||[]).map(j=>({...j,company_name:(j.companies as {name:string}|null)?.name}))
  return NextResponse.json(jobs)
}
export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()
  const { data, error } = await supabase.from("jobs").insert(body).select().single()
  if (error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json(data,{status:201})
}
