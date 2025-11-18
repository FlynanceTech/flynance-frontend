'use client'
import { Undo2, Check } from "lucide-react";
import Image from "next/image";
import logo from "../../../../assets/flynance-logo-white.png"
import Link from "next/link";

export default function Confirmar() {
  return (
    <div className='min-h-screen bg-white flex flex-col '>
      <header className='bg-gradient-to-r from-secondary to-primary text-white px-6 py-4 flex justify-center'>
        <div className="w-full max-w-[1080px] flex justify-between items-center">
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
            <div className='w-6' />
        </div>
      </header>
      <main className='flex flex-col items-center justify-center w-full'>
        <section className="p-8 flex flex-col items-center gap-8">
          <div className="p-4 bg-secondary rounded-full w-16 h-16 flex items-center justify-center">
            <Check size={48} color="#fff"/>
          </div>
          <h1 className="text-5xl text-[#333C4D] font-bold">Tudo certo por aqui!</h1>
          <h3 className="text-center text-[#333C4D] text-xl  font-light">
            Agora é só verificar a mensagem que acabamos de enviar <br/>  no seu WhatsApp para seguir com a ativação.
          </h3>
        </section>
      </main>
    </div>
  );
}
