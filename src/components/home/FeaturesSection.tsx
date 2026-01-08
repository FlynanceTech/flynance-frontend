import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Calculator,
  TrendingUp,
  Target,
  BookOpen,
  MessageCircle,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Controle de Gastos",
    description:
      "Acompanhe onde seu dinheiro está indo com gráficos detalhados de categorias de despesas.",
  },
  {
    icon: TrendingUp,
    title: "Monitoramento de Receitas",
    description: "Veja todas as suas fontes de renda organizadas em um só lugar.",
  },
  {
    icon: Target,
    title: "Progresso das Metas",
    description: "Crie metas financeiras e acompanhe seu avanço com gráficos intuitivos.",
  },
  {
    icon: BookOpen,
    title: "Trilhas Personalizadas",
    description: "Aprenda sobre finanças com conteúdos adaptados ao seu perfil e objetivos.",
  },
  {
    icon: MessageCircle,
    title: "IA no WhatsApp",
    description: "Envie mensagens de voz ou texto. A Fly entende e organiza tudo para você.",
  },
  {
    icon: BarChart3,
    title: "Relatórios Inteligentes",
    description: "Receba insights automáticos sobre seus hábitos financeiros.",
  },
];

const FeaturesSection = () => {
  return (
    <section
      id="features"
      className="py-8 md:py-16 bg-gradient-to-t from-secondary to-primary w-full text-white"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-8 md:mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Tudo o que você precisa para organizar suas finanças
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto text-white/90">
            Aprenda e cresça financeiramente, em um único lugar
          </p>
        </header>

        {/* ✅ Mobile: carousel */}
        <div className="md:hidden">
          <FeaturesCarousel items={features} />
        </div>

        {/* ✅ Desktop: grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

/* --------------------------- */
/* Card */
/* --------------------------- */

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="h-full bg-white/95 border border-white/10 rounded-2xl p-6 shadow-[0_18px_60px_rgba(2,8,23,0.25)] hover:shadow-[0_22px_70px_rgba(2,8,23,0.28)] transition-all duration-300 group">
     <div className="flex gap-4 items-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
     </div>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* --------------------------- */
/* Mobile carousel (no libs) */
/* --------------------------- */

function FeaturesCarousel({ items }: { items: typeof features }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const slides = useMemo(() => items, [items]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const children = Array.from(el.children) as HTMLElement[];
      if (!children.length) return;

      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;

      children.forEach((child, i) => {
        const childCenter = child.offsetLeft + child.clientWidth / 2;
        const dist = Math.abs(center - childCenter);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });

      setActive(best);
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[idx] as HTMLElement | undefined;
    if (!child) return;
    child.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="
          flex gap-4 overflow-x-auto pb-3
          snap-x snap-mandatory
          [-ms-overflow-style:none] [scrollbar-width:none]
        "
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* hide scrollbar (webkit) */}
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {slides.map((f, idx) => (
          <div
            key={idx}
            className="
              snap-center shrink-0
              w-[86%] sm:w-[72%]
            "
          >
            <FeatureCard {...f} />
          </div>
        ))}
      </div>

      {/* Dots + hint */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-white/80">Arraste para ver mais</p>

        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para item ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={[
                "h-2.5 rounded-full transition-all",
                i === active ? "w-7 bg-white" : "w-2.5 bg-white/40",
              ].join(" ")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
