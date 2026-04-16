import type { APIRequestContext } from '@playwright/test'

export async function fetchCases(request: APIRequestContext): Promise<any[]> {
  const response = await request.get('/api/cases')
  const data = await response.json()
  return Array.isArray(data) ? data : data.data ?? data.cases ?? []
}

export function findByStatus(cases: any[], status: string): any | undefined {
  return cases.find((c: any) => c.status === status)
}

export function getName(c: any): string {
  const first = c.interns?.first_name ?? c.intern?.first_name ?? ''
  const last = c.interns?.last_name ?? c.intern?.last_name ?? ''
  return `${first} ${last}`.trim()
}

export function getFirstName(c: any): string {
  return c.interns?.first_name ?? c.intern?.first_name ?? ''
}

export function getToken(c: any): string | undefined {
  return c.portal_token
}
