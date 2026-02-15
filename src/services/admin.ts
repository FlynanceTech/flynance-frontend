import api from '@/lib/axios'
import axios from 'axios'
import { getErrorMessage } from '@/utils/getErrorMessage'

export type AdminMetricItem = {
  total: number
  new7d: number
  new30d: number
}

export type AdminMetrics = {
  users: AdminMetricItem
  clients: AdminMetricItem
  advisors: AdminMetricItem
  leads: AdminMetricItem
  leadsByStatus: Record<string, number>
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  hasNext: boolean
  totalPages?: number
}

export type AdvisorInviteStatus = 'active' | 'expired' | 'revoked' | 'used'

export type AdvisorInvite = {
  id: string
  email?: string | null
  inviteUrl?: string | null
  token?: string | null
  expiresAt?: string | null
  maxUses: number
  usedCount: number
  defaultPermission?: 'READ_ONLY' | 'READ_WRITE'
  status: AdvisorInviteStatus
  revokedAt?: string | null
  createdAt?: string | null
}

export type AdvisorInvitesResponse = {
  invites: AdvisorInvite[]
  meta: PaginationMeta
}

export type CreateAdvisorInvitePayload = {
  email?: string
  emailOptional?: string
  expiresAt?: string
  expiresInHours?: number
  expiresInDays?: number
  maxUses?: number
  defaultPermission?: 'READ_ONLY' | 'READ_WRITE'
}

export type CreateAdvisorInviteResponse = {
  invite: AdvisorInvite
  inviteUrl: string
}

export type AcceptAdvisorInvitePayload = {
  token: string
}

export type AdminLead = {
  id: string
  name: string
  email: string
  phone?: string | null
  createdAt: string
  leadStatus: string
  latestSubscriptionUpdatedAt?: string | null
}

export type AdminLeadsParams = {
  page?: number
  limit?: number
  search?: string
  createdFrom?: string
  createdTo?: string
  status?: string
}

export type AdminLeadsResponse = {
  leads: AdminLead[]
  meta: PaginationMeta
}

export type AdminPlanPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export type AdminPlanFeature = {
  id?: string
  label: string
  key?: string | null
  value?: string | null
}

export type AdminPlan = {
  id: string
  name: string
  slug: string
  description?: string | null
  priceCents: number
  currency: string
  priceId?: string | null
  installmentPriceId?: string | null
  yearlyPriceId?: string | null
  allowCancel: boolean
  commitmentMonths?: number | null
  period: AdminPlanPeriod
  isActive: boolean
  isPublic: boolean
  isFeatured: boolean
  trialDays: number
  createdAt?: string | null
  updatedAt?: string | null
  features: AdminPlanFeature[]
}

export type AdminPlansParams = {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  isPublic?: boolean
}

export type AdminPlansResponse = {
  rows: AdminPlan[]
  plans: AdminPlan[]
  page: number
  limit: number
  total: number
  totalPages: number
  meta: PaginationMeta
}

export type UpsertAdminPlanPayload = {
  name: string
  slug: string
  description?: string
  priceCents: number
  currency: string
  priceId?: string
  installmentPriceId?: string
  yearlyPriceId?: string
  allowCancel?: boolean
  commitmentMonths?: number | null
  period: AdminPlanPeriod
  isActive?: boolean
  isPublic?: boolean
  isFeatured?: boolean
  trialDays?: number
  features?: Array<{
    label: string
    key?: string
    value?: string
  }>
}

export type StripeCoupon = {
  id: string
  name?: string | null
  percentOff?: number | null
  amountOff?: number | null
  currency?: string | null
  duration: 'once' | 'repeating' | 'forever'
  durationInMonths?: number | null
  maxRedemptions?: number | null
  redeemBy?: string | null
  timesRedeemed?: number | null
  active: boolean
}

export type StripePromotionCode = {
  id: string
  code: string
  couponId: string
  maxRedemptions?: number | null
  expiresAt?: string | null
  timesRedeemed?: number | null
  active: boolean
}

export type StripeCouponsResponse = {
  coupons: StripeCoupon[]
  promotionCodes: StripePromotionCode[]
}

export type CreateCouponPayload = {
  name?: string
  discountType: 'percent' | 'amount'
  percentOff?: number
  amountOff?: number
  currency?: string
  duration: 'once' | 'repeating' | 'forever'
  durationInMonths?: number
  maxRedemptions?: number
  redeemBy?: string
  metadata?: Record<string, string>
}

export type CreatePromoCodePayload = {
  code?: string
  couponId: string
  maxRedemptions?: number
  expiresAt?: string
  metadata?: Record<string, string>
}

export type StripePrice = {
  id: string
  stripePriceId?: string
  unitAmount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  active: boolean
  createdAt?: string | null
}

