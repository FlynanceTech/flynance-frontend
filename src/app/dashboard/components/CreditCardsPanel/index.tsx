// src/components/credit-cards/CreditCardsPanel.tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import CreditCard from '../CreditCard'
import { useCardMutations } from '@/hooks/query/useCreditCards'
import CreditCardDrawer from '../CreditCardDrawer'
import type { CreditCardResponse } from '@/services/cards'

const TZ = 'America/Sao_Paulo' // ajuste se quiser vir do perfil do usuário

export default function CreditCardsPanel() {
  // 1) lista + mutações
  const { cardQuery } = useCardMutations()

  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const cards: CreditCardResponse[] = cardQuery.data ?? []
  const current: CreditCardResponse | undefined = cards[index]
  const currentId = current?.id

  // 2) resumo do cartão selecionado
  const { CardSummary } = useCardMutations(currentId, TZ)
  const summary = CardSummary.data

  function handleChangeCard() {
    setIndex((i) => (cards.length === 0 ? 0 : (i + 1) % cards.length))
  }

  const spent = summary?.metrics.spent ?? 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-800">Meus Cartões</h3>
          <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
            {cards.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> 
          </button>
            {/* <div className="hidden sm:flex items-center gap-1">
                <button onClick={prev} className="rounded-full border p-2 hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={next} className="rounded-full border p-2 hover:bg-gray-50">
                <ChevronRight className="h-4 w-4" />
                </button>
            </div> */}
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        {cards.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-sm text-gray-500">
            Nenhum cartão ainda. Clique em <strong>Adicionar</strong>.
          </div>
        ) : (
          <div className="w-full flex flex-col items-center relative  h-[380px] ">
            {
                cards.map(card => {
                    return (
                        <div 
                            key={card.id} 
                            className={`absolute ${current.id === card.id ? 'z-20 top-0' : 'z-10 top-0'}  `}
                            onClick={handleChangeCard}
                        >
                            <CreditCard
                                name={card?.name ?? ''}
                                brand={card?.brand ?? 'OTHER'}
                                last4={card?.last4 ?? undefined}
                                limit={card?.limit ?? 0}
                                spent={spent}
                                closingDay={card?.closingDay ?? 1}
                                dueDay={card?.dueDay ?? 10}
                                className={`w-full max-w-md ${current.id === card.id ? 'z-20 top-10' : 'z-10 top-0 blur-xs'}`}
                            />
                        </div>
                    )
                })
            }

            <div className="mt-3 flex items-center justify-between w-full max-w-md">
           {/*    <div className="flex gap-1">
                {cards.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setIndex(i)}
                    className={`h-2 w-2 rounded-full ${i === index ? 'bg-emerald-600' : 'bg-gray-300'}`}
                    aria-label={`Selecionar cartão ${i + 1}`}
                  />
                ))}
              </div> */}

             {/*  <div className="flex gap-2">
                <button
                  title="Editar (implementar depois)"
                  className="rounded-full border p-2 hover:bg-gray-50 text-gray-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => current && deleteCardMutation.mutate(current.id)}
                  title="Excluir"
                  className="rounded-full border p-2 hover:bg-rose-50 text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div> */}
            </div>
          </div>
        )}

        {/* setas mobile */}
       {/*  {cards.length > 1 && (
          <div className="sm:hidden absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2">
            <button onClick={prev} className="rounded-full border p-2 bg-white/90">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={next} className="rounded-full border p-2 bg-white/90">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )} */}
      </div>

      <CreditCardDrawer open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
