import { CreditCard, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SubscriptionCard = () => {
  const subscription = {
    plan: "Premium",
    status: "ativo",
    renewalDate: "15/11/2025",
    daysUntilRenewal: 12,
  };

  const isNearRenewal = subscription.daysUntilRenewal <= 15;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Assinatura e Plano
        </h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-foreground">
                Plano {subscription.plan}
              </h3>
              <Badge
                variant="outline"
                className="bg-success/10 text-success border-success/20"
              >
                {subscription.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Renovação em {subscription.renewalDate}
            </p>
          </div>
        </div>

        {isNearRenewal && (
          <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Renovação próxima
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Sua assinatura será renovada em {subscription.daysUntilRenewal}{" "}
                dias. Certifique-se de que seus dados de pagamento estão
                atualizados.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button variant="default" size="lg" className="w-full">
            <TrendingUp className="mr-2 h-4 w-4" />
            Upgrade
          </Button>
          <Button variant="outline" size="lg" className="w-full">
            <TrendingDown className="mr-2 h-4 w-4" />
            Downgrade
          </Button>
          <Button variant="outline" size="lg" className="w-full">
            <CreditCard className="mr-2 h-4 w-4" />
            Pagamento
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCard;