export type StripeProduct = {
  id: string
  stripeProductId?: string
  name: string
  active: boolean
  description?: string | null
  prices: StripePrice[]
}

export type StripeProductsResponse = {
  products: StripeProduct[]
}

export type CreateProductPayload = {
  name: string
  description?: string
  active?: boolean
  metadata?: Record<string, string>
}

export type CreatePricePayload = {
  productId: string
  unitAmount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  nickname?: string
  metadata?: Record<string, string>
}

type ApiErrorShape = {
  message?: string
  error?: string
}

function toAdminErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const data = (error.response?.data ?? {}) as ApiErrorShape
    const apiMessage =
      (typeof data.message === 'string' && data.message.trim()) ||
      (typeof data.error === 'string' && data.error.trim())

    if (apiMessage) return apiMessage
    if (status === 401) return 'Sua sessao expirou. Faca login novamente.'
    if (status === 403) return 'Voce nao tem permissao para acessar este recurso.'
    if (status === 400) return 'Requisicao invalida. Revise os dados informados.'
    if (status && status >= 500) return 'Servidor indisponivel no momento. Tente novamente.'
  }

  return getErrorMessage(error, fallback)
}

function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    const ms = value > 10_000_000_000 ? value : value * 1000
    const parsed = new Date(ms)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }

  return null
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  if (typeof value === 'number') return value === 1
  return fallback
}

function toInteger(value: unknown, fallback = 0): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.trunc(n)
}

function toMeta(raw: any, fallbackPage = 1, fallbackLimit = 10): PaginationMeta {
  const source =
    raw?.meta ??
    raw?.pagination ??
    (raw && (raw.page != null || raw.total != null || raw.totalPages != null) ? raw : {})
  const page = Number(source.page ?? fallbackPage) || fallbackPage
  const limit = Number(source.limit ?? fallbackLimit) || fallbackLimit
  const total = Number(source.total ?? 0) || 0
  const totalPagesRaw = Number(source.totalPages ?? source.total_pages)
  const totalPages =
    Number.isFinite(totalPagesRaw) && totalPagesRaw > 0
      ? Math.trunc(totalPagesRaw)
      : Math.max(1, Math.ceil(total / Math.max(1, limit)))
  const hasNext =
    typeof source.hasNext === 'boolean' ? source.hasNext : page < totalPages

  return { page, limit, total, hasNext, totalPages }
}

function toMetricItem(raw: any): AdminMetricItem {
  return {
    total: Number(raw?.total ?? 0) || 0,
    new7d: Number(raw?.new7d ?? raw?.last7d ?? 0) || 0,
    new30d: Number(raw?.new30d ?? raw?.last30d ?? 0) || 0,
  }
}

function toStatusCountMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}

  return Object.entries(raw as Record<string, unknown>).reduce<Record<string, number>>(
    (acc, [key, value]) => {
      const normalizedKey = String(key ?? '')
        .trim()
        .toLowerCase()
      if (!normalizedKey) return acc

      const count = Number(value)
      acc[normalizedKey] = Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0
      return acc
    },
    {}
  )
}

function toLeadStatus(raw: unknown): string {
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase()
  return normalized || 'no_signature_id'
}

function toInviteStatus(raw: any): AdvisorInviteStatus {
  const normalized = String(raw ?? '').toLowerCase()
  if (normalized === 'expired') return 'expired'
  if (normalized === 'revoked') return 'revoked'
  if (normalized === 'used') return 'used'
  return 'active'
}

function toAdvisorInvite(raw: any): AdvisorInvite | null {
  const id = String(raw?.id ?? '')
  if (!id) return null

  return {
    id,
    email: raw?.email ?? raw?.emailOptional ?? null,
    inviteUrl: raw?.inviteUrl ?? raw?.url ?? null,
    token: raw?.token ?? null,
    expiresAt: toIsoDate(raw?.expiresAt ?? raw?.expires_at),
    maxUses: Number(raw?.maxUses ?? 1) || 1,
    usedCount: Number(raw?.usedCount ?? raw?.uses ?? raw?.used ?? 0) || 0,
    defaultPermission:
      String(raw?.defaultPermission ?? '')
        .trim()
        .toUpperCase() === 'READ_ONLY'
        ? 'READ_ONLY'
        : 'READ_WRITE',
    status: toInviteStatus(raw?.status),
    revokedAt: toIsoDate(raw?.revokedAt ?? raw?.revoked_at),
    createdAt: toIsoDate(raw?.createdAt ?? raw?.created_at),
  }
}

