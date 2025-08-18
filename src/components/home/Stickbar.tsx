'use client'
import { trackEvent } from "@/utils/trackEvent";
import Link from "next/link";
import React from "react";

export default function StickyBar() {

  return (
    <>
      <div className="fixed bottom-0 w-full bg-linear-to-r from-[#15B8A6] to-[#3B82F6] px-6 py-3 flex justify-center items-center z-40">
        <div className="w-full max-w-[1280px] flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="text-white font-medium text-base text-center">
            Acesse primeiro: entre para a lista de espera.
          </div>
          <Link
              href="/cadastro/espera"
              onClick={ () => trackEvent('Lead', { category: 'StickyBar', label: 'Inscrever-se' })}
            
            className="bg-[#15B8A6] w-full md:max-w-44 text-white text-center text-sm font-medium px-5 py-3 rounded-md hover:bg-[#13A897] transition cursor-pointer">
            Inscrever-se
          </Link>
        </div>
      </div>
    </>
  );
}
