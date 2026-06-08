'use client'

import React, { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, User, Building2, Mail, Phone, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { persistAuthToken } from '@/lib/authSession'
import { registerAdvisor, registerOrganization } from '@/services/advisor'
import { Input, CleaveInput } from '@/components/ui/input'
import { useUserSession } from '@/stores/useUserSession'

import logo from '../../../../assets/Logo/PNG/Logo Fly branca 1.png'

type SignupType = 'advisor' | 'organization'

function AdvisorForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { fetchAccount } = useUserSession()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Informe seu nome completo.')
    if (!email.trim()) return setError('Informe seu e-mail.')
    if (!phone.trim()) return setError('Informe seu WhatsApp.')
    setLoading(true)
    setError('')
    try {
      const res = await registerAdvisor({ name: name.trim(), email: email.trim(), phone: phone.trim() })
      persistAuthToken(res.token)
      await fetchAccount()
      onSuccess()
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="relative">
        <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="relative">
        <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <CleaveInput
          type="tel"
          name="tel"
          options={{ delimiters: ['(', ') ', '-'], blocks: [0, 2, 5, 4], numericOnly: true }}
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-primary text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
        {loading ? 'Criando conta...' : 'Criar conta'}
      </button>
    </form>
  )
}

function OrganizationForm({ onSuccess }: { onSuccess: () => void }) {
  const [orgName, setOrgName] = useState('')
  const [responsibleName, setResponsibleName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { fetchAccount } = useUserSession()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) return setError('Informe o nome da organização.')
    if (!responsibleName.trim()) return setError('Informe o nome do responsável.')
    if (!email.trim()) return setError('Informe o e-mail.')
    if (!phone.trim()) return setError('Informe o WhatsApp.')
    setLoading(true)
    setError('')
    try {
      const res = await registerOrganization({
        orgName: orgName.trim(),
        responsibleName: responsibleName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      })
      persistAuthToken(res.token)
      await fetchAccount()
      onSuccess()
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Nome da organização / escritório"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="relative">
        <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Nome do responsável"
          value={responsibleName}
          onChange={(e) => setResponsibleName(e.target.value)}
          className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="relative">
        <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="email"
          placeholder="email@organizacao.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="relative">
        <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <CleaveInput
          type="tel"
          name="tel"
          options={{ delimiters: ['(', ') ', '-'], blocks: [0, 2, 5, 4], numericOnly: true }}
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-primary text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
        {loading ? 'Criando conta...' : 'Criar conta'}
      </button>
    </form>
  )
}

export default function AdvisorCadastroPage() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [signupType, setSignupType] = useState<SignupType>('advisor')

  function handleSuccess() {
    const destination = signupType === 'organization' ? '/advisor/organization/dashboard' : '/advisor'
    startTransition(() => {
      router.push(destination)
    })
  }

  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2">

      {/* Left panel: branding */}
      <div className="relative hidden lg:flex flex-col justify-center gap-12 px-16 py-12 overflow-hidden bg-gradient-to-br from-secondary to-primary">
        <div className="relative z-10 flex items-center gap-3">
          <Image src={logo} alt="Flynance" width={120} height={26} className="object-contain" />
          <span className="rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold text-white tracking-wider uppercase">
            Orçamento
          </span>
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
            Comece agora<br />
            a transformar<br />
            <span className="text-white/80">dados em resultados</span><br />
            para seus clientes.
          </h1>
          <p className="mt-5 text-lg text-white/70 leading-relaxed">
            Plataforma gratuita para advisors e escritórios.<br />
            Seus clientes pagam apenas pelo que usam.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { title: 'Advisor independente', desc: 'Gerencie sua carteira de clientes com liberdade.' },
              { title: 'Escritório / organização', desc: 'Centralize consultores e clientes em um painel.' },
              { title: 'Sem mensalidade', desc: 'A plataforma é gratuita para o advisor.' },
              { title: 'Acesso imediato', desc: 'Cadastro aprovado automaticamente. Sem burocracia.' },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs text-white/70 leading-5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: form */}
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-white lg:border-l lg:border-gray-100">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <Image src={logo} alt="Flynance" width={100} height={22} className="object-contain brightness-0" />
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tracking-wider uppercase">
            Orçamento
          </span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-primary">Criar conta</h2>
            <p className="mt-2 text-sm text-gray-500">Acesso gratuito e aprovado na hora.</p>
          </div>

          {/* Type selector */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setSignupType('advisor')}
              className={[
                'flex flex-col items-center gap-1 rounded-lg px-3 py-3 text-xs font-semibold transition',
                signupType === 'advisor'
                  ? 'bg-gradient-to-r from-secondary to-primary text-white shadow-sm'
                  : 'text-gray-500 hover:text-primary',
              ].join(' ')}
            >
              <User className="h-4 w-4" />
              Advisor independente
            </button>
            <button
              type="button"
              onClick={() => setSignupType('organization')}
              className={[
                'flex flex-col items-center gap-1 rounded-lg px-3 py-3 text-xs font-semibold transition',
                signupType === 'organization'
                  ? 'bg-gradient-to-r from-secondary to-primary text-white shadow-sm'
                  : 'text-gray-500 hover:text-primary',
              ].join(' ')}
            >
              <Building2 className="h-4 w-4" />
              Organização
            </button>
          </div>

          {signupType === 'advisor'
            ? <AdvisorForm onSuccess={handleSuccess} />
            : <OrganizationForm onSuccess={handleSuccess} />}

          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <Link href="/advisor/login" className="hover:text-primary transition-colors">
                Já tenho conta — fazer login
              </Link>
              <span className="text-gray-300">·</span>
              <Link href="/" className="hover:text-primary transition-colors">
                Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
