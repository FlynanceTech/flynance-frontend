"use client";

import { useEffect, useRef } from "react";
import { Toaster } from "react-hot-toast";
import BottomMenu from "./components/buttonMenu";
import Sidebar from "./components/Sidebar";
import { Providers } from "@/providers/Providers";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { UserThemeProvider } from "@/providers/UserThemeProvider";
import { usePathname } from "next/navigation";
import '../globals.css'
import FeedbackWidget from "@/components/widgets/feedback";
import { AuthGuardProvider } from "@/providers/authGuardProvider";
import { useTransactionFilter } from "@/stores/useFilter";
import AdvisorActingPill from "./components/AdvisorActingPill";
import FinancialScopeSwitcher from "@/components/financial/FinancialScopeSwitcher";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider /* attribute='class' defaultTheme='light' enableSystem={false} se quiser */>
      <AuthGuardProvider>
        <UserThemeProvider>
          <DashboardShell>
            <aside className="hidden lg:flex">
              <Sidebar />
            </aside>

            <aside className="flex lg:hidden">
              <BottomMenu />
            </aside>

            <Toaster />
            <Providers>{children}</Providers>
          </DashboardShell>
        </UserThemeProvider>
      </AuthGuardProvider>
    </ThemeProvider>
  );
}

/** Lê o tema já dentro do ThemeProvider */
function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const limparFiltros = useTransactionFilter((s) => s.limparFiltros);
  const lastPathnameRef = useRef(pathname);

  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      limparFiltros();
      lastPathnameRef.current = pathname;
    }
  }, [pathname, limparFiltros]);

  return (
    <main
      className="lg:py-8 lg:pl-8 h-screen min-h-0 w-full lg:flex gap-8 relative overflow-x-hidden lg:overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))] transition-colors"
    >
      <AdvisorActingPill />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="px-4 pt-4 lg:px-0 lg:pr-8 lg:pt-0">
          <FinancialScopeSwitcher />
        </div>
        <div className="min-h-0 flex-1">
          {children}
        </div>
      </div>
      <FeedbackWidget />
    </main>
  );
}
