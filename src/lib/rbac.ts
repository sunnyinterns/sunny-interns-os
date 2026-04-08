export type UserRole = 'admin' | 'superuser' | 'account_manager'

export function canAccessSettings(role: UserRole): boolean {
  return role === 'admin'
}

export function canSeeAllCases(role: UserRole): boolean {
  return role === 'admin' || role === 'superuser'
}

export function canModifyCase(role: UserRole, caseManagerEmail: string, userEmail: string): boolean {
  if (canSeeAllCases(role)) return true
  return caseManagerEmail === userEmail
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}

export function canAccessFinances(role: UserRole): boolean {
  return role === 'admin' || role === 'superuser'
}
