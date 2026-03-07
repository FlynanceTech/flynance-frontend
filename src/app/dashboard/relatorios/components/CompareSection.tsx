import { useTranslations } from 'next-intl'
import { AnnualCompare } from '../types'
import { brl, pct } from './utils'

type Props = {
  compare: AnnualCompare | undefined
  isLoading: boolean
}

export default function CompareSection({ compare, isLoading }: Props) {
  const t = useTranslations('reports.compare')

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <h3 className="mb-3 text-lg font-semibold text-gray-800">{t('title')}</h3>
      {isLoading || !compare ? (
        <div className="text-sm text-gray-500">{t('loading')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <div className="text-gray-500">{t('balance')}</div>
            <div className="font-semibold">{brl(compare.balanceDiff)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <div className="text-gray-500">{t('income')}</div>
            <div className="font-semibold">{brl(compare.incomeDiff)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <div className="text-gray-500">{t('expenses')}</div>
            <div className="font-semibold">{brl(compare.expenseDiff)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <div className="text-gray-500">{t('savings')}</div>
            <div className="font-semibold">{pct(compare.savingRateDiff)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
