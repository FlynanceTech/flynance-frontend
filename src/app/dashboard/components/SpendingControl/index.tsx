'use client'

import { categoriaIcone } from '@/util/categoriesIcone'
import { Transaction } from '@/types/Transaction'
import { ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSpendingControlStore } from '@/stores/useSpendingControlStore'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { useEffect } from 'react'
import { useControls } from '@/hooks/query/useSpendingControl'

interface GoalCategoryProps {
  transactions?: Transaction[]
  isLoading: boolean
}

const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format

export function SpendingControl({ transactions, isLoading }: GoalCategoryProps) {
  const {
    controlsQuery,
  } = useControls()
  const isMobile = useIsMobile()
  const router = useRouter()
  const { addControl, controls, resetControls } = useSpendingControlStore()
  const categories = useCategoryStore((s) => s.categoryStore)

  useEffect(() => {
    if (controlsQuery.data) {
      resetControls()
      controlsQuery.data.forEach((c) =>
        addControl({
          categoryId: c.categoryId,
          meta: c.goal,
          limite: c.limit,
          periodType: c.period,
          alert: c.alert
        })
      )
    }
  }, [controlsQuery.data])

  const valoresPorCategoria = transactions?.reduce((acc, curr) => {
    const controleRelacionado = controls.find((c) => c.categoryId === curr.categoryId)
    if (!controleRelacionado) return acc
    acc[curr.categoryId] = (acc[curr.categoryId] || 0) + curr.value
    return acc
  }, {} as Record<string, number>) || {}

  const metasComGasto = controls.map((meta) => ({
    ...meta,
    gasto: valoresPorCategoria[meta.categoryId] || 0,
    categoriaNome: categories.find((c) => c.id === meta.categoryId)?.name || 'Categoria desconhecida',
  }))

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Controle de Gastos</h2>
        <Link
          href="/dashboard/controles"
          className="flex items-center gap-1 bg-[#CEF2E1] text-[#333C4D] font-bold px-4 py-2 rounded-full text-sm hover:bg-[#bde9d4] transition cursor-pointer"
        >
          <ClipboardList className="w-4 h-4" />
          {!isMobile && 'Meus Controles'}
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : controls.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-sm text-gray-500 text-center py-8">
            <ClipboardList className="w-6 h-6 mb-2 text-gray-400" />
            Nenhum controle de gasto cadastrado ainda. <br />
            você pode cadastrar um novo controle no botão acima!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {metasComGasto.slice(0, 5).map(({ categoryId, categoriaNome, meta, limite, gasto }) => {
              const percent = Math.min((gasto / meta) * 100, 100)
              const color =
                gasto > meta
                  ? 'bg-red-500'
                  : percent >= 75
                  ? 'bg-green-600'
                  : percent >= 50
                  ? 'bg-yellow-400'
                  : `bg-green-400`

              return (
                <div key={categoryId} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {categoriaIcone[categoriaNome as keyof typeof categoriaIcone] ?? (
                      <span className="w-4 h-4 bg-gray-300 rounded-full" />
                    )}
                    <span className="text-sm font-medium text-gray-700 flex-1">{categoriaNome}</span>
                    <span className="text-xs text-gray-500">Limite {formatter(limite)}</span>
                  </div>

                  <div className="w-full h-4 overflow-hidden relative">
                    <div className="h-2 absolute top-[3px] bg-gray-200 w-full rounded-full" />
                    <div className={`h-2 absolute top-[3px] z-10 ${color} rounded-full`} style={{ width: `${(gasto / limite) * 100}%` }} />
                    <div
                      className="absolute top-0 z-20 h-[16px] w-[4px] bg-gray-700 rounded-full"
                      style={{ left: `${(meta / limite) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-600">
                    <span>
                      Mês: {formatter(gasto)} ({Math.round((gasto / limite) * 100)}%)
                    </span>
                    <div className="flex flex-col md:flex-row text-right">
                      <span className={gasto > meta ? 'text-red-600' : 'text-green-600'}>
                        Meta: {formatter(meta)}
                      </span>
                      <span className={`${gasto > meta ? 'text-red-600' : 'text-green-600'} xs:text-[10px]`}>
                        ({gasto > meta
                          ? `Excedido em ${formatter(gasto - meta)}`
                          : `Restante: ${formatter(meta - gasto)}`})
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {controls.length > 1 && (
              <button
                onClick={() => router.push('/dashboard/controles')}
                className="text-sm text-green-600 cursor-pointer w-full mt-8"
              >
                Ver todos os controles
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
