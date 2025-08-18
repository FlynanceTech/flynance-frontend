import React from 'react'
import Header from '../components/Header'

export default function Educacao() {
  return (
    <section className='w-full h-full py-8 lg:px-8 px-4 flex flex-col gap-4 lg:gap-8'>
      <Header title='Educação' subtitle='' newTransation/>
      <div className='w-full h-full bg-white rounded-xl border border-gray-200 p-8'>
        Em breve
      </div>
    </section>
  )
}
