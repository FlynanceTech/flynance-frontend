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
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowUpDown,
  ChartPie,
  ChartScatter,
} from 'lucide-react'

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


export default function CategorySpendingDistribution({transactions, isLoading}) {
  
  const [sortDesc, setSortDesc] = useState(true)
  const [changeChart, setChangeChart] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedCategoryName, setSelectedCategoryName] = useState('')
  const [freezeAnimation, setFreezeAnimation] = useState(false)

  const despesas = transactions.filter(t => t.type === 'EXPENSE')

  const map = despesas.reduce((acc, t) => {
    const categoriaId = t.category?.id || 'outros'
    const categoriaNome = t.category?.name || 'Outros'
    const color = t.category?.color || '#CBD5E1'
    if (!acc[categoriaId]) {
      acc[categoriaId] = { id: categoriaId, name: categoriaNome, value: 0, color }
    }
    acc[categoriaId].value += t.value
    return acc
  }, {})

  const categoriasAgrupadas = despesas.reduce((acc, d) => {
    const id = d.category?.id || 'outros'
    const nome = d.category?.name || 'Outros'
    const cor = d.category?.color || '#CBD5E1'

    if (!acc[id]) {
      acc[id] = { id, name: nome, size: 0, color: cor }
    }

    acc[id].size += d.value

    return acc
  }, {})
  
  const data = [
    {
      name: '',
      children: Object.values(categoriasAgrupadas),
    },
  ];

  
  const dataPae = Object.entries(map).map(([name, { value, color }]) => ({ name, value, color }))

  const total = data[0]?.children?.reduce((sum, item) => sum + item.size, 0) ?? 0
  const selectedTransactions = selectedCategoryId
    ? despesas.filter((t) =>
        selectedCategoryId === 'outros'
          ? !t.category?.id
          : t.category?.id === selectedCategoryId
      )
    : []
  const disableAnimation = freezeAnimation


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
              animationDuration={disableAnimation ? 0 : 500}
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
                isAnimationActive={!disableAnimation}
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
        <div className="w-full space-y-4 overflow-auto pr-4 max-h-[420px]">
          {selectedCategoryId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {selectedCategoryName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedTransactions.length} transações
                  </p>
                </div>
                <button
                  className="rounded-full border border-gray-200 p-1 text-gray-500 hover:bg-gray-50"
                  onClick={() => {
                    setSelectedCategoryId(null)
                    setSelectedCategoryName('')
                    setFreezeAnimation(true)
                  }}
                  title="Voltar para categorias"
                >
                  <ArrowLeft size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {selectedTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-gray-800 font-medium">
                        {t.description || 'Transação'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="text-gray-900 font-semibold">
                      {toBRL(t.value)}
                    </span>
                  </div>
                ))}
                {selectedTransactions.length === 0 && (
                  <div className="text-sm text-gray-500">
                    Nenhuma transação nesta categoria.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {data[0]?.children?.sort((a, b) => sortDesc ? b.size - a.size : a.size - b.size)
              .map((entry, i) => {
                const percent = total > 0 ? (entry.size / total) * 100 : 0
                return (
                  <button
                    key={i}
                    className="w-full text-left space-y-1 rounded-lg p-2 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    onClick={() => {
                      setSelectedCategoryId(entry.id)
                      setSelectedCategoryName(entry.name)
                      setFreezeAnimation(true)
                    }}
                  >
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
                  </button>
                )
              })}
              {data.length === 0 && (
                <div className="text-sm text-gray-500">Não há despesas no período selecionado.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
