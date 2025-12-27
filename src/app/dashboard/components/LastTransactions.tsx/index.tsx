'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, CalendarDays, ChevronRight } from 'lucide-react'

import { useUserSession } from '@/stores/useUserSession'
import { useTranscation } from '@/hooks/query/useTransaction'
import type { Transaction } from '@/types/Transaction'
import DateRangeSelect, { DateFilter } from '../DateRangeSelect'
import { IconResolver } from '@/utils/IconResolver'

function toBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const SkeletonRow: React.FC = () => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-200" />
      <div className="space-y-2">
        <div className="h-3 w-40 bg-gray-200 rounded" />
        <div className="h-3 w-28 bg-gray-100 rounded" />
      </div>
    </div>
    <div className="h-4 w-20 bg-gray-200 rounded" />
  </div>
)

export const LastTransactions: React.FC = () => {
  const { user } = useUserSession()
  const userId =  user?.userData.user.id ?? ''

  const { transactionsQuery } = useTranscation({ userId })
  const isLoading: boolean = transactionsQuery.isLoading
  const transactions: Transaction[] = transactionsQuery.data ?? []

  const [filter, setFilter] = useState<DateFilter>({ mode: 'days', days: 30 })

  const filteredSortedTop7: Transaction[] = useMemo(() => {
    const ordered = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    let filtered = ordered

    if (filter.mode === 'days') {
      const now = Date.now()
      const maxAgeMs = (filter.days ?? 30) * 24 * 60 * 60 * 1000
      filtered = ordered.filter((t) => now - new Date(t.date).getTime() <= maxAgeMs)
    } else {
      const [sy, sm, sd] = filter.start.split('-').map(Number)
      const [ey, em, ed] = filter.end.split('-').map(Number)
      const start = Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0)
      const end = Date.UTC(ey, em - 1, ed, 23, 59, 59, 999)

      filtered = ordered.filter((t) => {
        const d = new Date(t.date).getTime()
        return d >= start && d <= end
      })
    }

    return filtered.slice(0, 7)
  }, [transactions, filter])


  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full h-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Últimas Transações</h2>
          <p className="text-sm text-gray-500">
            {filter.mode === 'days'
              ? <>Últimos <strong>{filter.days}</strong> dias</>
              : <>Período de <strong>{new Date(filter.start + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> até <strong>{new Date(filter.end + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></>}
          </p>

        </div>

        <DateRangeSelect value={filter} onChange={setFilter} />
      </div>

      <div className="divide-y divide-gray-100">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filteredSortedTop7.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            Nenhuma transação no período selecionado.
          </div>
        ) : (
          filteredSortedTop7.map((t) => {
            const isIncome = t.type === 'INCOME'
            const colorClass = isIncome ? 'text-primary' : 'text-red-500'
            const Icon = isIncome ? ArrowUp : ArrowDown
            const categoryName = t.category?.name ?? 'Sem categoria'

            return (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <IconResolver name={t.category?.icon} size={16} />
                  <div className="min-w-0">
                    <div className="text-sm text-gray-800 truncate">
                      {t.description || '(Sem descrição)'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {categoryName} · {new Date(t.date).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                <div className={`text-sm font-semibold ${colorClass} flex items-center gap-1`}>
                  <Icon className="w-4 h-4" />
                  {toBRL(t.value)}
                </div>
              </div>
            )
          })
        )}
      </div>

      {!isLoading && (
        <div className="pt-2 flex justify-end">
          <Link
            href="/dashboard/transacoes"
            className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
          >
            Ver todas <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default LastTransactions
