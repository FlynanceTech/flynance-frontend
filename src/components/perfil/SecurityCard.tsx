import { Shield, Key, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const SecurityCard = () => {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Segurança Adicional
        </h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/15 hover:bg-muted/50 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-full group-hover:bg-primary/10 transition-colors">
              <Key className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Autenticação de dois fatores (2FA)
              </p>
              <p className="text-sm text-muted-foreground">
                Adicione uma camada extra de segurança
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Ativar 2FA
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border/15 hover:bg-muted/50 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-full group-hover:bg-primary/10 transition-colors">
              <Smartphone className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Dispositivos conectados
              </p>
              <p className="text-sm text-muted-foreground">
                Gerencie dispositivos com acesso à sua conta
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            Ver todos
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SecurityCard;
