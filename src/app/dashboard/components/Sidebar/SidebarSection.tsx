'use client'

import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'

import SidebarItem from './SidebarItem'
import type { SidebarItemConfig } from './sidebar.config'

type SidebarSectionProps = {
  title: string
  icon: LucideIcon
  collapsible: boolean
  open: boolean
  collapsed?: boolean
  active?: boolean
  items: Array<
    SidebarItemConfig & {
      active: boolean
      onClick?: () => void
    }
  >
  onToggle?: () => void
  onCollapsedClick?: () => void
}

export default function SidebarSection({
  title,
  icon: Icon,
  collapsible,
  open,
  collapsed = false,
  active = false,
  items,
  onToggle,
  onCollapsedClick,
}: SidebarSectionProps) {
  if (collapsed) {
    return (
      <section className="flex justify-center">
        <button
          type="button"
          onClick={onCollapsedClick}
          title={title}
          aria-label={title}
          className={clsx(
            'flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border transition-all duration-200',
            active
              ? 'border-[#BFE0F5] bg-[#F3FAFF] text-primary shadow-[inset_0_0_0_1px_rgba(10,120,177,0.1)] dark:border-[#F4C542]/25 dark:bg-[#F4C542]/12 dark:text-[#F4C542]'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-[rgba(255,255,255,0.10)] dark:hover:text-white'
          )}
        >
          <Icon size={18} />
        </button>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? `Recolher ${title}` : `Expandir ${title}`}
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1 text-left transition hover:bg-[#F1F5F9B3] dark:hover:bg-[rgba(255,255,255,0.10)]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-500">
            {title}
          </span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 dark:text-zinc-500">
            <ChevronDown
              size={14}
              className={clsx('transition-transform duration-200', open ? 'rotate-0' : '-rotate-90')}
            />
          </span>
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-500">
            {title}
          </span>
        </div>
      )}

      <div
        className={clsx(
          'grid transition-all duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-1">
            {items.map((item) => (
              <SidebarItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                href={item.path}
                active={item.active}
                disabled={item.disabled}
                disabledReason={item.disabledReason}
                onClick={item.onClick}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
