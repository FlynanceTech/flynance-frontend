"use client";

import { useRouter } from "next/navigation";
import {  Undo2 } from "lucide-react";
import Image from "next/image";
import logo from "../../../assets/fly-logo.png";

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
      <div className="flex items-center gap-3 text-white">
        {showBack && (
          <button
            onClick={handleBack} className="flex gap-4 items-center cursor-pointer">
            <Undo2 size={32} />
            <span className="font-semibold">Voltar</span>
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
        <Image
          src={logo}
          className="object-contain aspect-[1.86] w-[130px]"
          alt="Flynance Logo"
          width={120}
          height={30}
        />
      )}
    </header>
  );
}
