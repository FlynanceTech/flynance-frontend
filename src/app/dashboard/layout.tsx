"use client";

import { useEffect, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import BottomMenu from "./components/buttonMenu";
import Sidebar from "./components/Sidebar";
import {
  DESKTOP_SIDEBAR_COLLAPSED_OFFSET_CLASS,
  DESKTOP_SIDEBAR_EXPANDED_OFFSET_CLASS,
} from "./components/Sidebar/sidebar.config";
import { Providers } from "@/providers/Providers";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { UserThemeProvider } from "@/providers/UserThemeProvider";
import { usePathname } from "next/navigation";
import '../globals.css'
import FeedbackWidget from "@/components/widgets/feedback";
import { AuthGuardProvider } from "@/providers/authGuardProvider";
import { useTransactionFilter } from "@/stores/useFilter";
import AdvisorActingPill from "./components/AdvisorActingPill";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ThemeProvider /* attribute='class' defaultTheme='light' enableSystem={false} se quiser */>
      <AuthGuardProvider>
        <UserThemeProvider>
          <DashboardShell sidebarCollapsed={sidebarCollapsed}>
            <aside className="hidden lg:block">
              <Sidebar
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
              />
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
function DashboardShell({
  children,
  sidebarCollapsed,
}: {
  children: React.ReactNode
  sidebarCollapsed: boolean
}) {
  const pathname = usePathname();
  const limparFiltros = useTransactionFilter((s) => s.limparFiltros);
  const lastPathnameRef = useRef(pathname);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      limparFiltros();
      contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
      window.scrollTo({ top: 0, behavior: "auto" });
      lastPathnameRef.current = pathname;
    }
  }, [pathname, limparFiltros]);

  return (
    <main
      className={`h-screen min-h-0 w-full gap-8 overflow-x-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))] transition-colors lg:flex lg:py-8 lg:pr-8 ${
        sidebarCollapsed ? DESKTOP_SIDEBAR_COLLAPSED_OFFSET_CLASS : DESKTOP_SIDEBAR_EXPANDED_OFFSET_CLASS
      }`}
    >
      <AdvisorActingPill />
      <div
        ref={contentRef}
        className="flex min-h-0 max-h-screen flex-1 flex-col overflow-y-auto overflow-x-hidden"
      >
        <div className="flex align-center justify-center px-4 lg:px-0 gap-4">
          {children}
        </div>
      </div>
      <FeedbackWidget />
    </main>
  );
}
