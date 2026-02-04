'use client'

import { ArrowDown, ArrowUp, Wallet } from 'lucide-react'
import FinanceCard from '../FinanceCard'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react'

export interface FinanceStatusProps {
  period: {
    income: number
    expense: number
    balance: number        // não usamos no card de Saldo
    incomeChange: number
    expenseChange: number
    balanceChange: number  // não usamos na UI
  }
  accumulated: {
    totalIncome: number
    totalExpense: number
    totalBalance: number   // saldo exibido
  }
  isLoading: boolean
  /** rótulo do período selecionado (ex.: "últimos 3 dias", "últimos 30 dias", "mês passado") */
  periodLabel?: string
}

export default function FinanceStatus({
  period,
  accumulated,
  isLoading,
  periodLabel = 'período anterior',
}: FinanceStatusProps) {
  const fmt = (v?: number) =>
    typeof v === 'number' && Number.isFinite(v)
      ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'R$ 0,00'

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

  const income = period.income
  const expense = period.expense
  const balance = accumulated.totalBalance

  const incomeChange = Math.trunc(period.incomeChange || 0)
  const expenseChange = Math.trunc(period.expenseChange || 0)

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
                    selected ? 'bg-secondary/30 text-primary' : 'bg-gray-100 text-gray-600'
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
                title={
                  <h2
                    className={`font-medium flex gap-2 ${
                      balance < 0 ? 'text-[#F15959]' : 'text-[#41B46B]'
                    }`}
                  >
                    <Wallet /> Saldo
                  </h2>
                }
                value={fmt(balance)}
                isLabel
                isBalance
              />
            </TabPanel>

            <TabPanel>
              <FinanceCard
                percentage={incomeChange}
                periodLabel={periodLabel}
                title={
                  <h2 className="text-[#41B46B] font-medium flex gap-2">
                    <ArrowUp /> Receita
                  </h2>
                }
                value={fmt(income)}
                isLabel
              />
            </TabPanel>

            <TabPanel>
              <FinanceCard
                percentage={expenseChange}
                periodLabel={periodLabel}
                title={
                  <h2 className="text-[#F15959] font-medium flex gap-2">
                    <ArrowDown /> Despesas
                  </h2>
                }
                value={fmt(expense)}
                isExpense
                isLabel
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>

      {/* Desktop */}
      <div className="hidden lg:grid lg:grid-flow-col gap-4 lg:gap-4">
        <FinanceCard
          title={
            <h2
              className={`font-medium flex gap-2 ${
                balance < 0 ? 'text-[#F15959]' : 'text-[#41B46B]'
              }`}
            >
              <Wallet /> Saldo
            </h2>
          }
          value={fmt(balance)}
          periodLabel={periodLabel}
          isLabel
          isBalance   
        />
        <FinanceCard
          percentage={incomeChange}
          periodLabel={periodLabel}
          title={<h2 className="text-[#41B46B] font-medium flex gap-2"><ArrowUp /> Receita</h2>}
          value={fmt(income)}
          isLabel
        />
        <FinanceCard
          percentage={expenseChange}
          periodLabel={periodLabel}
          title={<h2 className="text-[#F15959] font-medium flex gap-2"><ArrowDown /> Despesas</h2>}
          value={fmt(expense)}
          isExpense
          isLabel
        />
        
      </div>
    </div>
  )
}
