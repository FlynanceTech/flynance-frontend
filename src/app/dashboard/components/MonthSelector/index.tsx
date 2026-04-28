'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths } from 'date-fns'
import { useLocale } from 'next-intl'

interface MonthSelectorProps {
  initialDate?: Date
  onChange?: (newDate: Date) => void
}

export default function MonthSelector({ initialDate = new Date(), onChange }: MonthSelectorProps) {
  const locale = useLocale()
  const [currentDate, setCurrentDate] = useState(initialDate)

  const monthLabel = useMemo(() => {
    const formatted = currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }, [currentDate, locale])

  function handleChangeMonth(delta: number) {
    const newDate = addMonths(currentDate, delta)
    setCurrentDate(newDate)
    onChange?.(newDate)
  }

  return (
    <div className="flex items-center gap-2 lg:text-gray-600 dark:lg:text-white font-medium">
      <button
        onClick={() => handleChangeMonth(-1)}
        className="hover:text-primary transition-colors cursor-pointer"
      >
        <ChevronLeft size={20} />
      </button>
      <span>{monthLabel}</span>
      <button
        onClick={() => handleChangeMonth(1)}
        className="hover:text-primary transition-colors cursor-pointer"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
