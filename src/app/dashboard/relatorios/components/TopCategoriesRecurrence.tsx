import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { brl, pct } from './utils'

type Props = {
  topCategories: { name: string; total: number }[]
  recurring: { name: string; total: number }[]
  recurringExpenseRatio: number
}

const PIE_COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#EF4444', '#8B5CF6']

export default function TopCategoriesRecurrence({
  topCategories,
  recurring,
  recurringExpenseRatio,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Top categorias</h3>
        {topCategories.length === 0 ? (
          <div className="text-sm text-gray-500">Sem dados.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topCategories} dataKey="total" nameKey="name" outerRadius={90}>
                    {topCategories.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => brl(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2">
              {topCategories.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-700">{c.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{brl(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Recorrência</h3>
        <div className="text-sm text-gray-500 mb-3">
          Despesas recorrentes: {pct(recurringExpenseRatio)}
        </div>
        {recurring.length === 0 ? (
          <div className="text-sm text-gray-500">Sem categorias recorrentes.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {recurring.map((r) => (
              <div key={r.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{r.name}</span>
                <span className="font-semibold text-gray-900">{brl(r.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
