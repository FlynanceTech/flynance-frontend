'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  Copy,
  CreditCard,
  Edit3,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react'
import { useLocale } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useAdvisorGeneratedInvites,
  useCancelAdvisorGeneratedInvite,
  useCreateAdvisorGeneratedInvite,
  useCreateAdvisorInvitePackage,
  useDeleteAdvisorGeneratedInvite,
  useUpdateAdvisorGeneratedInviteName,
} from '@/hooks/query/useAdvisor'
import { createBillingSetupIntentMe } from '@/services/billing'
import type {
  AdvisorGeneratedInvite,
  AdvisorInviteAccountType,
  AdvisorInvitePaymentResponsible,
} from '@/services/advisor'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

type InviteOptionId = 'individual' | 'couple' | 'individual-package' | 'couple-package'

type InviteOption = {
  id: InviteOptionId
  title: string
  priceCents: number
  priceSuffix: string
  badge: string
  accountType: AdvisorInviteAccountType
  planSlug: string
  packageOnly: boolean
  minQuantity?: number
  Icon: LucideIcon
  bullets: string[]
}

type PendingNameAction = {
  option: InviteOption
  paymentResponsible: AdvisorInvitePaymentResponsible
}

type PaymentAction =
  | {
      kind: 'SINGLE'
      option: InviteOption
      clientName: string
      clientName2?: string | null
    }
  | {
      kind: 'PACKAGE'
      option: InviteOption
      quantity: number
    }

type GeneratedNotice = {
  message: string
  description?: string
  invite?: AdvisorGeneratedInvite | null
}

type AdvisorInviteGenerationSectionProps = {
  showGenerator?: boolean
  showList?: boolean
  generatorSurface?: 'page' | 'drawer'
  isOrgAdmin?: boolean
}

const INVITE_OPTIONS: InviteOption[] = [
  {
    id: 'individual',
    title: 'Nova Conta Individual',
    priceCents: 1990,
    priceSuffix: '/mês',
    badge: 'Cliente ou Consultor podem pagar',
    accountType: 'INDIVIDUAL',
    planSlug: 'essencial-mensal',
    packageOnly: false,
    Icon: UserRound,
    bullets: ['Convite unitário', 'Validade padrão de 3 dias', 'Uso único'],
  },
  {
    id: 'couple',
    title: 'Nova Conta Casal',
    priceCents: 3290,
    priceSuffix: '/mês',
    badge: 'Cliente ou Consultor podem pagar',
    accountType: 'COUPLE',
    planSlug: 'flynance-casal',
    packageOnly: false,
    Icon: UsersRound,
    bullets: ['Painel conjunto', 'Nome das duas pessoas', 'Uso único'],
  },
  {
    id: 'individual-package',
    title: 'Pacote de Contas Individuais',
    priceCents: 1592,
    priceSuffix: '/conta',
    badge: 'Somente Consultor pode pagar',
    accountType: 'INDIVIDUAL',
    planSlug: 'advisor-individual-package',
    packageOnly: true,
    minQuantity: 10,
    Icon: Package,
    bullets: ['Mínimo de 10 contas', 'Pagamento imediato', 'Links individuais'],
  },
  {
    id: 'couple-package',
    title: 'Pacote de Contas Casal',
    priceCents: 2690,
    priceSuffix: '/conta',
    badge: 'Somente Consultor pode pagar',
    accountType: 'COUPLE',
    planSlug: 'advisor-couple-package',
    packageOnly: true,
    minQuantity: 5,
    Icon: Package,
    bullets: ['Mínimo de 5 contas', 'Pagamento imediato', 'Links individuais'],
  },
]

const statusClasses = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  EXPIRED: 'border-slate-200 bg-slate-100 text-slate-600',
  CANCELLED: 'border-red-200 bg-red-50 text-red-700',
} as const

