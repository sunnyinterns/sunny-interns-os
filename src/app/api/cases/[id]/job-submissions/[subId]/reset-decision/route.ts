
import { createClient as svc } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function getAdmin() {
  return svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST — Charly resets employer_decision or candidate_decision
// body: { side: "employer" | "candidate" }
export async function POST(req: Request, { params }: { params: Promise<{ id: string; subId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: caseId, subId } = await params
  const body = await req.json() as { side: "employer" | "candidate" }
  const admin = getAdmin()

  const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.side === "employer") {
    updateFields.employer_decision = "pending"
    updateFields.employer_decision_at = null
    updateFields.employer_comment = null
  } else {
    updateFields.candidate_decision = "pending"
    updateFields.candidate_decision_at = null
  }

  // If was retained, reopen
  const { data: sub } = await admin.from("job_submissions").select("status").eq("id", subId).single()
  if (sub?.status === "retained") {
    updateFields.status = "interview"
  }

  await admin.from("job_submissions").update(updateFields).eq("id", subId).eq("case_id", caseId)

  await admin.from("activity_feed").insert({
    case_id: caseId, type: "decision_reset", source: "manual",
    title: `${body.side} decision reset`,
    description: `Charly reset the ${body.side} decision for submission ${subId}`,
    status: "completed",
  }).then(() => null, () => null)

  return NextResponse.json({ success: true })
}
