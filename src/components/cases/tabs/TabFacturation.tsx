'use client'

import { BillingForm } from '@/components/billing/BillingForm'

interface TabFacturationProps {
  caseId: string
}

export function TabFacturation({ caseId }: TabFacturationProps) {
  return (
    <div className="space-y-4">
      <BillingForm caseId={caseId} />
    </div>
  )
}