function getAdvisorInviteRowsFromPayload(data: any): any[] {
  const candidates = [
    data?.invites,
    data?.items,
    data?.rows,
    data?.data,
    data?.data?.invites,
    data?.data?.items,
    data?.data?.rows,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return Array.isArray(data) ? data : []
}

function normalizeAdvisorInvitesResponse(
  data: any,
  fallbackPage: number,
  fallbackLimit: number
): AdvisorInvitesResponse {
  const invitesRaw = getAdvisorInviteRowsFromPayload(data)
  const invites = invitesRaw
    .map(toAdvisorInvite)
    .filter((item): item is AdvisorInvite => Boolean(item))

  const meta = toMeta(data, fallbackPage, fallbackLimit)
  const page = Number(data?.page ?? meta.page ?? fallbackPage) || fallbackPage
  const limit = Number(data?.limit ?? meta.limit ?? fallbackLimit) || fallbackLimit
  const totalRaw = Number(data?.total ?? meta.total)
  const total = Number.isFinite(totalRaw) && totalRaw >= 0 ? Math.trunc(totalRaw) : invites.length
  const totalPagesRaw = Number(data?.totalPages ?? meta.totalPages)
  const totalPages =
    Number.isFinite(totalPagesRaw) && totalPagesRaw > 0
      ? Math.trunc(totalPagesRaw)
      : Math.max(1, Math.ceil(total / Math.max(1, limit)))

  return {
    invites,
    meta: {
      ...meta,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
    },
  }
}

function toLead(raw: any): AdminLead | null {
  const id = String(raw?.id ?? '')
  if (!id) return null

  return {
    id,
    name: String(raw?.name ?? 'Sem nome'),
    email: String(raw?.email ?? ''),
    phone: raw?.phone == null ? null : String(raw?.phone),
    createdAt: String(raw?.createdAt ?? ''),
    leadStatus: toLeadStatus(raw?.leadStatus ?? raw?.status),
    latestSubscriptionUpdatedAt:
      toIsoDate(raw?.latestSubscriptionUpdatedAt ?? raw?.lastActivityAt) ?? null,
  }
}

function toPlanPeriod(value: unknown): AdminPlanPeriod {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'WEEKLY' || normalized === 'YEARLY') return normalized
  return 'MONTHLY'
}

function toPlanFeature(raw: any): AdminPlanFeature | null {
  const label = String(raw?.label ?? '').trim()
  if (!label) return null

  const id = String(raw?.id ?? '').trim()
  const key = String(raw?.key ?? '').trim()
  const value = String(raw?.value ?? '').trim()

  return {
    ...(id ? { id } : {}),
    label,
    key: key || null,
    value: value || null,
  }
}

function toAdminPlan(raw: any): AdminPlan | null {
  const id = String(raw?.id ?? '').trim()
  if (!id) return null

  const name = String(raw?.name ?? '').trim() || 'Plano sem nome'
  const slug = String(raw?.slug ?? '').trim() || id
  const featuresRaw = Array.isArray(raw?.features) ? raw.features : []

  return {
    id,
    name,
    slug,
    description: raw?.description == null ? null : String(raw.description),
    priceCents: toInteger(raw?.priceCents ?? raw?.price_cents, 0),
    currency: String(raw?.currency ?? 'BRL').toUpperCase(),
    priceId:
      raw?.priceId == null && raw?.price_id == null
        ? null
        : String(raw?.priceId ?? raw?.price_id),
    installmentPriceId:
      raw?.installmentPriceId == null && raw?.installment_price_id == null
        ? null
        : String(raw?.installmentPriceId ?? raw?.installment_price_id),
    yearlyPriceId:
      raw?.yearlyPriceId == null && raw?.yearly_price_id == null
        ? null
        : String(raw?.yearlyPriceId ?? raw?.yearly_price_id),
    allowCancel: toBoolean(raw?.allowCancel, true),
    commitmentMonths:
      raw?.commitmentMonths == null && raw?.commitment_months == null
        ? null
        : toInteger(raw?.commitmentMonths ?? raw?.commitment_months, 0),
    period: toPlanPeriod(raw?.period),
    isActive: toBoolean(raw?.isActive, true),
    isPublic: toBoolean(raw?.isPublic, true),
    isFeatured: toBoolean(raw?.isFeatured, false),
    trialDays: toInteger(raw?.trialDays, 0),
    createdAt: toIsoDate(raw?.createdAt ?? raw?.created_at),
    updatedAt: toIsoDate(raw?.updatedAt ?? raw?.updated_at),
    features: featuresRaw
      .map(toPlanFeature)
      .filter((item: AdminPlanFeature | null): item is AdminPlanFeature => Boolean(item)),
  }
}

function getPlanRowsFromPayload(data: any): any[] {
  const candidates = [
    data?.items,
    data?.plans,
    data?.rows,
    data?.data,
    data?.data?.items,
    data?.data?.plans,
    data?.data?.rows,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }

  return []
}

