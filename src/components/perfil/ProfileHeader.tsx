import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ProfileHeader = () => {

  return (
    <div className="animate-fade-in">
      <Link href="/dashboard" className="inline-block">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>
      </Link>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Gerenciar Perfil
        </h1>
        <p className="text-muted-foreground text-base">
          Gerencie suas informações, assinatura e notificações.
        </p>
      </div>
    </div>
  );
};

export default ProfileHeader;
