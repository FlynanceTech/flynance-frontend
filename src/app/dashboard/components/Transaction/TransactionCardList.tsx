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

  
  function handleConfirmDelete() {
    if (targetId) onDelete(targetId)
  }

  return (
    <div className="lg:hidden flex flex-col gap-4">
      {transactions.map((item, i) => {
        const category = item.category
        const categoryType = category?.type ?? item.type ?? 'EXPENSE'
        const isIncome = categoryType === 'INCOME'
        const iconName = category?.icon ?? 'circle'
        const description = item.description ?? 'Sem descricao'
        const value = Number(item.value ?? 0)

        return (
          <div key={i} className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex gap-2 items-center min-w-0">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggleSelectRow(item.id)}
                  className="mr-2"
                />
                <IconResolver name={iconName} size={16} />

                <h4 className="font-semibold text-gray-800 truncate flex-1 min-w-0">
                  {description}
                </h4>
              </div>
              <div className="flex gap-4">
                <button
                  className="text-gray-500 hover:text-blue-300 cursor-pointer"
                  onClick={() => onEdit(item)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="text-gray-500 hover:text-red-400 cursor-pointer"
                  onClick={() => {
                    setTargetId(item.id)
                    setOpen(true)
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-500 mt-1">
              {new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
                timeZone: 'UTC',
              }).format(new Date(item.date))}
            </div>

            <div className="flex justify-between items-center mt-2">
              <span
                className={clsx(
                  'text-xs font-semibold px-3 py-1 rounded-full text-white',
                  isIncome ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                )}
              >
                {isIncome ? 'Receita' : 'Despesas'}
              </span>
              <span
                className={clsx(
                  'text-sm font-semibold',
                  isIncome ? 'text-[#22C55E]' : 'text-[#EF4444]'
                )}
              >
                {isIncome ? `R$ ${value.toFixed(2)}` : `- R$ ${value.toFixed(2)}`}
              </span>
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