function normalizeAdminPlansResponse(data: any, fallbackPage: number, fallbackLimit: number): AdminPlansResponse {
  const rowsRaw = getPlanRowsFromPayload(data)
  const rows = rowsRaw
    .map(toAdminPlan)
    .filter((item: AdminPlan | null): item is AdminPlan => Boolean(item))

  const meta = toMeta(data, fallbackPage, fallbackLimit)
  const page = Number(data?.page ?? meta.page ?? fallbackPage) || fallbackPage
  const limit = Number(data?.limit ?? meta.limit ?? fallbackLimit) || fallbackLimit
  const total = Number(data?.total ?? meta.total ?? rows.length) || rows.length
  const totalPagesRaw = Number(data?.totalPages ?? meta.totalPages)
  const totalPages =
    Number.isFinite(totalPagesRaw) && totalPagesRaw > 0
      ? Math.trunc(totalPagesRaw)
      : Math.max(1, Math.ceil(total / Math.max(1, limit)))

  return {
    rows,
    plans: rows,
    page,
    limit,
    total,
    totalPages,
    meta: {
      ...meta,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
    },
  }
}

async function requestAdminPlansByPath(path: string, query: string, page: number, limit: number) {
  const url = `${path}${query ? `?${query}` : ''}`
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[admin:plans] GET', url)
  }

  const response = await api.get(url)
  const data = response.data ?? {}
  const normalized = normalizeAdminPlansResponse(data, page, limit)

  if (process.env.NODE_ENV !== 'production') {
    const keys = data && typeof data === 'object' ? Object.keys(data) : []
    console.debug('[admin:plans] payload keys', keys)
    console.debug('[admin:plans] rows normalized', normalized.rows.length)
  }

  return normalized
}

async function requestAdvisorInvitesByPath(path: string, query: string, page: number, limit: number) {
  const url = `${path}${query ? `?${query}` : ''}`
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[admin:advisor-invites] GET', url)
  }

  const response = await api.get(url)
  const data = response.data ?? {}
  const normalized = normalizeAdvisorInvitesResponse(data, page, limit)

  if (process.env.NODE_ENV !== 'production') {
    const keys = data && typeof data === 'object' ? Object.keys(data) : []
    console.debug('[admin:advisor-invites] payload keys', keys)
    console.debug('[admin:advisor-invites] rows normalized', normalized.invites.length)
  }

  return normalized
}

function toStripeCoupon(raw: any): StripeCoupon | null {
  const id = String(raw?.id ?? raw?.couponId ?? '')
  if (!id) return null

  return {
    id,
    name: raw?.name ?? null,
    percentOff:
      raw?.percentOff == null && raw?.percent_off == null
        ? null
        : Number(raw?.percentOff ?? raw?.percent_off),
    amountOff:
      raw?.amountOff == null && raw?.amount_off == null
        ? null
        : Number(raw?.amountOff ?? raw?.amount_off),
    currency: raw?.currency ?? null,
    duration: (raw?.duration ?? 'once') as StripeCoupon['duration'],
    durationInMonths:
      raw?.durationInMonths == null && raw?.duration_in_months == null
        ? null
        : Number(raw?.durationInMonths ?? raw?.duration_in_months),
    maxRedemptions:
      raw?.maxRedemptions == null && raw?.max_redemptions == null
        ? null
        : Number(raw?.maxRedemptions ?? raw?.max_redemptions),
    redeemBy: toIsoDate(raw?.redeemBy ?? raw?.redeem_by),
    timesRedeemed:
      raw?.timesRedeemed == null && raw?.times_redeemed == null
        ? null
        : Number(raw?.timesRedeemed ?? raw?.times_redeemed),
    active: Boolean(raw?.active ?? raw?.valid ?? true),
  }
}

function toStripePromotionCode(raw: any): StripePromotionCode | null {
  const id = String(raw?.id ?? raw?.promoCodeId ?? '')
  if (!id) return null

  return {
    id,
    code: String(raw?.code ?? ''),
    couponId: String(raw?.couponId ?? raw?.coupon_id ?? raw?.coupon?.id ?? ''),
    maxRedemptions:
      raw?.maxRedemptions == null && raw?.max_redemptions == null
        ? null
        : Number(raw?.maxRedemptions ?? raw?.max_redemptions),
    expiresAt: toIsoDate(raw?.expiresAt ?? raw?.expires_at ?? raw?.redeemBy ?? raw?.redeem_by),
    timesRedeemed:
      raw?.timesRedeemed == null && raw?.times_redeemed == null
        ? null
        : Number(raw?.timesRedeemed ?? raw?.times_redeemed),
    active: Boolean(raw?.active ?? true),
  }
}

