'use client'

import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

export interface SidebarItemProps {
  label: string
  icon: LucideIcon
  active?: boolean
  disabled?: boolean
  disabledReason?: string
  onClick?: () => void
}

export default function SidebarItem({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  disabledReason,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-disabled={disabled}
      className={clsx(
        'group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200',
        disabled && 'cursor-not-allowed opacity-50',
        active
          ? 'bg-secondary/20 text-primary shadow-[inset_0_0_0_1px_rgba(10,120,177,0.12)] dark:bg-[#F4C542]/14 dark:text-[#F4C542]'
          : 'text-[#5A687C] hover:bg-[#F1F5F9CC] hover:text-[#223043] dark:text-zinc-300 dark:hover:bg-[rgba(255,255,255,0.10)] dark:hover:text-white'
      )}
    >
      <span
        className={clsx(
          'absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-opacity duration-200',
          active ? 'bg-primary opacity-100 dark:bg-[#F4C542]' : 'opacity-0'
        )}
      />
      <span
        className={clsx(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200',
          active
            ? 'border-[#BFE0F5] bg-[#F3FAFF] text-primary dark:border-[#F4C542]/25 dark:bg-[#F4C542]/12 dark:text-[#F4C542]'
            : 'border-slate-200 bg-white text-[#5A687C] group-hover:border-slate-300 group-hover:text-[#223043] dark:border-white/10 dark:bg-white/5 dark:text-zinc-300'
        )}
      >
        <Icon size={18} />
      </span>
      <span className={clsx('truncate', active && 'font-semibold')}>{label}</span>
      {disabled ? (
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:bg-white/10 dark:text-zinc-400">
          Off
        </span>
      ) : null}
    </button>
  )
}

