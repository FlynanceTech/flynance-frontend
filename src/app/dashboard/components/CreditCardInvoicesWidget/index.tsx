'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { AlertCircle, CreditCard, ExternalLink, Plus, WalletCards } from 'lucide-react'

import { useFinancialScope } from '@/hooks/useFinancialScope'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useCardMutations } from '@/hooks/query/useCreditCards'
import { cardKeys } from '@/hooks/query/cardkeys'
import { formatCurrency } from '@/utils/formatter'
import { getCardSummary, type CardSummaryResponse, type CreditCardResponse } from '@/services/cards'
import CreditCardDrawer from '../CreditCardDrawer'

const TZ = 'America/Sao_Paulo'
const CARD_COLOR_STORAGE_KEY = 'flynance:future-credit-card-colors'
const DEFAULT_CARD_COLOR = '#0EA5E9'

function getStoredCardColors(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(CARD_COLOR_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.entries(parsed).reduce<Record<string, string>>((acc, [id, value]) => {
      const color = String(value ?? '').trim()
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) acc[id] = color
      return acc
    }, {})
  } catch {
    return {}
  }
}

function cardLabel(card: CreditCardResponse) {
  return `${card.name}${card.last4 ? ` •• ${card.last4}` : ''}`
}

function getInvoiceValue(summary?: CardSummaryResponse) {
  return Number(summary?.metrics.spent ?? 0)
}

export default function CreditCardInvoicesWidget() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { cardQuery } = useCardMutations()
  const { scope, scopeKey } = useFinancialScope()
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'

  const cardColors = useMemo(() => getStoredCardColors(), [])
  const cards = useMemo(
    () => (cardQuery.data ?? []).filter((card) => card.isActive !== false),
    [cardQuery.data]
  )

  const summaryQueries = useQueries({
    queries: cards.map((card) => ({
      queryKey: cardKeys.summary(card.id, actingContextKey, scopeKey, TZ),
      queryFn: () => getCardSummary(card.id, TZ, scope),
      enabled: Boolean(card.id),
      staleTime: 30_000,
    })),
  })

  const isLoading = cardQuery.isLoading || summaryQueries.some((query) => query.isLoading)
  const hasSummaryError = summaryQueries.some((query) => query.isError)
  const totalInvoices = summaryQueries.reduce(
    (sum, query) => sum + getInvoiceValue(query.data),
    0
  )

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Faturas dos cartões</h2>
          <p className="mt-1 text-xs font-medium text-gray-500">
            Valor atual das faturas cadastradas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/30 text-primary transition-colors hover:bg-secondary/35"
          aria-label="Adicionar cartão"
          title="Adicionar cartão"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-slate-50/70 px-5 py-8 text-center">
          <WalletCards className="mb-3 h-8 w-8 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">Nenhum cartão cadastrado.</p>
          <p className="mt-1 text-xs text-gray-500">Cadastre cartões para acompanhar as faturas aqui.</p>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary"
          >
            <Plus className="h-4 w-4" />
            Novo cartão
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3">
            <p className="text-xs font-semibold text-blue-700">Total em faturas</p>
            <p className="mt-1 text-2xl font-extrabold text-primary">{formatCurrency(totalInvoices)}</p>
          </div>

          {hasSummaryError && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              <AlertCircle className="h-4 w-4" />
              Algumas faturas não puderam ser atualizadas agora.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {cards.map((card, index) => {
              const summary = summaryQueries[index]?.data
              const invoiceValue = getInvoiceValue(summary)
              const projected = Number(summary?.metrics.projected ?? 0)
              const accent = cardColors[card.id] ?? DEFAULT_CARD_COLOR

              return (
                <div
                  key={card.id}
                  className="rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_10px_26px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${accent}18`, color: accent }}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-800">{cardLabel(card)}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-gray-500">
                          Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-extrabold text-gray-900">{formatCurrency(invoiceValue)}</p>
                      <p className="text-[11px] font-medium text-gray-500">fatura atual</p>
                    </div>
                  </div>

                  {projected > invoiceValue && (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-gray-500">
                      Projeção: <span className="font-semibold text-gray-700">{formatCurrency(projected)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <Link
            href="/dashboard/futuros"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary/30 px-4 py-2 text-xs font-semibold text-primary hover:bg-secondary/35"
          >
            Ver faturas futuras
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </>
      )}

      <CreditCardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