function formatCurrencyFromCents(cents: number, locale: string) {
  return new Intl.NumberFormat(locale || 'pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(locale || 'pt-BR')
}

function getInviteDisplayName(invite: Pick<AdvisorGeneratedInvite, 'clientName' | 'clientName2' | 'accountType'>) {
  if (invite.accountType === 'COUPLE') {
    return [invite.clientName, invite.clientName2].filter(Boolean).join(' e ') || 'Casal'
  }

  return invite.clientName || 'Cliente'
}

function accountTypeLabel(value: AdvisorInviteAccountType) {
  return value === 'COUPLE' ? 'Casal' : 'Individual'
}

function paymentResponsibleLabel(value: AdvisorInvitePaymentResponsible) {
  if (value === 'ADVISOR') return 'Consultor'
  if (value === 'ORG') return 'Organização'
  return 'Cliente'
}

function resolveInviteStatus(invite: AdvisorGeneratedInvite): AdvisorGeneratedInvite['status'] {
  if (invite.status !== 'PENDING') return invite.status
  if (!invite.expiresAt) return invite.status
  const expiresAt = new Date(invite.expiresAt)
  if (Number.isNaN(expiresAt.getTime())) return invite.status
  return expiresAt.getTime() < Date.now() ? 'EXPIRED' : invite.status
}

function statusLabel(status: AdvisorGeneratedInvite['status']) {
  if (status === 'ACCEPTED') return 'Aceito'
  if (status === 'EXPIRED') return 'Expirado'
  if (status === 'CANCELLED') return 'Cancelado'
  return 'Pendente'
}

export default function AdvisorInviteGenerationSection({
  showGenerator = true,
  showList = true,
  generatorSurface = 'page',
  isOrgAdmin = false,
}: AdvisorInviteGenerationSectionProps) {
  const locale = useLocale()
  const invitesQuery = useAdvisorGeneratedInvites()
  const createInviteMutation = useCreateAdvisorGeneratedInvite()
  const createPackageMutation = useCreateAdvisorInvitePackage()
  const updateNameMutation = useUpdateAdvisorGeneratedInviteName()
  const cancelInviteMutation = useCancelAdvisorGeneratedInvite()
  const deleteInviteMutation = useDeleteAdvisorGeneratedInvite()

  const [quantities, setQuantities] = useState<Record<InviteOptionId, number>>({
    individual: 1,
    couple: 1,
    'individual-package': 10,
    'couple-package': 5,
  })
  const [nameAction, setNameAction] = useState<PendingNameAction | null>(null)
  const [editingInvite, setEditingInvite] = useState<AdvisorGeneratedInvite | null>(null)
  const [name1, setName1] = useState('')
  const [name2, setName2] = useState('')
  const [paymentAction, setPaymentAction] = useState<PaymentAction | null>(null)
  const [notice, setNotice] = useState<GeneratedNotice | null>(null)

  const invites = useMemo(() => invitesQuery.data ?? [], [invitesQuery.data])
  const visibleInvites = useMemo(() => invites.slice(0, 100), [invites])

  function openNameDialog(action: PendingNameAction) {
    setEditingInvite(null)
    setNameAction(action)
    setName1('')
    setName2('')
  }

  function openEditDialog(invite: AdvisorGeneratedInvite) {
    setNameAction(null)
    setEditingInvite(invite)
    setName1(invite.clientName || '')
    setName2(invite.clientName2 || '')
  }

  function updateQuantity(option: InviteOption, nextQuantity: number) {
    const minimum = option.minQuantity ?? 1
    setQuantities((current) => ({
      ...current,
      [option.id]: Math.max(minimum, Math.trunc(nextQuantity || minimum)),
    }))
  }

  async function copyInviteLink(invite: AdvisorGeneratedInvite) {
    if (!invite.inviteUrl) {
      toast.error('Link indisponível para este convite.')
      return
    }

    try {
      await navigator.clipboard.writeText(invite.inviteUrl)
      toast.success('Link copiado.')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  async function handleNameSubmit() {
    const clientName = name1.trim()
    const clientName2 = name2.trim()
    const accountType = editingInvite?.accountType ?? nameAction?.option.accountType

    if (!accountType) return
    if (clientName.length < 2) {
      toast.error('Informe o nome do cliente.')
      return
    }
    if (accountType === 'COUPLE' && clientName2.length < 2) {
      toast.error('Informe o nome da segunda pessoa.')
      return
    }

    if (editingInvite) {
      const invite = await updateNameMutation.mutateAsync({
        inviteId: editingInvite.id,
        payload: {
          clientName,
          clientName2: accountType === 'COUPLE' ? clientName2 : null,
        },
      })
      setNotice({
        message: `Convite atualizado em nome de ${getInviteDisplayName(invite)}.`,
        description: 'O link foi mantido e o status continua pendente.',
        invite,
      })
      setEditingInvite(null)
      return
    }

    if (!nameAction) return

    if (nameAction.paymentResponsible === 'CLIENT') {
      const invite = await createInviteMutation.mutateAsync({
        clientName,
        clientName2: nameAction.option.accountType === 'COUPLE' ? clientName2 : null,
        accountType: nameAction.option.accountType,
        paymentResponsible: 'CLIENT',
        unitPriceCents: nameAction.option.priceCents,
        planSlug: nameAction.option.planSlug,
      })
      setNotice({
        message: `Convite gerado em nome de ${getInviteDisplayName(invite)}.`,
        description: 'O cliente seguirá para o pagamento padrão ao aceitar o convite.',
        invite,
      })
      setNameAction(null)
      return
    }

    setPaymentAction({
      kind: 'SINGLE',
      option: nameAction.option,
      clientName,
      clientName2: nameAction.option.accountType === 'COUPLE' ? clientName2 : null,
    })
    setNameAction(null)
  }

  async function handlePaymentMethod(paymentMethodId: string) {
    if (!paymentAction) return

    if (paymentAction.kind === 'SINGLE') {
      const invite = await createInviteMutation.mutateAsync({
        clientName: paymentAction.clientName,
        clientName2: paymentAction.clientName2,
        accountType: paymentAction.option.accountType,
        paymentResponsible: 'ADVISOR',
        unitPriceCents: paymentAction.option.priceCents,
        planSlug: paymentAction.option.planSlug,
        paymentMethodId,
      })
      setNotice({
        message: `Convite gerado em nome de ${getInviteDisplayName(invite)}.`,
        description: 'O cartão do consultor só deve ser cobrado quando o cliente aceitar e fizer o primeiro acesso.',
        invite,
      })
      setPaymentAction(null)
      return
    }

    const response = await createPackageMutation.mutateAsync({
      accountType: paymentAction.option.accountType,
      quantity: paymentAction.quantity,
      unitPriceCents: paymentAction.option.priceCents,
      paymentMethodId,
      planSlug: paymentAction.option.planSlug,
    })
    setNotice({
      message: `${response.invites.length} convites gerados para o pacote ${accountTypeLabel(paymentAction.option.accountType)}.`,
      description: 'Cada convite tem link próprio, validade de 3 dias e uso único.',
      invite: response.invites[0] ?? null,
    })
    setPaymentAction(null)
  }

  async function handleCancelInvite(invite: AdvisorGeneratedInvite) {
    const confirmed = window.confirm(`Cancelar o convite de ${getInviteDisplayName(invite)}?`)
    if (!confirmed) return
    await cancelInviteMutation.mutateAsync(invite.id)
  }

  async function handleDeleteInvite(invite: AdvisorGeneratedInvite) {
    const confirmed = window.confirm(
      `Excluir permanentemente o convite de ${getInviteDisplayName(invite)}? Esta ação não pode ser desfeita.`
    )
    if (!confirmed) return
    await deleteInviteMutation.mutateAsync(invite.id)
  }

  function handleReactivateInvite(invite: AdvisorGeneratedInvite) {
    const option = INVITE_OPTIONS.find(
      (o) => o.accountType === invite.accountType && !o.packageOnly
    )
    if (!option) {
      toast.error('Tipo de conta não encontrado para reativação.')
      return
    }
    setEditingInvite(null)
    setNameAction({
      option,
      paymentResponsible: invite.paymentResponsible as AdvisorInvitePaymentResponsible,
    })
    setName1(invite.clientName || '')
    setName2(invite.clientName2 || '')
  }

  const nameDialogOpen = Boolean(nameAction || editingInvite)
  const nameDialogAccountType = editingInvite?.accountType ?? nameAction?.option.accountType ?? 'INDIVIDUAL'
  const nameDialogPending =
    createInviteMutation.isPending || updateNameMutation.isPending
  const generatorGridClassName =
    generatorSurface === 'drawer'
      ? 'mt-5 grid gap-4 md:grid-cols-2'
      : 'mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4'

  return (
    <section
      id={showList ? 'advisor-invites' : undefined}
      className="scroll-mt-4 space-y-4"
      data-onboarding-target={showList ? 'advisor-invites' : undefined}
    >
      {showGenerator && (
      <article className={generatorSurface === 'drawer' ? 'rounded-2xl border border-slate-200 bg-white p-4' : 'rounded-2xl border border-slate-200 bg-white p-5'}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#333C4D]">Gerar convites</h2>
            <p className="mt-1 text-sm text-slate-600">
              Escolha o tipo de conta, defina quem paga e gere links de acesso para os clientes.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-[#D7EAF5] bg-[#F3FAFF] text-[#2F6E91]">
            Validade padrão: 3 dias
          </Badge>
        </div>

        <div className={generatorGridClassName}>
          {INVITE_OPTIONS.map((option) => {
            const quantity = quantities[option.id]
            const minimum = option.minQuantity ?? 1
            const total = quantity * option.priceCents
            const Icon = option.Icon

            return (
              <article
                key={option.id}
                className={[
                  'flex flex-col rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFD_100%)] p-4 shadow-sm',
                  generatorSurface === 'drawer' ? 'min-h-[370px]' : 'min-h-[390px]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="max-w-[180px] border-[#D7EAF5] bg-white text-[11px] text-[#2F6E91]">
                    {option.badge}
                  </Badge>
                </div>

                <div className="mt-4">
                  <h3 className="min-h-12 text-base font-semibold leading-6 text-[#333C4D]">
                    {option.title}
                  </h3>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-3xl font-semibold leading-none text-secondary">
                      {formatCurrencyFromCents(option.priceCents, locale)}
                    </span>
                    <span className="pb-0.5 text-sm font-semibold text-slate-500">
                      {option.priceSuffix}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {option.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-start gap-2 text-sm leading-5 text-slate-700">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>

                {option.packageOnly && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Quantidade de contas
                    </label>
                    <div className="mt-2 flex h-10 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(option, quantity - 1)}
                        disabled={quantity <= minimum}
                        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        aria-label="Reduzir quantidade"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min={minimum}
                        value={quantity}
                        onChange={(event) => updateQuantity(option, Number(event.target.value))}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-center text-sm font-semibold outline-none focus:border-[#7CB8D8]"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(option, quantity + 1)}
                        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Mínimo {minimum}. Total: {formatCurrencyFromCents(total, locale)}.
                    </p>
                  </div>
                )}

                <div className="mt-auto space-y-2 pt-4">
                  {option.packageOnly ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAction({
                          kind: 'PACKAGE',
                          option,
                          quantity,
                        })
                      }
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0] disabled:opacity-60"
                    >
                      <CreditCard className="h-4 w-4" />
                      Prosseguir para pagamento
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => openNameDialog({ option, paymentResponsible: 'CLIENT' })}
                        className="h-10 rounded-xl border border-[#4F98C2] bg-white px-3 text-sm font-semibold text-[#2F6E91] hover:bg-[#EAF4FA]"
                      >
                        Cliente paga
                      </button>
                      <button
                        type="button"
                        onClick={() => openNameDialog({ option, paymentResponsible: 'ADVISOR' })}
                        className="h-10 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0]"
                      >
                        Consultor paga
                      </button>
                      {isOrgAdmin && (
                        <button
                          type="button"
                          onClick={() => openNameDialog({ option, paymentResponsible: 'ORG' })}
                          className="h-10 rounded-xl border border-purple-300 bg-purple-50 px-3 text-sm font-semibold text-purple-700 hover:bg-purple-100"
                        >
                          Organização paga
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </article>
      )}

      {notice && (
        <article className="rounded-2xl border border-[#D7EAF5] bg-[#F3FAFF] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#333C4D]">{notice.message}</h2>
              {notice.description && <p className="mt-1 text-sm text-slate-600">{notice.description}</p>}
              </div>
            {notice.invite && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyInviteLink(notice.invite!)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copiar link
                </button>
                <button
                  type="button"
                  onClick={() => openEditDialog(notice.invite!)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Editar nome
                </button>
              </div>
            )}
          </div>
        </article>
      )}

      {showList && (
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#333C4D]">Convites gerados</h2>
            <p className="mt-1 text-sm text-slate-600">
              Acompanhe pendentes, aceitos, expirados e cancelados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => invitesQuery.refetch()}
            className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Atualizar
          </button>
        </div>

        {invitesQuery.isLoading ? (
          <div className="mt-4 h-44 animate-pulse rounded-xl bg-slate-100" />
        ) : invitesQuery.isError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {invitesQuery.error instanceof Error
              ? invitesQuery.error.message
              : 'Erro ao carregar convites.'}
          </div>
        ) : visibleInvites.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Nenhum convite gerado ainda.
          </div>
        ) : (
          <div className="mt-4">
            <div className="space-y-3">
              {visibleInvites.map((invite) => {
                const effectiveStatus = resolveInviteStatus(invite)
                return (
                  <article key={invite.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#333C4D]">
                          {getInviteDisplayName(invite)}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {accountTypeLabel(invite.accountType)} - paga: {paymentResponsibleLabel(invite.paymentResponsible)}
                        </p>
                      </div>
                      <Badge variant="outline" className={statusClasses[effectiveStatus]}>
                        {statusLabel(effectiveStatus)}
                      </Badge>
                    </div>

                    {effectiveStatus === 'ACCEPTED' && invite.acceptedAt && (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700">
                        <p>
                          Aceito por{' '}
                          <strong>
                            {invite.acceptedByUserName ?? getInviteDisplayName(invite)}
                          </strong>
                          {invite.acceptedByUserName &&
                            invite.acceptedByUserName !== invite.clientName && (
                              <span className="ml-1 text-emerald-600">
                                (convidado como {getInviteDisplayName(invite)})
                              </span>
                            )}{' '}
                          em {formatDate(invite.acceptedAt, locale)}.
                        </p>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteInvite(invite)}
                            disabled={deleteInviteMutation.isPending}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-red-200 bg-white px-2 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Excluir registro
                          </button>
                        </div>
                      </div>
                    )}

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-slate-500">Criado em</dt>
                        <dd className="font-medium text-slate-700">{formatDate(invite.createdAt, locale)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Expira em</dt>
                        <dd className="font-medium text-slate-700">{formatDate(invite.expiresAt, locale)}</dd>
                      </div>
                    </dl>

                    {effectiveStatus === 'PENDING' && (
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => copyInviteLink(invite)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditDialog(invite)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelInvite(invite)}
                          disabled={cancelInviteMutation.isPending}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-white px-2 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                      </div>
                    )}

                    {(effectiveStatus === 'CANCELLED' || effectiveStatus === 'EXPIRED') && (
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        {effectiveStatus === 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => handleReactivateInvite(invite)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#4F98C2] bg-white px-2 text-xs text-[#2F6E91] hover:bg-[#EAF4FA]"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Reativar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteInvite(invite)}
                          disabled={deleteInviteMutation.isPending}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-white px-2 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>

          </div>
        )}
      </article>
      )}

      <Dialog
        open={nameDialogOpen}
        onOpenChange={(open) => {
          if (open) return
          setNameAction(null)
          setEditingInvite(null)
        }}
      >
        <DialogContent className="border-slate-200 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#333C4D]">
              {editingInvite ? 'Editar nome do convite' : 'Nome no convite'}
            </DialogTitle>
            <DialogDescription>
              {nameDialogAccountType === 'COUPLE'
                ? 'Informe os nomes das duas pessoas antes de gerar o convite.'
                : 'Informe o nome do cliente antes de gerar ou copiar o link.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">
                {nameDialogAccountType === 'COUPLE' ? 'Nome da pessoa 1' : 'Nome do cliente'}
              </span>
              <input
                value={name1}
                onChange={(event) => setName1(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                placeholder={nameDialogAccountType === 'COUPLE' ? 'Ex: Ana' : 'Ex: Ana Souza'}
              />
            </label>

            {nameDialogAccountType === 'COUPLE' && (
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Nome da pessoa 2</span>
                <input
                  value={name2}
                  onChange={(event) => setName2(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                  placeholder="Ex: Bruno"
                />
              </label>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setNameAction(null)
                setEditingInvite(null)
              }}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={nameDialogPending}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleNameSubmit}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0] disabled:opacity-60"
              disabled={nameDialogPending}
            >
              {nameDialogPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingInvite ? 'Salvar nome' : nameAction?.paymentResponsible === 'ADVISOR' ? 'Continuar' : 'Gerar convite'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AdvisorInvitePaymentDialog
        action={paymentAction}
        onClose={() => setPaymentAction(null)}
        onPaymentMethod={handlePaymentMethod}
        pending={createInviteMutation.isPending || createPackageMutation.isPending}
      />
    </section>
  )
}

function AdvisorInvitePaymentDialog({
  action,
  onClose,
  onPaymentMethod,
  pending,
}: {
  action: PaymentAction | null
  onClose: () => void
  onPaymentMethod: (paymentMethodId: string) => Promise<void>
  pending: boolean
}) {
  const locale = useLocale()
  const open = Boolean(action)
  const amountCents =
    action?.kind === 'PACKAGE'
      ? action.quantity * action.option.priceCents
      : action?.option.priceCents ?? 0
  const title =
    action?.kind === 'PACKAGE'
      ? 'Pagamento do pacote'
      : 'Configurar pagamento do consultor'
  const description =
    action?.kind === 'PACKAGE'
      ? 'A cobrança do pacote será feita imediatamente após a confirmação.'
      : 'O cartão fica configurado agora. A cobrança efetiva deve ocorrer quando o cliente aceitar e fizer o primeiro acesso.'

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="border-slate-200 bg-white sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#333C4D]">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-[#D7EAF5] bg-[#F3FAFF] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[#2F6E91]">Resumo</p>
              <p className="mt-1 text-sm font-semibold text-[#333C4D]">
                {action?.option.title ?? '-'}
              </p>
            </div>
            <p className="text-lg font-semibold text-secondary">
              {formatCurrencyFromCents(amountCents, locale)}
            </p>
          </div>
          {action?.kind === 'PACKAGE' && (
            <p className="mt-2 text-xs text-slate-600">
              {action.quantity} contas x {formatCurrencyFromCents(action.option.priceCents, locale)}.
            </p>
          )}
        </div>

        {!stripePromise ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Configure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY para habilitar o pagamento.
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ locale: 'pt-BR' }}>
            <AdvisorInvitePaymentForm
              onCancel={onClose}
              onPaymentMethod={onPaymentMethod}
              pending={pending}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AdvisorInvitePaymentForm({
  onCancel,
  onPaymentMethod,
  pending,
}: {
  onCancel: () => void
  onPaymentMethod: (paymentMethodId: string) => Promise<void>
  pending: boolean
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardholderName, setCardholderName] = useState('')
  const [cardError, setCardError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!stripe || !elements) {
      toast.error('Stripe ainda não carregou. Tente novamente.')
      return
    }

    const card = elements.getElement(CardElement)
    if (!card) {
      toast.error('Campo de cartão indisponível.')
      return
    }

    setSubmitting(true)
    setCardError(null)

    try {
      const setupIntent = await createBillingSetupIntentMe()
      const confirmation = await stripe.confirmCardSetup(setupIntent.clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: cardholderName.trim() || undefined,
          },
        },
      })

      if (confirmation.error) {
        throw new Error(confirmation.error.message || 'Não foi possível validar o cartão.')
      }

      const paymentMethod = confirmation.setupIntent?.payment_method
      const paymentMethodId = typeof paymentMethod === 'string' ? paymentMethod : paymentMethod?.id
      if (!paymentMethodId) {
        throw new Error('Método de pagamento não retornado.')
      }

      await onPaymentMethod(paymentMethodId)
      card.clear()
      setCardholderName('')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao configurar pagamento.'
      setCardError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const busy = submitting || pending

  return (
    <div className="space-y-4">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700">Nome no cartão</span>
        <input
          value={cardholderName}
          onChange={(event) => setCardholderName(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
          placeholder="Como aparece no cartão"
          disabled={busy}
        />
      </label>

      <div className="rounded-xl border border-slate-200 p-3">
        <CardElement
          onChange={(event) => setCardError(event.error?.message ?? null)}
          options={{
            hidePostalCode: true,
            style: {
              base: {
                fontSize: '16px',
                color: '#1f2937',
                '::placeholder': { color: '#94a3b8' },
              },
              invalid: { color: '#dc2626' },
            },
          }}
        />
      </div>

      {cardError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {cardError}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start gap-3 text-xs leading-5 text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
          <span>
            A Flynance não armazena dados completos do cartão nem CVV. A validação é feita pela Stripe.
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Confirmar pagamento
        </button>
      </div>
    </div>
  )
}

