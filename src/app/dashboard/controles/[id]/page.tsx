'use client'

import { useControls } from '@/hooks/query/useSpendingControl'
import { format } from 'date-fns'
import React, { use, useState } from 'react'
import { SpendingChart } from '../../components/SpendingChart'
import { formatter } from '@/utils/formatter'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, SquarePen, Undo2, XCircle } from 'lucide-react'
import MonthSelector from '../../components/MonthSelector'
import { IconMap, IconName } from '@/utils/icon-map'
import SpendingControlDrawer from '../../components/SpendingControlDrawer'

export interface Transaction {
  id: string
  userId: string
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
  channels: ('IN_APP' | 'EMAIL' | 'WHATSAPP')[]
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
  const {spent, goal, categoryIconName, categoryName, transactions} = control

  const chartDataMap = new Map<string, { date: string; valor: number; acumulado: number }>()
let acumulado = 0

const chartData = control.transactions
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .reduce((acc, t) => {
    const date = format(new Date(t.date), 'yyyy-MM-dd')

    const existing = chartDataMap.get(date)
    if (existing) {
      existing.valor += t.value
      existing.acumulado += t.value
    } else {
      acumulado += t.value
      const entry = { date, valor: t.value, acumulado }
      chartDataMap.set(date, entry)
      acc.push(entry)
    }

    return acc
  }, [] as { date: string; valor: number; acumulado: number }[])


  const exceeded = spent > goal
  const percentage = (spent / goal) * 100
  const exceededAmount = spent - goal

  const STATUS = {
    ok: { cls: 'text-primary', Icon: CheckCircle2, label: 'OK', bar: 'bg-blue-500', textColor: 'text-blue-500' },
    warning: { cls: 'text-yellow-500', Icon: AlertTriangle, label: 'Atenção', bar: 'bg-yellow-400', textColor: 'text-yellow-400' },
    danger: { cls: 'text-red-600', Icon: XCircle, label: 'Estourou', bar: 'bg-red-500', textColor: 'text-red-500' },
  } as const

    
  type StatusKey = keyof typeof STATUS


  function getStatus(p: number): StatusKey {
    if (p > 90) return 'danger'
    if (p > 60) return 'warning'
    return 'ok'
  }
  const status = getStatus(percentage)
  const { Icon, cls, label, bar: Color, textColor} = STATUS[status]


  return (
    <div className="flex flex-col w-full h-full lg:pr-8 pb-16 lg:pb-0 overflow-auto">
      <div className='bg-gradient-to-b from-secondary to-primary lg:bg-gradient-to-r lg:from-[#fff] lg:to-[#fff]
       p-8 rounded-b-3xl lg:rounded-b-2xl lg:rounded-t-2xl text-white lg:text-gray-600 flex flex-col gap-4'>
        <div className='flex justify-between'>
          <Link href="/dashboard/controles"><Undo2 /></Link>
          <h1 className="text-xl font-bold ">Controle de Metas</h1>
          <button onClick={()=> setDrawerOpen(!drawerOpen)}><SquarePen/></button>
        </div>
        <div className='flex justify-between items-center'>
          <h1 className="text-md font-bold flex gap-2 lg:text-gray-500">
            {IconMap[categoryIconName as IconName] && (
              React.createElement(IconMap[categoryIconName as IconName], { size: 22 })
            )}
              
            {categoryName}
          </h1>
          <MonthSelector
            initialDate={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
        <div className='p-4 lg:p-0 bg-white text-gray-500 rounded-md grid grid-cols-2 rounded-b-2xl'>
          <div className='flex flex-col items-center justify-center border-r border-gray-300 gap lg:gap-2'>
            <p className='font-semibold text-gray-400 text-sm lg:text-xl'>Meta</p>
            <span className='text-lg lg:text-3xl '>
              {formatter(goal)}
            </span>
          </div>
          <div className='flex flex-col items-center justify-center gap lg:gap-2'>
            <p className='font-semibold text-gray-400 text-sm lg:text-xl'>Gasto atual</p >
            <div className='flex flex-col text-center'>
              <span className={`text-lg lg:text-3xl ${exceeded ? 'text-red-500' : 'text-gray-500'}`}>
                {formatter(spent)}
              </span>
            </div>
          </div>
        </div>
      </div>
  
      <div className='flex flex-col px-8 pt-4 gap-2'>
        <div className='flex items-center justify-between'>
          <p className={`text-xs px-2 py-1 rounded-full font-medium flex items-center`}>
            <span className='flex items-center gap-2'>
              <Icon className={`w-4 h-4 ${cls}`} aria-hidden />
              <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                <span className="text-xs text-gray-500">
                  {label}  {
                  exceeded &&
                    <span>
                      {formatter(exceededAmount)}
                    </span>
                  }
                </span>  

              </span>
            </span>
          </p>
        
          <p className={`text-xs font-semibold col-span-1 ${textColor}`}>
            {percentage.toFixed(0)}% da meta
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full ${Color}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>

    
      <div className='p-8 pt-4 flex flex-col gap-4'>
        <div className='flex flex-col'>
          <SpendingChart data={chartData} spent={spent}  goal={goal}/>
          <p className="text-xs text-gray-400 text-center mt-2">
            O gráfico representa o gasto diário dentro do período selecionado
          </p>
        </div>
        <p className="font-semibold">Transações</p>

        {transactions.length === 0 ? (
          <p className="text-center text-gray-400 mt-4">Nenhuma transação neste período.</p>
          ) : (
            <ul className="list-none flex flex-col gap-4 ">
              {transactions.map((t) => (
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
          )}
      </div>
      <SpendingControlDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} editing={control} />
    </div>
  )
}
