'use client'

import { Fragment, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems, Transition, TransitionChild } from '@headlessui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, ChevronLeft, CreditCard as CreditCardIcon, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

import { useCardMutations } from '@/hooks/query/useCreditCards'
import type { CreditCardDTO, CreditCardResponse, CreditCardUpdateDTO } from '@/services/cards'

export interface CreditCard {
  id: string
  name: string
  last4?: string
  color?: string
  closingDay: number
  dueDay: number
}

export interface CreditCardMetrics {
  openInvoices: number
  futureInstallments: number
}

export type CreditCardManagerView = 'list' | 'form'

export const DEFAULT_CARD_COLOR = '#0EA5E9'
export const CREDIT_CARD_COLORS_STORAGE_KEY = 'flynance:future-credit-card-colors'

const CARD_COLORS = [
  '#0EA5E9',
  '#2563EB',
  '#7C3AED',
  '#E11D48',
  '#F97316',
  '#059669',
  '#111827',
]

const cardFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do cartão'),
  closingDay: z.coerce.number().int().min(1, 'Use um dia entre 1 e 31').max(31, 'Use um dia entre 1 e 31'),
  dueDay: z.coerce.number().int().min(1, 'Use um dia entre 1 e 28').max(28, 'Use um dia entre 1 e 28'),
})

type CreditCardFormValues = z.infer<typeof cardFormSchema>

export function normalizeCreditCardColor(color?: string | null) {
  if (!color) return null
  const normalized = color.trim()
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : null
}

export function readCreditCardColorMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(CREDIT_CARD_COLORS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [id, color]) => {
      const normalized = normalizeCreditCardColor(String(color ?? ''))
      if (normalized) acc[id] = normalized
      return acc
    }, {})
  } catch {
    return {}
  }
}

export function writeCreditCardColorMap(colors: Record<string, string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CREDIT_CARD_COLORS_STORAGE_KEY, JSON.stringify(colors))
}

function toCreditCard(card: CreditCardResponse, color?: string): CreditCard {
  return {
    id: card.id,
    name: card.name,
    last4: card.last4 ?? undefined,
    color: normalizeCreditCardColor(color) ?? undefined,
    closingDay: card.closingDay,
    dueDay: card.dueDay,
  }
}

function getErrorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function getCardDisplayName(card: CreditCard) {
  return `${card.name}${card.last4 ? ` •• ${card.last4}` : ''}`
}

type CreditCardManagerDrawerProps = {
  open: boolean
  view: CreditCardManagerView
  editingCardId: string | null
  cards: CreditCardResponse[]
  cardColors: Record<string, string>
  metricsByCardId: Record<string, CreditCardMetrics>
  onViewChange: (view: CreditCardManagerView) => void
  onEditingCardIdChange: (id: string | null) => void
  onColorSaved: (cardId: string, color: string) => void
  onCardRemoved: (cardId: string) => void
  onClose: () => void
}

