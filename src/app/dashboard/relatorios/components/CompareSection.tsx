import { AnnualCompare } from '../types'
import { brl, pct } from './utils'

type Props = {
  compare: AnnualCompare | undefined
  isLoading: boolean
}

export default function CompareSection({ compare, isLoading }: Props) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Comparativo anual</h3>
      {isLoading || !compare ? (
        <div className="text-sm text-gray-500">Carregando comparação...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <div className="text-gray-500">Saldo</div>
            <div className="font-semibold">{brl(compare.balanceDiff)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <div className="text-gray-500">Renda</div>
            <div className="font-semibold">{brl(compare.incomeDiff)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <div className="text-gray-500">Despesas</div>
            <div className="font-semibold">{brl(compare.expenseDiff)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <div className="text-gray-500">Poupança</div>
            <div className="font-semibold">{pct(compare.savingRateDiff)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
