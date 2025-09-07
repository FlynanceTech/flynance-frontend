import { addDays, format } from 'date-fns'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
  } from 'recharts'
  
  
  type CustomTooltipProps = {
    active?: boolean
    payload?: { value: number }[]
    label?: string
  }
  
  function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (active && payload && payload.length > 0) {
      return (
        <div className="rounded-lg border border-[#3ECC89] bg-[#3ECC8980] text-white px-4 py-2 shadow">
          <p>📅 <strong>Data:</strong> {label && format(new Date(label), 'dd/MM')}</p>
          <p>💸 <strong>Valor:</strong> {payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      )
    }
    return null
  }
  
  
export function SpendingChart({
    data,
    spent,
    goal,
  }: {
    data: { date: string; valor: number }[]
    spent: number
    goal: number
  }) {
    const percent = spent / goal
    let stroke = '#3ECC89' // verde
    if (percent >= 0.75) stroke = '#FFB200' // amarelo
    if (percent >= 1) stroke = '#FF4D4F' // vermelho

    const chartData =
    data.length === 1
      ? [
          data[0],
          {
            date: addDays(new Date(), 1).toISOString().split('T')[0],
            valor: 0,
          },
        ]
      : data
        
    return (
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.5} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
            <XAxis dataKey="date" stroke="#666" tickLine={false}
            axisLine={false} 
            tickFormatter={(date) => format(new Date(date), 'dd/MM')}
             padding={{ left: 10, right: 10 }}/>
            <YAxis stroke="#666" tickLine={false}
            axisLine={false} padding={{bottom: 20, top: 20}}/>
            <Tooltip content={<CustomTooltip />} />
            <Area
                type="monotone"
                dataKey="valor"
                stroke={stroke}
                strokeWidth={3}
                fill="url(#colorValue)"
                activeDot={{ r: 6, stroke: stroke, strokeWidth: 2, fill: '#fff' }}
            />
        </AreaChart>
      </ResponsiveContainer>
    )
  }
  