// src/lib/phone.ts
//
// Helpers de telefone country-aware compartilhados (checkout, login, sessão).
// Espelham a canonicalização do backend: número com "+" ou DDI reconhecido usa
// o país detectado; número "cru" assume o país padrão (Brasil).
import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js'
import { DEFAULT_PHONE_COUNTRY } from './phoneCountries'

/**
 * Retorna o telefone em E.164 SEM "+", pronto para comparação/identidade.
 * Preserva o Brasil como padrão para números crus (compat. com base atual).
 */
export function toE164Digits(
  raw?: string | null,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string {
  const trimmed = String(raw ?? '').trim()
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''

  const parsed = trimmed.startsWith('+')
    ? parsePhoneNumberFromString(trimmed)
    : parsePhoneNumberFromString(digits, defaultCountry) ||
      parsePhoneNumberFromString(`+${digits}`)

  if (parsed?.isValid()) {
    return parsed.number.replace(/^\+/, '')
  }

  // fallback legado: assume Brasil
  if (defaultCountry === 'BR') {
    return digits.startsWith('55') ? digits : `55${digits}`
  }
  return digits
}

/** Valida um WhatsApp (nacional ou E.164) para o país informado. */
export function isValidWhatsApp(
  raw?: string | null,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): boolean {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return false
  try {
    return trimmed.startsWith('+')
      ? isValidPhoneNumber(trimmed)
      : isValidPhoneNumber(trimmed, defaultCountry)
  } catch {
    return false
  }
}
