const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'])
const ADVISOR_ROLES = new Set(['ADVISOR'])
const ORG_ADMIN_ROLES = new Set(['ORG_ADMIN', 'MASTER', 'CONSULTANT_MANAGER'])

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

export function isOrgAdminRole(role: unknown): boolean {
  const normalized = normalizeRole(role)
  return ORG_ADMIN_ROLES.has(normalized)
}

export function isMasterRole(role: unknown): boolean {
  return isOrgAdminRole(role) || isAdminRole(role)
}

export function canAccessAdvisorRole(role: unknown): boolean {
  return isAdvisorRole(role) || isAdminRole(role) || isOrgAdminRole(role)
}

export function getAdvisorHomePath(role: unknown): string {
  return isOrgAdminRole(role) ? '/advisor/organization/dashboard' : '/advisor'
}

export function canActAsClientRole(role: unknown): boolean {
  return canAccessAdvisorRole(role)
}
