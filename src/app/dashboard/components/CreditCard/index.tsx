'use client'

import * as React from 'react'
import { clsx } from 'clsx'
import { CreditCard as CardIcon } from 'lucide-react'

export type CardBrand = 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'OTHER'

type Props = {
  name: string
  brand: CardBrand
  last4?: string
  limit: number
  spent: number
  closingDay: number
  dueDay: number
  className?: string
}

/** Cores/gradientes por bandeira */
const BRAND_STYLES: Record<CardBrand, { from: string; to: string; ring: string }> = {
  VISA:        { from: 'from-indigo-600',  to: 'to-blue-500',   ring: 'ring-indigo-400/40' },
  MASTERCARD:  { from: 'from-rose-600',    to: 'to-amber-500',  ring: 'ring-rose-400/40' },
  ELO:         { from: 'from-slate-800',   to: 'to-zinc-600',   ring: 'ring-zinc-400/40' },
  AMEX:        { from: 'from-cyan-600',    to: 'to-emerald-500',ring: 'ring-cyan-400/40' },
  HIPERCARD:   { from: 'from-red-700',     to: 'to-rose-600',   ring: 'ring-red-400/40' },
  OTHER:       { from: 'from-slate-700',   to: 'to-slate-500',  ring: 'ring-slate-400/40' },
}

/** Logos minimalistas das bandeiras (SVG inline) */
function BrandLogo({ brand }: { brand: CardBrand }) {
  if (brand === 'VISA') {
    return (
      <span className="font-black tracking-wider text-white/90">
        VI<span className="text-yellow-300">SA</span>
      </span>
    )
  }
  if (brand === 'MASTERCARD') {
    return (
      <div className="flex items-center gap-1">
        <span className="inline-block h-4 w-4 rounded-full bg-red-500 mix-blend-screen" />
        <span className="inline-block h-4 w-4 -ml-2 rounded-full bg-amber-400 mix-blend-screen" />
      </div>
    )
  }
  if (brand === 'AMEX') {
    return <span className="font-black text-white/90">AMEX</span>
  }
  if (brand === 'ELO') {
    return <span className="font-black text-white/90">ELO</span>
  }
  if (brand === 'HIPERCARD') {
    return <span className="font-semibold text-white/90">Hipercard</span>
  }
  return <CardIcon className="h-5 w-5 text-white/80" />
}

/** Chip simplificado */
function Chip() {
  return (
    <div className="h-6 w-8 rounded-md bg-gradient-to-br from-yellow-200 to-amber-300 shadow-inner ring-1 ring-amber-800/30" />
  )
}

/** Formata BRL */
const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

/** Componente principal */
export default function CreditCard({
  name,
  brand,
  last4,
  limit,
  spent,
  closingDay,
  dueDay,
  className,
}: Props) {
  const style = BRAND_STYLES[brand]
  const util = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
  const within = spent <= limit
  const restante = Math.max(0, limit - spent)

  return (
    <div
      className={clsx(
        'relative w-full rounded-3xl p-5 text-white',
        'bg-gradient-to-br', style.from, style.to,
        'shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)]',
        'ring-1 backdrop-blur-md', style.ring,
        className
      )}
    >
      {/* efeito vidro suave */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-white/5" />

      {/* topo */}
      <div className="relative z-[1] flex items-center justify-between">
        <BrandLogo brand={brand} />
        <Chip />
      </div>

      {/* número / nome */}
      <div className="relative z-[1] mt-6 space-y-1">
        <div className="text-xs/5 text-white/70">Nome no cartão</div>
        <div className="text-base font-medium">{name}</div>

        <div className="mt-3 text-xs/5 text-white/70">Cartão</div>
        <div className="text-lg tracking-widest">
          **** **** **** {last4 ?? '0000'}
        </div>
      </div>

      {/* rodapé info */}
      <div className="relative z-[1] mt-5 grid grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <div className="text-white/70">Fechamento</div>
          <div className="font-semibold">{String(closingDay).padStart(2, '0')}</div>
        </div>
        <div className="space-y-1">
          <div className="text-white/70">Vencimento</div>
          <div className="font-semibold">{String(dueDay).padStart(2, '0')}</div>
        </div>
        <div className="space-y-1 text-right">
          <div className="text-white/70">Limite</div>
          <div className="font-semibold">{brl(limit)}</div>
        </div>
      </div>

      {/* barra de utilização */}
      <div className="relative z-[1] mt-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-white/80">
          <span>Utilizado</span>
          <span>{within ? `${util.toFixed(0)}%` : '100%+'}</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className={clsx(
              'absolute left-0 top-0 h-full rounded-full transition-[width]',
              within ? 'bg-emerald-300' : 'bg-rose-300'
            )}
            style={{ width: `${util}%` }}
          />
          {/* marcador do limite visual */}
          <div className="absolute right-0 top-[-2px] h-3 w-[2px] rounded bg-white/70" />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-white/80">
          <span>Gasto: <strong className="text-white">{brl(spent)}</strong></span>
          <span>
            {within ? (
              <>Restante: <strong className="text-white">{brl(restante)}</strong></>
            ) : (
              <>Excedido: <strong className="text-white">{brl(spent - limit)}</strong></>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
