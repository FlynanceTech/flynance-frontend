"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

type PageHeaderProps = {
  title?: string;
  showBack?: boolean;
};

export function PageHeader({ title, showBack = true }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back(); 
  };

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 max-w-[980px]">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-sm transition cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
        )}

        {/* Logo */}
      {/*   <div className="flex items-center gap-2">
          <Image src="/icons/logo-192x192.png" alt="Flynance" width={32} height={32} />
          <span className="text-white font-semibold text-lg drop-shadow">
            <span className="">nance</span>
          </span>
        </div> */}
      </div>

      {title && (
        <span className="hidden md:inline text-white/90 text-sm">
          {title}
        </span>
      )}
    </header>
  );
}
