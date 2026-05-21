export function isEncryptedDescription(value: unknown) {
  // Format: enc:<iv>:<authTag>:<ciphertext>
  return /^enc:[^:\s]+:[^:\s]+:[^:\s]+/i.test(String(value ?? '').trim())
}

export function resolveDisplayDescription(
  primary: unknown,
  fallback?: unknown,
  emptyLabel = 'Sem descrição'
) {
  const primaryText = String(primary ?? '').trim()
  if (primaryText && !isEncryptedDescription(primaryText)) return primaryText

  const fallbackText = String(fallback ?? '').trim()
  if (fallbackText && !isEncryptedDescription(fallbackText)) return fallbackText

  return emptyLabel
}
