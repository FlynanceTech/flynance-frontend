'use client';

import { User, CreditCard, Bell, Shield, Clock, FileDown } from "lucide-react";

const menuItems = [
  { title: "Informações Pessoais", icon: User, id: "user-info" },
  { title: "Assinatura e Plano", icon: CreditCard, id: "subscription" },
  { title: "Histórico de Pagamentos", icon: Clock, id: "payment-history" },
  { title: "Autenticação", icon: Shield, id: "auth-preferences" },
  { title: "Notificações", icon: Bell, id: "notifications" },
  { title: "Segurança", icon: Shield, id: "security" },
  { title: "Dados e Privacidade", icon: FileDown, id: "data-export" },
  { title: "Atividade Recente", icon: Clock, id: "activity" },
];

export function ProfileSidebar() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <aside className="hidden lg:block">
        <nav className="w-64 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <ul className="space-y-2">
                {menuItems.map((item) => (
                    <li key={item.id}>
                        <button
                            onClick={() => scrollToSection(item.id)}
                            className="w-full flex items-center p-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <item.icon className="mr-3 h-5 w-5 text-gray-400" />
                            {item.title}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    </aside>
  );
}
