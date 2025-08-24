'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { categoriaCores } from '@/utils/categoriesIcone'
import { Transaction } from '@/types/Transaction'

interface IncomeChartProps {
  transactions?: Transaction[]
  isLoading: boolean
}

const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format

export default function IncomeChart({ transactions, isLoading }:IncomeChartProps) {

  if (!transactions || isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full space-y-4 animate-pulse">
        <div className="h-5 w-1/3 bg-gray-200 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        <div className="space-y-2 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const receitas = transactions.filter((t) => t.type === 'INCOME')

  const receitaPorFonte = receitas.reduce((acc: Record<string, number>, item) => {
    acc[item.description] = (acc[item.description] || 0) + item.value
    return acc
  }, {})

  const data = Object.entries(receitaPorFonte).map(([descricao, valor]) => ({
    descricao,
    valor,
  }))

  const maxCategoriaLength = Math.max(...data.map((d) => String(d.valor).length))

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Receitas por Fonte</h2>
      <p className="text-sm text-gray-500 mb-4">
        Acompanhe quanto entrou por cada fonte de receita
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: maxCategoriaLength > 15 ? (maxCategoriaLength * 4.5) : (maxCategoriaLength * 8.5) , bottom: 0 }}
        >
          <XAxis dataKey="descricao" />
          <YAxis tickFormatter={(value) => formatter(value)} />
          <Tooltip formatter={(value: number) => formatter(value)} cursor={false} />
          <Bar dataKey="valor" fill="#22C55E">
            {data.map((entry, index) => (
              <Cell key={index} fill={categoriaCores['Receita']} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
