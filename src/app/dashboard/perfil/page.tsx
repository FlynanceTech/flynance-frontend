'use client'

import Header from '../components/Header'
import CyclePreferencesCard from '@/components/perfil/CyclePreferencesCard'
import { ProfileSidebar } from '@/components/perfil/ProfileSidebar'
import SubscriptionCard from '@/components/perfil/SubscriptionCard'
import UserInfoCard from '@/components/perfil/UserInfoCard'
import UserPreferencesCard from '@/components/perfil/UserPreferencesCard'
import { useUserSession } from '@/stores/useUserSession'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import PageOnboardingTour, { type PageOnboardingStep } from '@/components/onboarding/PageOnboardingTour'
import { useTranslations } from 'next-intl'

export default function ProfilePage() {
  const router = useRouter()
  const t = useTranslations('profile')
  const { logout } = useUserSession()

  useEffect(() => {
    const scrollToHashTarget = (attempt = 0) => {
      const targetId = window.location.hash.replace('#', '')
      if (!targetId) return

      const element = document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  const profileOnboardingSteps: ReadonlyArray<PageOnboardingStep> = [
    {
      id: 'header',
      selector: '[data-onboarding-target="perfil-header"]',
      align: 'bottom',
      title: t('onboarding.headerTitle'),
      description: t('onboarding.headerDescription'),
    },
    {
      id: 'sidebar',
      selector: '[data-onboarding-target="perfil-sidebar"]',
      title: t('onboarding.sidebarTitle'),
      description: t('onboarding.sidebarDescription'),
    },
    {
      id: 'cards',
      selector: '[data-onboarding-target="perfil-cards"]',
      title: t('onboarding.cardsTitle'),
      description: t('onboarding.cardsDescription'),
    },
  ]

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <section className="w-full h-full min-h-0 overflow-hidden pt-8 px-4 lg:px-8 flex flex-col gap-8">
      <div data-onboarding-target="perfil-header">
        <Header
          title={t('title')}
          subtitle={t('subtitle')}
          rightContent={
            <PageOnboardingTour
              steps={profileOnboardingSteps}
              storageKeyBase="flynance:dashboard:onboarding:perfil:v1"
              triggerLabel={t('guideButton')}
            />
          }
        />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden gap-4 justify-center">
        <div data-onboarding-target="perfil-sidebar">
          <ProfileSidebar />
        </div>

        <main
          className="flex-1 h-full min-h-0 overflow-y-auto max-w-4xl lg:pr-4 lg:pb-0 pb-24"
          data-onboarding-target="perfil-cards"
        >
          <div className="space-y-6">
            <div id="user-info">
              <UserInfoCard />
            </div>

            <div id="subscription">
              <SubscriptionCard />
            </div>

            <div id="user-preferences">
              <UserPreferencesCard />
            </div>

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
