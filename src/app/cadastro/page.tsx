import SignupStepper from "@/components/cadastro/SignupStepper";
import { Undo2 } from "lucide-react";
import Image from "next/image";
import logo from "../../../assets/flynance-logo-white.png"
import Link from "next/link";
import { Suspense } from "react";

export default function Cadastro() {
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
      <main className='flex flex-col items-center justify-center w-full '>
        <section className="w-full flex flex-col gap-8 pb-16">
          <Suspense fallback={<div className="text-center text-sm text-gray-500">Carregando...</div>}>
            <SignupStepper />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
