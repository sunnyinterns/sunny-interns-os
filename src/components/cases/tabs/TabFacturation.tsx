'use client'

import { BillingForm } from '@/components/billing/BillingForm'

interface TabFacturationProps {
  caseId: string
  caseData?: {
    id: string
    interns?: { first_name: string; last_name: string } | null
  }
}

export function TabFacturation({ caseId, caseData }: TabFacturationProps) {
  return (
    <div className="space-y-4">
      <BillingForm caseId={caseId} caseData={caseData} />
    </div>
  )
}
