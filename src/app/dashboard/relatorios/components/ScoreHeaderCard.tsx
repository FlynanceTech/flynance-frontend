import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import InfoTip from './InfoTip'
import { formatDateBR, scoreColor } from './utils'

type Props = {
  score: number
  badgeLabel: string
  badgeClass: string
  periodStart?: string
  periodEnd?: string
  isCurrentYear: boolean
}

export default function ScoreHeaderCard({
  score,
  badgeLabel,
  badgeClass,
  periodStart,
  periodEnd,
  isCurrentYear,
}: Props) {
  return (
    <div className="flex flex-col justify-center items-center gap-3 rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between w-full gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
          {badgeLabel}
        </span>
        <InfoTip text="Score combina taxa de poupança, dívida, uso de crédito e volatilidade de gastos. 0–49 crítico, 50–74 atenção, 75–100 saudável." />
      </div>
      <div className="relative h-36 w-40 overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart className="translate-y-2 h-full">
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
        <div className="absolute top-10 inset-0 flex items-center justify-center">
          <div className="text-3xl font-semibold text-gray-800">{score}</div>
        </div>
      </div>
     
   
    
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span>
          Período: {formatDateBR(periodStart)} até {formatDateBR(periodEnd)}
        </span>
        {isCurrentYear && (
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            Acumulado até hoje
          </span>
        )}
      </div>

      {isCurrentYear && (
        <div className="text-xs text-amber-600">
          Os resultados refletem apenas os meses com dados até o momento.
        </div>
      )}
    </div>
  )
}
