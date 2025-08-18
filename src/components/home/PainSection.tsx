'use client'

import React, { useEffect, useState } from 'react'
import Paincard from './paincard'
import 'keen-slider/keen-slider.min.css'
import { useKeenSlider } from 'keen-slider/react'
import {HandCoins, Sheet, BookOpenCheck } from 'lucide-react'

export default function PainSection() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Sempre chamar o hook, mas condicionar o uso
  const [sliderRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: {
      perView: 1.1,
      spacing: 16,
    },
  })

  const content = [
    {
      title: 'Planilhas e Apps',
      subtitle: 'Planilhas? Esquece. Aqui tudo flui por WhatsApp.',
      icon: <Sheet color='#fff' size="32"/>,
    },
    {
      title: 'Descontrole Financeiro',
      subtitle: 'Muita gente não sabe pra onde vai o dinheiro. A Flynance mostra.',
      iconString: '45',
      icon: <HandCoins color='#fff' size="32"/>
    },
    {
      title: 'Educação Financeira',
      subtitle: 'Pouca teoria e zero prática. A IA te ensina enquanto organiza.',
      icon: <BookOpenCheck color='#fff' size="32"/>,
    },
  ]

  return (
    <section className='py-8 max-w-[1280px] w-full px-8 lg:px-0'>
      {isMobile ? (
        <div ref={sliderRef} className='keen-slider'>
          {content.map((item, index) => (
            <div key={index} className='keen-slider__slide'>
              <Paincard {...item} />
            </div>
          ))}
        </div>
      ) : (
        <div className='grid grid-cols-3 gap-8'>
          {content.map((item, index) => (
            <Paincard key={index} {...item} />
          ))}
        </div>
      )}
    </section>
  )
}
