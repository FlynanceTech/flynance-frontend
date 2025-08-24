'use client'

import React, { useEffect, useState } from 'react'
import Header from './components/Header/overview'
import { SpendingControl } from './components/SpendingControl'
import CategorySpendingDistribution from './components/CategorySpendingDistribution'
import { useUserSession } from '@/stores/useUserSession'
import ComparisonChart from './components/ComparisonChart'
import LastTransactions from './components/LastTransactions.tsx'



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

      <section className="flex flex-col gap-4 lg:gap-4">

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-4">
          <ComparisonChart userId={userId} />
          <SpendingControl userId={userId} />
          <LastTransactions />
        </div>

        <CategorySpendingDistribution
          
        />
      </section>
    </section>
  )
}
