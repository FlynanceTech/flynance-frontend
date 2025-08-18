import CheckoutStepper from '@/components/cadastro/checkoutStepper'
import React, { Suspense } from 'react'
import { Undo2 } from "lucide-react";
import Image from "next/image";
import logo from "../../../../assets/flynance-logo-white.png"
import Link from "next/link";

export default function Checkout() {
    
  return (
    <div className='min-h-screen bg-white flex flex-col '>
      <header className='bg-gradient-to-r from-green-400 to-green-700 text-white px-6 py-4 flex justify-center'>
        <div className="w-full max-w-4xl mx-auto px-4 flex justify-between items-center">
            <div className='flex items-center gap-2'>
                <Link href="/" className="flex gap-4 items-center">
                    <Undo2 size={32} />
                    <span className='font-semibold'>Voltar</span>
                </Link>
            </div>
            <Image
                src={logo}
                className="object-contain aspect-[1.86] w-[93px]"
                alt="Flynance Logo"
                width={93}
                height={50}
              />
          
        </div>
      </header>
      <main>
        
      <Suspense fallback={<div className="text-center text-sm text-gray-500">Carregando...</div>}>
        <CheckoutStepper />
      </Suspense>
      </main>
    </div>
  )
}