function toStripePrice(raw: any): StripePrice | null {
  const id = String(raw?.id ?? raw?.stripePriceId ?? raw?.stripe_price_id ?? '')
  if (!id) return null

  const rawInterval =
    raw?.interval ?? raw?.recurringInterval ?? raw?.recurring_interval ?? raw?.recurring?.interval
  const interval =
    rawInterval === 'year' || rawInterval === 'month'
      ? rawInterval
      : ('month' as StripePrice['interval'])

  return {
    id,
    stripePriceId: String(raw?.stripePriceId ?? raw?.stripe_price_id ?? raw?.priceId ?? id),
    unitAmount:
      Number(raw?.unitAmount ?? raw?.unit_amount ?? raw?.amount ?? raw?.amount_off ?? 0) || 0,
    currency: String(raw?.currency ?? 'brl'),
    interval,
    intervalCount:
      Number(
        raw?.intervalCount ??
          raw?.interval_count ??
          raw?.recurringIntervalCount ??
          raw?.recurring_interval_count ??
          raw?.recurring?.interval_count ??
          1
      ) || 1,
    active: Boolean(raw?.active ?? true),
    createdAt: toIsoDate(raw?.createdAt ?? raw?.created_at ?? raw?.created),
  }
}

function toStripeProduct(raw: any): StripeProduct | null {
  const id = String(raw?.id ?? raw?.stripeProductId ?? raw?.stripe_product_id ?? '')
  if (!id) return null

  const pricesRaw = Array.isArray(raw?.prices) ? raw.prices : []
  return {
    id,
    stripeProductId: String(raw?.stripeProductId ?? raw?.stripe_product_id ?? raw?.productId ?? id),
    name: String(raw?.name ?? 'Produto sem nome'),
    active: Boolean(raw?.active ?? true),
    description: raw?.description ?? null,
    prices: pricesRaw
      .map(toStripePrice)
      .filter((item: StripePrice | null): item is StripePrice => Boolean(item)),
  }
}

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const qp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    qp.set(key, String(value))
  })
  return qp.toString()
}

function normalizePlanPayload(payload: UpsertAdminPlanPayload) {
  return {
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    description: payload.description?.trim() || undefined,
    priceCents: toInteger(payload.priceCents, 0),
    currency: String(payload.currency || 'BRL').toUpperCase(),
    priceId: payload.priceId?.trim() || undefined,
    installmentPriceId: payload.installmentPriceId?.trim() || undefined,
    yearlyPriceId: payload.yearlyPriceId?.trim() || undefined,
    allowCancel: payload.allowCancel ?? true,
    commitmentMonths:
      payload.commitmentMonths == null ? null : toInteger(payload.commitmentMonths, 0),
    period: payload.period,
    isActive: payload.isActive ?? true,
    isPublic: payload.isPublic ?? true,
    isFeatured: payload.isFeatured ?? false,
    trialDays: toInteger(payload.trialDays ?? 0, 0),
    features: (payload.features ?? [])
      .map((feature) => ({
        label: String(feature.label ?? '').trim(),
        key: String(feature.key ?? '').trim() || undefined,
        value: String(feature.value ?? '').trim() || undefined,
      }))
      .filter((feature) => Boolean(feature.label)),
  }
}

