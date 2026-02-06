'use client'
import clsx from 'clsx'
import { useTransactionFilter } from '@/stores/useFilter'

type TxTypeFilter = 'ALL' | 'INCOME' | 'EXPENSE'

const options: { key: TxTypeFilter; label: string }[] = [
  { key: 'ALL', label: 'Tudo' },
  { key: 'INCOME', label: 'Receitas' },
  { key: 'EXPENSE', label: 'Despesas' },
]

export default function QuickTypeFilter() {
  const typeFilter = useTransactionFilter((s) => s.typeFilter)
  const setTypeFilter = useTransactionFilter((s) => s.setTypeFilter)

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
      {options.map((opt) => {
        const active = typeFilter === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => setTypeFilter(opt.key)}
            className={clsx(
              'h-8 rounded-full px-3 text-sm transition',
              active
                ? 'bg-secondary/30 text-[#333C4D] font-medium'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
