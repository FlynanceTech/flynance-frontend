"use client"

import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"
import { CheckCircle2 } from "lucide-react"

interface AlternatePlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlan: (plan: "mensal" | "anual") => void
}

export default function AlternatePlanModal({
  isOpen,
  onClose,
  onSelectPlan,
}: AlternatePlanModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 text-left shadow-xl">
                <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
                  Escolha seu plano
                </Dialog.Title>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => {
                      onSelectPlan("mensal")
                      onClose()
                    }}
                    className="border border-gray-300 hover:border-green-600 hover:bg-green-50 rounded-lg p-4 text-left transition-colors"
                  >
                    <div className="font-medium text-gray-800">Plano Mensal</div>
                    <div className="text-sm text-gray-600">R$ 19,90 por mês</div>
                  </button>

                  <button
                    onClick={() => {
                      onSelectPlan("anual")
                      onClose()
                    }}
                    className="border border-gray-300 hover:border-green-600 hover:bg-green-50 rounded-lg p-4 text-left transition-colors"
                  >
                    <div className="font-medium text-gray-800">Plano Anual</div>
                    <div className="text-sm text-gray-600">12x de R$ 17,91 (R$ 214,92/ano)</div>
                    <div className="mt-1 text-green-700 text-sm flex items-center gap-1">
                      <CheckCircle2 size={14} /> 10% de desconto aplicado
                    </div>
                  </button>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
