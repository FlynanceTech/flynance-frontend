'use client'

import { Bell, CalendarRange, CreditCard, Shield, User } from 'lucide-react'

const menuItems = [
  { title: 'Informacoes pessoais', icon: User, id: 'user-info' },
  { title: 'Assinatura e plano', icon: CreditCard, id: 'subscription' },
  { title: 'Autenticacao', icon: Shield, id: 'auth-preferences' },
  { title: 'Ciclo financeiro', icon: CalendarRange, id: 'cycle-preferences' },
  { title: 'Notificacoes', icon: Bell, id: 'notifications' },
]

export function ProfileSidebar() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <aside className="hidden lg:block">
      <nav className="w-64 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => scrollToSection(item.id)}
                className="w-full flex items-center p-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <item.icon className="mr-3 h-5 w-5 text-gray-400" />
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
