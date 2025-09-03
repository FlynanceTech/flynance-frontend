'use client'

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import { Trash2, X } from 'lucide-react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmLabel?: string
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Excluir item',
  description = 'Você tem certeza que deseja excluir este item? Essa ação não poderá ser desfeita.',
  confirmLabel = 'Excluir',
}: DeleteConfirmModalProps) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel className="relative w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all ">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-800 transition"
              >
                <X className="h-5 w-5 cursor-pointer" />
              </button>

              <div className="flex flex-col items-center text-center gap-4">
                <div className="rounded-full bg-red-100 dark:bg-red-400/10 p-3">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <DialogTitle as="h3" className="text-lg font-semibold text-zinc-800 ">
                  {title}
                </DialogTitle>
                <p className="text-sm text-zinc-600 dark:text-zinc-500">
                  {description}
                </p>

                <div className="mt-4 flex w-full gap-2">
                  <button
                    type="button"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium 
                    text-zinc-700 hover:bg-zinc-50 cursor-pointer
                    transition"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition cursor-pointer"
                    onClick={() => {
                      onConfirm()
                      onClose()
                    }}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
