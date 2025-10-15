import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const NotificationsCard = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: "dashboard",
      name: "Dashboard",
      description: "Notificações dentro da plataforma",
      enabled: true,
    },
    {
      id: "email",
      name: "E-mail",
      description: "Alertas e resumos enviados por e-mail",
      enabled: true,
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      description: "Mensagens importantes via WhatsApp",
      enabled: true,
    },
  ]);

  const handleToggle = (id: string) => {
    setChannels(
      channels.map((channel) =>
        channel.id === id ? { ...channel, enabled: !channel.enabled } : channel
      )
    );
  };

  const handleSave = () => {
    toast.success("Preferências salvas!", {
      description: "Suas configurações de notificação foram atualizadas.",
    });
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Notificações</h2>
      </div>

      <div className="space-y-4">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <Label
                htmlFor={channel.id}
                className="text-base font-medium text-foreground cursor-pointer"
              >
                {channel.name}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {channel.description}
              </p>
            </div>
            <Switch
              id={channel.id}
              checked={channel.enabled}
              onCheckedChange={() => handleToggle(channel.id)}
              className="ml-4"
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} className="w-full mt-6" size="lg">
        Salvar preferências
      </Button>
    </div>
  );
};

export default NotificationsCard;
