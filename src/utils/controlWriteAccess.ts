export type AdvisorManagedControl = {
  userId?: string
  managedByAdvisorId?: string | null
}

export function canCreateGoalControl(hasAdvisor: boolean, isAdvisorActing: boolean): boolean {
  return isAdvisorActing || !hasAdvisor
}

export function canWriteGoalControl(
  control: AdvisorManagedControl,
  currentUserId: string,
  isAdvisorActing: boolean
): boolean {
  if (isAdvisorActing) return true
  if (control.managedByAdvisorId) return false
  return !control.userId || control.userId === currentUserId
}

export function isGoalControlLockedForClient(
  control: AdvisorManagedControl,
  isAdvisorActing: boolean
): boolean {
  return !isAdvisorActing && Boolean(control.managedByAdvisorId)
}
