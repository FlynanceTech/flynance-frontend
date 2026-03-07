'use client'
import clsx from 'clsx'
import { useTransactionFilter } from '@/stores/useFilter'
import { useTranslations } from 'next-intl'

type TxTypeFilter = 'ALL' | 'INCOME' | 'EXPENSE'

export default function QuickTypeFilter() {
  const t = useTranslations('quickTypeFilter')
  const options: { key: TxTypeFilter; label: string }[] = [
    { key: 'ALL', label: t('all') },
    { key: 'INCOME', label: t('income') },
    { key: 'EXPENSE', label: t('expense') },
  ]

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
                : 'text-slate-600 hover:bg-primary/20 hover:text-[#333C4D] cursor-pointer',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
