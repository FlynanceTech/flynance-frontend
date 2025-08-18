'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import { useState } from 'react'
import type { Goal } from '@/types/Goals'

interface GoalsChartProps {
  goals?: Goal[]
  isLoading: boolean
}

export default function GoalsChart({ goals, isLoading }: GoalsChartProps) {
  const [open, setOpen] = useState(false)
  
  if (isLoading || !goals) {
    return (
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full space-y-4 animate-pulse">
        <div className="h-5 w-1/3 bg-gray-200 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />

        {/* barras simuladas */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between text-sm">
              <div className="h-3 w-1/2 bg-gray-200 rounded" />
              <div className="h-3 w-1/6 bg-gray-100 rounded" />
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full" />
            <div className="h-3 w-2/3 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }
  
  const metasVisiveis = goals.slice(0, 3)
  
  const renderBar = (meta: Goal) => {
    const percentual = Math.round((meta.current / meta.goal) * 100)
    return (
      <div key={meta.title} className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-700">
          <span>{meta.title}</span>
          <span>{percentual}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-2 bg-blue-500 rounded-full"
            style={{ width: `${percentual}%` }}
          />
        </div>
        <div className="text-xs text-gray-500">
          R$ {meta.current.toFixed(2)} de R$ {meta.goal.toFixed(2)}
        </div>
      </div>
    )
  }

  if (isLoading || !goals) {
    return (
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full space-y-4 animate-pulse">
        <div className="h-5 w-1/3 bg-gray-200 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-1/2 bg-gray-100 rounded" />
            <div className="h-2 bg-gray-200 rounded" />
            <div className="h-2 w-3/4 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200 w-full space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Minhas Metas</h2>
            <button
              onClick={() => setOpen(true)}
              className="text-sm text-blue-600 hover:underline cursor-pointer"
            >
              Ver todas as metas
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Acompanhe o progresso de cada meta financeira
          </p>
        </div>

        <div className="space-y-6">{metasVisiveis.map(renderBar)}</div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="bg-white max-w-md w-full rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-lg font-semibold text-gray-800">Todas as metas</DialogTitle>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">{goals.map(renderBar)}</div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
