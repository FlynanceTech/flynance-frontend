"use client"

import Lottie from "lottie-react";
import { Fragment, useEffect, useState } from "react"
import confettiAnimation from '../../../../public/lotties/confetti.json'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return;
  
    const handler = (e: Event) => {
      if (!("prompt" in e)) return;
  
      const promptEvent = e as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      setShowPrompt(true);
    };
  
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return

    const promptEvent = deferredPrompt
    promptEvent.prompt()

    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') {
      console.log('Usuário aceitou instalação PWA ✅')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <Transition appear show={showPrompt} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setShowPrompt(false)}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPrompt(false)}
              >
                <X className="h-5 w-5 cursor-pointer" />
              </button>

              <Lottie
                animationData={confettiAnimation}
                loop={false}
                className="absolute -top-32 left-0 w-full h-40 pointer-events-none"
              />

              <div className="relative z-10 text-center">
                <div className="text-4xl mb-2">🎉</div>
                <DialogTitle className="text-xl font-semibold text-gray-800">
                  Instale o app da Flynance!
                </DialogTitle>
                <p className="text-gray-600 text-sm mb-6">
                  Aproveite a experiência completa diretamente no seu dispositivo.
                </p>

                <button
                  onClick={handleInstall}
                  className="bg-gradient-to-r from-[#3ECC89] to-[#1F6645] text-white font-medium py-2 px-8 rounded-lg hover:scale-105 transition cursor-pointer"
                >
                  Vamos lá!
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
