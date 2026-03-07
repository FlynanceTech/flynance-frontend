'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useLocale, useTranslations } from 'next-intl'
import {
  useCreateCoupon,
  useCreatePromoCode,
  useDisablePromoCode,
  useStripeCoupons,
} from '@/hooks/query/useAdmin'

type TranslatorFn = (key: string, values?: Record<string, string | number | Date>) => string

function createCouponSchema(t: TranslatorFn) {
  return z
    .object({
      name: z.string().optional(),
      discountType: z.enum(['percent', 'amount']),
      percentOff: z.coerce.number().min(1, t('errors.minOne')).max(100, t('errors.maxHundred')).optional(),
      amountOff: z.coerce.number().min(1, t('errors.minOne')).optional(),
      currency: z.string().min(3, t('errors.invalidCurrency')).max(3, t('errors.invalidCurrency')).default('BRL'),
      duration: z.enum(['once', 'repeating', 'forever']),
      durationInMonths: z.coerce.number().min(1, t('errors.minOne')).max(36, t('errors.maxMonths')).optional(),
      maxRedemptions: z.coerce.number().min(1, t('errors.minOne')).optional(),
      redeemBy: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.discountType === 'percent' && !data.percentOff) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['percentOff'],
          message: t('errors.percentRequired'),
        })
      }
      if (data.discountType === 'amount' && !data.amountOff) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amountOff'],
          message: t('errors.amountRequired'),
        })
      }
      if (data.duration === 'repeating' && !data.durationInMonths) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['durationInMonths'],
          message: t('errors.monthsRequired'),
        })
      }
    })
}

function createPromoCodeSchema(t: TranslatorFn) {
  return z.object({
    code: z.union([z.literal(''), z.string().min(3, t('errors.codeMin')).max(50)]).optional(),
    couponId: z.string().min(1, t('errors.couponRequired')),
    maxRedemptions: z.coerce.number().min(1, t('errors.minOne')).optional(),
    expiresAt: z.string().optional(),
  })
}

type CouponFormValues = z.input<ReturnType<typeof createCouponSchema>>
type PromoCodeFormValues = z.input<ReturnType<typeof createPromoCodeSchema>>

function formatDate(value: string | null | undefined, locale: string, t: TranslatorFn) {
  if (!value) return t('common.empty')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('common.empty')
  return date.toLocaleDateString(locale)
}

function durationLabel(value: string, t: TranslatorFn) {
  const map: Record<string, string> = {
    once: t('forms.coupon.duration.once'),
    repeating: t('forms.coupon.duration.repeating'),
    forever: t('forms.coupon.duration.forever'),
  }
  return map[value] ?? value
}

