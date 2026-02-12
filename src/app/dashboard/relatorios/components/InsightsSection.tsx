import { Insight } from '../types'

type Props = {
  title: string
  insights: Insight[]
}

export default function InsightsSection({ title, insights }: Props) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
      {insights.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins, idx) => (
            <div key={idx} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800">{ins.title}</div>
                <span className="text-xs text-gray-500">{ins.severity}</span>
              </div>
              <div className="text-xs text-gray-600 mt-1">{ins.message}</div>
              {ins.recommendation && (
                <div className="text-xs text-gray-500 mt-2">Recomendação: {ins.recommendation}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">Sem recomendações no momento</div>
      )}
    </div>
  )
}
