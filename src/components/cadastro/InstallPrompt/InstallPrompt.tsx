"use client"

import { useEffect, useState } from "react"

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
  

  console.log('check installPrompt')

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setShowPrompt(false)
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white shadow-xl border rounded-lg p-4 flex items-center justify-between z-50">
      <span className="text-sm text-gray-800">Instale o app para uma melhor experiência</span>
      <button
        onClick={handleInstallClick}
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
      >
        Instalar
      </button>
    </div>
  )
}