export default function AdminBillingCouponsPage() {
  const t = useTranslations('adminBillingCouponsPage')
  const locale = useLocale()
  const couponsQuery = useStripeCoupons()
  const createCouponMutation = useCreateCoupon()
  const createPromoCodeMutation = useCreatePromoCode()
  const disablePromoMutation = useDisablePromoCode()
  const couponSchema = useMemo(() => createCouponSchema(t), [t])
  const promoCodeSchema = useMemo(() => createPromoCodeSchema(t), [t])

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
          <h3 className="text-base font-semibold text-[#333C4D]">{t('forms.coupon.title')}</h3>

          <form onSubmit={onSubmitCoupon} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-slate-600">{t('forms.coupon.nameLabel')}</span>
              <input
                type="text"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                placeholder={t('forms.coupon.namePlaceholder')}
                {...couponForm.register('name')}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{t('forms.coupon.typeLabel')}</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...couponForm.register('discountType')}
              >
                <option value="percent">{t('forms.coupon.type.percent')}</option>
                <option value="amount">{t('forms.coupon.type.amount')}</option>
              </select>
            </label>

            {discountType === 'percent' ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">{t('forms.coupon.percentLabel')}</span>
                <input
                  type="number"
                  className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                  {...couponForm.register('percentOff')}
                />
                <span className="text-xs text-red-400">
                  {couponForm.formState.errors.percentOff?.message}
                </span>
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('forms.coupon.amountLabel')}</span>
                  <input
                    type="number"
                    className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                    {...couponForm.register('amountOff')}
                  />
                  <span className="text-xs text-red-400">
                    {couponForm.formState.errors.amountOff?.message}
                  </span>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">{t('forms.coupon.currencyLabel')}</span>
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
              <span className="text-slate-600">{t('forms.coupon.durationLabel')}</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...couponForm.register('duration')}
              >
                <option value="once">{t('forms.coupon.duration.once')}</option>
                <option value="repeating">{t('forms.coupon.duration.repeating')}</option>
                <option value="forever">{t('forms.coupon.duration.forever')}</option>
              </select>
            </label>

            {duration === 'repeating' && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">{t('forms.coupon.monthsLabel')}</span>
                <input
                  type="number"
                  className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                  {...couponForm.register('durationInMonths')}
                />
                <span className="text-xs text-red-400">
                  {couponForm.formState.errors.durationInMonths?.message}
                </span>
              </label>
            )}

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{t('forms.coupon.maxRedemptionsLabel')}</span>
              <input
                type="number"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...couponForm.register('maxRedemptions')}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{t('forms.coupon.expirationLabel')}</span>
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
              {createCouponMutation.isPending ? t('forms.coupon.submitting') : t('forms.coupon.submit')}
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#333C4D]">{t('forms.promo.title')}</h3>

          <form onSubmit={onSubmitPromoCode} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{t('forms.promo.codeLabel')}</span>
              <input
                type="text"
                className="h-10 rounded-xl border border-slate-200 px-3 uppercase outline-none focus:border-[#7CB8D8]"
                placeholder={t('forms.promo.codePlaceholder')}
                {...promoCodeForm.register('code')}
              />
              <span className="text-xs text-red-400">{promoCodeForm.formState.errors.code?.message}</span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{t('forms.promo.couponLabel')}</span>
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...promoCodeForm.register('couponId')}
              >
                <option value="">{t('forms.promo.couponSelect')}</option>
                {couponOptions.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-red-400">
                {promoCodeForm.formState.errors.couponId?.message}
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{t('forms.promo.maxRedemptionsLabel')}</span>
              <input
                type="number"
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
                {...promoCodeForm.register('maxRedemptions')}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{t('forms.promo.expirationLabel')}</span>
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
              {createPromoCodeMutation.isPending ? t('forms.promo.submitting') : t('forms.promo.submit')}
            </button>
          </form>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#333C4D]">{t('sections.coupons.title')}</h3>

        {couponsQuery.isLoading ? (
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" />
        ) : coupons.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            {t('states.noCoupons')}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">{t('tables.coupons.coupon')}</th>
                  <th className="pb-2 font-medium">{t('tables.coupons.discount')}</th>
                  <th className="pb-2 font-medium">{t('tables.coupons.duration')}</th>
                  <th className="pb-2 font-medium">{t('tables.coupons.usage')}</th>
                  <th className="pb-2 font-medium">{t('tables.coupons.status')}</th>
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
                          : t('common.empty')}
                    </td>
                    <td className="py-3">
                      {durationLabel(coupon.duration, t)}
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
                        {coupon.active ? t('status.active') : t('status.disabled')}
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
        <h3 className="text-base font-semibold text-[#333C4D]">{t('sections.promoCodes.title')}</h3>

        {couponsQuery.isLoading ? (
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" />
        ) : promotionCodes.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            {t('states.noPromotionCodes')}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">{t('tables.promo.code')}</th>
                  <th className="pb-2 font-medium">{t('tables.promo.coupon')}</th>
                  <th className="pb-2 font-medium">{t('tables.promo.expiresAt')}</th>
                  <th className="pb-2 font-medium">{t('tables.promo.usage')}</th>
                  <th className="pb-2 font-medium">{t('tables.promo.status')}</th>
                  <th className="pb-2 font-medium text-right">{t('tables.promo.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {promotionCodes.map((promoCode) => (
                  <tr key={promoCode.id} className="border-b border-slate-100">
                    <td className="py-3 font-semibold">{promoCode.code}</td>
                    <td className="py-3">{promoCode.couponId}</td>
                    <td className="py-3">{formatDate(promoCode.expiresAt, locale, t)}</td>
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
                        {promoCode.active ? t('status.active') : t('status.disabled')}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(promoCode.code)
                            toast.success(t('toasts.codeCopied'))
                          }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          {t('actions.copy')}
                        </button>
                        <button
                          type="button"
                          disabled={!promoCode.active || disablePromoMutation.isPending}
                          onClick={() => disablePromoMutation.mutate(promoCode.id)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-50"
                        >
                          {t('actions.disable')}
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
