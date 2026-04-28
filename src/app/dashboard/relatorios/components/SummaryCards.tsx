import { useTranslations } from 'next-intl'
import InfoTip from './InfoTip'
import { brl, pct } from './utils'

type Props = {
  totalIncome: number
  totalExpenses: number
  balance: number
  savingRate: number
}

export default function SummaryCards({ totalIncome, totalExpenses, balance, savingRate }: Props) {
  const t = useTranslations('reports.summaryCards')

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="text-sm text-gray-500">{t('totalIncome')}</div>
        <div className="mt-2 text-xl font-semibold text-emerald-600 lg:text-3xl">{brl(totalIncome)}</div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="text-sm text-gray-500">{t('totalExpenses')}</div>
        <div className="mt-2 text-xl font-semibold text-red-400 lg:text-3xl">{brl(totalExpenses)}</div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="text-sm text-gray-500">{t('balance')}</div>
        <div className="mt-2 text-xl font-semibold text-gray-900 lg:text-3xl">{brl(balance)}</div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
          <div className="text-sm text-gray-500">{t('savingRate')}</div>
          <InfoTip text={t('savingRateTip')} />
        </div>
        <div className="mt-2 text-xl font-semibold text-gray-900 lg:text-3xl">{pct(savingRate)}</div>
      </div>
    </div>
  )
}