function normalizePartialPlanPayload(payload: Partial<UpsertAdminPlanPayload>) {
  const normalized: Record<string, unknown> = {}

  if (payload.name !== undefined) normalized.name = String(payload.name).trim()
  if (payload.slug !== undefined) normalized.slug = String(payload.slug).trim()
  if (payload.description !== undefined) {
    normalized.description = payload.description?.trim() || undefined
  }
  if (payload.priceCents !== undefined) normalized.priceCents = toInteger(payload.priceCents, 0)
  if (payload.currency !== undefined) normalized.currency = String(payload.currency || 'BRL').toUpperCase()
  if (payload.priceId !== undefined) normalized.priceId = payload.priceId?.trim() || undefined
  if (payload.installmentPriceId !== undefined) {
    normalized.installmentPriceId = payload.installmentPriceId?.trim() || undefined
  }
  if (payload.yearlyPriceId !== undefined) normalized.yearlyPriceId = payload.yearlyPriceId?.trim() || undefined
  if (payload.allowCancel !== undefined) normalized.allowCancel = payload.allowCancel
  if (payload.commitmentMonths !== undefined) {
    normalized.commitmentMonths =
      payload.commitmentMonths == null ? null : toInteger(payload.commitmentMonths, 0)
  }
  if (payload.period !== undefined) normalized.period = payload.period
  if (payload.isActive !== undefined) normalized.isActive = payload.isActive
  if (payload.isPublic !== undefined) normalized.isPublic = payload.isPublic
  if (payload.isFeatured !== undefined) normalized.isFeatured = payload.isFeatured
  if (payload.trialDays !== undefined) normalized.trialDays = toInteger(payload.trialDays, 0)
  if (payload.features !== undefined) {
    normalized.features = (payload.features ?? [])
      .map((feature) => ({
        label: String(feature.label ?? '').trim(),
        key: String(feature.key ?? '').trim() || undefined,
        value: String(feature.value ?? '').trim() || undefined,
      }))
      .filter((feature) => Boolean(feature.label))
  }

  return normalized
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  try {
    const response = await api.get('/admin/metrics')
    const payload = response.data ?? {}
    const data = payload?.data ?? payload
    const cards = data?.cards ?? {}

    const users = cards?.users ?? data?.users ?? {
      total: data?.totalUsers,
      new7d: data?.newUsers7d,
      new30d: data?.newUsers30d,
    }
    const clients = cards?.clients ?? data?.clients ?? {
      total: data?.totalClients,
      new7d: data?.newClients7d,
      new30d: data?.newClients30d,
    }
    const advisors = cards?.advisors ?? data?.advisors ?? {
      total: data?.totalAdvisors,
      new7d: data?.newAdvisors7d,
      new30d: data?.newAdvisors30d,
    }
    const leads = cards?.leads ?? data?.leads ?? {
      total: data?.leadsCaptured ?? data?.totalLeads,
      new7d: data?.newLeads7d,
      new30d: data?.newLeads30d,
    }
    const leadsByStatus = toStatusCountMap(data?.leadsByStatus ?? cards?.leadsByStatus)

    return {
      users: toMetricItem(users),
      clients: toMetricItem(clients),
      advisors: toMetricItem(advisors),
      leads: toMetricItem(leads),
      leadsByStatus,
    }
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao buscar metricas do admin.'))
  }
}

export async function getAdvisorInvites(params?: {
  page?: number
  limit?: number
}): Promise<AdvisorInvitesResponse> {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 10
  const query = toQuery({ page, limit })

  try {
    return await requestAdvisorInvitesByPath('/admin/advisor-invites', query, page, limit)
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      try {
        return await requestAdvisorInvitesByPath('/admin/advisor-invite', query, page, limit)
      } catch (fallbackError: unknown) {
        if (axios.isAxiosError(fallbackError)) {
          const status = fallbackError.response?.status
          if (status === 401) throw new Error('Sua sessao expirou. Faca login novamente.')
          if (status === 403) throw new Error('Acesso restrito.')
          if (status === 400)
            throw new Error(
              'Nao foi possivel carregar os convites de advisor. Revise os filtros e tente novamente.'
            )
          if (status && status >= 500)
            throw new Error(
              'Nao foi possivel carregar os convites de advisor agora. Tente novamente em instantes.'
            )
        }
        throw new Error(toAdminErrorMessage(fallbackError, 'Erro ao buscar convites de advisor.'))
      }
    }

    if (axios.isAxiosError(e)) {
      const status = e.response?.status
      if (status === 401) throw new Error('Sua sessao expirou. Faca login novamente.')
      if (status === 403) throw new Error('Acesso restrito.')
      if (status === 400)
        throw new Error(
          'Nao foi possivel carregar os convites de advisor. Revise os filtros e tente novamente.'
        )
      if (status && status >= 500)
        throw new Error(
          'Nao foi possivel carregar os convites de advisor agora. Tente novamente em instantes.'
        )
    }

    throw new Error(toAdminErrorMessage(e, 'Erro ao buscar convites de advisor.'))
  }
}

export async function createAdvisorInvite(
  payload: CreateAdvisorInvitePayload
): Promise<CreateAdvisorInviteResponse> {
  try {
    const expiresInHours =
      payload.expiresInHours ??
      (payload.expiresInDays ? Math.max(1, Math.round(payload.expiresInDays * 24)) : undefined)
    const requestPayload = {
      emailOptional: payload.emailOptional ?? payload.email,
      expiresAt: payload.expiresAt,
      expiresInHours,
      maxUses: payload.maxUses ?? 1,
      defaultPermission: payload.defaultPermission ?? 'READ_WRITE',
    }

    const response = await api.post('/admin/advisor-invites', requestPayload)
    const data = response.data ?? {}
    const invite = toAdvisorInvite(data?.invite ?? data)

    return {
      invite:
        invite ??
        {
          id: '',
          email: payload.emailOptional ?? payload.email ?? null,
          inviteUrl: null,
          token: null,
          expiresAt: null,
          maxUses: payload.maxUses ?? 1,
          usedCount: 0,
          defaultPermission: payload.defaultPermission ?? 'READ_WRITE',
          status: 'active',
          revokedAt: null,
          createdAt: null,
        },
      inviteUrl: String(data?.inviteUrl ?? data?.url ?? ''),
    }
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao criar convite de advisor.'))
  }
}

