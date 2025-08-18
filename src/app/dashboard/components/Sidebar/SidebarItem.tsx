import React from 'react'
import clsx from 'clsx'

export interface SidebarItemProps {
  label: string
  icon: React.ReactNode
  active?: boolean
  onClick?: () => void
}

export default function SidebarItem({ label, icon, active = false, onClick }: SidebarItemProps) {
  return (
    <li
      onClick={onClick}
      className={clsx(
        'pl-8 flex gap-2 text-sm items-center cursor-pointer transition-colors duration-200',
        {
          'bg-[#CEF2E1] border-r-4 border-[#3ECC89] py-2 text-[#3ECC89] font-semibold': active,
          'text-[#333C4D] hover:text-[#3ECC89]': !active,
        }
      )}
    >
      {icon}
      {label}
    </li>
  )
}
