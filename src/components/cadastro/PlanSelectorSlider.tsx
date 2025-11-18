'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Info } from 'lucide-react'
import { useKeenSlider } from 'keen-slider/react'
import 'keen-slider/keen-slider.min.css'

type PlanType = 'mensal' | 'anual'

type Plan = {
  label: string
  value: PlanType
  price: string
  description: string
  benefits: string[]
}

type Props = {
  plans: Plan[]
  selectedPlan: PlanType
  setSelectedPlan: (plan: PlanType) => void
  openModal: (content: string) => void
}

export default function PlanSelectorSlider({ plans, selectedPlan, setSelectedPlan, openModal }: Props) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const [sliderRef, slider] = useKeenSlider<HTMLDivElement>({
    loop: false,
    slides: {
      perView: 1.1,
      spacing: 16,
    },
  })

  useEffect(() => {
    if (!isMobile || !slider) return
  
    const index = plans.findIndex((plan) => plan.value === selectedPlan)
    if (index !== -1) {
      slider.current?.moveToIdx(index)
    }
  }, [slider, selectedPlan, isMobile, plans])

  const renderCard = (plan: Plan) => {
    const isSelected = selectedPlan === plan.value
    const badge = plan.value === 'mensal' ? 'Popular' : '10% Off'

    return (
      <div
        key={plan.value}
        onClick={() => setSelectedPlan(plan.value)}
        className={`relative border rounded-xl text-left transition-all w-full h-full
          ${isSelected ? 'border-primary bg-green-50 shadow-md' : 'border-gray-300 bg-white'}
          flex flex-col justify-between  cursor-pointer`}
      >
        <div className={`p-4 flex items-center justify-between rounded-t-xl ${isSelected ? 'bg-primary' : 'bg-gray-600'}`}>
          <div className='flex items-center gap-2'>
            <p className='text-white text-base font-semibold'>{plan.label}</p>
            <span className='bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full'>
              {badge}
            </span>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation()
              openModal(plan.description)
            }}
            className='text-white hover:text-green-200 transition cursor-pointer'
          >
            <Info size={18} />
          </div>
        </div>

        <div className='p-4 text-center'>
          {plan.value === 'anual' && (
                <p className='text-xs text-red-500 line-through'>De R$ 19,90 por...</p>
          )}
          <p className={`${plan.value === 'mensal' ? `text-4xl font-bold text-primary` : 'text-4xl font-bold text-gray-500'}`}>{plan.price}</p>
         {/*  {plan.value === 'anual' && (
                <p className='text-sm text-gray-600'>Equivalente a R$ 17,91 / mês</p>
          )} */}
        </div>

        <ul className='px-6 pb-4 space-y-2 text-sm text-gray-700'>
          {plan.benefits.map((benefit, idx) => (
            <li key={idx} className='flex items-center gap-2'>
              <CheckCircle className='text-secondary' size={16} />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return isMobile ? (
    <div ref={sliderRef} className='keen-slider'>
      {plans.map((plan) => (
        <div key={plan.value} className='keen-slider__slide'>
          {renderCard(plan)}
        </div>
      ))}
    </div>
  ) : (
    <div className='grid md:grid-cols-2 gap-4 w-full'>
      {plans.map(renderCard)}
    </div>
  )
}