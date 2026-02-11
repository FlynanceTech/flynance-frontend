'use client'

import React, { useMemo } from 'react'
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { Transaction } from '@/types/Transaction'

type SortField = 'date' | 'value' | null
type SortDirection = 'asc' | 'desc'

type Props = {
  transactions: Transaction[]
  selectedIds: Set<string>
  selectAll: boolean
  onToggleSelectAll: () => void
  onToggleSelectRow: (id: string) => void
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void

  sortField: SortField
  sortDirection: SortDirection
  onSortChange: (field: 'date' | 'value') => void
}

function toBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function fmtDate(d: any) {
  // suporta Date | string
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('pt-BR')
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown className="h-4 w-4 opacity-60" />
  return direction === 'asc' ? (
    <ArrowUp className="h-4 w-4" />
  ) : (
    <ArrowDown className="h-4 w-4" />
  )
}

/**
 * Grid columns:
 *  - checkbox
 *  - data
 *  - descrição (flexível)
 *  - categoria (desktop)
 *  - tipo (desktop)
 *  - valor
 *  - ações
 */
const GRID_COLS =
  'grid-cols-[40px_110px_minmax(220px,1fr)_220px_110px_140px_92px]'

export function TransactionTable({
  transactions,
  selectedIds,
  selectAll,
  onToggleSelectAll,
  onToggleSelectRow,
  onEdit,
  onDelete,
  sortField,
  sortDirection,
  onSortChange,
}: Props) {
  const hasData = transactions?.length > 0

  // pra não “piscar” o header quando não tiver dado
  const rows = useMemo(() => transactions ?? [], [transactions])

  return (
    <div className="w-full hidden md:block">
      {/* Container */}
      <div className="rounded-xl border border-gray-200 bg-white shadow overflow-hidden">
        {/* Header Sticky */}
        <div
          role="row"
          className={[
            'sticky top-0 z-10',
            'grid',
            GRID_COLS,
            'items-center gap-0',
            'border-b border-gray-200 ',
            'bg-secondary/30 backdrop-blur',
            'px-4 py-4',
          ].join(' ')}
        >
          {/* Select all */}
          <div role="columnheader" className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={onToggleSelectAll}
              className="h-4 w-4 accent-black"
              aria-label="Selecionar todas as transações desta página"
            />
          </div>

          {/* Date */}
          <button
            type="button"
            role="columnheader"
            onClick={() => onSortChange('date')}
            className="flex items-center gap-2 text-left text-sm font-semibold text-primary hover:text-gray-900 cursor-pointer"
            title="Ordenar por data"
          >
            Data
            <SortIcon active={sortField === 'date'} direction={sortDirection} />
          </button>

          {/* Description */}
          <div role="columnheader" className="text-sm font-semibold text-primary">
            Descrição
          </div>

          {/* Category (desktop) */}
          <div role="columnheader" className="hidden lg:block text-sm font-semibold text-primary">
            Categoria
          </div>

          {/* Type (desktop) */}
          <div role="columnheader" className="hidden lg:block text-sm font-semibold text-primary">
            Tipo
          </div>

          {/* Value */}
          <button
            type="button"
            role="columnheader"
            onClick={() => onSortChange('value')}
            className="flex items-center justify-end gap-2 text-right text-sm font-semibold text-primary hover:text-gray-900 pr-8 cursor-pointer"
            title="Ordenar por valor"
          >
            Valor
            <SortIcon active={sortField === 'value'} direction={sortDirection} />
          </button>

          {/* Actions */}
          <div role="columnheader" className="text-right text-sm font-semibold text-primary pr-2">
            Ações
          </div>
        </div>

        {/* Body */}
        <div role="rowgroup" className="max-h-[580px] overflow-auto">
          {!hasData ? (
            <div className="p-6 text-sm text-gray-500">Nenhuma transação encontrada.</div>
          ) : (
            rows.map((t) => {
              const checked = selectedIds.has(t.id)

              const categoryName = t.category?.name ?? '—'
              const categoryColor = t.category?.color ?? '#CBD5E1'
              const isExpense = t.type === 'EXPENSE'
              const value = Number(t.value ?? 0)

              return (
                <div
                  key={t.id}
                  role="row"
                  className={[
                    'grid',
                    GRID_COLS,
                    'items-center',
                    'px-4 py-2',
                    'border-b border-gray-100',
                    'hover:bg-gray-50',
                  ].join(' ')}
                >
                  {/* Checkbox */}
                  <div role="cell" className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelectRow(t.id)}
                      className="h-4 w-4 accent-black"
                      aria-label={`Selecionar transação ${t.description ?? ''}`}
                    />
                  </div>

                  {/* Date */}
                  <div role="cell" className="text-sm text-gray-700">
                    {fmtDate(t.date)}
                  </div>

                  {/* Description */}
                  <div role="cell" className="min-w-0 pr-4">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {t.description || 'Sem descrição'}
                    </div>

                    {/* Sub-info no mobile (categoria + tipo) */}
                    <div className="lg:hidden mt-0.5 flex items-center gap-2 text-xs text-gray-500 ">
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: categoryColor }}
                        />
                        <span className="truncate max-w-[200px]">{categoryName}</span>
                      </span>
                      <span className="opacity-60">•</span>
                      <span>{isExpense ? 'Despesa' : 'Receita'}</span>
                    </div>
                  </div>

                  {/* Category (desktop) */}
                  <div role="cell" className="hidden lg:flex items-center gap-2 text-sm text-gray-700 pr-4">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor }} />
                    <span className="truncate">{categoryName}</span>
                  </div>

                  {/* Type (desktop) */}
                  <div role="cell" className="hidden lg:block">
                    <span
                      className={[
                        'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                        isExpense ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700',
                      ].join(' ')}
                    >
                      {isExpense ? 'Despesa' : 'Receita'}
                    </span>
                  </div>

                  {/* Value */}
                  <div role="cell" className="text-right pr-8">
                    <span className={['text-sm font-semibold', isExpense ? 'text-red-600' : 'text-green-600'].join(' ')}>
                      {toBRL(value)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div role="cell" className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(t)}
                      className="h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center cursor-pointer"
                      title="Editar"
                      aria-label="Editar transação"
                    >
                      <Pencil className="h-4 w-4 text-gray-600" />
                    </button>

                    <button
                      onClick={() => onDelete(t.id)}
                      className="h-9 w-9 rounded-full border border-gray-200 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                      title="Excluir"
                      aria-label="Excluir transação"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Hint (opcional) */}
      <div className="mt-2 text-xs text-gray-500">
        Dica: clique em <span className="font-medium">Data</span> ou <span className="font-medium">Valor</span> para ordenar.
      </div>
    </div>
  )
}
