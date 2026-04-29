import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useLocale, useTranslations } from 'next-intl'
import InfoTip from './InfoTip'
import type { ScoreLevel } from './utils'
import { formatDateByLocale, scoreColor } from './utils'

type Props = {
  score: number
  level: ScoreLevel
  badgeClass: string
  periodStart?: string
  periodEnd?: string
  isCurrentYear: boolean
}

export default function ScoreHeaderCard({
  score,
  level,
  badgeClass,
  periodStart,
  periodEnd,
  isCurrentYear,
}: Props) {
  const t = useTranslations('reports.scoreCard')
  const locale = useLocale()
  const badgeLabel = t(`levels.${level}`)

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm">
      <div className="flex w-full items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
          {badgeLabel}
        </span>
        <InfoTip text={t('scoreInfo')} />
      </div>
      <div className="relative h-36 w-40 overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart className="h-full translate-y-2">
            <Pie
              data={[
                { name: 'score', value: score },
                { name: 'rest', value: Math.max(0, 100 - score) },
              ]}
              dataKey="value"
              cx="50%"
              cy="70%"
              startAngle={180}
              endAngle={0}
              innerRadius={42}
              outerRadius={80}
              stroke="none"
            >
              <Cell fill={scoreColor(score)} />
              <Cell fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 top-10 flex items-center justify-center">
          <div className="text-3xl font-semibold text-gray-800">{score}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span>
          {t('periodLabel')}: {formatDateByLocale(periodStart, locale)} {t('periodTo')}{' '}
          {formatDateByLocale(periodEnd, locale)}
        </span>
        {isCurrentYear && (
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            {t('accumulatedUntilToday')}
          </span>
        )}
      </div>

      {isCurrentYear && (
        <div className="text-xs text-amber-600">
          {t('currentYearWarning')}
        </div>
      )}
    </div>
  )
}
