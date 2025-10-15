import { useState } from "react";
import { User, Mail, Phone, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const UserInfoCard = () => {
  const [formData, setFormData] = useState({
    name: "João Silva",
    email: "joao.silva@email.com",
    whatsapp: "(11) 99999-9999",
  });

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setFormData({ ...formData, whatsapp: formatted });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Informações atualizadas com sucesso!", {
      description: "Suas alterações foram salvas.",
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-border animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <User className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Informações do Usuário
        </h2>
      </div>

      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-semibold text-primary">
            JS
          </div>
          <button className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full hover:bg-primary/90 transition-colors">
            <Camera className="h-3.5 w-3.5 text-primary-foreground" />
          </button>
        </div>
        <div>
          <p className="font-medium text-foreground">{formData.name}</p>
          <p className="text-sm text-muted-foreground">{formData.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Digite seu nome"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              className="pl-10"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="whatsapp"
              className="pl-10"
              value={formData.whatsapp}
              onChange={handleWhatsAppChange}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg">
          Salvar alterações
        </Button>
      </form>
    </div>
  );
};

export default UserInfoCard;
