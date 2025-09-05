import React from 'react'
import clsx from 'clsx'

export interface SidebarItemProps {
  label: string
  icon: React.ReactNode
  active?: boolean
  collapsed?: boolean
  onClick?: () => void
}

export default function SidebarItem({ label, icon, active = false, collapsed = false, onClick }: SidebarItemProps) {
  return (
    <li
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 text-sm cursor-pointer transition-colors duration-200 rounded-lg',
        {
          'bg-[#CEF2E1] text-[#3ECC89] font-semibold': active,
          'text-[#333C4D] hover:text-[#3ECC89]': !active,
          'justify-center': collapsed,
        }
      )}
    >
      <span className="text-lg">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </li>
  )
}
