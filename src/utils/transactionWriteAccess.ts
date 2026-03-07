export type AdvisorClientPermission = 'READ_ONLY' | 'READ_WRITE' | null | undefined

export function isAdvisorReadOnlyTransactionAccess(
  activeClientId: string | null | undefined,
  permission: AdvisorClientPermission
) {
  const safeClientId = String(activeClientId ?? '').trim()
  return Boolean(safeClientId && permission === 'READ_ONLY')
}
