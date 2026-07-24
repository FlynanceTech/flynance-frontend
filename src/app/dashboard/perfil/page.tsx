'use client'

import Header from '../components/Header'
import CyclePreferencesCard from '@/components/perfil/CyclePreferencesCard'
import SubscriptionCard from '@/components/perfil/SubscriptionCard'
import UserInfoCard from '@/components/perfil/UserInfoCard'
import UserPreferencesCard from '@/components/perfil/UserPreferencesCard'
import { useUserSession } from '@/stores/useUserSession'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function ProfilePage() {
  const router = useRouter()
  const t = useTranslations('profile')
  const { logout } = useUserSession()

  useEffect(() => {
    const scrollToHashTarget = (attempt = 0) => {
      const targetId = window.location.hash.replace('#', '')

      if (!targetId) {
        const scrollRoot = document.getElementById('dashboard-scroll-root')
        scrollRoot?.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      const element = document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      if (attempt < 10) {
        window.setTimeout(() => scrollToHashTarget(attempt + 1), 100)
      }
    }

    const handleHashChange = () => scrollToHashTarget()

    scrollToHashTarget()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <section className="w-full h-full min-h-0 overflow-hidden pt-8 px-4 lg:px-8 flex flex-col gap-8">
      <Header
        title={t('title')}
        subtitle={t('subtitle')}
        newTransation={false}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden gap-4 justify-center">
        <main className="flex-1 h-full min-h-0 overflow-y-auto max-w-4xl lg:pr-4 lg:pb-0 pb-24">
          <div className="space-y-4">
            <div id="user-info">
              <UserInfoCard />
            </div>

            <hr className="border-slate-200" />

            <div id="subscription">
              <SubscriptionCard />
            </div>

            <hr className="border-slate-200" />

            <div id="user-preferences">
              <UserPreferencesCard />
            </div>

            <hr className="border-slate-200" />

            <div id="cycle-preferences">
              <CyclePreferencesCard />
            </div>

            <footer className="pt-4 border-t border-gray-300 flex w-full">
              <button
                onClick={handleLogout}
                className="flex lg:hidden items-center justify-center gap-2 w-full rounded-md py-2 bg-red-500 text-white hover:bg-red-600 cursor-pointer"
              >
                <LogOut size={18} />
                <span className="text-xl">{t('logout')}</span>
              </button>
            </footer>
          </div>
        </main>
      </div>
    </section>
  )
}
