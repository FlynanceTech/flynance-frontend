"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";
import { Toaster } from "react-hot-toast";
import BottomMenu from "./components/buttonMenu";
import Sidebar from "./components/Sidebar";
import { Providers } from "@/providers/Providers";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import '../globals.css'
import FeedbackWidget from "@/components/widgets/feedback";
import { AuthGuardProvider } from "@/providers/authGuardProvider";
import { useTransactionFilter } from "@/stores/useFilter";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider /* attribute='class' defaultTheme='light' enableSystem={false} se quiser */>
      <AuthGuardProvider>
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
      </AuthGuardProvider>
    </ThemeProvider>
  );
}

/** Lê o tema já dentro do ThemeProvider */
function DashboardShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
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
      className={clsx(
        "lg:py-8 lg:pl-8 h-screen w-full lg:flex gap-8 relative",
        theme === "dark" ? "bg-gray-800 text-white" : "bg-[#F7F8FA]"
      )}
    >
      {children}
      <FeedbackWidget />
    </main>
  );
}
