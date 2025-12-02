'use client'

import React from 'react'
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import clsx from 'clsx'
import { IconMap, IconName } from '@/utils/icon-map'

interface IconSelectorProps {
  value: IconName
  onChange: (icon: IconName) => void
  label?: string
}

// Cria a lista com base no próprio IconMap
const categoriaIconeLista = Object.entries(IconMap).map(([name, Icon]) => ({
  name: name as IconName,
  Icon,
}))

export default function IconSelector({ value, label,onChange }: IconSelectorProps) {
  const SelectedIcon = IconMap[value] || IconMap.Home

  return (
    <Menu as="div" className="relative text-left w-full">
      <MenuButton className="w-full  h-12 flex gap-2 items-center justify-center text-nowrap border border-gray-300 
        rounded-full bg-white hover:bg-gray-100 transition cursor-pointer">
          {label && label}
        <SelectedIcon size={20} />
      </MenuButton>

      <Transition
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <MenuItems className="absolute z-50 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-3 grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
          {categoriaIconeLista.map(({ name, Icon }) => (
            <MenuItem key={name}>
              {({ active }) => (
                <button
                  type="button"
                  onClick={() => onChange(name)}
                  className={clsx(
                    'p-2 rounded-md flex items-center justify-center',
                    value === name
                      ? 'bg-secondary/30 border border-secondary text-primary'
                      : active
                      ? 'bg-gray-100 text-gray-700'
                      : 'text-gray-600'
                  )}
                >
                  <Icon size={20} />
                </button>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      </Transition>
    </Menu>
  )
}
