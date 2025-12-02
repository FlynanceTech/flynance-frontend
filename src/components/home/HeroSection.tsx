import React from "react";
import chatFly from '../../../assets/chat-fly.jpeg'
import dashboardMobile from '../../../assets/dashboard-mobile.png'
/* import HeroImage from '../../../assets/hero-cliente-usando-celular.png'

import { trackEvent } from "@/utils/trackEvent";
 */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight} from "lucide-react";

const HeroSection = () => {
  return (
   <section className="py-8 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-8">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Question Text */}

          {/* Main Headline */}
          <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-foreground mb-8 leading-tight">
            Simplifique sua vida financeira com <strong className="text-primary">Inteligência Artificial </strong> direto no seu <strong className="text-primary">WhatsApp</strong> 
          </h1>
          <p className="text-highlight text-lg md:text-xl font-medium mb-4">
            Você no controle, sem fórmulas mágicas, trace metas e aprenda a cuidar do que é seu sem complicação, direto no WhatsApp.
          </p>

          <Link
            href="#pricing"  
            className="bg-primary hover:bg-primary/90  rounded-full shadow-lg px-10 py-4"
          >
            <span className="text-white flex items-center justify-center text-lg  font-semibold ">
              Começar agora
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>

        {/* Phone Mockups Section */}
        <div className=" flex justify-center gap-4 md:gap-8 overflow-hidden p-4">
          <div className="w-[200px] md:w-[280px] bg-foreground rounded-3xl p-2 shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-300">
       {/*      <div className="bg-[#075E54] rounded-2xl p-3 h-[350px] md:h-[450px] overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">F</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Flynance - Oficial</p>
                  <p className="text-white/60 text-xs">Online</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-[#DCF8C6] rounded-lg p-2 ml-auto max-w-[80%]">
                  <p className="text-foreground text-xs">Gastei 17 reais no posto</p>
                </div>
                <div className="bg-[#FFFFFF] rounded-lg p-2 max-w-[80%]">
                  <p className="text-foreground text-xs">Registrado! ⛽ Gasto de R$17 em Transporte.</p>
                </div>
                <div className="bg-[#DCF8C6] rounded-lg p-2 ml-auto max-w-[80%]">
                  <p className="text-foreground text-xs">E 30 reais de estacionamento</p>
                </div>
                <div className="bg-[#FFFFFF] rounded-lg p-2 max-w-[80%]">
                  <p className="text-foreground text-xs">Anotado! 🅿️ R$30 em Transporte.</p>
                </div>
              </div>
            </div> */}
            <Image src={chatFly}
            className="object-contain rounded-2xl" alt="" width={300} height={900}/>
          </div>

          <div className="w-[200px] md:w-[280px] bg-foreground rounded-3xl p-2 shadow-2xl hidden md:block">
            <div className="bg-[#075E54] rounded-2xl p-3 h-[450px] overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">F</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Flynance - Oficial</p>
                  <p className="text-white/60 text-xs">Online</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-[#FFFFFF] rounded-lg p-2 max-w-[90%]">
                  <p className="text-foreground text-xs">No total, você gastou <span className="font-bold text-highlight">R$ 17.664,00</span> neste mês.</p>
                </div>
                <div className="bg-[#FFFFFF] rounded-lg p-2 max-w-[90%]">
                  <p className="text-foreground text-xs">Se precisar de mais detalhes, acesse seu painel! 📊</p>
                </div>
                <div className="bg-[#DCF8C6] rounded-lg p-2 ml-auto max-w-[80%]">
                  <p className="text-foreground text-xs">Gastei 150 reais de iFood</p>
                </div>
                <div className="bg-[#FFFFFF] rounded-lg p-2 max-w-[90%]">
                  <p className="text-foreground text-xs">Registrado! 🍔 R$150 em Alimentação.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-[200px] md:w-[280px] bg-foreground rounded-3xl p-2 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300 hidden lg:block">
            <Image src={dashboardMobile}
            className="object-contain rounded-2xl" alt="" width={300} height={900}/>
        {/*     <div className="bg-background rounded-2xl p-3 h-[450px] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-xs font-bold">F</span>
                  </div>
                  <p className="text-foreground text-sm font-semibold">Assessor</p>
                </div>
              </div>
              <div className="text-center mb-4">
                <p className="text-muted-foreground text-xs">Abril</p>
              </div>
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Valores pagos</p>
                  <p className="text-highlight font-bold">R$ 1.932,00</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Valores recebidos</p>
                  <p className="text-green-500 font-bold">R$ 52.501,00</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Total a pagar</p>
                  <p className="text-highlight font-bold">R$ 27.200,00</p>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
