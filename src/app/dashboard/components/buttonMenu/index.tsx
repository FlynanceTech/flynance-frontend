import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Landmark,
  Tag,
  User,
  BookOpenCheck,
  ClipboardList,
  Menu,
  X,
  BarChart3,
  Clock3,
  ShieldCheck,
  Users,
} from 'lucide-react'
import React, { useState } from 'react'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { useUserSession } from '@/stores/useUserSession'
import { isAdvisorRole, isAdminRole } from '@/utils/roles'

export default function BottomMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUserSession()
  const role = user?.userData?.user?.role
  const isAdmin = isAdminRole(role)
  const isAdvisor = isAdvisorRole(role)

  const primaryItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Transações', icon: Landmark, path: '/dashboard/transacoes' },
    { label: 'Contas', icon: ClipboardList, path: '/dashboard/contas-fixas' },
  ]
  const moreItems = [
    { label: 'Futuros', icon: Clock3, path: '/dashboard/futuros' },
    { label: 'Relatorios', icon: BarChart3, path: '/dashboard/relatorios' },
    { label: 'Categorias', icon: Tag, path: '/dashboard/categorias' },
    { label: 'Educacao', icon: BookOpenCheck, path: '/dashboard/educacao' },
    ...(isAdvisor ? [{ label: 'Clientes', icon: Users, path: '/advisor' }] : []),
    { label: 'Perfil', icon: User, path: '/dashboard/perfil' },
    ...(isAdmin ? [{ label: 'Admin', icon: ShieldCheck, path: '/admin/dashboard' }] : []),
  ]
  const [moreOpen, setMoreOpen] = useState(false)

  const normalize = (p: string) => p.replace(/\/+$/, '')
  const current = normalize(pathname ?? '')
  const isPathActive = (itemPath: string) => {
    const base = normalize(itemPath)

    if (base === '/dashboard') {
      return current === '/dashboard' || current.startsWith('/dashboard/controles')
    }
    if (base === '/admin/dashboard') {
      return current.startsWith('/admin')
    }
    if (base === '/advisor') {
      return current.startsWith('/advisor')
    }

    return current === base || current.startsWith(`${base}/`)
  }

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-4 z-50">
        {primaryItems.map(({ label, icon: Icon, path }) => {
          const isActive = isPathActive(path)
          return (
            <button
              key={label}
              onClick={() => router.push(path)}
              className={`flex flex-col items-center text-xs ${isActive ? 'text-primary' : 'text-gray-500'}`}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          )
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center text-xs text-gray-500"
        >
          <Menu size={22} />
          <span>Mais</span>
        </button>
      </nav>

      <Transition show={moreOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={() => setMoreOpen(false)}>
          <TransitionChild
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </TransitionChild>

          <div className="fixed inset-0 flex items-end justify-center">
            <TransitionChild
              as={React.Fragment}
              enter="ease-out duration-200"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              <DialogPanel className="w-full rounded-t-2xl bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Mais opcoes</span>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                    aria-label="Fechar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {moreItems.map(({ label, icon: Icon, path }) => {
                    const isActive = isPathActive(path)
                    return (
                      <button
                        key={label}
                        onClick={() => {
                          setMoreOpen(false)
                          router.push(path)
                        }}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs ${
                          isActive ? 'border-primary text-primary' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        <Icon size={20} />
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
