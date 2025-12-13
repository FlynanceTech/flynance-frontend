'use client'

import Header from '../components/Header'
/* import ActivityCard from '@/components/perfil/ActivityCard' */
import AuthPreferencesCard from '@/components/perfil/AuthPreferencesCard'
/* import DataExportCard from '@/components/perfil/DataExportCard' */
import NotificationsCard from '@/components/perfil/NotificationsCard'
import { ProfileSidebar } from '@/components/perfil/ProfileSidebar'
/* import SecurityCard from '@/components/perfil/SecurityCard' */
import SubscriptionCard from '@/components/perfil/SubscriptionCard'
import UserInfoCard from '@/components/perfil/UserInfoCard'
import { useUserSession } from '@/stores/useUserSession'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  const { logout } = useUserSession()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
      <section className="w-full h-full pt-8 px-4 lg:px-8  flex flex-col gap-8">
        <Header title="Meu Perfil" subtitle="" />
        <div className='flex gap-4 overflow-auto justify-center'>
          <ProfileSidebar />

          <main className="flex-1 overflow-auto max-w-4xl lg:pr-4 lg:pb-0 pb-24">
            <div className="">

              <div className=" space-y-6">
                <div id="user-info">
                  <UserInfoCard />
                </div>
                
                <div id="subscription">
                  <SubscriptionCard />
                </div>
       {/*          
                <div id="payment-history">
                  <PaymentHistoryCard />
                </div> */}
                
                <div id="auth-preferences">
                  <AuthPreferencesCard />
                </div>
                
                <div id="notifications">
                  <NotificationsCard />
                </div>
                
              {/*   <div id="security">
                  <SecurityCard />
                </div> */}
                
                {/* <div id="data-export">
                  <DataExportCard />
                </div> */}
                
               {/*  <div id="activity">
                  <ActivityCard />
                </div> */}

                <footer
                  className={
                    'pt-4 border-t border-gray-300 flex w-full'
                  }
                >
                  <button
                    onClick={handleLogout}
                    className="flex lg:hidden items-center justify-center gap-2 w-full rounded-md py-2 bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                  >
                    <LogOut size={18} />
                    <span className='text-xl'>Sair</span>
                  </button>
                </footer>
              </div>
            </div>
          </main>
        </div>
      </section>
  )
}
