import { useState } from "react";
import { Shield, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AuthMethod {
  id: string;
  name: string;
  description: string;
  icon: typeof Mail;
  value: string;
}

const AuthPreferencesCard = () => {
  const [selectedMethod, setSelectedMethod] = useState("email");

  const authMethods: AuthMethod[] = [
    {
      id: "email",
      name: "E-mail",
      description: "Código enviado para joao.silva@email.com",
      icon: Mail,
      value: "email",
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      description: "Código enviado via WhatsApp",
      icon: MessageCircle,
      value: "whatsapp",
    },
  ];

  const handleSave = () => {
    toast.success("Preferência de autenticação atualizada!", {
      description: `Agora você receberá códigos de verificação via ${
        authMethods.find((m) => m.id === selectedMethod)?.name
      }.`,
    });
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Autenticação
          </h2>
          <p className="text-sm text-muted-foreground">
            Escolha como deseja receber códigos de verificação
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {authMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <button
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div
                className={`p-2 rounded-full transition-colors ${
                  isSelected
                    ? "bg-primary/20"
                    : "bg-muted group-hover:bg-primary/10"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isSelected ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1 text-left">
                <Label
                  className={`text-base font-medium cursor-pointer ${
                    isSelected ? "text-primary" : "text-foreground"
                  }`}
                >
                  {method.name}
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {method.description}
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                }`}
              >
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Button onClick={handleSave} className="w-full mt-6" size="lg">
        Salvar preferência
      </Button>
    </div>
  );
};

export default AuthPreferencesCard;
