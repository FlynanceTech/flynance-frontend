// src/lib/phoneCountries.ts
//
// Lista curada de países suportados no cadastro (Brasil + LATAM + EUA/Canadá +
// principais da Europa). Espelha o SUPPORTED_REGIONS do backend.
import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js'

export type PhoneCountry = {
  iso: CountryCode
  name: string
  flag: string
}

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'BR'

/** Países suportados, na ordem exibida no seletor (Brasil primeiro). */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { iso: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { iso: 'BO', name: 'Bolívia', flag: '🇧🇴' },
  { iso: 'CL', name: 'Chile', flag: '🇨🇱' },
  { iso: 'CO', name: 'Colômbia', flag: '🇨🇴' },
  { iso: 'EC', name: 'Equador', flag: '🇪🇨' },
  { iso: 'MX', name: 'México', flag: '🇲🇽' },
  { iso: 'PE', name: 'Peru', flag: '🇵🇪' },
  { iso: 'PY', name: 'Paraguai', flag: '🇵🇾' },
  { iso: 'UY', name: 'Uruguai', flag: '🇺🇾' },
  { iso: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { iso: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { iso: 'CA', name: 'Canadá', flag: '🇨🇦' },
  { iso: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { iso: 'ES', name: 'Espanha', flag: '🇪🇸' },
  { iso: 'FR', name: 'França', flag: '🇫🇷' },
  { iso: 'DE', name: 'Alemanha', flag: '🇩🇪' },
  { iso: 'IT', name: 'Itália', flag: '🇮🇹' },
  { iso: 'NL', name: 'Holanda', flag: '🇳🇱' },
  { iso: 'IE', name: 'Irlanda', flag: '🇮🇪' },
  { iso: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
]

/** Código de discagem (DDI) do país, ex.: "55", "351". */
export function dialCodeOf(iso: CountryCode): string {
  try {
    return getCountryCallingCode(iso)
  } catch {
    return ''
  }
}

/** Formata o número nacional conforme o usuário digita (máscara do país). */
export function formatAsYouType(value: string, iso: CountryCode): string {
  return new AsYouType(iso).input(value)
}

/** Valida o número (nacional ou E.164) para o país informado. */
export function isValidPhoneForCountry(value: string, iso: CountryCode): boolean {
  const trimmed = String(value || '').trim()
  if (!trimmed) return false
  try {
    return trimmed.startsWith('+')
      ? isValidPhoneNumber(trimmed)
      : isValidPhoneNumber(trimmed, iso)
  } catch {
    return false
  }
}

/**
 * Converte para E.164 ("+DDI…"). Se o valor já vier internacional ("+…"), usa o
 * DDI informado; caso contrário, interpreta como número nacional do país.
 * Retorna string vazia se não for possível parsear.
 */
export function toE164(value: string, iso: CountryCode): string {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  const parsed = trimmed.startsWith('+')
    ? parsePhoneNumberFromString(trimmed)
    : parsePhoneNumberFromString(trimmed, iso)
  return parsed?.number ?? ''
}

/**
 * Separa um telefone (E.164, canônico "55…" ou nacional) em país + número
 * nacional formatado. Usado para pré-preencher o campo vindo do signup/sessão.
 * País não detectado -> usa `fallbackCountry` e o valor como está.
 */
export function splitPhone(
  value?: string | null,
  fallbackCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): { country: CountryCode; national: string } {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return { country: fallbackCountry, national: '' }

  const digits = trimmed.replace(/\D/g, '')
  const parsed = trimmed.startsWith('+')
    ? parsePhoneNumberFromString(trimmed)
    : parsePhoneNumberFromString(`+${digits}`) ||
      parsePhoneNumberFromString(trimmed, fallbackCountry)

  if (parsed?.country) {
    return { country: parsed.country, national: parsed.formatNational() }
  }
  return { country: fallbackCountry, national: trimmed }
}
