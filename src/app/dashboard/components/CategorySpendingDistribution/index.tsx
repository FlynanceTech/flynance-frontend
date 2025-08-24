'use client'

import React, { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { Transaction } from '@/types/Transaction'
import { useUserSession } from '@/stores/useUserSession'
import { useTranscation } from '@/hooks/query/useTransaction'
import DateRangeSelect, { DateFilter } from '../DateRangeSelect'

function toBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function CategorySpendingDistribution() {
  // 1) usuário e busca de transações
  const { user } = useUserSession()
  const userId = user?.account?.userId ?? ''
  const { transactionsQuery } = useTranscation({ userId })
  const isLoading = transactionsQuery.isLoading
  const transactions: Transaction[] = transactionsQuery.data || []

  // 2) filtro local (cada componente tem o seu)
  const [filter, setFilter] = useState<DateFilter>({ mode: 'days', days: 30 })

  const filtered = useMemo(() => {
    if (!transactions.length) return [] as Transaction[]

    if (filter.mode === 'days') {
      const now = Date.now()
      const maxAgeMs = (filter.days ?? 30) * 24 * 60 * 60 * 1000
      return transactions.filter(t => now - new Date(t.date).getTime() <= maxAgeMs)
    }

    // mês/ano
    const y = Number(filter.year)
    const m = Number(filter.month) - 1
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)).getTime()
    const end   = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)).getTime()
    return transactions.filter(t => {
      const d = new Date(t.date).getTime()
      return d >= start && d <= end
    })
  }, [transactions, filter])

  // 3) agregação
  const despesas = filtered.filter(t => t.type === 'EXPENSE')

  const map = despesas.reduce<Record<string, { value: number; color: string }>>((acc, t) => {
    const categoria = t.category?.name || 'Outros'
    const color = t.category?.color || '#CBD5E1'
    if (!acc[categoria]) acc[categoria] = { value: 0, color }
    acc[categoria].value += t.value
    return acc
  }, {})

  const data = Object.entries(map).map(([name, { value, color }]) => ({ name, value, color }))
  const total = data.reduce((s, i) => s + i.value, 0)

  // 4) loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full animate-pulse space-y-6">
        <div className="h-5 w-1/3 bg-gray-200 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        <div className="w-full h-[350px] bg-gray-100 rounded" />
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full flex flex-col lg:flex-row gap-8 items-center lg:items-start">
      <div className="w-full lg:w-1/2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Gastos por Categoria</h2>
            <p className="text-sm text-gray-500">
              {filter.mode === 'days'
                ? <>Distribuição dos últimos <strong>{filter.days}</strong> dias</>
                : <>Distribuição de <strong>{new Date(Number(filter.year), Number(filter.month) - 1)
                      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong></>}
            </p>
          </div>
          <DateRangeSelect value={filter} onChange={setFilter} />
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              dataKey="value"
              outerRadius={120}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => toBRL(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full lg:w-1/2 space-y-4 overflow-auto pr-4 max-h-[420px]">
        {data.map((entry, i) => {
          const percent = total > 0 ? (entry.value / total) * 100 : 0
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm text-gray-700 font-medium">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="text-gray-900">{toBRL(entry.value)}</span>
              </div>
              <div className="text-xs text-gray-500">{percent.toFixed(0)}% do total de gastos</div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${percent.toFixed(0)}%`, backgroundColor: entry.color }}
                />
              </div>
            </div>
          )
        })}
        {data.length === 0 && (
          <div className="text-sm text-gray-500">Não há despesas no período selecionado.</div>
        )}
      </div>
    </div>
  )
}
