import { Download, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DataExportCard = () => {
  const handleExportData = () => {
    toast.success("Exportação iniciada!", {
      description:
        "Você receberá um e-mail com seus dados em até 24 horas.",
    });
  };

  const handleDeleteAccount = () => {
    toast.error("Conta excluída", {
      description: "Seus dados serão removidos permanentemente em 30 dias.",
    });
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/15 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Seus Dados
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie e exporte suas informações
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl border border-border/15 hover:bg-muted/50 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-medium text-foreground mb-1">
                Exportar dados
              </p>
              <p className="text-sm text-muted-foreground">
                Receba uma cópia completa dos seus dados em formato JSON
              </p>
            </div>
          </div>
          <Button
            onClick={handleExportData}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Solicitar exportação
          </Button>
        </div>

        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5">
          <div className="mb-3">
            <p className="font-medium text-foreground mb-1">Excluir conta</p>
            <p className="text-sm text-muted-foreground">
              Esta ação é irreversível. Todos os seus dados serão
              permanentemente removidos.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir minha conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá
                  permanentemente sua conta e removerá seus dados de nossos
                  servidores.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, excluir minha conta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default DataExportCard;
