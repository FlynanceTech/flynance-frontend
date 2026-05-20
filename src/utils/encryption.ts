const ENC_PREFIX = 'enc:'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function parseEncrypted(value: string): { iv: Uint8Array; authTag: Uint8Array; ciphertext: Uint8Array } | null {
  if (!value.startsWith(ENC_PREFIX)) return null
  const parts = value.slice(ENC_PREFIX.length).split(':')
  if (parts.length !== 3) return null
  const [ivHex, authTagHex, ciphertextHex] = parts
  return {
    iv: hexToBytes(ivHex),
    authTag: hexToBytes(authTagHex),
    ciphertext: hexToBytes(ciphertextHex),
  }
}

// Cached key import — runs once per session
let _keyPromise: Promise<CryptoKey | null> | null = null

function getKey(): Promise<CryptoKey | null> {
  if (_keyPromise) return _keyPromise
  _keyPromise = (async () => {
    const hex = process.env.NEXT_PUBLIC_ENCRYPTION_KEY
    if (!hex || hex.length !== 64) return null
    const keyBytes = hexToBytes(hex)
    return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt'])
  })()
  return _keyPromise
}

export function isEncryptedValue(value: unknown): boolean {
  const str = String(value ?? '').trim()
  return str.startsWith(ENC_PREFIX) && str.slice(ENC_PREFIX.length).split(':').length === 3
}

export async function decryptValue(value: string): Promise<string> {
  const parsed = parseEncrypted(value.trim())
  if (!parsed) return value

  try {
    const key = await getKey()
    if (!key) return value

    // Web Crypto AES-GCM expects ciphertext with authTag appended at the end
    const combined = new Uint8Array(parsed.ciphertext.length + parsed.authTag.length)
    combined.set(parsed.ciphertext)
    combined.set(parsed.authTag, parsed.ciphertext.length)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: parsed.iv },
      key,
      combined,
    )

    return new TextDecoder().decode(decrypted)
  } catch {
    return value
  }
}

export async function decryptNullable(value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  if (!isEncryptedValue(value)) return value
  return decryptValue(value)
}
