'use client'

import React, { useEffect, useState } from 'react'
import Header from './components/Header/overview'
import { SpendingControl } from './components/SpendingControl'
import CategorySpendingDistribution from './components/CategorySpendingDistribution'
import { useUserSession } from '@/stores/useUserSession'
import ComparisonChart from './components/ComparisonChart'
import LastTransactions from './components/LastTransactions.tsx'
import PaymentTypeCard from './components/PaymentTypeCard'
import CreditCardsPanel from './components/CreditCardsPanel'



export default function Dashboard() {
  const { user } = useUserSession()
  const userId = user?.account?.userId ?? ''

  const [hydrated, setHydrated] = useState(false)


  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!hydrated) return null

  return (
    <section className="flex flex-col gap-4 w-full md:pt-0 pt-4 lg:pr-8 px-4 lg:pl-0 pb-24 lg:pb-0 overflow-auto">
      <Header
        title="Dashboard Financeiro"
        subtitle="Veja um resumo da sua vida financeira."
        asFilter
        userId={userId}
      />

      <section className="grid md:grid-cols-4 grid-cols-1 gap-4 lg:gap-4 w-full">
        <div className='md:col-span-3 flex gap-4 flex-col w-full'>
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-4">
            <SpendingControl userId={userId} />
            <ComparisonChart userId={userId} />
          </div>
          <div className='flex flex-col lg:flex-row gap-4 h-full'>
            <PaymentTypeCard />
            <CategorySpendingDistribution/>
          </div>
        </div>
        <div className='flex flex-col gap-4 w-full'>
          <CreditCardsPanel />
          <LastTransactions />
        </div>
      </section>
    </section>
  )
}
