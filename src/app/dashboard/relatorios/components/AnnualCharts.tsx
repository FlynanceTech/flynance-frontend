import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'
import { brl, monthLabel } from './utils'

type Props = {
  monthly: { month: string; income: number; expenses: number; balance: number }[]
}

export default function AnnualCharts({ monthly }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Saldo mensal</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${Number(v).toFixed(0)}`} />
            <Tooltip formatter={(v: number) => brl(Number(v))} />
            <Line type="monotone" dataKey="balance" stroke="#2563EB" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Receitas x Despesas</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${Number(v).toFixed(0)}`} />
            <Tooltip formatter={(v: number) => brl(Number(v))} />
            <Bar dataKey="income" fill="#16A34A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" fill="#EF4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
