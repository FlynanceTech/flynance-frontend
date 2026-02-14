'use client'

import { Toaster } from 'react-hot-toast'
import AdminGuard from './components/AdminGuard'
import AdminSidebar from './components/AdminSidebar'
import AdminTopbar from './components/AdminTopbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#F7F8FA] text-[#333C4D]">
        <div className="flex min-h-screen">
          <aside className="hidden lg:block">
            <AdminSidebar />
          </aside>

          <section className="flex-1 flex flex-col min-w-0">
            <AdminTopbar />
            <div className="flex-1 p-4 md:p-6">{children}</div>
          </section>
        </div>
      </main>
      <Toaster />
    </AdminGuard>
  )
}