export async function revokeAdvisorInvite(inviteId: string): Promise<void> {
  try {
    await api.post(`/admin/advisor-invites/${inviteId}/revoke`, {})
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao revogar convite de advisor.'))
  }
}

export async function acceptAdvisorInvite(payload: AcceptAdvisorInvitePayload): Promise<void> {
  try {
    const token = String(payload?.token ?? '').trim()
    if (token.length < 10) {
      throw new Error('Token de convite invalido. Verifique o link recebido.')
    }
    await api.post('/advisor/invites/accept', { token })
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao aceitar convite de advisor.'))
  }
}

export async function getAdminLeads(params: AdminLeadsParams): Promise<AdminLeadsResponse> {
  try {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 10
    const query = toQuery({
      page,
      limit,
      search: params.search,
      createdFrom: params.createdFrom,
      createdTo: params.createdTo,
      status: params.status?.trim() || undefined,
    })
    const response = await api.get(`/admin/leads${query ? `?${query}` : ''}`)
    const data = response.data ?? {}
    const leadsRaw = data?.items ?? data?.leads ?? data?.data ?? (Array.isArray(data) ? data : [])
    const leads = (Array.isArray(leadsRaw) ? leadsRaw : [])
      .map(toLead)
      .filter((item): item is AdminLead => Boolean(item))

    return {
      leads,
      meta: toMeta(data, page, limit),
    }
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao buscar leads.'))
  }
}

export async function getAdminPlans(params?: AdminPlansParams): Promise<AdminPlansResponse> {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 20
  const query = toQuery({
    page,
    limit,
    search: params?.search?.trim() || undefined,
    isActive: params?.isActive,
    isPublic: params?.isPublic,
  })

  try {
    return await requestAdminPlansByPath('/admin/plans', query, page, limit)
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      try {
        return await requestAdminPlansByPath('/admin/plan', query, page, limit)
      } catch (fallbackError: unknown) {
        if (axios.isAxiosError(fallbackError)) {
          const status = fallbackError.response?.status
          if (status === 401) throw new Error('Sua sessao expirou. Faca login novamente.')
          if (status === 403) throw new Error('Acesso restrito.')
          if (status === 400)
            throw new Error('Nao foi possivel carregar os planos. Revise os filtros e tente novamente.')
          if (status && status >= 500)
            throw new Error('Nao foi possivel carregar os planos agora. Tente novamente em instantes.')
        }
        throw new Error(toAdminErrorMessage(fallbackError, 'Erro ao buscar planos.'))
      }
    }

    if (axios.isAxiosError(e)) {
      const status = e.response?.status
      if (status === 401) throw new Error('Sua sessao expirou. Faca login novamente.')
      if (status === 403) throw new Error('Acesso restrito.')
      if (status === 400)
        throw new Error('Nao foi possivel carregar os planos. Revise os filtros e tente novamente.')
      if (status && status >= 500)
        throw new Error('Nao foi possivel carregar os planos agora. Tente novamente em instantes.')
    }

    throw new Error(toAdminErrorMessage(e, 'Erro ao buscar planos.'))
  }
}

export async function getAdminPlanById(planId: string): Promise<AdminPlan> {
  try {
    const response = await api.get(`/admin/plans/${planId}`)
    const plan = toAdminPlan(response.data?.plan ?? response.data?.data ?? response.data)
    if (!plan) throw new Error('Plano invalido retornado pelo backend.')
    return plan
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao buscar plano.'))
  }
}

export async function createAdminPlan(payload: UpsertAdminPlanPayload): Promise<AdminPlan> {
  try {
    const response = await api.post('/admin/plans', normalizePlanPayload(payload))
    const plan = toAdminPlan(response.data?.plan ?? response.data?.data ?? response.data)
    if (!plan) throw new Error('Plano invalido retornado pelo backend.')
    return plan
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao criar plano.'))
  }
}

export async function updateAdminPlan(
  planId: string,
  payload: Partial<UpsertAdminPlanPayload>
): Promise<AdminPlan> {
  try {
    const normalized = normalizePartialPlanPayload(payload)
    const response = await api.patch(`/admin/plans/${planId}`, normalized)
    const plan = toAdminPlan(response.data?.plan ?? response.data?.data ?? response.data)
    if (!plan) throw new Error('Plano invalido retornado pelo backend.')
    return plan
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao atualizar plano.'))
  }
}

