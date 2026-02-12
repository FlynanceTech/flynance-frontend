import InfoTip from './InfoTip'
import { brl, pct } from './utils'

type Props = {
  totalIncome: number
  totalExpenses: number
  balance: number
  savingRate: number
}

export default function SummaryCards({ totalIncome, totalExpenses, balance, savingRate }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <div className="text-sm text-gray-500">Receita total</div>
        <div className="text-xl lg:text-3xl mt-2 font-semibold text-emerald-600">{brl(totalIncome)}</div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <div className="text-sm text-gray-500">Despesas totais</div>
        <div className="text-xl lg:text-3xl mt-2 font-semibold text-red-600">{brl(totalExpenses)}</div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <div className="text-sm text-gray-500">Saldo</div>
        <div className="text-xl lg:text-3xl mt-2 font-semibold text-gray-900">{brl(balance)}</div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <div className="flex items-center gap-2 text-sm text-gray-500 justify-between">
          <div className="text-sm text-gray-500">
          Taxa de sobra
          </div>
          <InfoTip text="Saldo acumulado ÷ receita acumulada." />
        </div>
        <div className="text-xl lg:text-3xl mt-2 font-semibold text-gray-900">{pct(savingRate)}</div>
      </div>
    </div>
  )
}