export default function CreditCardManagerDrawer({
  open,
  view,
  editingCardId,
  cards,
  cardColors,
  metricsByCardId,
  onViewChange,
  onEditingCardIdChange,
  onColorSaved,
  onCardRemoved,
  onClose,
}: CreditCardManagerDrawerProps) {
  const {
    createCardMutation,
    updateCardMutation,
    deleteCardMutation,
  } = useCardMutations()

  const visibleCards = cards.filter((card) => card.isActive !== false)
  const editingCard = visibleCards.find((card) => card.id === editingCardId) ?? null
  const saving = createCardMutation.isPending || updateCardMutation.isPending
  const mutatingCard = updateCardMutation.isPending || deleteCardMutation.isPending

  const handleNewCard = () => {
    onEditingCardIdChange(null)
    onViewChange('form')
  }

  const handleEditCard = (cardId: string) => {
    onEditingCardIdChange(cardId)
    onViewChange('form')
  }

  const handleBackToList = () => {
    onEditingCardIdChange(null)
    onViewChange('list')
  }

  const handleArchiveCard = async (cardId: string) => {
    try {
      await updateCardMutation.mutateAsync({ id: cardId, data: { isActive: false } })
      onCardRemoved(cardId)
      toast.success('Cartão arquivado')
    } catch (error) {
      toast.error(getErrorText(error, 'Erro ao arquivar cartão'))
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    const confirmed = window.confirm('Excluir este cartão? Esta ação depende das permissões do backend.')
    if (!confirmed) return

    try {
      await deleteCardMutation.mutateAsync(cardId)
      onCardRemoved(cardId)
      toast.success('Cartão excluído')
    } catch (error) {
      toast.error(getErrorText(error, 'Erro ao excluir cartão'))
    }
  }

  return (
    <Transition appear show={open} as={Fragment}>
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
          <div className="fixed inset-0 bg-slate-950/30 backdrop-blur-[1px]" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-stretch justify-end sm:p-4">
          <TransitionChild
            as={Fragment}
            enter="transform duration-200"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform duration-150"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <DialogPanel className="flex h-full w-full flex-col overflow-hidden bg-[#F6F9FC] shadow-2xl sm:max-w-[520px] sm:rounded-[28px]">
              <div className="border-b border-slate-200 bg-white px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle className="text-xl font-extrabold text-slate-950">
                      {view === 'form' ? (editingCard ? 'Editar cartão' : 'Novo cartão') : 'Seus cartões'}
                    </DialogTitle>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Cartões usados no planejamento de faturas futuras.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {view === 'form' ? (
                  <CreditCardForm
                    key={editingCard?.id ?? 'new-card'}
                    card={editingCard}
                    color={editingCard ? cardColors[editingCard.id] : undefined}
                    saving={saving}
                    onBack={handleBackToList}
                    onCreate={(payload) => createCardMutation.mutateAsync(payload)}
                    onUpdate={(id, payload) => updateCardMutation.mutateAsync({ id, data: payload })}
                    onColorSaved={onColorSaved}
                    onSaved={handleBackToList}
                  />
                ) : (
                  <CreditCardList
                    cards={visibleCards.map((card) => toCreditCard(card, cardColors[card.id]))}
                    metricsByCardId={metricsByCardId}
                    loading={false}
                    mutating={mutatingCard}
                    onNewCard={handleNewCard}
                    onEditCard={handleEditCard}
                    onArchiveCard={handleArchiveCard}
                    onDeleteCard={handleDeleteCard}
                  />
                )}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

function CreditCardList({
  cards,
  metricsByCardId,
  loading,
  mutating,
  onNewCard,
  onEditCard,
  onArchiveCard,
  onDeleteCard,
}: {
  cards: CreditCard[]
  metricsByCardId: Record<string, CreditCardMetrics>
  loading: boolean
  mutating: boolean
  onNewCard: () => void
  onEditCard: (cardId: string) => void
  onArchiveCard: (cardId: string) => void
  onDeleteCard: (cardId: string) => void
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-[20px] border border-slate-200 bg-white" />
        ))}
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-primary">
          <CreditCardIcon className="h-8 w-8" />
        </div>
        <h3 className="mt-5 text-base font-extrabold text-slate-950">Você ainda não tem cartões nomeados.</h3>
        <button
          type="button"
          onClick={onNewCard}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,102,163,0.24)] transition-colors hover:bg-secondary"
        >
          <Plus className="h-4 w-4" />
          Nomear primeiro cartão
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-slate-900">{cards.length} cartões ativos</p>
        <button
          type="button"
          onClick={onNewCard}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,102,163,0.18)] transition-colors hover:bg-secondary"
        >
          <Plus className="h-4 w-4" />
          Novo cartão
        </button>
      </div>

      {cards.map((card) => (
        <CreditCardItem
          key={card.id}
          card={card}
          metrics={metricsByCardId[card.id] ?? { openInvoices: 0, futureInstallments: 0 }}
          mutating={mutating}
          onEdit={() => onEditCard(card.id)}
          onArchive={() => onArchiveCard(card.id)}
          onDelete={() => onDeleteCard(card.id)}
        />
      ))}
    </div>
  )
}

function CreditCardItem({
  card,
  metrics,
  mutating,
  onEdit,
  onArchive,
  onDelete,
}: {
  card: CreditCard
  metrics: CreditCardMetrics
  mutating: boolean
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const accent = normalizeCreditCardColor(card.color) ?? DEFAULT_CARD_COLOR

  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            <CreditCardIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <h3 className="truncate text-base font-extrabold text-slate-950">{getCardDisplayName(card)}</h3>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Fecha dia {card.closingDay} • Vence dia {card.dueDay}
            </p>
          </div>
        </div>
        <CreditCardActionsMenu
          disabled={mutating}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-bold text-slate-500">Faturas abertas</p>
          <p className="mt-1 text-xl font-extrabold text-slate-950">{metrics.openInvoices}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-bold text-slate-500">Parcelamentos</p>
          <p className="mt-1 text-xl font-extrabold text-slate-950">{metrics.futureInstallments} ativos</p>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-extrabold text-slate-700 transition-colors hover:border-blue-200 hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </button>
      </div>
    </article>
  )
}

