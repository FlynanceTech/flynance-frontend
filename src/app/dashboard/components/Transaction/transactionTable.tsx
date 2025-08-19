'use client'

import clsx from 'clsx'
import { Pencil, Trash2 } from 'lucide-react'
import React from 'react'
import { Transaction } from '@/types/Transaction'
import { IconMap, IconName } from '@/utils/icon-map'

interface Props {
  transactions: Transaction[]
  selectedIds: Set<string>
  selectAll: boolean
  onToggleSelectAll: () => void
  onToggleSelectRow: (index: string) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (index: string) => void
}

export function TransactionTable({
  transactions,
  selectedIds,
  selectAll,
  onToggleSelectAll,
  onToggleSelectRow,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="w-full h-full bg-white rounded-md border border-gray-200 p-8 hidden lg:block">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-500 border-b border-gray-200">
            <tr>
              <th className="py-2 px-2">
                <input type="checkbox" checked={selectAll} onChange={onToggleSelectAll} />
              </th>
              <th className="py-2">Descrição</th>
              <th className="py-2">Categoria</th>
              <th className="py-2">Data</th>
              <th className="py-2">Valor</th>
              <th className="py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item, i) => (
              <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-4 px-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleSelectRow(item.id)}
                  />
                </td>
                <td className="py-4 max-w-52">
                  <div className='truncate max-w-72'>
                    <span className="text-gray-800 truncate max-w-72" title={item.description}>{item.description}</span>
                  </div>
                </td>
                <td className="py-4 flex items-center gap-3">
                  <div className={clsx('flex items-center gap-2 px-3 py-1 rounded-full text-white',
                     item.category.type === 'INCOME' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                  )}>
                    {
                      IconMap[item.category.icon as IconName] && (
                      React.createElement(IconMap[item.category.icon as IconName], { size: 16 }))
                    }
                    <span
                      className={clsx(
                        'text-xs font-semibold'
                      )}
                    >
                    
                      {item.category.name}
                    </span>
                  </div>
                </td>
                <td className="text-gray-600">{
                    new Intl.DateTimeFormat('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'UTC',
                        }).format(new Date(item.date))
                    }
                </td>
                <td
                  className={clsx(
                    'font-medium',
                    item.category.type === 'INCOME' ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  )}
                >
                  {item.category.type === 'INCOME'
                    ? `R$ ${item.value.toFixed(2)}`
                    : `- R$ ${item.value.toFixed(2)}`}
                </td>
                <td className="flex justify-end gap-4 py-4 pr-2">
                  <button
                    className="text-gray-500 hover:text-blue-300 cursor-pointer"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="text-gray-500 hover:text-red-400 cursor-pointer"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
