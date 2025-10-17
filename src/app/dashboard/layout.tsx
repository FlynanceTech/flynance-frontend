"use client";

import clsx from "clsx";
import { Toaster } from "react-hot-toast";
import BottomMenu from "./components/buttonMenu";
import Sidebar from "./components/Sidebar";
import { useSession } from "@/hooks/useSession";
import { Providers } from "@/providers/Providers";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useTheme } from "next-themes";
import '../globals.css'
import FeedbackWidget from "@/components/widgets/feedback";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading: loadingSession } = useSession();
  if (loadingSession) return null;

  return (
    <ThemeProvider /* attribute='class' defaultTheme='light' enableSystem={false} se quiser */>
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
    </ThemeProvider>
  );
}

/** Lê o tema já dentro do ThemeProvider */
function DashboardShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
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
