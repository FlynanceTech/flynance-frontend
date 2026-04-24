'use client'

import { useEffect, useMemo, useState } from 'react'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { Check, Palette } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const DEFAULT_COLORS = [
  '#22C55E',
  '#3B82F6',
  '#06B6D4',
  '#8B5CF6',
  '#EC4899',
  '#F97316',
  '#FACC15',
  '#EF4444',
  '#64748B',
  '#111827',
] as const

type Props = {
  color: string
  disabled?: boolean
  isSaving?: boolean
  ariaLabel: string
  tooltip: string
  disabledTooltip?: string
  onChange: (nextColor: string) => Promise<void> | void
}

export default function CategoryColorPicker({
  color,
  disabled = false,
  isSaving = false,
  ariaLabel,
  tooltip,
  disabledTooltip,
  onChange,
}: Props) {
  const [currentColor, setCurrentColor] = useState(color || '#CBD5E1')

  useEffect(() => {
    setCurrentColor(color || '#CBD5E1')
  }, [color])

  const palette = useMemo(() => {
    const normalized = currentColor?.trim() || '#CBD5E1'
    return DEFAULT_COLORS.includes(normalized as (typeof DEFAULT_COLORS)[number])
      ? DEFAULT_COLORS
      : [...DEFAULT_COLORS, normalized]
  }, [currentColor])

  const handleSelect = async (nextColor: string, close?: () => void) => {
    if (!nextColor || nextColor === currentColor || isSaving) {
      close?.()
      return
    }

    setCurrentColor(nextColor)
    close?.()
    await onChange(nextColor)
  }

  const content = (
    <Popover className="relative">
      {({ close }) => (
        <>
          <PopoverButton
            type="button"
            disabled={disabled || isSaving}
            aria-label={ariaLabel}
            className="group inline-flex h-5 w-5 items-center justify-center rounded-full outline-none transition-transform duration-150 hover:scale-110 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={(event) => event.stopPropagation()}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-slate-300 shadow-sm transition group-hover:border-slate-400"
              style={{ backgroundColor: currentColor }}
            />
          </PopoverButton>

          <Transition
            enter="transition duration-150 ease-out"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition duration-100 ease-in"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <PopoverPanel
              anchor="bottom start"
              className="z-30 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#121212]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Palette size={14} />
                {tooltip}
              </div>

              <div className="grid grid-cols-5 gap-2">
                {palette.map((option) => {
                  const selected = option.toLowerCase() === currentColor.toLowerCase()
                  const iconClass =
                    option === '#FACC15' || option === '#22C55E' || option === '#06B6D4'
                      ? 'text-slate-900'
                      : 'text-white'

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => void handleSelect(option, close)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 transition hover:scale-110 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
                      style={{ backgroundColor: option }}
                      aria-label={`${tooltip}: ${option}`}
                    >
                      {selected ? <Check size={14} className={iconClass} /> : null}
                    </button>
                  )
                })}
              </div>

              <label className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
                <span>HEX</span>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(event) => void handleSelect(event.target.value, close)}
                  className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label={ariaLabel}
                />
              </label>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top">
          {disabled && disabledTooltip ? disabledTooltip : tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
