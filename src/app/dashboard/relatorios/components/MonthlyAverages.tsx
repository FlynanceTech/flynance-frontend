import { brl } from './utils'

type Props = {
  avgMonthlyIncome?: number
  avgMonthlyExpenses?: number
}

export default function MonthlyAverages({ avgMonthlyIncome, avgMonthlyExpenses }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <div className="text-sm text-gray-500">Média mensal (até agora) — Receita</div>
        <div className="text-xl font-semibold text-emerald-600">
          {brl(Number(avgMonthlyIncome ?? 0))}
        </div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <div className="text-sm text-gray-500">Média mensal (até agora) — Despesas</div>
        <div className="text-xl font-semibold text-red-600">
          {brl(Number(avgMonthlyExpenses ?? 0))}
        </div>
      </div>
    </div>
  )
}
