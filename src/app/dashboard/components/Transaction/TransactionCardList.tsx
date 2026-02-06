'use client'

import clsx from 'clsx'
import { Pencil, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { Transaction } from '@/types/Transaction'
import { IconResolver } from '@/utils/IconResolver'
import DeleteConfirmModal from '../DeleteConfirmModal'

interface Props {
  transactions: Transaction[]
  selectedIds: Set<string>
  onToggleSelectRow: (index: string) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (index: string) => void
}

export function TransactionCardList({
  transactions,
  selectedIds,
  onToggleSelectRow,
  onEdit,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false)
  
  const [targetId, setTargetId] = useState<string | null>(null)

  const paymentLabel = (value?: Transaction['paymentType']) => {
    switch (value) {
      case 'PIX':
        return 'Pix'
      case 'CREDIT_CARD':
        return 'Crédito'
      case 'DEBIT_CARD':
        return 'Débito'
      case 'BOLETO':
        return 'Boleto'
      case 'TED':
        return 'TED'
      case 'DOC':
        return 'DOC'
      case 'MONEY':
        return 'Dinheiro'
      case 'CASH':
        return 'Espécie'
      case 'OTHER':
        return 'Outro'
      default:
        return 'Pagamento'
    }
  }

  const originLabel = (value?: Transaction['origin']) => {
    switch (value) {
      case 'WHATSAPP':
        return 'WhatsApp'
      case 'TEXT':
        return 'Texto'
      case 'IMAGE':
        return 'Imagem'
      case 'AUDIO':
        return 'Áudio'
      case 'CHATBOT':
        return 'Chatbot'
      case 'DASHBOARD':
        return 'Dashboard'
      case 'IMPORT':
        return 'Importação'
      case 'MESSAGE':
        return 'Mensagem'
      default:
        return 'Manual'
    }
  }

  
  function handleConfirmDelete() {
    if (targetId) onDelete(targetId)
  }

  return (
    <div className="lg:hidden flex flex-col gap-4">
      {transactions.map((item) => {
        const category = item.category
        const categoryType = category?.type ?? item.type ?? 'EXPENSE'
        const isIncome = categoryType === 'INCOME'
        const iconName = category?.icon ?? 'circle'
        const description = item.description ?? 'Sem descricao'
        const value = Number(item.value ?? 0)
        const categoryName = category?.name ?? 'Sem categoria'

        return (
          <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => onToggleSelectRow(item.id)}
                className="mt-1"
              />

              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      <IconResolver name={iconName} size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">
                        {description}
                      </h4>
                     
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'rounded-full px-2 py-1 font-semibold text-white text-xs',
                      isIncome ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                    )}
                  >
                    {isIncome ? 'Receita' : 'Despesa'}
                  </span>
                
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'UTC',
                    }).format(new Date(item.date))}
                  </span>
          
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                    {paymentLabel(item.paymentType)}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                    {originLabel(item.origin)}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {categoryName}
                  </p>
                  <span
                    className={clsx(
                      'shrink-0 text-sm font-semibold',
                      isIncome ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    )}
                  >
                    {isIncome ? `R$ ${value.toFixed(2)}` : `- R$ ${value.toFixed(2)}`}
                  </span>
                  <div className='flex gap-2'>
                    <button 
                      className="text-gray-500 hover:text-blue-400 cursor-pointer"
                      onClick={() => onEdit(item)}
                      aria-label="Editar transação"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="text-gray-500 hover:text-red-400 cursor-pointer"
                      onClick={() => {
                        setTargetId(item.id)
                        setOpen(true)
                      }}
                      aria-label="Excluir transação"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <DeleteConfirmModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir transação"
        description="Tem certeza que deseja excluir esta transação?"
      />

    </div>
  )
}
