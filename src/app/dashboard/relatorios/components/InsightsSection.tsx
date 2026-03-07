import { useTranslations } from 'next-intl'
import { Insight } from '../types'

type Props = {
  title: string
  insights: Insight[]
}

const SEVERITY_KEYS: Record<string, 'low' | 'medium' | 'high'> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
}

export default function InsightsSection({ title, insights }: Props) {
  const t = useTranslations('reports.insights')

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <h3 className="mb-3 text-lg font-semibold text-gray-800">{title}</h3>
      {insights.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {insights.map((ins, idx) => {
            const severityKey = SEVERITY_KEYS[String(ins.severity).toLowerCase()]
            const severityLabel = severityKey ? t(`severity.${severityKey}`) : ins.severity

            return (
              <div key={idx} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800">{ins.title}</div>
                  <span className="text-xs text-gray-500">{severityLabel}</span>
                </div>
                <div className="mt-1 text-xs text-gray-600">{ins.message}</div>
                {ins.recommendation && (
                  <div className="mt-2 text-xs text-gray-500">
                    {t('recommendationPrefix')}: {ins.recommendation}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-500">{t('empty')}</div>
      )}
    </div>
  )
}
