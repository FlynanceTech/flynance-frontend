import { useTranslations } from 'next-intl'
import InfoTip from './InfoTip'
import { pct, volatilityKey } from './utils'

type Props = {
  debtRatio: number
  creditCardRatio: number
  expenseVolatility: string
  goalsAchievedRate: number
}

export default function SecondaryMetrics({
  debtRatio,
  creditCardRatio,
  expenseVolatility,
  goalsAchievedRate,
}: Props) {
  const t = useTranslations('reports.secondaryMetrics')
  const volatility = volatilityKey(expenseVolatility)
  const volatilityLabel =
    volatility === 'low' || volatility === 'medium' || volatility === 'high'
      ? t(`volatilityValues.${volatility}`)
      : expenseVolatility

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
          {t('debtRatio')}
          <InfoTip text={t('debtRatioTip')} />
        </div>
        <div className="mt-2 text-lg font-semibold text-gray-900 lg:text-3xl">{pct(debtRatio)}</div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
          {t('creditCardRatio')}
          <InfoTip text={t('creditCardRatioTip')} />
        </div>
        <div className="mt-2 text-lg font-semibold text-gray-900 lg:text-3xl">{pct(creditCardRatio)}</div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
          {t('volatility')}
          <InfoTip text={t('volatilityTip')} />
        </div>
        <div className="mt-2 text-lg font-semibold text-gray-900 lg:text-3xl">
          {volatilityLabel}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between gap-2 text-sm text-gray-500">
          {t('goalsAchieved')}
          <InfoTip text={t('goalsAchievedTip')} />
        </div>
        <div className="mt-2 text-lg font-semibold text-gray-900 lg:text-3xl">{pct(goalsAchievedRate)}</div>
      </div>
    </div>
  )
}
