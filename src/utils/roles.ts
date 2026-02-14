const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'])

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
