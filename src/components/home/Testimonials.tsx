import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Maria Silva",
    role: "Empreendedora",
    avatar: "",
    rating: 5,
    text: "A Fly mudou completamente minha relação com dinheiro. Agora controlo tudo pelo WhatsApp de forma super prática!",
  },
  {
    name: "João Santos",
    role: "Autônomo",
    avatar: "",
    rating: 5,
    text: "Nunca imaginei que seria tão fácil organizar minhas finanças. Em 2 meses já economizei mais de R$ 800!",
  },
  {
    name: "Ana Oliveira",
    role: "Designer",
    avatar: "",
    rating: 5,
    text: "A inteligência artificial da Fly é incrível! Ela me ajuda a tomar decisões financeiras muito mais inteligentes.",
  },
  {
    name: "Carlos Mendes",
    role: "Professor",
    avatar: "",
    rating: 5,
    text: "Finalmente consegui sair das dívidas graças aos insights da Flynance. Recomendo para todos!",
  },
];

const Testimonials = () => {
  return (
    <section className="w-full bg-primary py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 text-white">
          <span className=" font-medium text-sm uppercase tracking-wider">
            Depoimentos
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg max-w-2xl mx-auto">
            Faça parte dessa transformação na educação financeira com a Flynance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border border-border"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              
              <p className="text-foreground mb-6 text-sm leading-relaxed">
                &quot;{testimonial.text}&quot;
              </p>
              
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={testimonial.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {testimonial.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      {/*   <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-8 bg-card rounded-full px-8 py-4 shadow-sm border border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">4.9</p>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">10k+</p>
              <p className="text-muted-foreground text-xs">Usuários ativos</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">R$ 2M+</p>
              <p className="text-muted-foreground text-xs">Economizados</p>
            </div>
          </div>
        </div> */}
      </div>
    </section>
  );
};

export default Testimonials;
