'use client'

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import React from 'react'

interface FinanceCardProps {
  title: React.ReactNode
  value: string
  percentage?: number
  isExpense?: boolean
  periodLabel?: string
  isLabel?: boolean
  isBalance?: boolean   // 🔹 novo flag para diferenciar saldo
}

export default function FinanceCard({
  title,
  value,
  percentage,
  isExpense = false,
  periodLabel = 'período anterior',
  isLabel = false,
  isBalance = false     // 🔹 default false
}: FinanceCardProps) {

  const getTrendText = () => {
    if (isExpense) {
      if (percentage && percentage < 0)
        return `${Math.abs(percentage).toFixed(0)}% menor que ${periodLabel}`
      if (percentage && percentage > 0)
        return `${Math.abs(percentage).toFixed(0)}% maior que ${periodLabel}`
      return `Sem variação em relação a ${periodLabel}`
    } else {
      if (percentage && percentage > 0)
        return `${Math.abs(percentage).toFixed(0)}% maior que ${periodLabel}`
      if (percentage && percentage < 0)
        return `${Math.abs(percentage).toFixed(0)}% menor que ${periodLabel}`
      return `Sem variação em relação a ${periodLabel}`
    }
  }

  const getTrendIcon = () => {
    if (percentage && percentage > 0) return <ArrowUp size={16} />
    if (percentage && percentage < 0) return <ArrowDown size={16} />
    return <Minus size={16} />
  }

  const getTextColor = () => {
    if (isBalance) return 'text-gray-500' // 🔹 saldo sempre neutro
    if (percentage && percentage > 0) return isExpense ? 'text-red-500' : 'text-green-600'
    if (percentage && percentage < 0) return isExpense ? 'text-green-600' : 'text-red-500'
    return 'text-gray-500'
  }

  return (
    <div className="flex flex-col justify-center gap-4 bg-white p-4 rounded-md border border-[#E2E8F0] w-full">
      {title}
      <h1 className="font-bold text-2xl text-[#333C4D]">{value}</h1>
      {
        isLabel && (
          <div className={`text-sm font-light flex items-center gap-1 ${getTextColor()}`}>
            {isBalance 
              ? <>Situação atual das suas finanças</> 
              : <>{getTrendIcon()} {getTrendText()}</>}
          </div>
        )
      }
    </div>
  )
}
