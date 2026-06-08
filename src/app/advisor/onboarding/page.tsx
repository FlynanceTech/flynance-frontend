'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, Check, ChevronLeft, Loader2, User } from 'lucide-react'

import logo from '../../../../assets/Logo/PNG/Logo Fly branca 1.png'

type ProfileType = 'independent' | 'office' | null
type TeamSize = 'solo' | 'small' | 'medium' | 'large' | null
type ClientRange = 'under10' | '10to30' | '30to100' | 'over100' | null

type OnboardingState = {
  profileType: ProfileType
  officeName: string
  clientRange: ClientRange
  teamSize: TeamSize
  goal: string
}

const GOALS = [
  'Acompanhar saúde financeira dos clientes',
  'Automatizar relatórios e insights',
  'Gerenciar equipe de consultores',
  'Gerar mais clientes via convites',
  'Controlar pagamentos e assinaturas',
]

export default function AdvisorOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<OnboardingState>({
    profileType: null,
    officeName: '',
    clientRange: null,
    teamSize: null,
    goal: '',
  })

  const totalSteps = 4

  function update<K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function canAdvance() {
    if (step === 1) return state.profileType !== null
    if (step === 2) {
      if (state.profileType === 'office' && !state.officeName.trim()) return false
      return state.clientRange !== null
    }
    if (step === 3) return state.teamSize !== null
    if (step === 4) return state.goal !== ''
    return false
  }

  async function handleFinish() {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    const dest = state.profileType === 'office' ? '/advisor/organization' : '/advisor'
    router.push(dest)
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#060E1C]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Image src={logo} alt="Flynance" width={90} height={20} className="object-contain" />
          <span className="rounded-full border border-[#F0C040]/40 bg-[#F0C040]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F0C040]">
            Advisory
          </span>
        </div>
        <span className="text-xs text-slate-600">Passo {step} de {totalSteps}</span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/8">
        <div
          className="h-full bg-[#F0C040] transition-all duration-500"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          {step === 1 && (
            <StepWrapper
              title="Qual é o seu perfil?"
              subtitle="Isso nos ajuda a configurar a experiência ideal para você."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <OptionCard
                  selected={state.profileType === 'independent'}
                  onSelect={() => update('profileType', 'independent')}
                  Icon={User}
                  title="Advisor independente"
                  desc="Trabalho sozinho e gerencie minha própria carteira de clientes."
                />
                <OptionCard
                  selected={state.profileType === 'office'}
                  onSelect={() => update('profileType', 'office')}
                  Icon={Building2}
                  title="Escritório / Corporação"
                  desc="Tenho ou faço parte de uma equipe com múltiplos advisors."
                />
              </div>
            </StepWrapper>
          )}

          {step === 2 && (
            <StepWrapper
              title={state.profileType === 'office' ? 'Sobre o escritório' : 'Sobre sua carteira'}
              subtitle="Nos conte mais para personalizar seus relatórios e KPIs."
            >
              {state.profileType === 'office' && (
                <label className="mb-5 block">
                  <span className="text-sm font-medium text-slate-300">Nome do escritório</span>
                  <input
                    value={state.officeName}
                    onChange={(e) => update('officeName', e.target.value)}
                    placeholder="Ex: Capital Wealth Advisory"
                    className="mt-2 h-11 w-full rounded-xl border border-white/12 bg-white/6 px-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#F0C040]/50"
                  />
                </label>
              )}
              <p className="mb-3 text-sm font-medium text-slate-300">Quantos clientes você possui atualmente?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { id: 'under10', label: 'Menos de 10' },
                  { id: '10to30', label: '10 a 30 clientes' },
                  { id: '30to100', label: '30 a 100 clientes' },
                  { id: 'over100', label: 'Mais de 100' },
                ] as const).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update('clientRange', id)}
                    className={[
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition',
                      state.clientRange === id
                        ? 'border-[#F0C040] bg-[#F0C040]/10 text-[#F0C040]'
                        : 'border-white/12 text-slate-400 hover:border-white/24 hover:text-white',
                    ].join(' ')}
                  >
                    {state.clientRange === id && <Check className="h-4 w-4 flex-shrink-0" />}
                    {label}
                  </button>
                ))}
              </div>
            </StepWrapper>
          )}

          {step === 3 && (
            <StepWrapper
              title="Como você trabalha?"
              subtitle="Ajuste a visibilidade da plataforma para sua realidade."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { id: 'solo', label: 'Trabalho sozinho', desc: 'Sou o único advisor.' },
                  { id: 'small', label: 'Pequena equipe', desc: '2 a 5 advisors.' },
                  { id: 'medium', label: 'Equipe média', desc: '6 a 20 advisors.' },
                  { id: 'large', label: 'Grande escritório', desc: 'Mais de 20 advisors.' },
                ] as const).map(({ id, label, desc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update('teamSize', id)}
                    className={[
                      'flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition',
                      state.teamSize === id
                        ? 'border-[#F0C040] bg-[#F0C040]/10'
                        : 'border-white/12 hover:border-white/24',
                    ].join(' ')}
                  >
                    <span className={['text-sm font-semibold', state.teamSize === id ? 'text-[#F0C040]' : 'text-white'].join(' ')}>
                      {label}
                    </span>
                    <span className="text-xs text-slate-500">{desc}</span>
                  </button>
                ))}
              </div>
            </StepWrapper>
          )}

          {step === 4 && (
            <StepWrapper
              title="Qual é o seu objetivo principal?"
              subtitle="Vamos priorizar os recursos mais úteis para você."
            >
              <div className="space-y-2">
                {GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => update('goal', goal)}
                    className={[
                      'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition',
                      state.goal === goal
                        ? 'border-[#F0C040] bg-[#F0C040]/10 text-[#F0C040]'
                        : 'border-white/12 text-slate-400 hover:border-white/24 hover:text-white',
                    ].join(' ')}
                  >
                    {state.goal === goal && <Check className="h-4 w-4 flex-shrink-0" />}
                    {goal}
                  </button>
                ))}
              </div>
            </StepWrapper>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                type="button"
                disabled={!canAdvance()}
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F0C040] px-6 text-sm font-bold text-[#060E1C] transition hover:bg-[#E8B830] disabled:opacity-40"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canAdvance() || loading}
                onClick={handleFinish}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F0C040] px-6 text-sm font-bold text-[#060E1C] transition hover:bg-[#E8B830] disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {loading ? 'Configurando...' : 'Entrar no Advisory'}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function StepWrapper({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  )
}

function OptionCard({
  selected,
  onSelect,
  Icon,
  title,
  desc,
}: {
  selected: boolean
  onSelect: () => void
  Icon: typeof User
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition',
        selected
          ? 'border-[#F0C040] bg-[#F0C040]/10'
          : 'border-white/12 hover:border-white/24',
      ].join(' ')}
    >
      <div className={['flex h-10 w-10 items-center justify-center rounded-xl', selected ? 'bg-[#F0C040]/20' : 'bg-white/8'].join(' ')}>
        <Icon className={['h-5 w-5', selected ? 'text-[#F0C040]' : 'text-slate-400'].join(' ')} />
      </div>
      <div>
        <p className={['text-sm font-semibold', selected ? 'text-[#F0C040]' : 'text-white'].join(' ')}>{title}</p>
        <p className="mt-1 text-xs text-slate-500 leading-5">{desc}</p>
      </div>
      {selected && (
        <div className="absolute top-3 right-3">
          <Check className="h-4 w-4 text-[#F0C040]" />
        </div>
      )}
    </button>
  )
}
