import React from "react";
import PricingCard from "./PricingCard";
import Image from "next/image";
import background from '../../../assets/background-plan.svg'

const PricingSection = () => {
  return (
    <section
      id="pricing"
      className="flex relative flex-col items-center self-stretch px-8 xl:px-0 pt-16 mt-16 w-full min-h-[1010px] max-md:mt-10 max-md:max-w-full"
    >
      <Image
        src={background}
        alt="Background"
        width={1920}
        height={1010}
        className="object-cover absolute inset-0 size-full"
      />
      <div className="flex relative z-10 flex-col w-full md:max-w-[1280px] max-md:mb-2.5 gap-8 items-center justify-center">
        <h2 className="self-center text-2xl md:text-3xl font-bold text-white text-center max-md:max-w-full px-4">
          Escolha seu plano e comece a economizar
        </h2>

        {/* Stack cards vertically on mobile, horizontally on desktop */}
        <div className="w-full flex flex-col md:flex-row gap-8 md:gap-8 md:items-center md:justify-center">
          {/* Free Plan */}
{/*           <div className="w-full md:flex-1 md:shrink md:self-stretch md:my-auto md:basis-0 md:min-w-60">
            <PricingCard
              title="Gratuito"
              planType="gratuito"
              price={
                <div className="flex flex-col items-center self-center">
                  <div className="text-lg font-light text-gray-500">
                    Plano Gratuito
                  </div>
                  <div className="text-4xl">
                    <span className="font-weight-500 text-xl">R$</span>
                    <span className="text-6xl">0</span>
                    <span className="font-weight-300 text-xl">/Mês</span>
                  </div>
                </div>
              }
              buttonStyle="secondary"
              benefits={[
                { text: "5 Mensagens no mês", active: true },
                { text: "Acesso ao Dashboard financeiro", active: true },
                { text: "Acesso a plataforma de educação", active: false },
                { text: "Mensagens de relatório pela fly", active: false },
              ]}
              buttonTitle="Testar no WhatsApp"
            />
          </div> */}

          {/* Monthly Plan */}
          <div className="">
            <PricingCard
              title="1 mês"
              popular={true}
              planType="mensal"
              price={
                <div className="flex justify-center items-center self-center text-emerald-400">
                  <div className="self-stretch my-auto text-4xl font-bold">
                    <span className="font-weight-500 text-xl">R$</span>
                    <span className="text-8xl text-emerald-400">19</span>
                  </div>
                  <div className="self-stretch my-auto text-xl w-[53px]">
                    <div className="font-bold">,90</div>
                    <div className="mt-2 font-light">/ Mês</div>
                  </div>
                </div>
              }
              buttonStyle="primary"
              benefits={[
                { text: "Teste gratuitamente por 7 dias", active: true },
                { text: "Registro de gastos e receitas", active: true },
                { text: "Categorias ilimitadas", active: true },
                { text: "Acesso ao Dashboard financeiro", active: true },
                { text: "Acesso a plataforma de educação", active: true },
                { text: "Mensagens de relatório pela fly", active: true },
              ]}
            />
          </div>

          {/* Annual Plan */}
          <div className="">
            <PricingCard
              title="12 meses"
              discount="10% Off"
              planType="anual"
              price={
                <div className="flex flex-col items-center self-center">
                  <div className="text-lg text-red-400 line-through">
                    De 19,90 por
                  </div>
                  <div className="flex justify-center items-center text-gray-700">
                    <div className="self-stretch my-auto text-4xl font-bold">
                      <span className="font-weight-500 text-xl">R$</span>
                      <span className="text-6xl text-gray-700">17</span>
                    </div>
                    <div className="self-stretch my-auto text-xl w-[53px]">
                      <div className="font-bold">,91</div>
                      <div className="mt-2 font-light">/ Mês</div>
                    </div>
                  </div>
                </div>
              }
              buttonStyle="secondary"
              buttonTitle="Garanta já 10% OFF"
              benefits={[
                { text: "Teste gratuitamente por 7 dias", active: true },
                { text: "Registro de gastos e receitas", active: true },
                { text: "Categorias ilimitadas", active: true },
                { text: "Acesso ao Dashboard financeiro", active: true },
                { text: "Acesso a plataforma de educação", active: true },
                { text: "Mensagens de relatório pela fly", active: true },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
