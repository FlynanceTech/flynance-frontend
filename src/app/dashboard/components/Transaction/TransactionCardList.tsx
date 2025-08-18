'use client'

import { categoriaIcone } from '@/util/categoriesIcone'
import clsx from 'clsx'
import { Pencil, Trash2 } from 'lucide-react'
import React from 'react'
import { Transaction } from '@/types/Transaction'

interface Props {
  transactions: Transaction[]
  selectedIds: Set<string>
  onToggleSelectRow: (index: string) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (index: string) => void
}

export function 
TransactionCardList({
  transactions,
  selectedIds,
  onToggleSelectRow,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="lg:hidden flex flex-col gap-4">
      {transactions.map((item, i) => (
        <div key={i} className="bg-white rounded-lg p-4 shadow border border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => onToggleSelectRow(item.id)}
                className="mr-2"
              />
              {categoriaIcone[item.category.icon as keyof typeof categoriaIcone] ?? (
                <span className="w-4 h-4 bg-gray-300 rounded-full" />
              )}
              <h4 className="font-semibold text-gray-800 truncate">{item.description}</h4>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => onEdit(item)}
                className="text-blue-500"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500 mt-1">{item.date}</div>

          <div className="flex justify-between items-center mt-2">
            <span
              className={clsx(
                'text-xs font-semibold px-3 py-1 rounded-full text-white',
                item.category.type === 'EXPENSE' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
              )}
            >
              {item.category.type === 'EXPENSE' ? 'Receita' : 'Despesas' }
            </span>
            <span
              className={clsx(
                'text-sm font-semibold',
                item.category.type === 'INCOME' ? 'text-[#22C55E]' : 'text-[#EF4444]'
              )}
            >
              {item.category.type === 'INCOME'
                ? `R$ ${item.value.toFixed(2)}`
                : `- R$ ${item.value.toFixed(2)}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
