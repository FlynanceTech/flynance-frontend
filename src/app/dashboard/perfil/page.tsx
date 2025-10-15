'use client'

import Header from '../components/Header'
import ActivityCard from '@/components/perfil/ActivityCard'
import AuthPreferencesCard from '@/components/perfil/AuthPreferencesCard'
import DataExportCard from '@/components/perfil/DataExportCard'
import NotificationsCard from '@/components/perfil/NotificationsCard'
import PaymentHistoryCard from '@/components/perfil/PaymentHistoryCard'
import { ProfileSidebar } from '@/components/perfil/ProfileSidebar'
import SecurityCard from '@/components/perfil/SecurityCard'
import SubscriptionCard from '@/components/perfil/SubscriptionCard'
import UserInfoCard from '@/components/perfil/UserInfoCard'

export default function ProfilePage() {
  return (
      <section className="w-full h-full pt-8 px-4 lg:px-8  flex flex-col gap-8">
        <Header title="Meu Perfil" subtitle="" />
        <div className='flex gap-4 overflow-auto justify-center'>
          <ProfileSidebar />

          <main className="flex-1 overflow-auto max-w-4xl pr-4">
            <div className="">

              <div className=" space-y-6">
                <div id="user-info">
                  <UserInfoCard />
                </div>
                
                <div id="subscription">
                  <SubscriptionCard />
                </div>
                
                <div id="payment-history">
                  <PaymentHistoryCard />
                </div>
                
                <div id="auth-preferences">
                  <AuthPreferencesCard />
                </div>
                
                <div id="notifications">
                  <NotificationsCard />
                </div>
                
                <div id="security">
                  <SecurityCard />
                </div>
                
                <div id="data-export">
                  <DataExportCard />
                </div>
                
                <div id="activity">
                  <ActivityCard />
                </div>
              </div>
            </div>
          </main>
        </div>
      </section>
  )
}
