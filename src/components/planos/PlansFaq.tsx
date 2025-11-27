"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

type FaqItem = {
  id: string;
  question: string;
  answer: React.ReactNode;
};

type PlansFaqProps = {
  items?: FaqItem[];
  className?: string;
};

const DEFAULT_ITEMS: FaqItem[] = [
  {
    id: "mensal-vs-anual",
    question: "Qual a diferença entre o plano Mensal e o Plano Anual?",
    answer: (
      <div className="space-y-2">
        <p>
          O <strong>Plano Mensal</strong> tem cobrança recorrente todo mês, sem fidelidade.
        </p>
        <p>
          O <strong>Plano Anual</strong> oferece desconto e garante acesso por 12 meses,
          sendo o melhor custo-benefício.
        </p>
      </div>
    ),
  },
  {
    id: "o-que-inclui",
    question: "O que está incluso em cada plano?",
    answer: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Acesso ao dashboard financeiro</li>
        <li>Assistente IA</li>
        <li>Controle de gastos e metas</li>
        <li>Projeções e relatórios</li>
        <li>Suporte dedicado via WhatsApp</li>
      </ul>
    ),
  },
  {
    id: "cancelamento",
    question: "Posso cancelar quando quiser?",
    answer: "Sim! Não existe fidelidade. O cancelamento é simples e sem multas.",
  },
  {
    id: "pagamento",
    question: "Quais são as formas de pagamento?",
    answer: (
      <>
        Atualmente aceitamos cartão de crédito. Em breve: PIX recorrente e cartão virtual.
      </>
    ),
  },
];

export default function PlansFaq({
  items = DEFAULT_ITEMS,
  className,
}: PlansFaqProps) {
  return (
    <section className={clsx("w-full max-w-3xl mx-auto px-4", className)}>
      <div className="mb-6 text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
          Perguntas frequentes
        </h2>
        <p className="text-sm md:text-base text-slate-500">
          Tudo o que você precisa saber antes de assinar a Flynance.
        </p>
      </div>

      <Accordion.Root
        type="single"
        collapsible
        className=""
      >
        {items.map((item) => (
          <Accordion.Item
            key={item.id}
            value={item.id}
            className="bg-white mb-8"
          >
            <Accordion.Header className="bg-primary px-4 md:px-6 rounded-t-sm text-white">
              <Accordion.Trigger
                className={clsx(
                  "flex w-full items-center justify-between py-4 text-left font-semibold transition group"
                )}
              >
                {item.question}
                <ChevronDown
                  size={20}
                  className=" transition-transform duration-300 group-data-[state=open]:rotate-180"
                />
              </Accordion.Trigger>
            </Accordion.Header>

            <Accordion.Content
              className={clsx(
                "overflow-hidden text-slate-600 leading-relaxed py-4 px-4 md:px-6 border border-primary rounded-b-sm",
                "data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
              )}
            >
              <div className="pt-1">{item.answer}</div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}
