type ActorSource = {
  createdByUser?: { name?: string | null; email?: string | null } | null
  user?: { name?: string | null; email?: string | null } | null
}

export function toFirstName(value?: string | null) {
  const firstName = String(value ?? '').trim().split(/\s+/)[0]?.split('@')[0] ?? ''
  return firstName ? firstName.toUpperCase() : ''
}

export function getActorFirstName(source: ActorSource, fallback = '') {
  return (
    toFirstName(source.createdByUser?.name) ||
    toFirstName(source.createdByUser?.email) ||
    toFirstName(source.user?.name) ||
    toFirstName(source.user?.email) ||
    toFirstName(fallback)
  )
}
