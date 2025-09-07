'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthSelectorProps {
  initialDate?: Date
  onChange?: (newDate: Date) => void
}

export default function MonthSelector({ initialDate = new Date(), onChange }: MonthSelectorProps) {
  const [currentDate, setCurrentDate] = useState(initialDate)

  function handleChangeMonth(delta: number) {
    const newDate = addMonths(currentDate, delta)
    setCurrentDate(newDate)
    onChange?.(newDate)
  }

  return (
    <div className="flex items-center gap-2 lg:text-gray-600 font-medium">
      <button
        onClick={() => handleChangeMonth(-1)}
        className="hover:text-primary transition-colors cursor-pointer"
      >
        <ChevronLeft size={20} />
      </button>
      <span>{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
      <button
        onClick={() => handleChangeMonth(1)}
        className="hover:text-primary transition-colors cursor-pointer"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
