'use client'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Bell, TrendingDown, Flag, X } from 'lucide-react'
import React, { useState } from 'react'

const metaPrincipal = {
  titulo: 'Viagem para o Chile',
  valorMeta: 5000,
  valorAtual: 3600,
}

const limiteGasto = {
  categoria: 'Alimentação',
  limite: 1000,
  gastoAtual: 1420,
}

export default function SmartAlert() {
  const [open, setOpen] = useState(false)
  const progressoMeta = Math.round((metaPrincipal.valorAtual / metaPrincipal.valorMeta) * 100)
  const gastoPercentual = Math.min(
    Math.round((limiteGasto.gastoAtual / limiteGasto.limite) * 100),
    100
  )

  const excessoGasto = limiteGasto.gastoAtual > limiteGasto.limite
  const ultrapassagem = limiteGasto.gastoAtual - limiteGasto.limite
  const excessoPercentual = Math.round((ultrapassagem / limiteGasto.limite) * 100)

  return (
    <div className=''>
      <div className="flex flex-col gap-6 bg-white p-6 rounded-md border border-[#E2E8F0] w-full col-span-2">
        <div className='flex items-center justify-between'>
          <h2 className="flex items-center gap-2 text-[#333C4D] font-semibold">
            <Bell size={18} /> Alertas
          </h2>
          <button
            onClick={() => setOpen(true)}
            className="text-sm text-blue-600 hover:underline cursor-pointer"
          >
            Ver mais
          </button>
        </div>

        <div className="space-y-2">
          <p className='text-sm text-gray-800 flex items-center gap-2 font-medium'>
            <TrendingDown size={16} className="text-red-500" />
            Limite mensal em <strong>{limiteGasto.categoria}</strong>: R$ {limiteGasto.limite.toFixed(2)}
          </p>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full ${excessoGasto ? 'bg-red-400' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(gastoPercentual, 100)}%` }}
            />
          </div>
          <p className={`text-xs ${excessoGasto ? 'text-red-700' : 'text-gray-500'}`}>
            R$ {limiteGasto.gastoAtual.toFixed(2)} de R$ {limiteGasto.limite.toFixed(2)} ({gastoPercentual}%)
          </p>
       
        </div>
      </div>
      
      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="bg-white max-w-xl w-full rounded-xl shadow-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-lg font-semibold text-gray-800">
                Alertas Inteligentes
              </DialogTitle>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700 cursor-pointer">
                <X size={20}/>
              </button>
            </div>

            <div className="space-y-2">
              <p className='text-sm text-gray-800 flex items-center gap-2 font-medium'>
                <Flag size={16} className="text-blue-500" />
                Meta principal: <span className="text-gray-900 font-semibold">{metaPrincipal.titulo}</span>
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-blue-500 rounded-full"
                  style={{ width: `${progressoMeta}%` }}
                />
              </div>
              <p className='text-xs text-gray-500'>
                R$ {metaPrincipal.valorAtual.toFixed(2)} de R$ {metaPrincipal.valorMeta.toFixed(2)} ({progressoMeta}%)
              </p>
            </div>

            <div className="space-y-2">
              <p className='text-sm text-gray-800 flex items-center gap-2 font-medium'>
                <TrendingDown size={16} className="text-red-500" />
                Limite mensal em <strong>{limiteGasto.categoria}</strong>: R$ {limiteGasto.limite.toFixed(2)}
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full ${excessoGasto ? 'bg-yellow-400' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(gastoPercentual, 100)}%` }}
                />
              </div>
              <p className={`text-xs ${excessoGasto ? 'text-yellow-700' : 'text-gray-500'}`}>
                R$ {limiteGasto.gastoAtual.toFixed(2)} de R$ {limiteGasto.limite.toFixed(2)} ({gastoPercentual}%)
              </p>
              {excessoGasto && (
                <p className='bg-[#FFE26C] text-sm text-[#333C4D] px-4 py-1 rounded-md'>
                  Você gastou R$ {ultrapassagem.toFixed(2)} ({excessoPercentual}%) a mais que o limite estipulado.
                </p>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}
