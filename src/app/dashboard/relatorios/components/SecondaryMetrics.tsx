import InfoTip from './InfoTip'
import { pct, volatilityLabel } from './utils'

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
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <div className="flex items-center gap-2 text-sm text-gray-500 justify-between">
          Comprometimento da renda
          <InfoTip text="(Fixos + cartão) ÷ receita acumulada." />
        </div>
        <div className="text-lg  lg:text-3xl mt-2 font-semibold text-gray-900">{pct(debtRatio)}</div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <div className="text-sm text-gray-500"></div>
         <div className="flex items-center gap-2 text-sm text-gray-500 justify-between">
          Cartão no gasto total
          <InfoTip text="Parte do gasto total que veio do cartão no período." />
        </div>
        <div className="text-lg  lg:text-3xl mt-2 font-semibold text-gray-900">{pct(creditCardRatio)}</div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <div className="flex items-center gap-2 text-sm text-gray-500 justify-between">
          Volatilidade
          <InfoTip text="Mede a variação mês a mês das despesas." />
        </div>
        <div className="text-lg  lg:text-3xl mt-2 font-semibold text-gray-900">
          {volatilityLabel(expenseVolatility)}
        </div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <div className="flex items-center gap-2 text-sm text-gray-500 justify-between">
          Metas atingidas
          <InfoTip text="Atingidas conforme os períodos já decorridos." />
        </div>
        <div className="text-lg  lg:text-3xl mt-2 font-semibold text-gray-900">{pct(goalsAchievedRate)}</div>
      </div>
    </div>
  )
}
