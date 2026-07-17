'use client'

import React from 'react'
import type { CountryCode } from 'libphonenumber-js'
import {
  PHONE_COUNTRIES,
  dialCodeOf,
  formatAsYouType,
} from '@/lib/phoneCountries'

type Props = {
  /** País selecionado (ISO 3166-1 alpha-2). */
  country: CountryCode
  /** Número nacional (sem DDI), já mascarado. */
  phone: string
  onCountryChange: (iso: CountryCode) => void
  onPhoneChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

/**
 * Campo de telefone com seletor de DDI (bandeira do país).
 * Vem por padrão com o Brasil. O número é formatado conforme o país escolhido.
 */
export default function PhoneDdiField({
  country,
  phone,
  onCountryChange,
  onPhoneChange,
  placeholder = 'WhatsApp',
  autoFocus,
}: Props) {
  return (
    <div className='flex w-full gap-2'>
      <div className='relative'>
        <select
          aria-label='Código do país (DDI)'
          value={country}
          onChange={(e) => onCountryChange(e.target.value as CountryCode)}
          className='h-full appearance-none rounded-md border border-gray-300 bg-white py-3 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-secondary'
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} +{dialCodeOf(c.iso)}
            </option>
          ))}
        </select>
        <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400'>
          ▾
        </span>
      </div>

      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        inputMode='tel'
        value={phone}
        onChange={(e) => onPhoneChange(formatAsYouType(e.target.value, country))}
        placeholder={placeholder}
        className='w-full flex-1 rounded-md border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary'
      />
    </div>
  )
}
