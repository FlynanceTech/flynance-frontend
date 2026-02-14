'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import {
  useCreateCoupon,
  useCreatePromoCode,
  useDisablePromoCode,
  useStripeCoupons,
} from '@/hooks/query/useAdmin'

const couponSchema = z
  .object({
    name: z.string().optional(),
    discountType: z.enum(['percent', 'amount']),
    percentOff: z.coerce.number().min(1).max(100).optional(),
    amountOff: z.coerce.number().min(1).optional(),
    currency: z.string().min(3).max(3).default('BRL'),
    duration: z.enum(['once', 'repeating', 'forever']),
    durationInMonths: z.coerce.number().min(1).max(36).optional(),
    maxRedemptions: z.coerce.number().min(1).optional(),
    redeemBy: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === 'percent' && !data.percentOff) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['percentOff'],
        message: 'Informe o percentual.',
      })
    }
    if (data.discountType === 'amount' && !data.amountOff) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amountOff'],
        message: 'Informe o valor.',
      })
    }
    if (data.duration === 'repeating' && !data.durationInMonths) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationInMonths'],
        message: 'Informe os meses.',
      })
    }
  })

const promoCodeSchema = z.object({
  code: z.union([z.literal(''), z.string().min(3, 'Codigo minimo de 3 caracteres').max(50)]).optional(),
  couponId: z.string().min(1, 'Selecione um cupom'),
  maxRedemptions: z.coerce.number().min(1).optional(),
  expiresAt: z.string().optional(),
})

type CouponFormValues = z.input<typeof couponSchema>
type PromoCodeFormValues = z.input<typeof promoCodeSchema>

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR')
}

