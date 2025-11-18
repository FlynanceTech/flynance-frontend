'use client'
import { Bell } from 'lucide-react'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import clsx from 'clsx'

interface props {
  asFilter: boolean
}

export default function NotificationBell({asFilter}:props) {
  const [notifications, setNotifications] = useState([
    {
      title: 'Meta quase alcançada!',
      description: 'Você está a 15% de atingir sua meta de viagem.',
      time: '1h atrás',
      isNew: true,
    },
    {
      title: 'Novo conteúdo disponível',
      description: 'Confira o novo módulo sobre investimentos.',
      time: '3h atrás',
      isNew: true,
    },
    {
      title: 'Transação registrada',
      description: 'Sua transferência de R$ 300,00 foi concluída.',
      time: '8h atrás',
      isNew: true,
    },
    {
      title: 'Lembrete de pagamento',
      description: 'Não se esqueça de pagar sua fatura do cartão.',
      time: 'Ontem',
      isNew: false,
    },
  ])

  const handleNotificationClick = (index: number) => {
    setNotifications((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isNew: false } : item
      )
    )
  }

  const newCount = notifications.filter((n) => n.isNew).length

  return (
    <Popover className="relative">
      <PopoverButton className="relative focus:outline-none">
        <Bell className="text-[#333C4D] cursor-pointer" size={20} />
        {newCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
            {newCount}
          </span>
        )}
      </PopoverButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <PopoverPanel className={clsx("absolute z-20 mt-4  lg:right-0 w-[280px] bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden",
          asFilter ? '-right-14' : 'right-0'
        )}>
          <div className="p-4 text-sm font-medium text-gray-800 border-b border-gray-200">
            Notificações
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.map((n, index) => (
              <button
                key={index}
                onClick={() => handleNotificationClick(index)}
                className={clsx(
                  'text-left w-full px-4 py-3 border-b border-gray-200 flex flex-col gap-0.5 text-sm hover:bg-gray-50 transition',
                  n.isNew && 'bg-[#D9FBE7] cursor-pointer'
                )}
              >
                <div className="flex items-center justify-between font-semibold text-[#1A202C]">
                  <div className="flex items-center gap-1">
                    <span className="text-secondary text-xl">•</span>
                    {n.title}
                  </div>
                  {n.isNew && (
                    <span className="bg-[#A0EBC4] text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                      Novo
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{n.description}</p>
                <span className="text-xs text-gray-500">{n.time}</span>
              </button>
            ))}
          </div>
        </PopoverPanel>
      </Transition>
    </Popover>
  )
}
