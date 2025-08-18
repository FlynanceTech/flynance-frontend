import React from "react";
import FeatureItem from "./FeatureItem";
import ChartIcon from "../../../assets/icons/chart-icon.svg"
import MoneyBag from "../../../assets/icons/money-bag-icon.svg"
import Goals from "../../../assets/icons/goals-fill-icon.svg"
import Books from "../../../assets/icons/books-icon.svg"
import Idea from "../../../assets/icons/idea-icon.svg"
import GameController from "../../../assets/icons/game-controller-icon.svg"
import Image from "next/image";
import Link from "next/link";
import { scrollToSection } from "@/utils/scroll-smooth";

const FeaturesSection = () => {
  return (
    <section
      id="features"
      className="flex flex-col md:flex-row flex-wrap gap-8 items-center justify-center max-w-full w-full md:w-[1280px] px-8"
    >
      {/* Título - Mobile: Primeiro (order-1) | Desktop: Natural */}
      <h2 className="text-lg md:text-xl font-semibold leading-7 text-center text-gray-700 w-full md:w-[687px] px-4 order-1 md:order-none">
        Tudo o que você precisa para organizar suas finanças, aprender e crescer
        financeiramente, em um único lugar.
      </h2>
      <div className="flex md:flex-row flex-col gap-8 items-center justify-center order-2 md:order-none">
        {/* Primeira coluna - Mobile: Primeiro (order-1) | Desktop: Natural */}
        <div className="w-full md:self-stretch md:my-auto md:min-w-60 md:w-[359px] order-1 md:order-none">
          <div className="flex flex-col gap-4">
            <FeatureItem
              icon={ChartIcon}
              title="Controle de Gastos"
              description="Acompanhe onde seu dinheiro está indo com gráficos detalhados de categorias de despesas. Identifique oportunidades de economia e melhore sua gestão financeira."
              iconSize="large"
            />
            <FeatureItem
              icon={MoneyBag}
              title="Monitoramento de Receitas"
              description="Veja todas as suas fontes de renda organizadas em um só lugar. Entenda seus ganhos ao longo do tempo e planeje melhor seus próximos passos financeiros."
              iconSize="large"
            />
            <FeatureItem
              icon={Goals}
              title="Progresso das Metas"
              description="Crie metas financeiras e acompanhe seu avanço com gráficos intuitivos. Saiba exatamente quanto falta para atingir seus objetivos e mantenha sua motivação."
              iconSize="large"
            />
          </div>
        </div>
        {/* Imagem - Mobile: Depois do conteúdo (order-2) | Desktop: Natural */}
        <div className="w-full md:w-auto flex flex-col justify-center items-center gap-4 my-8 md:my-0 order-2 md:order-none">
          <Image
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/e3f7306ee105cc810f3c1d63db433d637bedc9a8?apiKey=30d4c2b32552471b89a9a20881bec729"
            alt="Dashboard preview"
            width={488}
            height={320}
            className="object-contain rounded-none aspect-[1.34] w-full max-w-[488px] md:min-w-60 md:w-[488px]"
          />
          <Link href="#pricing"  onClick={(e) => scrollToSection(e, "pricing")} 
        className="w-3xs flex items-center justify-center py-3 px-8 text-white bg-gradient-to-r 
        from-[#3ECC89] via-[#3B82F5] to-[#3ECC89] 
        bg-[length:200%_200%] animate-gradient rounded-full">
            Falar com a Fly
        </Link>
        </div>   
        {/* Terceira coluna - Mobile: Primeiro (order-1) | Desktop: Natural */}
        <div className="w-full md:self-stretch md:my-auto md:min-w-60 md:w-[383px] order-3 md:order-none">
          <div className="flex flex-col gap-8">
            <FeatureItem
              icon={Books}
              title="Trilhas Personalizadas"
              description="Aprenda no seu ritmo com conteúdos adaptados ao seu nível de conhecimento. Escolha entre temas como orçamento, planejamento financeiro e muito mais."
              iconSize="small"
            />
            <FeatureItem
              icon={GameController}
              title="Gamificação e Recompensas"
              description="Ganhe pontos e desbloqueie conquistas enquanto aprende. Transforme a educação financeira em um jogo motivador e envolvente."
              iconSize="medium"
            />
            <FeatureItem
              icon={Idea}
              title="Dicas e Boas Práticas"
              description="Receba dicas práticas e orientações personalizadas para aplicar no seu dia a dia."
              iconSize="medium"
            />
          </div>
        </div>
      </div>

      
    </section>
  );
};

export default FeaturesSection;
