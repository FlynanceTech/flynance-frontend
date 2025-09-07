'use client'

import { useControls } from '@/hooks/query/useSpendingControl'
import { format } from 'date-fns'
import React, { use, useState } from 'react'
import { SpendingChart } from '../../components/SpendingChart'
import { formatter } from '@/utils/formatter'
import Link from 'next/link'
import { SquarePen, Undo2 } from 'lucide-react'
import MonthSelector from '../../components/MonthSelector'
import { IconMap, IconName } from '@/utils/icon-map'
import SpendingControlDrawer from '../../components/SpendingControlDrawer'

export interface Transaction {
  id: string
  userId: string
  accountId: string
  value: number
  description: string
  categoryId: string
  date: string
  type: 'INCOME' | 'EXPENSE'
  paymentType: 'CASH' | 'CREDIT_CARD' | 'PIX' | string
  origin: 'DASHBOARD' | string
  cardId?: string
}

export interface ControlWithTransactions {
  id: string
  accountId: string
  categoryId: string
  userId: string
  goal: number
  periodType: 'monthly' | string
  categoryName: string
  categoryIconName: string
  resetDay: number
  timezone: string
  carryOver: boolean
  notify: boolean
  notifyAtPct: number[]
  channels: ('IN_APP' | 'EMAIL' | 'WHATSZAPP')[]
  lastNotifiedAt: string | null
  nextCheckAt: string | null
  includeSubcategories: boolean
  isActive: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  periodStart: string
  periodEnd: string
  spent: number
  transactions: Transaction[]
}


export default function ControlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  const { id } = use(params)
  const { controlsByIdQuery } = useControls(id, selectedDate)
  
  if (controlsByIdQuery.isLoading) return <p>Carregando...</p>
  if (controlsByIdQuery.isError) return <p>Erro ao carregar dados</p>

  const control = controlsByIdQuery.data as ControlWithTransactions
  console.log('control', control)
  const chartData = control.transactions
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .map((t) => ({
    date: t.date,
    valor: t.value,
  }))

return (
  <div className="flex flex-col w-full h-full lg:pr-8 pb-16 overflow-auto">
    <div className='bg-[#3ECC89] lg:bg-white p-8 rounded-b-3xl lg:rounded-b-2xl lg:rounded-t-2xl text-white lg:text-gray-600 flex flex-col gap-4'>
      <div className='flex justify-between'>
        <Link href="/dashboard"><Undo2 /></Link>
        <h1 className="text-xl font-bold ">Controle de Metas</h1>
        <button onClick={()=> setDrawerOpen(!drawerOpen)}><SquarePen/></button>
      </div>
      <div className='flex justify-between items-center'>
        <h1 className="text-md font-bold flex gap-2 lg:text-gray-500">
          {IconMap[control.categoryIconName as IconName] && (
            React.createElement(IconMap[control.categoryIconName as IconName], { size: 22 })
          )}
             
          {control.categoryName}
        </h1>
        <MonthSelector
          initialDate={selectedDate}
          onChange={setSelectedDate}
        />
      </div>
      <div className='p-4 lg:p-0 bg-white text-gray-500 rounded-md grid grid-cols-2 rounded-b-2xl'>
        <div className='flex flex-col items-center justify-center border-r border-gray-300 gap-2'>
          <p className='font-semibold text-gray-400'>Meta</p>
          <span className='text-xl lg:text-3xl '>
            {formatter(control.goal)}
          </span>
        </div>
        <div className='flex flex-col items-center justify-center gap-2'>
          <p className='font-semibold text-gray-400'>Gasto atual</p>
          <span className='text-xl lg:text-3xl'>
            {formatter(control.spent)}
          </span>
        </div>
        
      </div>
    </div>

   
    <div className='p-8 h-full flex flex-col gap-4'>
      <SpendingChart data={chartData} spent={control.spent}  goal={control.goal}/>
      <p className="font-semibold">Transações</p>
      <ul className="list-none flex flex-col gap-4 ">
        {control.transactions.map((t) => (
          <li key={t.id} className='p-4 bg-white rounded-md'>
            <div className='flex justify-between'>
              <span className='font-semibold'>
                {t.description}
              </span>
              <span>
                {formatter(t.value)}
              </span>
            </div>
            <span className='text-sm text-gray-400'>
              {format(new Date(t.date), 'dd/MM/yyyy')}
            </span>
          </li>
        ))}
      </ul>
    </div>
    <SpendingControlDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} editing={control} />
  </div>
)
}
