import { Receipt, Download, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "pending" | "failed";
  invoice: string;
  description: string;
}

const PaymentHistoryCard = () => {
  const payments: Payment[] = [
    {
      id: "1",
      date: "15/10/2025",
      amount: "R$ 49,90",
      status: "paid",
      invoice: "INV-2025-10-001",
      description: "Assinatura Premium - Outubro 2025",
    },
    {
      id: "2",
      date: "15/09/2025",
      amount: "R$ 49,90",
      status: "paid",
      invoice: "INV-2025-09-001",
      description: "Assinatura Premium - Setembro 2025",
    },
    {
      id: "3",
      date: "15/08/2025",
      amount: "R$ 49,90",
      status: "paid",
      invoice: "INV-2025-08-001",
      description: "Assinatura Premium - Agosto 2025",
    },
    {
      id: "4",
      date: "15/07/2025",
      amount: "R$ 49,90",
      status: "paid",
      invoice: "INV-2025-07-001",
      description: "Assinatura Premium - Julho 2025",
    },
  ];

  const getStatusBadge = (status: Payment["status"]) => {
    switch (status) {
      case "paid":
        return (
          <Badge
            variant="outline"
            className="bg-success/10 text-success border-success/20"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Pago
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-warning/10 text-warning border-warning/20"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="bg-destructive/10 text-destructive border-destructive/20"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Falhou
          </Badge>
        );
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Histórico de Pagamentos
          </h2>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <div className="space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/15 hover:bg-muted/50 transition-colors gap-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-foreground">
                  {payment.description}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{payment.date}</span>
                <span>•</span>
                <span className="font-mono">{payment.invoice}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-foreground">
                {payment.amount}
              </span>
              {getStatusBadge(payment.status)}
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/15">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total pago em 2025</span>
          <span className="font-semibold text-foreground">R$ 199,60</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryCard;
