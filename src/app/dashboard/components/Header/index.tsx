'use client'

import React, { useState } from 'react'
import { Menu, MenuItems, Transition } from '@headlessui/react'
import DateRangeSelect from '../DateRangeSelect'
import NotificationBell from '../NotificationBell'
import { NewTransactionButton } from '../Buttons'
import { CategoriesSelectWithCheck } from '../CategorySelect'
import SearchBar from '../SearchBar'
import TransactionDrawer from '../TransactionDrawer'
import { Category } from '@/types/Transaction'
import { Plus, SlidersHorizontal, X } from 'lucide-react'
import { useUserSession } from '@/stores/useUserSession'
import { ThemeToggle } from '@/components/ThemeToggle'

interface HeaderProps {
  title: string
  subtitle: string  
  asFilter?: boolean
  dataToFilter?: Category[]
  newTransation?: boolean
}

export default function Header({ title, subtitle, asFilter = false, dataToFilter, newTransation = true }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const {user} = useUserSession()

  return (
    <div className='flex flex-col'>
      <header className="flex items-center justify-between lg:py-4 sm:px-0">
        <div>
          <h1 className="text-xl font-semibold text-[#333C4D]">{title}</h1>
          <h3 className="text-sm text-[#333C4D] font-light hidden sm:block">Olá, {user?.account.user.name}! {subtitle}</h3>
        </div>

        <div className="hidden lg:flex gap-4 items-center">
          {asFilter && (
            <div className="flex gap-4 items-center">
            
              {dataToFilter && (
                <div className="flex gap-4 items-center">
                  <SearchBar />
                  <CategoriesSelectWithCheck />
                </div>
              )}
                <DateRangeSelect />
            </div>
          )}

          <NotificationBell asFilter={asFilter} />
          {
            newTransation &&
            <NewTransactionButton onClick={() => setDrawerOpen(true)} />
          }
        </div>

        <div className="flex lg:hidden gap-4 items-center">
          <ThemeToggle />
          <NotificationBell  asFilter={asFilter} />
          {asFilter && (
           <Menu as="div" className="relative lg:hidden">
           {({ open }) => (
             <>
               <Menu.Button className="p-1.5 rounded-md hover:bg-gray-100 transition cursor-pointer">
                 {open ? <X /> : <SlidersHorizontal />}
               </Menu.Button>
         
               <Transition
                 enter="transition ease-out duration-200"
                 enterFrom="opacity-0 scale-95"
                 enterTo="opacity-100 scale-100"
                 leave="transition ease-in duration-150"
                 leaveFrom="opacity-100 scale-100"
                 leaveTo="opacity-0 scale-95"
               >
                 <MenuItems className="absolute right-0 mt-2 min-w-[90vw] bg-white shadow-lg rounded-md p-4 z-40 flex flex-col gap-4 outline-none">
                   {dataToFilter && (
                     <div className='min-w-full flex flex-col gap-4'>
                       <SearchBar />
                       <CategoriesSelectWithCheck />
                     </div>
                   )}
                   <DateRangeSelect />
                 </MenuItems>
               </Transition>
             </>
           )}
         </Menu>
          )}
        </div>
      </header>
      <h3 className="text-sm text-[#333C4D] font-light sm:hidden block">{subtitle}</h3>
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-20 right-4 bg-green-100 text-black rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg z-40 sm:hidden"
      >
        <Plus />
      </button>

      <TransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
