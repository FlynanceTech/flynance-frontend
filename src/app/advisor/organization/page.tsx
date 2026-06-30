'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  Building2,
  Check,
  ClipboardList,
  Copy,
  Eye,
  Gift,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  UsersRound,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'

import toast from 'react-hot-toast'
import AdvisorGuard from '../components/AdvisorGuard'
import AdvisorActingPill from '../../dashboard/components/AdvisorActingPill'
import { useUserSession } from '@/stores/useUserSession'
import {
  delegateInviteToAdvisor,
  DelegatedInviteResult,
  getOrgAdvisors,
  inviteOrgAdvisor,
  OrgAdvisor,
  removeOrgAdvisor,
} from '@/services/advisor'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type AdvisorStatus = 'active' | 'pending' | 'inactive' | 'blocked'

type MockAdvisor = Omit<OrgAdvisor, 'status'> & { status: AdvisorStatus }

function fromOrgAdvisor(a: OrgAdvisor): MockAdvisor {
  return { ...a, status: a.status as AdvisorStatus }
}


const STATUS_LABELS: Record<AdvisorStatus, string> = {
  active: 'Ativo',
  pending: 'Pendente',
  inactive: 'Inativo',
  blocked: 'Bloqueado',
}

const STATUS_BADGE: Record<AdvisorStatus, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  inactive: 'border-slate-200 bg-slate-100 text-slate-600',
  blocked: 'border-red-200 bg-red-50 text-red-700',
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AD'
}

function daysAgo(dateStr: string) {
  if (!dateStr) return 'Nunca'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'há 1 dia'
  return `há ${days} dias`
}

