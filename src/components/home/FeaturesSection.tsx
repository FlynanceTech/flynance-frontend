import React from "react";
import { Calculator, TrendingUp, Target, BookOpen, MessageCircle, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Controle de Gastos",
    description: "Acompanhe onde seu dinheiro está indo com gráficos detalhados de categorias de despesas.",
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
      className="py-4 md:py-16 bg-gradient-to-t from-secondary to-primary w-full text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tudo o que você precisa para organizar suas finanças
          </h2>
          <p className="text-lg max-w-2xl mx-auto">
            Aprenda e cresça financeiramente, em um único lugar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className="bg-card border border-primary rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/30 group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

};

export default FeaturesSection;
