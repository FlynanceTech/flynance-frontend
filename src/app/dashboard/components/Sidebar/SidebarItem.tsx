'use client'

import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

export interface SidebarItemProps {
  label: string
  icon: LucideIcon
  active?: boolean
  isAction?: boolean
  onClick?: () => void
}

export default function SidebarItem({
  label,
  icon: Icon,
  active = false,
  isAction = false,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200',
        active
          ? 'bg-secondary/20 text-primary shadow-[inset_0_0_0_1px_rgba(10,120,177,0.12)] dark:bg-[#F4C542]/14 dark:text-[#F4C542]'
          : isAction
          ? 'text-[#333C4D] hover:bg-red-50 hover:text-red-500 dark:text-white dark:hover:bg-red-500/10 dark:hover:text-red-400'
          : 'text-[#5A687C] hover:bg-slate-100/80 hover:text-[#223043] dark:text-zinc-300 dark:hover:bg-white/6 dark:hover:text-white'
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
            : isAction
            ? 'border-transparent bg-transparent text-current'
            : 'border-slate-200 bg-white text-[#5A687C] group-hover:border-slate-300 group-hover:text-[#223043] dark:border-white/10 dark:bg-white/5 dark:text-zinc-300'
        )}
      >
        <Icon size={18} />
      </span>
      <span className={clsx('truncate', active && 'font-semibold')}>{label}</span>
    </button>
  )
}