export default function AdvisorOrganizationPage() {
  const router = useRouter()
  const session = useUserSession((s) => s.user)
  const [advisors, setAdvisors] = useState<MockAdvisor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AdvisorStatus | 'ALL'>('ALL')
  const [addOpen, setAddOpen] = useState(false)
  const [actionAdvisor, setActionAdvisor] = useState<MockAdvisor | null>(null)
  const [delegateAdvisor, setDelegateAdvisor] = useState<MockAdvisor | null>(null)

  const orgName = session?.userData?.user?.name?.split(' ')?.[0] || 'Organização'

  async function fetchAdvisors() {
    try {
      const data = await getOrgAdvisors()
      setAdvisors(data.map(fromOrgAdvisor))
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar advisors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchAdvisors() }, [])

  function handleViewCarteira(advisor: MockAdvisor) {
    if (!advisor.userId) {
      toast('Este advisor ainda não aceitou o convite.', { icon: '⚠️' })
      return
    }
    setActionAdvisor(null)
    const params = new URLSearchParams({ name: advisor.name, email: advisor.email })
    router.push(`/advisor/organization/advisors/${advisor.userId}?${params.toString()}`)
  }

  function handleTransferClients(_advisor: MockAdvisor) {
    toast('Transferência de clientes em breve.', { icon: '⚙️' })
  }

  function handleDelegateInvite(advisor: MockAdvisor) {
    if (!advisor.userId) {
      toast('Este advisor ainda não aceitou o convite da organização.', { icon: '⚠️' })
      return
    }
    setActionAdvisor(null)
    setDelegateAdvisor(advisor)
  }

  function handleResetAccess(advisor: MockAdvisor) {
    setActionAdvisor(null)
    toast.success(`Link de acesso reenviado para ${advisor.email}.`)
  }

  function handleToggleBlock(advisor: MockAdvisor) {
    const newStatus: AdvisorStatus = advisor.status === 'blocked' ? 'active' : 'blocked'
    setAdvisors((prev) => prev.map((a) => a.id === advisor.id ? { ...a, status: newStatus } : a))
    setActionAdvisor(null)
    toast.success(newStatus === 'blocked' ? `${advisor.name} bloqueado.` : `${advisor.name} ativado.`)
  }

  async function handleRemoveAdvisor(advisor: MockAdvisor) {
    try {
      await removeOrgAdvisor(advisor.id)
      setAdvisors((prev) => prev.filter((a) => a.id !== advisor.id))
      setActionAdvisor(null)
      toast.success(`${advisor.name} removido da organização.`)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover advisor.')
    }
  }

  const filtered = advisors.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalActiveClients = advisors.reduce((s, a) => s + a.activeClients, 0)
  const totalCritical = advisors.reduce((s, a) => s + a.criticalClients, 0)
  const totalInactive = advisors.reduce((s, a) => s + a.inactiveClients, 0)
  const totalPendingInvites = advisors.reduce((s, a) => s + a.pendingInvites, 0)
  const activeAdvisors = advisors.filter((a) => a.status === 'active').length

  const kpis = [
    { label: 'Advisors ativos', value: activeAdvisors, detail: `${advisors.length} no total`, Icon: UserCheck },
    { label: 'Clientes totais', value: totalActiveClients, detail: `${totalActiveClients} vinculados`, Icon: UsersRound },
    { label: 'Clientes críticos', value: totalCritical, detail: `${totalInactive} sem movimentação`, Icon: ShieldAlert },
    { label: 'Convites pendentes', value: totalPendingInvites, detail: 'aguardando aceite', Icon: ClipboardList },
  ]

  return (
    <AdvisorGuard>
      <main className="w-full overflow-y-auto px-4 pb-28 pt-6 md:px-6 lg:pb-6 lg:pt-0">
        <AdvisorActingPill />
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">

          {/* Header */}
          <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7FB] text-[#2F6E91]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-[#2F6E91]">Fly Advisory — Organização</p>
                  <h1 className="text-xl font-semibold text-[#253140]">Painel de {orgName}</h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-[#3f86b0]"
                >
                  <Plus className="h-4 w-4" />
                  Novo Advisor
                </button>
              </div>
            </div>
          </header>

          {/* KPIs */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map(({ label, value, detail, Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#253140]">{value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7FB] text-[#2F6E91]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">{detail}</p>
              </div>
            ))}
          </section>

          {/* Advisors table */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#253140]">Gestão de Advisors</h2>
                <p className="mt-0.5 text-sm text-slate-600">Monitore, ative e gerencie os advisors da organização.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['ALL', 'active', 'pending', 'inactive', 'blocked'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={[
                      'h-8 rounded-lg border px-3 text-xs font-semibold transition',
                      statusFilter === s
                        ? 'border-[#4F98C2] bg-[#EAF4FA] text-[#2F6E91]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="relative block max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar advisor por nome ou e-mail"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-[#7CB8D8] focus:bg-white"
                />
              </label>
            </div>

            {loading ? (
              <div className="mt-8 flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="mt-4 space-y-3 md:hidden">
                  {filtered.map((advisor) => (
                    <AdvisorCard
                      key={advisor.id}
                      advisor={advisor}
                      onView={() => setActionAdvisor(advisor)}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">Nenhum advisor encontrado.</p>
                  )}
                </div>

                {/* Desktop table */}
                <div className="mt-4 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="pb-3 font-semibold">Advisor</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Clientes</th>
                        <th className="pb-3 font-semibold">Críticos</th>
                        <th className="pb-3 font-semibold">Convites</th>
                        <th className="pb-3 font-semibold">Último acesso</th>
                        <th className="pb-3 text-right font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((advisor) => (
                        <tr key={advisor.id} className="border-b border-slate-100 align-middle hover:bg-slate-50/50">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#253140] text-xs font-semibold text-white">
                                {initials(advisor.name)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-[#253140]">{advisor.name}</p>
                                <p className="text-xs text-slate-500">{advisor.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={['rounded-full border px-2.5 py-1 text-[11px] font-semibold', STATUS_BADGE[advisor.status]].join(' ')}>
                              {STATUS_LABELS[advisor.status]}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-[#253140]">{advisor.activeClients}</td>
                          <td className="py-3">
                            <span className={advisor.criticalClients > 0 ? 'font-semibold text-red-600' : 'text-slate-500'}>
                              {advisor.criticalClients}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600">{advisor.pendingInvites}</td>
                          <td className="py-3 text-slate-500">{daysAgo(advisor.lastAccess ?? '')}</td>
                          <td className="py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setActionAdvisor(advisor)}
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                title="Ver advisor"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionAdvisor(advisor)}
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                title="Mais opções"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                            Nenhum advisor encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* Add Advisor Dialog */}
      <AddAdvisorDialog open={addOpen} onClose={() => setAddOpen(false)} onAdded={fetchAdvisors} />

      {/* Advisor Detail Dialog */}
      <AdvisorDetailDialog
        advisor={actionAdvisor}
        onClose={() => setActionAdvisor(null)}
        onViewCarteira={handleViewCarteira}
        onDelegateInvite={handleDelegateInvite}
        onTransferClients={handleTransferClients}
        onResetAccess={handleResetAccess}
        onToggleBlock={handleToggleBlock}
        onRemove={handleRemoveAdvisor}
      />

      {/* Delegate Invite Dialog */}
      <DelegateInviteDialog
        advisor={delegateAdvisor}
        onClose={() => setDelegateAdvisor(null)}
      />

      <Toaster />
    </AdvisorGuard>
  )
}

function AdvisorCard({ advisor, onView }: { advisor: MockAdvisor; onView: () => void }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#253140] text-xs font-semibold text-white">
            {initials(advisor.name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#253140]">{advisor.name}</p>
            <p className="text-xs text-slate-500">{advisor.email}</p>
          </div>
        </div>
        <span className={['rounded-full border px-2 py-0.5 text-[11px] font-semibold', STATUS_BADGE[advisor.status]].join(' ')}>
          {STATUS_LABELS[advisor.status]}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-base font-semibold text-[#253140]">{advisor.activeClients}</p>
          <p className="text-[10px] text-slate-500">Clientes</p>
        </div>
        <div>
          <p className={['text-base font-semibold', advisor.criticalClients > 0 ? 'text-red-600' : 'text-[#253140]'].join(' ')}>
            {advisor.criticalClients}
          </p>
          <p className="text-[10px] text-slate-500">Críticos</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Eye className="h-3.5 w-3.5" />
          Visualizar Advisor
        </button>
      </div>
    </article>
  )
}

function AdvisorDetailDialog({
  advisor,
  onClose,
  onViewCarteira,
  onDelegateInvite,
  onTransferClients,
  onResetAccess,
  onToggleBlock,
  onRemove,
}: {
  advisor: MockAdvisor | null
  onClose: () => void
  onViewCarteira: (a: MockAdvisor) => void
  onDelegateInvite: (a: MockAdvisor) => void
  onTransferClients: (a: MockAdvisor) => void
  onResetAccess: (a: MockAdvisor) => void
  onToggleBlock: (a: MockAdvisor) => void
  onRemove: (a: MockAdvisor) => void
}) {
  if (!advisor) return null

  const isBlocked = advisor.status === 'blocked'

  const ACTIONS: { label: string; Icon: any; variant: 'primary' | 'outline' | 'danger'; onClick: () => void }[] = [
    { label: 'Visualizar Carteira', Icon: Eye, variant: 'primary', onClick: () => onViewCarteira(advisor) },
    { label: 'Delegar Assinatura', Icon: Gift, variant: 'outline', onClick: () => onDelegateInvite(advisor) },
    { label: 'Transferir Clientes', Icon: ArrowUpRight, variant: 'outline', onClick: () => onTransferClients(advisor) },
    { label: 'Redefinir Acesso', Icon: UserCheck, variant: 'outline', onClick: () => onResetAccess(advisor) },
    { label: isBlocked ? 'Ativar Advisor' : 'Bloquear Advisor', Icon: isBlocked ? UserCheck : UserX, variant: 'danger', onClick: () => onToggleBlock(advisor) },
    { label: 'Remover Advisor', Icon: UserMinus, variant: 'danger', onClick: () => onRemove(advisor) },
  ]

  return (
    <Dialog open={Boolean(advisor)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-slate-200 bg-white sm:max-w-lg sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#253140]">Advisor: {advisor.name}</DialogTitle>
          <DialogDescription>{advisor.email} · Último acesso: {daysAgo(advisor.lastAccess ?? '')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Clientes ativos', value: advisor.activeClients },
            { label: 'Clientes críticos', value: advisor.criticalClients },
            { label: 'Sem movimentação', value: advisor.inactiveClients },
            { label: 'Convites pendentes', value: advisor.pendingInvites },
            { label: 'Status', value: STATUS_LABELS[advisor.status] },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-semibold text-[#253140]">{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {ACTIONS.map(({ label, Icon, variant, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={[
                'flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                variant === 'primary'
                  ? 'border-transparent bg-primary text-primary-foreground hover:bg-[#3f86b0]'
                  : variant === 'danger'
                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const PLANS = [
  { label: 'Essencial Mensal', value: 'essencial-mensal' },
  { label: 'Essencial Anual', value: 'essencial-anual' },
  { label: 'Plus Mensal', value: 'plus-mensal' },
  { label: 'Plus Anual', value: 'plus-anual' },
]

function DelegateInviteDialog({
  advisor,
  onClose,
}: {
  advisor: MockAdvisor | null
  onClose: () => void
}) {
  const [clientName, setClientName] = useState('')
  const [clientName2, setClientName2] = useState('')
  const [accountType, setAccountType] = useState<'INDIVIDUAL' | 'COUPLE'>('INDIVIDUAL')
  const [planSlug, setPlanSlug] = useState(PLANS[0]?.value ?? '')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DelegatedInviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  function reset() {
    setClientName('')
    setClientName2('')
    setAccountType('INDIVIDUAL')
    setPlanSlug(PLANS[0]?.value ?? '')
    setExpiresInDays(7)
    setResult(null)
    setCopied(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!advisor?.userId) return
    if (!clientName.trim()) {
      toast.error('Informe o nome do cliente.')
      return
    }
    if (accountType === 'COUPLE' && !clientName2.trim()) {
      toast.error('Informe o nome da segunda pessoa.')
      return
    }

    setLoading(true)
    try {
      const res = await delegateInviteToAdvisor(advisor.userId, {
        clientName: clientName.trim(),
        clientName2: accountType === 'COUPLE' ? clientName2.trim() : undefined,
        accountType,
        planSlug: planSlug || undefined,
        expiresInDays,
      })
      setResult(res)
      toast.success('Assinatura delegada com sucesso!')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao delegar assinatura.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result?.inviteUrl) return
    await navigator.clipboard.writeText(result.inviteUrl).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={Boolean(advisor)} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="border-slate-200 bg-white sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#253140]">Delegar Assinatura</DialogTitle>
          <DialogDescription>
            Crie um convite de assinatura para o advisor <strong>{advisor?.name}</strong> enviar ao cliente.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">Convite gerado com sucesso!</p>
              <p className="mt-1 text-xs text-emerald-700">
                O advisor <strong>{advisor?.name}</strong> verá este convite em seu painel e poderá
                compartilhá-lo com o cliente.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-slate-500">Link do convite</p>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="min-w-0 flex-1 break-all text-xs text-slate-700">{result.inviteUrl}</p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold uppercase text-slate-500">Cliente</p>
                <p className="mt-0.5 font-medium text-slate-700">
                  {result.clientName}{result.clientName2 ? ` & ${result.clientName2}` : ''}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="font-semibold uppercase text-slate-500">Plano</p>
                <p className="mt-0.5 font-medium text-slate-700">{result.planSlug ?? '—'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                className="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Novo convite
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="h-9 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0]"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Tipo de conta</span>
              <div className="flex gap-2">
                {(['INDIVIDUAL', 'COUPLE'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={[
                      'flex-1 h-9 rounded-xl border text-xs font-semibold transition',
                      accountType === type
                        ? 'border-[#4F98C2] bg-[#EAF4FA] text-[#2F6E91]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {type === 'INDIVIDUAL' ? 'Individual' : 'Casal'}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">
                Nome do cliente {accountType === 'COUPLE' ? '(pessoa 1)' : ''}
              </span>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                placeholder="Ex: João Silva"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              />
            </label>

            {accountType === 'COUPLE' && (
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Nome da pessoa 2</span>
                <input
                  value={clientName2}
                  onChange={(e) => setClientName2(e.target.value)}
                  required
                  placeholder="Ex: Maria Silva"
                  className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                />
              </label>
            )}

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Plano</span>
              <select
                value={planSlug}
                onChange={(e) => setPlanSlug(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              >
                {PLANS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Validade do convite</span>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              >
                <option value={3}>3 dias</option>
                <option value={7}>7 dias</option>
                <option value={14}>14 dias</option>
                <option value={30}>30 dias</option>
              </select>
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
              O link será gerado para o advisor <strong>{advisor?.name}</strong> compartilhar com o cliente. A cobrança fica por conta da organização.
            </div>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                {loading ? 'Gerando...' : 'Gerar convite'}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddAdvisorDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded?: () => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [funcao, setFuncao] = useState('ADVISOR')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Informe o e-mail do advisor.')
      return
    }
    setLoading(true)
    try {
      await inviteOrgAdvisor({ email: email.trim(), expiresInDays: 7 })
      toast.success(`Convite enviado para ${email}.`)
      setNome('')
      setEmail('')
      setFuncao('ADVISOR')
      onClose()
      onAdded?.()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar convite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-slate-200 bg-white sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#253140]">Novo advisor</DialogTitle>
          <DialogDescription>
            Preencha os dados e o convite de acesso será enviado por e-mail.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Nome completo</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Ex: Rafael Mendes"
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">E-mail profissional</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="advisor@escritorio.com"
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Função</span>
            <select
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            >
              <option value="ADVISOR">Advisor</option>
              <option value="ORG_ADMIN">Administrador</option>
            </select>
          </label>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? 'Enviando...' : 'Enviar convite'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

