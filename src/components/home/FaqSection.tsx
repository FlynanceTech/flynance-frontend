import React from "react";
import FaqItem from "./FaqItem";
import { scrollToSection } from "@/utils/scroll-smooth";

const faqData = [
  {
    question: "O que é a Flynance?",
    answer:
      "A Flynance é um hub completo de gestão financeira pessoal que combina educação, tecnologia e suporte especializado para ajudar você a atingir seus objetivos financeiros. Nossa plataforma oferece ferramentas para controle de gastos, monitoramento de receitas, acompanhamento de metas, além de conteúdos com dicas e boas práticas financeiras personalizadas.",
  },
  {
    question: "O que a Flynance não é?",
    answer:
      "A Flynance não é uma consultoria de investimentos. Nós não realizamos recomendações de ativos, não oferecemos planos de investimento personalizados, e não estamos vinculados a nenhuma corretora, banco ou casa de análise. Nosso foco é 100% educacional: ajudamos você a entender melhor seu dinheiro e tomar decisões mais conscientes por conta própria, com base em dicas de comportamento financeiro, trilhas de aprendizado e ferramentas de organização pessoal.",
  },
  {
    question: "Como funciona o chatbot da Flynance?",
    answer:
      "O chatbot da Flynance é uma assistente virtual inteligente que responde suas dúvidas sobre finanças pessoais, ajuda a analisar seus gastos, oferece dicas personalizadas e te auxilia a navegar pela plataforma. Você pode fazer perguntas em linguagem natural e receber respostas claras e objetivas, além de relatórios personalizados sobre sua situação financeira.",
  },
  {
    question: "O que posso visualizar no Dashboard?",
    answer:
      "No Dashboard da Flynance, você pode visualizar gráficos detalhados de suas despesas por categoria, acompanhar a evolução de suas receitas ao longo do tempo, monitorar o progresso de suas metas financeiras, ver um resumo de seus investimentos, e receber insights personalizados baseados nos seus dados financeiros. Tudo isso em uma interface intuitiva e fácil de usar.",
  },
  {
    question: "Como funciona a Educação Financeira da Flynance?",
    answer:
      "A Educação Financeira da Flynance funciona através de trilhas de aprendizado personalizadas ao seu nível de conhecimento e objetivos. Oferecemos conteúdos em diversos formatos (artigos, vídeos, podcasts), elementos de gamificação para manter sua motivação, e recomendações de conteúdo baseadas no seu perfil e comportamento financeiro. Você aprende no seu ritmo e aplica o conhecimento diretamente na gestão das suas finanças.",
  },
];

const FaqSection = () => {
  return (
    <section
      id="faq"
      className="max-w-full w-full md:w-[1280px] z-10 mt-10 xl:-mt-44 px-8 xl:px-0 flex flex-col gap-8"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-gray-700 text-center md:text-left">
        Perguntas Frequentes
      </h2>
      <div className="flex flex-col">
        {faqData.map((faq, index) => (
          <FaqItem
            key={index}
            index={index}
            question={faq.question}
            answer={faq.answer}
          />
        ))}
      </div>
      <div className="w-full flex justify-center items-center">
        <a href="#pricing"  onClick={(e) => scrollToSection(e, "pricing")} className="w-3xs flex items-center justify-center py-3 px-8 text-white bg-gradient-to-r from-secondary via-[#3B82F5] to-secondary bg-[length:200%_200%] animate-gradient rounded-full">Começar agora</a>
      </div>
    </section>
  );
};

export default FaqSection;
