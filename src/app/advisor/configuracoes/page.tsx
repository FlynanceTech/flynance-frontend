'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BadgeCheck,
  Building2,
  DoorOpen,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Save,
  Shield,
  User,
  UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'

import AdvisorGuard from '../components/AdvisorGuard'
import { useUserSession } from '@/stores/useUserSession'
import { useAdvisorClients } from '@/hooks/query/useAdvisor'
import { useUsers } from '@/hooks/query/useUsers'
import { isOrgAdminRole, isAdvisorRole } from '@/utils/roles'
import { leaveOrg } from '@/services/advisor'

function roleLabel(role: string): string {
  if (role === 'ORG_ADMIN') return 'Administrador da Organização'
  if (role === 'MASTER') return 'Master'
  if (role === 'CONSULTANT_MANAGER') return 'Gerente de Consultores'
  if (role === 'ADVISOR') return 'Advisor Independente'
  return role
}

function roleColor(role: string) {
  if (isOrgAdminRole(role)) return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' }
  if (isAdvisorRole(role)) return { bg: 'bg-[#EAF4FA]', text: 'text-[#2F6E91]', border: 'border-[#BFE0F5]' }
  return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }
}

function formatPhone(value: string): string {
  const n = value.replace(/\D/g, '')
  if (n.length <= 11) {
    return n.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
  }
  return value
}

export default function AdvisorConfiguracoesPage() {
  return (
    <AdvisorGuard>
      <AdvisorConfiguracoesInner />
    </AdvisorGuard>
  )
}

function AdvisorConfiguracoesInner() {
  const router = useRouter()
  const { user, setUser, logout } = useUserSession()
  const { updateMutation } = useUsers()
  const { data: clientsData } = useAdvisorClients()

  const userData = user?.userData?.user
  const role = userData?.role ?? ''
  const roleStyle = roleColor(role)

  const [form, setForm] = useState({
    name: userData?.name ?? '',
    email: userData?.email ?? '',
    phone: userData?.phone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [leavingOrg, setLeavingOrg] = useState(false)

  const activeClients = clientsData?.clients?.length ?? 0

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!userData?.id) return
    try {
      setSaving(true)
      await updateMutation.mutateAsync({
        id: userData.id,
        data: { name: form.name, email: form.email, phone: form.phone },
      })
      setUser({
        ...user!,
        userData: {
          ...user!.userData,
          user: { ...user!.userData.user, name: form.name, email: form.email, phone: form.phone },
        },
      })
      toast.success('Perfil atualizado com sucesso.')
    } catch {
      toast.error('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true)
      await logout()
      router.push('/advisor/login')
    } finally {
      setLoggingOut(false)
    }
  }

  async function handleLeaveOrg() {
    if (!confirm('Tem certeza que deseja sair da organização? Você voltará a ser um advisor independente.')) return
    try {
      setLeavingOrg(true)
      await leaveOrg()
      setUser({
        ...user!,
        userData: {
          ...user!.userData,
          user: { ...user!.userData.user, role: 'ADVISOR' },
        },
      })
      toast.success('Você saiu da organização com sucesso.')
      router.push('/advisor')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao sair da organização.')
    } finally {
      setLeavingOrg(false)
    }
  }

  return (
    <section className="w-full px-4 pb-28 pt-6 md:px-6 lg:px-8 lg:pt-8 lg:pb-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 lg:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">Gerencie seu perfil e preferências da conta Advisor.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — profile form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF4FA]">
                <User className="h-5 w-5 text-[#2F6E91]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Dados do perfil</h2>
                <p className="text-xs text-slate-500">Nome, e-mail e telefone de contato</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="adv-name" className="text-sm font-medium text-slate-700">
                  Nome completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="adv-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#4F98C2] focus:bg-white focus:ring-2 focus:ring-[#4F98C2]/20"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="adv-email" className="text-sm font-medium text-slate-700">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="adv-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#4F98C2] focus:bg-white focus:ring-2 focus:ring-[#4F98C2]/20"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="adv-phone" className="text-sm font-medium text-slate-700">
                  WhatsApp / Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="adv-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#4F98C2] focus:bg-white focus:ring-2 focus:ring-[#4F98C2]/20"
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6E91] py-2.5 text-sm font-semibold text-white transition hover:bg-[#245873] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </form>
          </div>
        </div>

        {/* Right column — info cards */}
        <div className="space-y-6">
          {/* Role card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF4FA]">
                <Shield className="h-5 w-5 text-[#2F6E91]" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Acesso e função</h2>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500 uppercase tracking-wider">Função</p>
                <span
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                    roleStyle.bg,
                    roleStyle.text,
                    roleStyle.border,
                  ].join(' ')}
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {roleLabel(role)}
                </span>
              </div>

              {isOrgAdminRole(role) && (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    <Building2 className="h-3.5 w-3.5" />
                    Organização
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF4FA]">
                <UsersRound className="h-5 w-5 text-[#2F6E91]" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Carteira</h2>
            </div>

            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-800">{activeClients}</span>
              <span className="mb-1 text-sm text-slate-500">clientes vinculados</span>
            </div>
          </div>

          {/* Leave org card — only for advisors linked to an org */}
          {isAdvisorRole(role) && !isOrgAdminRole(role) && (
            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
                  <DoorOpen className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Sair da organização</h2>
                  <p className="text-xs text-slate-500">Você voltará a ser um advisor independente</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLeaveOrg}
                disabled={leavingOrg}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {leavingOrg ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DoorOpen className="h-4 w-4" />
                )}
                {leavingOrg ? 'Saindo…' : 'Sair da organização'}
              </button>
            </div>
          )}

          {/* Logout card */}
          <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                <LogOut className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Encerrar sessão</h2>
                <p className="text-xs text-slate-500">Você será redirecionado para o login</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {loggingOut ? 'Saindo…' : 'Sair da conta'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
