
import Lottie from "lottie-react";
import { Fragment, useEffect, useState } from "react"
import confettiAnimation from '../../../../public/lotties/confetti.json'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const dismissedKey = 'flynance_pwa_install_dismissed'

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyDismissed = window.localStorage.getItem(dismissedKey) === 'true'
    if (alreadyDismissed) {
      setDismissed(true)
    }

    const handler = (e: Event) => {
      if (window.localStorage.getItem(dismissedKey) === 'true') return
      if (!("prompt" in e)) return;

      const promptEvent = e as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      setShowPrompt(true);
    };

    const handleInstalled = () => {
      window.localStorage.setItem(dismissedKey, 'true')
      setDismissed(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", handleInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", handleInstalled)
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return

    const promptEvent = deferredPrompt
    promptEvent.prompt()

    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') {
      console.log('UsuÃ¡rio aceitou instalaÃ§Ã£o PWA âœ…')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(dismissedKey, 'true')
    }
    setDismissed(true)
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  if (!showPrompt || dismissed) return null

  return (
    <Transition appear show={showPrompt} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleDismiss}>
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
                onClick={handleDismiss}
              >
                <X className="h-5 w-5 cursor-pointer" />
              </button>

              <Lottie
                animationData={confettiAnimation}
                loop={false}
                className="absolute -top-32 left-0 w-full h-40 pointer-events-none"
              />

              <div className="relative z-10 text-center">
                <div className="text-4xl mb-2">ðŸŽ‰</div>
                <DialogTitle className="text-xl font-semibold text-gray-800">
                  Instale o app da Flynance!
                </DialogTitle>
                <p className="text-gray-600 text-sm mb-6">
                  Aproveite a experiÃªncia completa diretamente no seu dispositivo.
                </p>

                <button
                  onClick={handleInstall}
                  className="bg-gradient-to-r from-secondary to-primary text-white font-medium py-2 px-8 rounded-lg hover:scale-105 transition cursor-pointer"
                >
                  Vamos lÃ¡!
                </button>
                <button
                  onClick={handleDismiss}
                  className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline underline-offset-4 cursor-pointer"
                >
                  JÃ¡ instalei
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
