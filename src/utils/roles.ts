const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'])
const ADVISOR_ROLES = new Set(['ADVISOR'])

export function normalizeRole(role: unknown): string {
  return String(role ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

export function isAdminRole(role: unknown): boolean {
  const normalized = normalizeRole(role)
  return ADMIN_ROLES.has(normalized)
}

export function isAdvisorRole(role: unknown): boolean {
  const normalized = normalizeRole(role)
  return ADVISOR_ROLES.has(normalized)
}

export function canActAsClientRole(role: unknown): boolean {
  return isAdvisorRole(role) || isAdminRole(role)
}
