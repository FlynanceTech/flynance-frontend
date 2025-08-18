'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { categoriaCores } from '@/util/categoriesIcone'
import { Transaction } from '@/types/Transaction'
import { ChevronDown, Undo2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTransactionFilter } from '@/stores/useFilter'
import { useState } from 'react'
import { useCategories } from '@/hooks/query/useCategory'
import { CategoryResponse } from '@/services/category'

interface CategoryChartProps {
  transactions?: Transaction[]
  isLoading: boolean
}

const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format

export default function CategoryChart({ isLoading, transactions }: CategoryChartProps) {
  const isMobile = useIsMobile()
  const [showLegend, setShowLegend] = useState(false)
  
  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategories = useTransactionFilter((s) => s.setSelectedCategories)
  const {
    categoriesQuery: { data: allCategories = [] }
  } = useCategories()
  
  const isDetalhado = selectedCategories.length === 1
  const categoriaSelecionada = isDetalhado ? selectedCategories[0] : null

  if (isLoading || !transactions) {
    return (
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full animate-pulse space-y-4">
        <div className="h-5 w-1/3 bg-gray-200 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        <div className="space-y-2 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const receitas = transactions.filter(t => t.type === 'INCOME')
  const despesas = transactions.filter(t =>  t.type === 'EXPENSE')

  const totalReceita = receitas.reduce((acc, item) => acc + item.value, 0)

  const despesasPorCategoria = despesas.reduce((acc: Record<string, number>, item) => {
    acc[item.category.name] = (acc[item.category.name] || 0) + item.value
    return acc
  }, {})

  const dataChart = [
    {
      name: 'Receita',
      valor: totalReceita,
    },
    {
      name: 'Despesas',
      ...despesasPorCategoria,
    },
  ]
  const acumuladoPorCategoria = despesas.reduce((acc: Record<string, number>, item) => {
    acc[item.category.name] = (acc[item.category.name] || 0) + item.value
    return acc
  }, {})
  const dataAgrupada = Object.entries(acumuladoPorCategoria).map(([categoria, valor]) => ({
    categoria,
    valor,
  }))

  const categoriasDespesas = Object.keys(despesasPorCategoria)

  const dataDetalhada = transactions
  .filter(t => t.category.id === categoriaSelecionada?.id)
  .map(t => ({
    data: new Date(t.date).toLocaleDateString('pt-BR'),
    valor: t.value,
    description: t.description
  }))

  const maxCategoriaLength = Math.max(...dataAgrupada.map(d => String(d.valor).length))

  const handleShowLegend = () => {
    setShowLegend(!showLegend)
  }

  const findColorCategory = (category:CategoryResponse) => {
    const categoriaObj = allCategories.find((c) => c.id === category.id)
    return categoriaObj?.color
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow border border-gray-200 w-full h-full">
      <div className="flex justify-between items-center px-4 pt-4">
        <div className='w-full flex flex-col lg:flex-row lg:justify-between items-start '>
          <div className='flex flex-col '>
            <h2 className="text-xl font-semibold text-gray-800">
              {categoriaSelecionada ? `Detalhes de ${categoriaSelecionada}` : 'Receita x Despesas'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">Resumo das suas finanças no período selecionado</p>
          </div>
          {
          categoriaSelecionada 
          ? 
          <button
              onClick={() => setSelectedCategories([])}
              className="text-sm text-[#333C4D] cursor-pointer flex gap-2 items-center"
            >
              Voltar
              <Undo2 className="h-5 w-5 " />
            </button>
          :       
            <button onClick={handleShowLegend} className="text-sm text-[#333C4D] cursor-pointer flex gap-2 items-center">
              <span>Legenda </span>
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-200 ${showLegend ? 'rotate-180' : ''}`}
              />
            </button>
          }

          </div>
      </div>
      {
        showLegend && !categoriaSelecionada &&
        <div className='flex flex-wrap gap-2'>
          {categoriasDespesas.map((catName) => {
            const categoriaObj = allCategories.find((c) => c.name === catName)
            if (!categoriaObj) return null

            return (
              <button
                key={catName}
                className="flex items-center gap-2 text-sm px-3 py-1 rounded-full cursor-pointer"
                onClick={() => setSelectedCategories([categoriaObj])}
              >
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: categoriaCores[catName] || categoriaCores['Outros'] }}
                />
                <span className="text-gray-700">{catName}</span>
              </button>
          )}
        )}
        </div>
      }
      <div className='flex flex-col  gap-4 justify-center mt-8'>
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 500} >
          {categoriaSelecionada ? (
              <BarChart data={dataDetalhada}  margin={{ top: 10, right: 30, left: maxCategoriaLength * 4.5, bottom: 0 }}>
                <XAxis dataKey="data" />
                <YAxis tickFormatter={value => formatter(value)} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const item = payload[0].payload
                      return (
                        <div className="bg-white border border-gray-200 rounded shadow p-3 text-sm space-y-1 max-w-xs">
                          <div className="font-semibold text-gray-800">{item.description}</div>
                          <div className="text-gray-600">Data: {item.data}</div>
                          <div className="text-gray-700 font-medium">Valor: {formatter(item.valor)}</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="valor"
                  fill={findColorCategory(categoriaSelecionada)}
                />
              </BarChart>
            ) : (
          <BarChart 
            data={dataChart} 
            margin={{ top: 10, right: 30, left: maxCategoriaLength * 3.5, bottom: 0 }}
            barGap={isMobile ? -55 : -140}
          >
            <XAxis 
              dataKey="name" 
              interval={0} 
              tick={{ textAnchor: 'middle' }}
            />

            <YAxis tickFormatter={value => formatter(value)} />
            {!isMobile && <Tooltip formatter={(value: number) => formatter(value)} cursor={false}/>}
         

            <Bar dataKey="valor" fill="#22C55E" barSize={isMobile ? 45 : 150  }/>

            {categoriasDespesas.map((categoriaName) => {
              const categoriaObj = allCategories.find(c => c.name === categoriaName)
           
              return (
                <Bar
                  key={categoriaName}
                  dataKey={categoriaName}
                  stackId="despesas"
                  fill={categoriaObj?.color || '#CBD5E1'} // ou 
                  barSize={isMobile ? 45 : 150}
                />
              )
            })}
          </BarChart>
            )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}