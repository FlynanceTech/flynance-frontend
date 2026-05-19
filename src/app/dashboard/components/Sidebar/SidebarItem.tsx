'use client'

import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

export interface SidebarItemProps {
  label: string
  icon: LucideIcon
  href?: string
  active?: boolean
  onClick?: () => void
}

export default function SidebarItem({
  label,
  icon: Icon,
  href,
  active = false,
  onClick,
}: SidebarItemProps) {
  const className = clsx(
    'group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200',
    active
      ? 'bg-secondary/20 text-primary shadow-[inset_0_0_0_1px_rgba(10,120,177,0.12)] dark:bg-[#F4C542]/14 dark:text-[#F4C542]'
      : 'text-[#5A687C] hover:bg-[#F1F5F9CC] hover:text-[#223043] dark:text-zinc-300 dark:hover:bg-[rgba(255,255,255,0.10)] dark:hover:text-white'
  )

  const content = (
    <>
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
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}