export async function deleteAdminPlan(planId: string, hardDelete = false): Promise<void> {
  try {
    await api.delete(`/admin/plans/${planId}`, {
      params: hardDelete ? { hardDelete: true } : undefined,
    })
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao excluir plano.'))
  }
}

export async function getStripeCoupons(): Promise<StripeCouponsResponse> {
  try {
    const response = await api.get('/admin/stripe/coupons')
    const data = response.data ?? {}

    const couponsRaw = data?.coupons ?? data?.data?.coupons ?? []
    const promoRaw =
      data?.promotionCodes ??
      data?.promoCodes ??
      data?.promotion_codes ??
      data?.data?.promotionCodes ??
      data?.data?.promoCodes ??
      []

    const coupons = (Array.isArray(couponsRaw) ? couponsRaw : [])
      .map(toStripeCoupon)
      .filter((item): item is StripeCoupon => Boolean(item))
    const promotionCodes = (Array.isArray(promoRaw) ? promoRaw : [])
      .map(toStripePromotionCode)
      .filter((item): item is StripePromotionCode => Boolean(item))

    return { coupons, promotionCodes }
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao buscar cupons Stripe.'))
  }
}

export async function createCoupon(payload: CreateCouponPayload): Promise<StripeCoupon> {
  try {
    const requestPayload: Record<string, unknown> = {
      name: payload.name,
      duration: payload.duration,
      durationInMonths: payload.duration === 'repeating' ? payload.durationInMonths : undefined,
      maxRedemptions: payload.maxRedemptions,
      redeemBy: payload.redeemBy,
      metadata: payload.metadata,
    }

    if (payload.discountType === 'percent') {
      requestPayload.percentOff = payload.percentOff
    } else {
      requestPayload.amountOff = payload.amountOff
      requestPayload.currency = payload.currency
    }

    const response = await api.post('/admin/stripe/coupons', requestPayload)
    const coupon = toStripeCoupon(response.data?.coupon ?? response.data)
    if (!coupon) throw new Error('Cupom invalido retornado pelo backend.')
    return coupon
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao criar cupom.'))
  }
}

export async function createPromoCode(
  payload: CreatePromoCodePayload
): Promise<StripePromotionCode> {
  try {
    const code = payload.code?.trim()
    const requestPayload: Record<string, unknown> = {
      couponId: payload.couponId,
      maxRedemptions: payload.maxRedemptions,
      expiresAt: payload.expiresAt,
      metadata: payload.metadata,
    }
    if (code) requestPayload.code = code.toUpperCase()

    const response = await api.post('/admin/stripe/promo-codes', requestPayload)
    const promo = toStripePromotionCode(
      response.data?.promotionCode ?? response.data?.promoCode ?? response.data
    )
    if (!promo) throw new Error('Promotion code invalido retornado pelo backend.')
    return promo
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao criar promotion code.'))
  }
}

export async function disablePromoCode(promoCodeId: string): Promise<void> {
  try {
    await api.post(`/admin/stripe/promo-codes/${promoCodeId}/disable`, {})
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao desativar promotion code.'))
  }
}

export async function getStripeProducts(): Promise<StripeProductsResponse> {
  try {
    const response = await api.get('/admin/stripe/products')
    const data = response.data ?? {}
    const productsRaw =
      data?.products ?? data?.data?.products ?? data?.data ?? (Array.isArray(data) ? data : [])
    const products = (Array.isArray(productsRaw) ? productsRaw : [])
      .map(toStripeProduct)
      .filter((item): item is StripeProduct => Boolean(item))
    return { products }
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao buscar produtos Stripe.'))
  }
}

export async function createProduct(payload: CreateProductPayload): Promise<StripeProduct> {
  try {
    const response = await api.post('/admin/stripe/products', payload)
    const product = toStripeProduct(response.data?.product ?? response.data)
    if (!product) throw new Error('Produto invalido retornado pelo backend.')
    return product
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao criar produto.'))
  }
}

export async function createPrice(payload: CreatePricePayload): Promise<StripePrice> {
  try {
    const response = await api.post('/admin/stripe/prices', {
      productId: payload.productId,
      unitAmount: payload.unitAmount,
      currency: payload.currency,
      recurringInterval: payload.interval,
      recurringIntervalCount: payload.intervalCount,
      nickname: payload.nickname,
      metadata: payload.metadata,
    })
    const price = toStripePrice(response.data?.price ?? response.data)
    if (!price) throw new Error('Price invalido retornado pelo backend.')
    return price
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao criar price.'))
  }
}

export async function disablePrice(priceId: string): Promise<void> {
  try {
    await api.post(`/admin/stripe/prices/${priceId}/disable`, {})
  } catch (e: unknown) {
    throw new Error(toAdminErrorMessage(e, 'Erro ao desativar price.'))
  }
}