function CreditCardActionsMenu({
  disabled,
  onEdit,
  onArchive,
  onDelete,
}: {
  disabled: boolean
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  return (
    <Menu as="div" className="relative">
      <MenuButton
        disabled={disabled}
        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoreHorizontal className="h-5 w-5" />
      </MenuButton>
      <MenuItems className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-xl outline-none">
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              onClick={onEdit}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium ${focus ? 'bg-slate-50 text-slate-950' : 'text-slate-700'}`}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          )}
        </MenuItem>
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              onClick={onArchive}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium ${focus ? 'bg-slate-50 text-slate-950' : 'text-slate-700'}`}
            >
              <Archive className="h-4 w-4" />
              Arquivar cartão
            </button>
          )}
        </MenuItem>
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              onClick={onDelete}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-medium ${focus ? 'bg-red-50 text-red-700' : 'text-red-600'}`}
            >
              <Trash2 className="h-4 w-4" />
              Excluir cartão
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  )
}

function CreditCardForm({
  card,
  color,
  saving,
  onBack,
  onCreate,
  onUpdate,
  onColorSaved,
  onSaved,
}: {
  card: CreditCardResponse | null
  color?: string
  saving: boolean
  onBack: () => void
  onCreate: (payload: CreditCardDTO) => Promise<CreditCardResponse>
  onUpdate: (id: string, payload: CreditCardUpdateDTO) => Promise<CreditCardResponse>
  onColorSaved: (cardId: string, color: string) => void
  onSaved: () => void
}) {
  const [selectedColor, setSelectedColor] = useState(
    normalizeCreditCardColor(color) ?? DEFAULT_CARD_COLOR
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreditCardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      name: card?.name ?? '',
      closingDay: card?.closingDay ?? 3,
      dueDay: Math.min(card?.dueDay ?? 10, 28),
    },
  })

  const onSubmit = async (data: CreditCardFormValues) => {
    const normalizedColor = normalizeCreditCardColor(selectedColor) ?? DEFAULT_CARD_COLOR

    try {
      if (card) {
        const updated = await onUpdate(card.id, {
          name: data.name.trim(),
          closingDay: data.closingDay,
          dueDay: data.dueDay,
          brand: card.brand,
          limit: card.limit,
          timezone: card.timezone ?? 'America/Sao_Paulo',
        })
        onColorSaved(updated.id, normalizedColor)
        toast.success('Cartão atualizado')
      } else {
        const created = await onCreate({
          name: data.name.trim(),
          brand: 'OTHER',
          limit: 0,
          closingDay: data.closingDay,
          dueDay: data.dueDay,
          timezone: 'America/Sao_Paulo',
        })
        onColorSaved(created.id, normalizedColor)
        toast.success('Cartão criado com sucesso')
      }

      onSaved()
    } catch (error) {
      toast.error(getErrorText(error, card ? 'Erro ao atualizar cartão' : 'Erro ao criar cartão'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition-colors hover:border-blue-200 hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </button>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-4 rounded-[20px] border border-slate-100 bg-slate-50 p-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${selectedColor}18`, color: selectedColor }}
          >
            <CreditCardIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-500">Preview</p>
            <p className="truncate text-lg font-extrabold text-slate-950">
              {card ? getCardDisplayName(toCreditCard(card, selectedColor)) : 'Novo cartão'}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Nome do cartão</span>
            <input
              {...register('name')}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-primary"
              placeholder="Nubank, Itaú, Inter..."
            />
            {errors.name && <p className="mt-1 text-xs font-medium text-red-500">{errors.name.message}</p>}
          </label>

          <CreditCardColorPicker value={selectedColor} onChange={setSelectedColor} />

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Dia de fechamento</span>
              <input
                type="number"
                min={1}
                max={31}
                {...register('closingDay')}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-primary"
              />
              {errors.closingDay && <p className="mt-1 text-xs font-medium text-red-500">{errors.closingDay.message}</p>}
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">Dia de vencimento</span>
              <input
                type="number"
                min={1}
                max={28}
                {...register('dueDay')}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-primary"
              />
              {errors.dueDay && <p className="mt-1 text-xs font-medium text-red-500">{errors.dueDay.message}</p>}
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-full border border-slate-200 px-5 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-full bg-primary px-5 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,102,163,0.20)] transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </section>
    </form>
  )
}

function CreditCardColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <span className="text-xs font-bold text-slate-600">Cor do cartão</span>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {CARD_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Selecionar cor ${color}`}
            onClick={() => onChange(color)}
            className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-105 ${
              value === color ? 'border-slate-950' : 'border-white'
            }`}
            style={{ backgroundColor: color, boxShadow: '0 0 0 1px rgba(148, 163, 184, 0.28)' }}
          />
        ))}
        <label className="relative flex h-9 w-12 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-extrabold text-slate-500">
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Escolher cor personalizada"
          />
          Cor
        </label>
      </div>
    </div>
  )
}
