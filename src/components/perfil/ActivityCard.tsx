import { Clock, Mail, User, CreditCard } from "lucide-react";

interface Activity {
  id: string;
  type: "email" | "profile" | "payment";
  description: string;
  timestamp: string;
}

const ActivityCard = () => {
  const activities: Activity[] = [
    {
      id: "1",
      type: "email",
      description: "E-mail atualizado",
      timestamp: "Há 2 horas",
    },
    {
      id: "2",
      type: "profile",
      description: "Informações do perfil editadas",
      timestamp: "Há 1 dia",
    },
    {
      id: "3",
      type: "payment",
      description: "Método de pagamento adicionado",
      timestamp: "Há 3 dias",
    },
  ];

  const getIcon = (type: Activity["type"]) => {
    const iconClass = "h-4 w-4 text-muted-foreground";
    switch (type) {
      case "email":
        return <Mail className={iconClass} />;
      case "profile":
        return <User className={iconClass} />;
      case "payment":
        return <CreditCard className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Atividade Recente
        </h2>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="p-2 bg-muted rounded-full">{getIcon(activity.type)}</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {activity.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {activity.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityCard;
