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
import { useLocale, useTranslations } from 'next-intl'
import { brl, monthLabel } from './utils'

type Props = {
  monthly: { month: string; income: number; expenses: number; balance: number }[]
}

export default function AnnualCharts({ monthly }: Props) {
  const t = useTranslations('reports.charts')
  const locale = useLocale()

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
        <h3 className="mb-3 text-lg font-semibold text-gray-800">{t('monthlyBalanceTitle')}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="month"
              tickFormatter={(value: string) => monthLabel(value, locale)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => brl(Number(v))} />
            <Tooltip formatter={(v: number) => brl(Number(v))} />
            <Line type="monotone" dataKey="balance" stroke="#2563EB" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
        <h3 className="mb-3 text-lg font-semibold text-gray-800">{t('incomeVsExpensesTitle')}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="month"
              tickFormatter={(value: string) => monthLabel(value, locale)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => brl(Number(v))} />
            <Tooltip formatter={(v: number) => brl(Number(v))} />
            <Bar dataKey="income" fill="#16A34A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" fill="#EF4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
