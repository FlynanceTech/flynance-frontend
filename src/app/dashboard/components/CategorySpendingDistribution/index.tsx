'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { Transaction } from '@/types/Transaction'

interface CategorySpendingDistributionProps {
  transactions?: Transaction[]
  isLoading: boolean
}

export default function CategorySpendingDistribution({
  isLoading,
  transactions = [],
}: CategorySpendingDistributionProps) {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full animate-pulse space-y-6">
        <div className="h-5 w-1/3 bg-gray-200 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        <div className="w-full h-[350px] bg-gray-100 rounded" />
      </div>
    )
  }

  const despesas = transactions.filter((t) => t.type === 'EXPENSE')

  const somaPorCategoria = despesas.reduce((acc: Record<string, { value: number, color: string }>, item) => {
    const categoria = item.category?.name || 'Outros'
    const cor = item.category?.color || '#CBD5E1' // cinza claro padrão
    if (!acc[categoria]) {
      acc[categoria] = { value: 0, color: cor }
    }
    acc[categoria].value += item.value
    return acc
  }, {})

  const data = Object.entries(somaPorCategoria).map(([name, { value, color }]) => ({
    name,
    value,
    color,
  }))

  const total = data.reduce((acc, item) => acc + item.value, 0)

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full flex flex-col lg:flex-row gap-8 items-center lg:items-start">
      <div className="w-full lg:w-1/2">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Gastos por Categoria</h2>
        <p className="text-sm text-gray-500 mb-4">Análise da distribuição de seus gastos</p>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(value)
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full lg:w-1/2 space-y-4 overflow-auto pr-4 max-h-[420px]">
        {data.map((entry, index) => {
          const percentage = ((entry.value / total) * 100).toFixed(0)
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm text-gray-700 font-medium">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}
                </span>
                <span className="text-gray-900">R$ {entry.value.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500">{percentage}% do total de gastos</div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: entry.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
