'use client'

import * as Slider from '@radix-ui/react-slider'
import { NumericFormat } from 'react-number-format'
interface MetaSliderProps {
  value: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  disabled?: boolean
}

export function MetaSlider({
  value,
  onChange,
  min = 0,
  max = 5000,
  step = 50,
  label = 'Meta mensal',
  disabled = false,
}: MetaSliderProps) {
  return (
    <div className="w-full flex flex-col gap-2 opacity-100">
      <div className="flex items-end gap-4 w-full">
        <div className="hidden lg:flex flex-col text-sm font-medium w-1/5">
          <label className="text-sm font-medium text-gray-600">{label}</label>
          <NumericFormat
            value={value}
            displayType="text"
            thousandSeparator="."
            decimalSeparator=","
            prefix="R$ "
          />
        </div>
        <Slider.Root
          disabled={disabled}
          className={`relative flex items-center select-none touch-none h-5 w-full lg:w-3/5 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(val) => onChange?.(val[0])} // 👈 Aqui emitimos a mudança
        >
          <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
            <Slider.Range className="absolute bg-green-500 rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb className="block w-4 h-4 bg-green-600 rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400" />
        </Slider.Root>
      </div>
      {/* Mobile */}
      <div className="lg:hidden flex items-center justify-between">
        <div className="flex flex-col text-sm font-medium">
          <label className="text-sm font-medium text-gray-600">{label}</label>
          <NumericFormat
            value={value}
            displayType="text"
            thousandSeparator="."
            decimalSeparator=","
            prefix="R$ "
          />
        </div>
      </div>
    </div>
  )
}

  