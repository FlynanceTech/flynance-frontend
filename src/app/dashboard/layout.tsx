'use client'
import { Toaster } from "react-hot-toast"
import BottomMenu from "./components/buttonMenu"
import Sidebar from "./components/Sidebar"
import { useSession } from "@/hooks/useSession"
import { Providers } from "@/providers/Providers"
import clsx from "clsx"
import { useTheme } from "next-themes"

export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { loading: loadingSession } = useSession()
    const { theme } = useTheme()

    if (loadingSession) return null
    
  
    return <main className={clsx("lg:py-8 lg:pl-8 h-screen w-full lg:flex gap-8",
      theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-[#F7F8FA]'
     )}>
      <aside className='hidden lg:flex'>
        <Sidebar />
      </aside>

      <aside className="flex lg:hidden">
        <BottomMenu />
      </aside>
      <Toaster />
      <Providers>
        {children}
      </Providers>
    </main>
  }