import React from 'react'

type props = {
    title: string;
    subtitle: string;
    icon: React.ReactNode
}

export default function Paincard({
    subtitle,
    title,
    icon
  }: props) {
    return (
      <div className='flex flex-col gap-4 items-center justify-center p-8 border border-[#E2E8F0] rounded-2xl bg-white min-h-[300px] max-w-[370px] md:max-w-full shadow-sm'>
        <div className='rounded-full p-4 bg-[#15B8A6] w-[80px] h-[80px] flex items-center justify-center'>
         {icon}
        </div>
        <h1 className='text-[#333C4D] text-xl md:text-2xl font-semibold text-center'>{title}</h1>
        <h3 className='text-[#333C4D] text-center text-sm md:text-base'>{subtitle}</h3>
      </div>
    )
  }
