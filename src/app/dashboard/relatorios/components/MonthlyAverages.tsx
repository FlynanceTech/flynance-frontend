import { useTranslations } from 'next-intl'
import { brl } from './utils'

type Props = {
  avgMonthlyIncome?: number
  avgMonthlyExpenses?: number
}

export default function MonthlyAverages({ avgMonthlyIncome, avgMonthlyExpenses }: Props) {
  const t = useTranslations('reports.monthlyAverages')

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="text-sm text-gray-500">{t('incomeTitle')}</div>
        <div className="text-xl font-semibold text-emerald-600">{brl(Number(avgMonthlyIncome ?? 0))}</div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="text-sm text-gray-500">{t('expensesTitle')}</div>
        <div className="text-xl font-semibold text-red-400">{brl(Number(avgMonthlyExpenses ?? 0))}</div>
      </div>
    </div>
  )
}
