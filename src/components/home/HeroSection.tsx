import React from "react";
import HeroImage from '../../../assets/hero-cliente-usando-celular.png'
import Image from "next/image";
import { trackEvent } from "@/utils/trackEvent";
import Link from "next/link";

const HeroSection = () => {
  return (
    <section
      id="hero"
      className="flex flex-col items-center self-stretch px-8 xl:px-0 md:px-16 w-full max-md:max-w-full pt-16 lg:pb-0 bg-linear-to-r"
    >
      <div className="mt-10 md:mt-14 max-w-full w-full md:w-[1280px]">
        {/* Mobile: Text acima da imagem | Desktop: Padrão */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-5">
          {/* Texto - Mobile: Primeiro (order-1) | Desktop: Natural */}
          <div className="w-full md:w-6/12 order-1 md:order-none">
            <div className="flex flex-col items-center md:items-start w-full text-gray-700 max-w-full gap-4">
              <div className="flex flex-col">
                <h1 className="self-stretch text-4xl md:text-6xl leading-tight md:leading-16 text-center md:text-left font-bold">
                  <span className="text-[#3B82F5]">Simplifique</span> sua
                  <br />
                  vida financeira com
                  <br />a Flynance
                </h1>
                <p className="mt-4 md:mt-4 text-base md:text-lg leading-relaxed md:leading-7 text-center md:text-left">
                Você no controle, sem fórmulas mágicas, trace metas e aprenda a cuidar do que é seu sem complicação, direto no WhatsApp.
                </p>
              </div>
              <Link href="/cadastro/espera"  onClick={() => {
                trackEvent('Lead', { category: 'lead', label: 'Hero banner button' })
              }} className=" py-3 px-8 flex items-center justify-center
              text-base text-white bg-[#3B82F5] cursor-pointer w-full md:w-auto  rounded-full">
                Inscrever na lista de espera
              </Link>
            </div>
          </div>

          {/* Imagem - Mobile: Segundo (order-2) | Desktop: Natural */}
          <div className="w-full md:w-6/12 md:ml-5 order-2 md:order-none flex justify-center">
            <Image
              src={HeroImage}
              className="object-contain w-full h-auto"
              alt="Hero Image"
              width="605"
              height="514"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
