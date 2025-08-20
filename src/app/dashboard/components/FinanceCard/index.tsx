'use client'

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import React from 'react'

interface FinanceCardProps {
  title: React.ReactNode
  value: string
  percentage: number
  isExpense?: boolean
}

export default function FinanceCard({
  title,
  value,
  percentage,
  isExpense = false
}: FinanceCardProps) {

  const getTrendText = () => {
    if(isExpense) {
      if (percentage < 0)
        return `${Math.abs(percentage).toFixed(0)}% melhor que o mês anterior`
      if (percentage > 0)
        return `${Math.abs(percentage).toFixed(0)}% pior que o mês anterior`
      return 'Sem variação em relação ao mês anterior'
    }else {
      if (percentage > 0)
        return `${Math.abs(percentage).toFixed(0)}% melhor que o mês anterior`
      if (percentage < 0)
        return `${Math.abs(percentage).toFixed(0)}% pior que o mês anterior`
      return 'Sem variação em relação ao mês anterior'
    }
  }

  const getTrendIcon = () => {
    if(isExpense){
      if (percentage < 0) return <ArrowUp size={16} />
      if (percentage > 0) return <ArrowDown size={16} />
      return <Minus size={16} />
    }else{
      if (percentage > 0) return <ArrowUp size={16} />
      if (percentage < 0) return <ArrowDown size={16} />
      return <Minus size={16} />
    }
  }

  const getTextColor = () => {
    if(isExpense){
      if (percentage < 0) return 'text-green-600'
      if (percentage > 0) return 'text-red-500'
      return 'text-gray-500'
    } else {
      if (percentage > 0) return 'text-green-600'
      if (percentage < 0) return 'text-red-500'
      return 'text-gray-500'
    }
  }

  return (
    <div className="flex flex-col justify-center gap-4 bg-white p-4 rounded-md border border-[#E2E8F0] w-full">
      {title}
      <h1 className="font-bold text-2xl text-[#333C4D]">{value}</h1>

      <div className={`text-sm font-light flex items-center gap-1 ${getTextColor()}`}>
        {getTrendIcon()}
        {getTrendText()}
      </div>
    </div>
  )
}
