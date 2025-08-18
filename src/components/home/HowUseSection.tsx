import React from 'react'
import FeatureItem from '../home/FeatureItem'
import chatIcon from "../../../assets/icons/chat-icon.png"
import chatAiIcon from "../../../assets/icons/chat-ai-icon.png"
import data from "../../../assets/icons/data-icon.png"
import check from "../../../assets/icons/check-icon.png"

import { scrollToSection } from "@/utils/scroll-smooth";
import Link from 'next/link'
import Image from 'next/image'
import logo from '../../../assets/flynance-logo-white.png'

type props = {
    isHome?: boolean
}

export default function HowUseSection({isHome = true}: props) {
  return (
    <section id="instruction" className={
        `flex flex-col items-center justify-center w-full py-8 px-8 gap-8 ${isHome && 'bg-linear-to-br from-[#EBF7F5] from-20% to-[#8DDCD3]'}`}>
    <h2 className="text-3xl font-bold leading-none text-[#333C4D] max-md:max-w-full">
      Simples e fácil direto no seu WhatsApp
    </h2>
    <div className="max-w-full w-[1280px] flex items-center justify-center">
      <div className="flex gap-8 lg:gap-16 max-md:flex-col items-center">
        <div className="w-full max-w-[380px]">
          <div className="flex flex-col pb-8 mx-auto w-full bg-[#fafafa] rounded-xl ">
            <div className="flex flex-col justify-center items-start px-8 py-3 bg-teal-500 rounded-t-xl max-md:px-5">
                <Image
                src={logo}
                className="object-contain aspect-[1.86] w-[93px]"
                alt="Flynance Logo"
                width={93}
                height={50}
              />
            </div>
            <div className="gap-2.5 self-end px-4 py-2 mt-7 text-base text-center text-gray-700 bg-emerald-300 rounded-tl-xl rounded-bl-xl">
              Adiciona R$ 3200,00 como salário
            </div>
            <div className="gap-2.5 self-start px-4 py-2 mt-8 text-base leading-6 text-white bg-emerald-400 rounded-tr-xl rounded-br-xl w-[277px]">
              Receita de R$ 3.200 adicionada à categoria Salário. Seu saldo
              atual é R$ 3.200,00.
            </div>
            <div className="gap-2.5 self-end px-4 py-2 mt-8 text-base text-center text-gray-700 bg-emerald-300 rounded-tl-xl rounded-bl-xl">
              Paguei R$ 300 de internet
            </div>
            <div className="gap-2.5 self-start px-4 py-2 mt-3 text-base leading-6 text-white bg-emerald-400 rounded-tr-xl rounded-br-xl w-[277px]">
              Despesa de R$ 300 adicionada à categoria Moradia. Seu saldo
              atual é R$ 2.200,00.
            </div>
          </div>
        </div>
        <div className="w-full">
          <div className="flex flex-col gap-8 lg:gap-16 w-full ">
            <FeatureItem
              icon={chatIcon}
              title="Envie sua Mensagem"
              description="Envie um comando simples via WhatsApp para registrar seus ganhos e gastos."
              widthIcon={32}
              heightIcon={32}
            />

            <FeatureItem
              icon={chatAiIcon}
              title="IA Organiza seus Dados"
              description="Nossa tecnologia interpreta sua mensagem e categoriza automaticamente cada transação."
              widthIcon={32}
              heightIcon={32}
            />

            <FeatureItem
              icon={data}
              title="Atualização Instantânea"
              description="Seu saldo e histórico financeiro são ajustados em tempo real no sistema."
              widthIcon={32}
              heightIcon={32}
            />

            <FeatureItem
                icon={check}
                title="Confirmação Rápida"
                description=" Receba uma notificação imediata confirmando o registro da
                  sua transação."
                widthIcon={32}
                heightIcon={32}
            />
          </div>
        </div>
      </div>
    </div>
    {
        isHome &&
        <Link href="#pricing"  onClick={(e) => scrollToSection(e, "pricing")} 
        className="w-3xs flex items-center justify-center py-3 px-8 text-white bg-gradient-to-r 
        from-[#3ECC89] via-[#3B82F5] to-[#3ECC89] 
        bg-[length:200%_200%] animate-gradient rounded-full">
            Falar com a Fly
        </Link>
    }
  </section>
  )
}