export default function AdminBillingCouponsPage() {
  const couponsQuery = useStripeCoupons()
  const createCouponMutation = useCreateCoupon()
  const createPromoCodeMutation = useCreatePromoCode()
  const disablePromoMutation = useDisablePromoCode()

  const couponForm = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      name: '',
      discountType: 'percent',
      duration: 'once',
      currency: 'BRL',
    },
  })

  const promoCodeForm = useForm<PromoCodeFormValues>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: {
      code: '',
      couponId: '',
    },
  })

  const discountType = couponForm.watch('discountType')
  const duration = couponForm.watch('duration')

  const coupons = couponsQuery.data?.coupons ?? []
  const promotionCodes = couponsQuery.data?.promotionCodes ?? []

  const couponOptions = useMemo(
    () =>
      coupons.map((coupon) => ({
        id: coupon.id,
        label: coupon.name || coupon.id,
      })),
    [coupons]
  )

  const onSubmitCoupon = couponForm.handleSubmit(async (values) => {
    await createCouponMutation.mutateAsync({
      name: values.name || undefined,
      discountType: values.discountType,
      percentOff: values.discountType === 'percent' ? values.percentOff : undefined,
      amountOff: values.discountType === 'amount' ? values.amountOff : undefined,
      currency: values.discountType === 'amount' ? values.currency?.toLowerCase() : undefined,
      duration: values.duration,
      durationInMonths: values.duration === 'repeating' ? values.durationInMonths : undefined,
      maxRedemptions: values.maxRedemptions,
      redeemBy: values.redeemBy || undefined,
    })
    couponForm.reset({
      name: '',
      discountType: 'percent',
      duration: 'once',
      currency: 'BRL',
    })
  })

  const onSubmitPromoCode = promoCodeForm.handleSubmit(async (values) => {
    const code = values.code?.trim()
    await createPromoCodeMutation.mutateAsync({
      code: code ? code.toUpperCase() : undefined,
      couponId: values.couponId,
      maxRedemptions: values.maxRedemptions,
      expiresAt: values.expiresAt || undefined,
    })
    promoCodeForm.reset({ code: '', couponId: '' })
  })

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#333C4D]">Criar cupom</h3>

          <form onSubmit={onSubmitCoupon} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-slate-600">Nome (opcional)</span>
              <input
                type="text"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                placeholder="Cupom campanha de fevereiro"
                {...couponForm.register('name')}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Tipo</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...couponForm.register('discountType')}
              >
                <option value="percent">%</option>
                <option value="amount">Valor</option>
              </select>
            </label>

            {discountType === 'percent' ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Percentual (%)</span>
                <input
                  type="number"
                  className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                  {...couponForm.register('percentOff')}
                />
                <span className="text-xs text-red-600">
                  {couponForm.formState.errors.percentOff?.message}
                </span>
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">Valor</span>
                  <input
                    type="number"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...couponForm.register('amountOff')}
                  />
                  <span className="text-xs text-red-600">
                    {couponForm.formState.errors.amountOff?.message}
                  </span>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">Moeda</span>
                  <input
                    type="text"
                    maxLength={3}
                    className="h-10 rounded-xl border border-slate-200 px-3 uppercase outline-none focus:border-[#7CB8D8]"
                    {...couponForm.register('currency')}
                  />
                </label>
              </>
            )}

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Duracao</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...couponForm.register('duration')}
              >
                <option value="once">once</option>
                <option value="repeating">repeating</option>
                <option value="forever">forever</option>
              </select>
            </label>

            {duration === 'repeating' && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Meses</span>
                <input
                  type="number"
                  className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                  {...couponForm.register('durationInMonths')}
                />
                <span className="text-xs text-red-600">
                  {couponForm.formState.errors.durationInMonths?.message}
                </span>
              </label>
            )}

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Max redemptions</span>
              <input
                type="number"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...couponForm.register('maxRedemptions')}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Expiracao</span>
              <input
                type="date"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...couponForm.register('redeemBy')}
              />
            </label>

            <button
              type="submit"
              disabled={createCouponMutation.isPending}
              className="md:col-span-2 h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
            >
              {createCouponMutation.isPending ? 'Criando...' : 'Criar cupom'}
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#333C4D]">Criar promotion code</h3>

          <form onSubmit={onSubmitPromoCode} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Code</span>
              <input
                type="text"
                className="h-10 rounded-xl border border-slate-200 px-3 uppercase outline-none focus:border-[#7CB8D8]"
                placeholder="FLY20"
                {...promoCodeForm.register('code')}
              />
              <span className="text-xs text-red-600">{promoCodeForm.formState.errors.code?.message}</span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Coupon</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...promoCodeForm.register('couponId')}
              >
                <option value="">Selecione</option>
                {couponOptions.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-red-600">
                {promoCodeForm.formState.errors.couponId?.message}
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Max redemptions</span>
              <input
                type="number"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...promoCodeForm.register('maxRedemptions')}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Expiracao</span>
              <input
                type="date"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...promoCodeForm.register('expiresAt')}
              />
            </label>

            <button
              type="submit"
              disabled={createPromoCodeMutation.isPending}
              className="md:col-span-2 h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0] disabled:opacity-60"
            >
              {createPromoCodeMutation.isPending ? 'Criando...' : 'Criar promotion code'}
            </button>
          </form>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#333C4D]">Cupons</h3>

        {couponsQuery.isLoading ? (
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" />
        ) : coupons.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Nenhum cupom encontrado.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">Cupom</th>
                  <th className="pb-2 font-medium">Desconto</th>
                  <th className="pb-2 font-medium">Duracao</th>
                  <th className="pb-2 font-medium">Uso</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-slate-100">
                    <td className="py-3">{coupon.name || coupon.id}</td>
                    <td className="py-3">
                      {coupon.percentOff
                        ? `${coupon.percentOff}%`
                        : coupon.amountOff
                          ? `${coupon.currency?.toUpperCase()} ${coupon.amountOff}`
                          : '-'}
                    </td>
                    <td className="py-3">
                      {coupon.duration}
                      {coupon.duration === 'repeating' && coupon.durationInMonths
                        ? ` (${coupon.durationInMonths}m)`
                        : ''}
                    </td>
                    <td className="py-3">
                      {coupon.timesRedeemed ?? 0}
                      {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ''}
                    </td>
                    <td className="py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          coupon.active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700',
                        ].join(' ')}
                      >
                        {coupon.active ? 'active' : 'disabled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#333C4D]">Promotion codes</h3>

        {couponsQuery.isLoading ? (
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" />
        ) : promotionCodes.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Nenhum promotion code encontrado.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Coupon</th>
                  <th className="pb-2 font-medium">Expira</th>
                  <th className="pb-2 font-medium">Uso</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {promotionCodes.map((promoCode) => (
                  <tr key={promoCode.id} className="border-b border-slate-100">
                    <td className="py-3 font-semibold">{promoCode.code}</td>
                    <td className="py-3">{promoCode.couponId}</td>
                    <td className="py-3">{formatDate(promoCode.expiresAt)}</td>
                    <td className="py-3">
                      {promoCode.timesRedeemed ?? 0}
                      {promoCode.maxRedemptions ? ` / ${promoCode.maxRedemptions}` : ''}
                    </td>
                    <td className="py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                          promoCode.active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700',
                        ].join(' ')}
                      >
                        {promoCode.active ? 'active' : 'disabled'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(promoCode.code)
                            toast.success('Codigo copiado.')
                          }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Copiar
                        </button>
                        <button
                          type="button"
                          disabled={!promoCode.active || disablePromoMutation.isPending}
                          onClick={() => disablePromoMutation.mutate(promoCode.id)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Disable
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
