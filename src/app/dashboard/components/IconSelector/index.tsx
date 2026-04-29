'use client'

import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, ChevronDown } from 'lucide-react'
import { IconMap, IconName } from '@/utils/icon-map'

interface IconSelectorProps {
  value: IconName
  onChange: (icon: IconName) => void
  label?: string
}

const categoryIconList = Object.entries(IconMap).map(([name, Icon]) => ({
  name: name as IconName,
  Icon,
}))

function formatIconLabel(name: IconName) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}

type DropdownPosition = {
  placement: 'top' | 'bottom'
}

export default function IconSelector({ value, label, onChange }: IconSelectorProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({
    placement: 'bottom',
  })
  const SelectedIcon = IconMap[value] || IconMap.Home

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      setOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative w-full text-left">
      <button
        type="button"
        onClick={(event) => {
          const button = event.currentTarget
          const rect = button.getBoundingClientRect()
          const dropdownHeight = 320
          const viewportHeight = window.innerHeight
          const spaceBelow = viewportHeight - rect.bottom
          const shouldOpenUp = spaceBelow < dropdownHeight + 16 && rect.top > spaceBelow

          setDropdownPosition({
            placement: shouldOpenUp ? 'top' : 'bottom',
          })
          setOpen((current) => !current)
        }}
        className={clsx(
          'flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 text-left transition',
          'hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#7CB8D8]/40',
          open && 'border-[#7CB8D8] ring-2 ring-[#7CB8D8]/20'
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <SelectedIcon size={18} />
          </span>
          <span className="min-w-0">
            {label ? (
              <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                {label}
              </span>
            ) : null}
            <span className="block truncate text-sm font-medium text-slate-700">
              {formatIconLabel(value)}
            </span>
          </span>
        </span>
        <ChevronDown
          size={16}
          className={clsx('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          className={clsx(
            'absolute left-0 right-0 z-[120] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5',
            dropdownPosition.placement === 'top' ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
              Escolha um icone
            </span>
            <span className="text-xs text-slate-500">{formatIconLabel(value)}</span>
          </div>

          <div className="max-h-64 overflow-y-auto pr-1">
            <div
              className={clsx(
                'grid grid-cols-4 gap-2 sm:grid-cols-5',
                dropdownPosition.placement === 'top' && 'scroll-pb-2'
              )}
            >
              {categoryIconList.map(({ name, Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(name)
                    setOpen(false)
                  }}
                  title={formatIconLabel(name)}
                  className={clsx(
                    'relative flex h-11 items-center justify-center rounded-xl border transition',
                    value === name
                      ? 'border-[#7CB8D8] bg-[#7CB8D8]/15 text-[#1E6FA8]'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700'
                  )}
                >
                  <Icon size={20} />
                  {value === name ? (
                    <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1E6FA8] text-white">
                      <Check size={10} />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
