'use client'

import { ArrowDown, ArrowUp, Wallet } from 'lucide-react'
import FinanceCard from '../FinanceCard'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react'

interface FinanceStatusProps {
  period: {
    income: number
    expense: number
    balance: number
    incomeChange: number
    expenseChange: number
    balanceChange: number
  }
  accumulated: {
    totalIncome: number
    totalExpense: number
    totalBalance: number
  }
  isLoading: boolean
}


export default function FinanceStatus({ period, isLoading }: FinanceStatusProps) {
  const formatCurrency = (value?: number) => {
    if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00'
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  if (isLoading) {
    return (
      <div className="grid grid-flow-col gap-8 w-full animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 space-y-2 w-full">
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-6 w-2/3 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Mobile */}
      <div className="lg:hidden">
        <TabGroup>
          <TabList className="flex gap-2 overflow-x-auto no-scrollbar">
            {['Saldo', 'Receita', 'Despesas'].map((label) => (
              <Tab
                key={label}
                className={({ selected }) =>
                  `px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap outline-none ${
                    selected
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`
                }
              >
                {label}
              </Tab>
            ))}
          </TabList>

          <TabPanels className="mt-4">
            <TabPanel>
              <FinanceCard
                percentage={+period.balanceChange.toFixed(0)}
                title={
                  <h2 className={`font-medium flex gap-2 ${period.balance < 0 ? 'text-[#F15959]' : 'text-[#41B46B]'}`}>
                    <Wallet /> Saldo
                  </h2>
                }
                value={formatCurrency(period.balance)}
              />
            </TabPanel>
            <TabPanel>
              <FinanceCard
                percentage={+period.incomeChange.toFixed(0)}
                title={
                  <h2 className="text-[#41B46B] font-medium flex gap-2">
                    <ArrowUp /> Receita
                  </h2>
                }
                value={formatCurrency(period.income)}
              />
            </TabPanel>
            <TabPanel>
              <FinanceCard
                percentage={+period.expenseChange.toFixed(0)}
                title={
                  <h2 className="text-[#F15959] font-medium flex gap-2">
                    <ArrowDown /> Despesas
                  </h2>
                }
                value={formatCurrency(period.expense)}
                isExpense={true}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>

      {/* Desktop */}
      <div className="hidden lg:grid lg:grid-flow-col gap-4 lg:gap-8">
        <FinanceCard
          percentage={+period.incomeChange.toFixed(0)}
          title={<h2 className="text-[#41B46B] font-medium flex gap-2"><ArrowUp /> Receita</h2>}
          value={formatCurrency(period.income)}
        />
        <FinanceCard
          percentage={+period.expenseChange.toFixed(0)}
          title={<h2 className="text-[#F15959] font-medium flex gap-2"><ArrowDown /> Despesas</h2>}
          value={formatCurrency(period.expense)}
          isExpense={true}
        />
        <FinanceCard
          percentage={+period.balanceChange.toFixed(0)}
          title={
            <h2 className={`font-medium flex gap-2 ${period.balance < 0 ? 'text-[#F15959]' : 'text-[#41B46B]'}`}>
              <Wallet /> Saldo
            </h2>
          }
          value={formatCurrency(period.balance)}
        />
      </div>
    </div>
  )
}
