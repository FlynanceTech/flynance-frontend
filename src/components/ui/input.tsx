/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useRef, useState, forwardRef } from 'react'
import Cleave from 'cleave.js/react'



interface OtpInputProps {
  length?: number
  onComplete: (code: string) => void
}

import type { CleaveOptions } from 'cleave.js/options';

type CleaveInputProps = {
  options: CleaveOptions;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
} & React.InputHTMLAttributes<HTMLInputElement>


export function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input
          {...props}
          className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
    )
  }


export function OtpInput({ length = 6, onComplete }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''))
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }

    if (newOtp.every((digit) => digit !== '')) {
      onComplete(newOtp.join(''))
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData('text').slice(0, length)
    if (/^\d+$/.test(paste)) {
      const newOtp = paste.split('')
      setOtp(newOtp)
      newOtp.forEach((digit, i) => {
        if (inputsRef.current[i]) {
          inputsRef.current[i]!.value = digit
        }
      })
      if (newOtp.length === length) onComplete(newOtp.join(''))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex gap-2 lg:gap-4 justify-center">
      {otp.map((digit, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          onChange={(e) => handleChange(e.target.value, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className="w-11 lg:w-12 lg:h-14 h-12 text-2xl text-center border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      ))}
    </div>
  )
}

export const CleaveInput = forwardRef<HTMLInputElement, CleaveInputProps>(
  ({ options, ...props }, ref) => {
    return (
      <Cleave
        {...props}
        options={options}
        htmlRef={(el) => {
          if (ref && typeof ref === 'function') {
            ref(el);
          } else if (ref && typeof ref === 'object' && ref !== null) {
            (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
          }
        }}
      />
    );
  }
);

CleaveInput.displayName = 'CleaveInput';