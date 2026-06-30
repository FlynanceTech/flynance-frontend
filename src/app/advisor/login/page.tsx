'use client'

import React, { Suspense, useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, Loader2, ShieldCheck, BarChart3, Users, TrendingUp } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

import { normalizeAuthEmail, normalizeAuthPhone, syncBillingCheckoutSessionIdentity } from '@/lib/authSession'
import { sendLoginCode, verifyCode } from '@/services/auth'
import { CleaveInput, Input, OtpInput } from '@/components/ui/input'
import { WhatsappIcon } from '@/components/icon/whatsapp'
import { getErrorMessage } from '@/lib/getErrorMessage'
import { useUserSession } from '@/stores/useUserSession'
import { canAccessAdvisorRole, isOrgAdminRole } from '@/utils/roles'

import logo from '../../../../assets/Logo/PNG/Logo Fly branca 1.png'

type LoginMethod = 'whatsapp' | 'email'

const STORAGE_METHOD_KEY = 'flynance_advisor_login_method'
const STORAGE_IDENTIFIER_KEY = 'flynance_advisor_login_identifier'

const FEATURES = [
  { Icon: Users, label: 'Gestão de carteira', desc: 'Acompanhe todos os seus clientes em um painel unificado.' },
  { Icon: BarChart3, label: 'Insights automáticos', desc: 'Alertas e análises gerados em tempo real.' },
  { Icon: TrendingUp, label: 'Relatórios consultivos', desc: 'Dados prontos para suas reuniões de consultoria.' },
  { Icon: ShieldCheck, label: 'Plataforma segura', desc: 'Criptografia ponta a ponta e controle de acessos.' },
]

function AdvisorLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const { fetchAccount, invalidateSession } = useUserSession()

  const [method, setMethod] = useState<LoginMethod>('whatsapp')
  const [identifier, setIdentifier] = useState('')
  const [step, setStep] = useState<'identifier' | 'code'>('identifier')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const rawNext = searchParams.get('next')
  const defaultNext = '/advisor'
  const isAdvisorNextRoute = rawNext === '/advisor' || rawNext?.startsWith('/advisor/')
  const nextRoute =
    rawNext && isAdvisorNextRoute && !rawNext.startsWith('/advisor/login')
      ? rawNext
      : defaultNext

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedMethod = window.sessionStorage.getItem(STORAGE_METHOD_KEY) as LoginMethod | null
    const savedId = window.sessionStorage.getItem(STORAGE_IDENTIFIER_KEY)
    if (savedMethod === 'email' || savedMethod === 'whatsapp') setMethod(savedMethod)
    if (savedId) setIdentifier(savedId)
  }, [])

  useEffect(() => {
    void invalidateSession()
  }, [invalidateSession])

  function handleMethodChange(m: LoginMethod) {
    setMethod(m)
    setIdentifier('')
    setError('')
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_METHOD_KEY, m)
    }
  }

  function handleIdentifierChange(val: string) {
    setIdentifier(val)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_IDENTIFIER_KEY, val)
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier.trim()) {
      setError(method === 'email' ? 'Informe seu e-mail.' : 'Informe seu WhatsApp.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await invalidateSession()
      const body = method === 'email' ? { email: identifier.trim() } : { whatsappPhone: identifier.trim() }
      await sendLoginCode(body)
      setStep('code')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const body = method === 'email' ? { email: identifier.trim(), code } : { whatsappPhone: identifier.trim(), code }
      await verifyCode(body)
      await fetchAccount()

      const { status, user } = useUserSession.getState()
      const sessionUser = user?.userData?.user
      const identifierMatches =
        method === 'email'
          ? normalizeAuthEmail(sessionUser?.email) === normalizeAuthEmail(identifier)
          : normalizeAuthPhone(sessionUser?.phone) === normalizeAuthPhone(identifier)

      if (status !== 'authenticated' || !sessionUser?.id || !identifierMatches) {
        await invalidateSession()
        setError('Falha na validação da sessão. Tente novamente.')
        setLoading(false)
        return
      }

      if (!canAccessAdvisorRole(sessionUser.role)) {
        setError('Esta conta não possui acesso ao Fly Advisory. Use o login padrão.')
        await invalidateSession()
        setLoading(false)
        return
      }

      syncBillingCheckoutSessionIdentity({
        userId: sessionUser.id,
        email: sessionUser.email,
        phone: sessionUser.phone,
      })

      const destination = isOrgAdminRole(sessionUser.role) ? '/advisor/organization/dashboard' : nextRoute

      startTransition(() => {
        router.push(destination)
      })
    } catch (err) {
      setError(getErrorMessage(err) || 'Código inválido ou expirado.')
      setLoading(false)
    }
  }

  async function handleResend() {
    setLoading(true)
    setError('')
    try {
      const body = method === 'email' ? { email: identifier.trim() } : { whatsappPhone: identifier.trim() }
      await sendLoginCode(body)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2">

      {/* ── Left panel: branding ── */}
      <div className="relative hidden lg:flex flex-col justify-center gap-12 px-16 py-12 overflow-hidden bg-gradient-to-br from-secondary to-primary">
        {/* Logo + badge */}
        <div className="relative z-10 flex items-center gap-3">
          <Image src={logo} alt="Flynance" width={120} height={26} className="object-contain" />
          <span className="rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold text-white tracking-wider uppercase">
            Orçamento
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10 max-w-xl">
          <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
            A plataforma profissional<br />
            para <span className="text-white/80">advisors</span>,<br />
            escritórios e consultores<br />
            financeiros.
          </h1>
          <p className="mt-5 text-lg text-white/70 leading-relaxed">
            Centralize clientes. Gere insights automáticos.<br />
            Acompanhe saúde financeira. Transforme dados<br />
            em relacionamento.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {FEATURES.map(({ Icon, label, desc }) => (
              <div key={label} className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-xs text-white/70 leading-5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
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
            <h2 className="text-2xl font-bold text-primary">
              {step === 'identifier' ? 'Acessar o Fly Orçamento' : 'Confirmar acesso'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {step === 'identifier'
                ? 'Entre com WhatsApp ou e-mail para continuar.'
                : `Insira o código enviado via ${method === 'whatsapp' ? 'WhatsApp' : 'e-mail'}.`}
            </p>
          </div>

          <form
            onSubmit={step === 'identifier' ? handleSendCode : handleVerifyCode}
            className="space-y-4"
          >
            {step === 'identifier' ? (
              <>
                {/* Method toggle */}
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => handleMethodChange('whatsapp')}
                    className={[
                      'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                      method === 'whatsapp'
                        ? 'bg-gradient-to-r from-secondary to-primary text-white shadow-sm'
                        : 'text-gray-500 hover:text-primary',
                    ].join(' ')}
                  >
                    <WhatsappIcon
                      className="h-4 w-4"
                      fill={method === 'whatsapp' ? '#fff' : '#6b7280'}
                    />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMethodChange('email')}
                    className={[
                      'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                      method === 'email'
                        ? 'bg-gradient-to-r from-secondary to-primary text-white shadow-sm'
                        : 'text-gray-500 hover:text-primary',
                    ].join(' ')}
                  >
                    <Mail className="h-4 w-4" />
                    E-mail
                  </button>
                </div>

                {/* Input */}
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {method === 'email'
                      ? <Mail className="h-4 w-4" />
                      : <WhatsappIcon className="h-4 w-4" fill="#9ca3af" />}
                  </div>
                  {method === 'email' ? (
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={identifier}
                      onChange={(e) => handleIdentifierChange(e.target.value)}
                      className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <CleaveInput
                      type="tel"
                      name="tel"
                      options={{ delimiters: ['(', ') ', '-'], blocks: [0, 2, 5, 4], numericOnly: true }}
                      placeholder="(11) 99999-9999"
                      value={identifier}
                      onChange={(e) => handleIdentifierChange(e.target.value)}
                      className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-primary text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? 'Enviando código...' : 'Continuar'}
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-5">
                  <OtpInput length={4} onComplete={setCode} />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 4}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-primary text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? 'Verificando...' : 'Acessar o Fly Orçamento'}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => { setStep('identifier'); setCode(''); setError('') }}
                    className="h-10 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary transition disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResend}
                    className="h-10 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary transition disabled:opacity-50"
                  >
                    Reenviar código
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/advisor/cadastro"
              className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
            >
              Não tem conta? Cadastre-se grátis
            </Link>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <Link href="/login" className="hover:text-primary transition-colors">
                Acesso ao app
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

function AdvisorLoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </main>
  )
}

export default function AdvisorLoginPage() {
  return (
    <Suspense fallback={<AdvisorLoginFallback />}>
      <AdvisorLoginContent />
    </Suspense>
  )
}
