'use client'

import React, { useMemo, useState } from 'react'
import {
  Treemap,
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
} from 'recharts'
import { useUserSession } from '@/stores/useUserSession'
import { useTranscation } from '@/hooks/query/useTransaction'
import DateRangeSelect from '../DateRangeSelect'
import { ArrowDownUp, ArrowUpDown, ChartPie, ChartScatter } from 'lucide-react'

function toBRL(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(v)
}

const CustomRect = (props) => {
  const { depth, x, y, width, height, name, color } = props

  const fillColor = depth === 2 ? color : 'transparent'

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fillColor,
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {depth === 2 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          pointerEvents="none"
        >
          {name}
        </text>
      )}
    </g>
  )
}


export default function CategorySpendingDistribution() {
  const { user } = useUserSession()
  const userId = user?.user.id ?? ''
  const { transactionsQuery } = useTranscation({ userId })
  const isLoading = transactionsQuery.isLoading
  const transactions = transactionsQuery.data || []
  
  const [sortDesc, setSortDesc] = useState(true)
  const [changeChart, setChangeChart] = useState(true)
  const [filter, setFilter] = useState({ mode: 'days', days: 30 })

  const filtered = useMemo(() => {
    if (!transactions.length) return []

    if (filter.mode === 'days') {
      const now = Date.now()
      const maxAgeMs = (filter.days ?? 30) * 24 * 60 * 60 * 1000
      return transactions.filter(t => now - new Date(t.date).getTime() <= maxAgeMs)
    }

    const y = Number(filter.year)
    const m = Number(filter.month) - 1
    const start = new Date(Date.UTC(y, m, 1)).getTime()
    const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)).getTime()
    return transactions.filter(t => {
      const d = new Date(t.date).getTime()
      return d >= start && d <= end
    })
  }, [transactions, filter])

  const despesas = filtered.filter(t => t.type === 'EXPENSE')

  const map = despesas.reduce((acc, t) => {
    const categoria = t.category?.name || 'Outros'
    const color = t.category?.color || '#CBD5E1'
    if (!acc[categoria]) acc[categoria] = { value: 0, color }
    acc[categoria].value += t.value
    return acc
  }, {})

  const categoriasAgrupadas = despesas.reduce((acc, d) => {
    const nome = d.category.name;
    const cor = d.category.color;
  
    if (!acc[nome]) {
      acc[nome] = { name: nome, size: 0, color: cor };
    }
  
    acc[nome].size += d.value;
  
    return acc;
  }, {});
  
  const data = [
    {
      name: '',
      children: Object.values(categoriasAgrupadas),
    },
  ];

  
  const dataPae = Object.entries(map).map(([name, { value, color }]) => ({ name, value, color }))

  const total = data[0]?.children?.reduce((sum, item) => sum + item.size, 0) ?? 0


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
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full flex flex-col lg:flex-row gap-4 items-center lg:items-start">
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Gastos por Categoria</h2>
          <div className='flex items-center gap-4 justify-between'>
            <button  
              className='border border-gray-300 rounded-full p-1 text-gray-500 w-9 h-9 flex items-center justify-center hover:bg-gray-50 cursor-pointer'
              onClick={() => setChangeChart(prev => !prev)}
              title='trocar leitura de grafico'  
            >
              {changeChart ? <ChartPie size={18} />  : <ChartScatter size={18} /> }
            </button>
            <button
              onClick={() => setSortDesc(prev => !prev)}
              className='border border-gray-300 rounded-full p-1 text-gray-500 w-9 h-9 flex items-center justify-center hover:bg-gray-50 cursor-pointer'
              title="Mudar Ordenação"
            >
              {sortDesc ?  <ArrowUpDown size={18} /> :  <ArrowDownUp size={18} />}
            </button>
            <DateRangeSelect value={filter} onChange={setFilter} />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          {
            changeChart ? 
              <Treemap
              width={400}
              height={200}
              data={data}
              dataKey="size"
              nameKey="name"
              stroke="#fff"
              animationDuration={500}
              content={(props) => <CustomRect {...props} />}
              />
            :
              <PieChart>
              <Pie
                data={dataPae}
                cx="50%"
                cy="50%"
                dataKey="value"
                outerRadius={120}
              >
                {dataPae.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => toBRL(v)} />
            </PieChart>   
          }
        </ResponsiveContainer>
      </div>
      <div className='flex flex-col gap-2 w-full lg:w-1/2 '>
        <p className="text-sm text-gray-500">
          {filter.mode === 'days'
            ? <>Distribuição dos últimos <strong>{filter.days}</strong> dias</>
            : <>Distribuição de <strong>{new Date(Number(filter.year), Number(filter.month) - 1)
              .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong></>}
        </p>
        
        <div className="w-full space-y-4 overflow-auto pr-4 max-h-[420px]">
          {data[0]?.children?.sort((a, b) => sortDesc ? b.size - a.size : a.size - b.size)
          .map((entry, i) => {
            const percent = total > 0 ? (entry.size / total) * 100 : 0
            return (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm text-gray-700 font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.name}
                  </span>
                  <span className="text-gray-900">{toBRL(entry.size)}</span>
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
    </div>
  )
}
