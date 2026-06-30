import axios from 'axios'
import api from '@/lib/axios'
import { getErrorMessage } from '@/utils/getErrorMessage'

export type AdvisorPermission = 'READ_ONLY' | 'READ_WRITE'
export type AdvisorClientStatus = 'ACTIVE' | 'PENDING' | 'REVOKED'
export type AdvisorClientInviteStatus = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'REVOKED'
export type AdvisorInviteAccountType = 'INDIVIDUAL' | 'COUPLE'
export type AdvisorInvitePaymentResponsible = 'CLIENT' | 'ADVISOR' | 'ORG'
export type AdvisorGeneratedInviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
export type AdvisorInvitePackageStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'
export type AdvisorInvitePaymentStatus = 'PENDING' | 'APPROVED' | 'FAILED' | 'NOT_REQUIRED'

export type AdvisorGeneratedInvite = {
  id: string
  advisorId?: string | null
  advisorName?: string | null
  clientName: string
  clientName2?: string | null
  accountType: AdvisorInviteAccountType
  paymentResponsible: AdvisorInvitePaymentResponsible
  packageId?: string | null
  status: AdvisorGeneratedInviteStatus
  token: string
  inviteUrl: string
  maxUses: number
  uses: number
  expiresAt: string | null
  acceptedAt?: string | null
  acceptedByUserId?: string | null
  acceptedByUserName?: string | null
  createdAt: string | null
  updatedAt: string | null
  unitPriceCents?: number | null
  totalPriceCents?: number | null
  paymentStatus?: AdvisorInvitePaymentStatus | null
  planSlug?: string | null
}

export type CreateAdvisorGeneratedInvitePayload = {
  clientName: string
  clientName2?: string | null
  accountType: AdvisorInviteAccountType
  paymentResponsible: AdvisorInvitePaymentResponsible
  unitPriceCents: number
  planSlug: string
  paymentMethodId?: string
}

export type AdvisorInvitePackage = {
  id: string
  advisorId?: string | null
  accountType: AdvisorInviteAccountType
  quantity: number
  unitPriceCents: number
  totalPriceCents: number
  status: AdvisorInvitePackageStatus
  paymentStatus: AdvisorInvitePaymentStatus
  createdAt: string | null
}

export type CreateAdvisorInvitePackagePayload = {
  accountType: AdvisorInviteAccountType
  quantity: number
  unitPriceCents: number
  paymentMethodId: string
  planSlug: string
}

export type AdvisorInvitePackageResponse = {
  package: AdvisorInvitePackage
  invites: AdvisorGeneratedInvite[]
}

export type UpdateAdvisorGeneratedInviteNamePayload = {
  clientName: string
  clientName2?: string | null
}

export type AdvisorClient = {
  id: string
  clientUserId: string
  name: string
  email: string
  phone?: string | null
  permission: AdvisorPermission
  status: AdvisorClientStatus
  balance: number
  income: number
  expense: number
  score?: number | null
  createdAt?: string | null
  latestActivityAt?: string | null
}

export type AdvisorClientsParams = {
  page?: number
  limit?: number
  search?: string
}

export type AdvisorPaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
}

export type AdvisorClientsResponse = {
  clients: AdvisorClient[]
  meta: AdvisorPaginationMeta
}

export type CreateAdvisorClientInvitePayload = {
  quickLink?: boolean
  emailOptional?: string
  emails?: string[]
  expiresAt?: string
  expiresInHours?: number
  expiresInDays?: number
  maxUses?: number
  permission?: AdvisorPermission
  defaultPermission?: AdvisorPermission
}

export type AdvisorClientInviteEmailDelivery = {
  sent?: boolean
  error?: string | null
}

export type AdvisorClientInviteGenerated = {
  inviteId?: string
  inviteUrl: string
  token?: string | null
  expiresAt?: string | null
  quickLink?: boolean
  unlimitedUses?: boolean
  maxUses: number
  usedCount: number
  permission: AdvisorPermission
  emailOptional?: string | null
  emailDelivery?: AdvisorClientInviteEmailDelivery
  emailDeliverySent?: boolean
  emailDeliveryError?: string | null
}

export type AdvisorClientInviteResponse = AdvisorClientInviteGenerated & {
  batch?: boolean
  totalRequested?: number
  totalCreated?: number
  totalEmailSent?: number
  totalEmailFailed?: number
  invites?: AdvisorClientInviteGenerated[]
}

export type AdvisorClientInvite = {
  id: string
  emailOptional?: string | null
  expiresAt?: string | null
  quickLink?: boolean
  unlimitedUses?: boolean
  maxUses: number
  usedCount: number
  permission: AdvisorPermission
  revokedAt?: string | null
  status: AdvisorClientInviteStatus
}

export type AdvisorClientInvitesParams = {
  page?: number
  limit?: number
}

export type AdvisorClientInvitesResponse = {
  invites: AdvisorClientInvite[]
  meta: AdvisorPaginationMeta
}

export type AcceptAdvisorConnectionPayload = {
  tokenOrSlug: string
}

type ApiErrorShape = {
  message?: string
  error?: string
}

function toAdvisorErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const data = (error.response?.data ?? {}) as ApiErrorShape
    const apiMessage =
      (typeof data.message === 'string' && data.message.trim()) ||
      (typeof data.error === 'string' && data.error.trim())

    if (
      apiMessage &&
      /incomplete_expired|cannot update a subscription that is/i.test(apiMessage)
    ) {
      logAdvisorInviteEvent('stripe_subscription_incomplete_expired', { apiMessage })
      return 'Não conseguimos atualizar essa assinatura antiga. Gere um novo link de pagamento.'
    }

    if (status === 401) return 'Sua sessao expirou. Faca login novamente.'
    if (status === 403) return 'Voce nao tem permissao para acessar este recurso.'
    if (status === 400 && apiMessage) return apiMessage
    if (apiMessage) return apiMessage
    if (status === 400) return 'Requisicao invalida. Revise os dados informados.'
    if (status && status >= 500) return 'Servidor indisponivel no momento. Tente novamente.'
  }

  return getErrorMessage(error, fallback)
}

export function logAdvisorInviteEvent(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const entry = { event, ts: new Date().toISOString(), ...(data ?? {}) }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[advisor-invite]', entry)
  }
}

function toIsoDate(value: unknown): string | null {
  if (value == null || value === '') return null
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  return fallback
}

function toInteger(value: unknown, fallback = 0): number {
  const n = toNumber(value, fallback)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

function toOptionalString(value: unknown): string | null {
  if (value == null) return null
  const normalized = String(value).trim()
  return normalized || null
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function normalizeEmail(value: unknown): string | null {
  const normalized = toOptionalString(value)
  if (!normalized) return null
  return normalized.toLowerCase()
}

function normalizeEmails(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const map = new Map<string, string>()
  values.forEach((value) => {
    const normalized = normalizeEmail(value)
    if (!normalized) return
    if (!map.has(normalized)) {
      map.set(normalized, normalized)
    }
  })
  return Array.from(map.values())
}

function toPermission(value: unknown): AdvisorPermission {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return normalized === 'READ_ONLY' ? 'READ_ONLY' : 'READ_WRITE'
}

function toClientStatus(value: unknown): AdvisorClientStatus {
  if (typeof value === 'boolean') return value ? 'ACTIVE' : 'REVOKED'

  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (normalized === 'PENDING') return 'PENDING'
  if (normalized === 'REVOKED') return 'REVOKED'
  return 'ACTIVE'
}

function toInviteStatus(value: unknown): AdvisorClientInviteStatus {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (normalized === 'EXPIRED') return 'EXPIRED'
  if (normalized === 'EXHAUSTED') return 'EXHAUSTED'
  if (normalized === 'REVOKED') return 'REVOKED'
  return 'ACTIVE'
}

function toAdvisorInviteAccountType(value: unknown): AdvisorInviteAccountType {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return normalized === 'COUPLE' || normalized === 'CASAL' ? 'COUPLE' : 'INDIVIDUAL'
}

function toAdvisorInvitePaymentResponsible(value: unknown): AdvisorInvitePaymentResponsible {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (normalized === 'ADVISOR' || normalized === 'CONSULTOR') return 'ADVISOR'
  if (normalized === 'ORG' || normalized === 'ORGANIZACAO' || normalized === 'ORGANIZATION') return 'ORG'
  return 'CLIENT'
}

function toAdvisorGeneratedInviteStatus(value: unknown): AdvisorGeneratedInviteStatus {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'ACCEPTED') return 'ACCEPTED'
  if (normalized === 'EXPIRED') return 'EXPIRED'
  if (normalized === 'CANCELLED' || normalized === 'CANCELED' || normalized === 'REVOKED') {
    return 'CANCELLED'
  }

  return 'PENDING'
}

function toAdvisorInvitePackageStatus(value: unknown): AdvisorInvitePackageStatus {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'PAID' || normalized === 'APPROVED') return 'PAID'
  if (normalized === 'FAILED') return 'FAILED'
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'CANCELLED'
  return 'PENDING'
}

function toAdvisorInvitePaymentStatus(value: unknown): AdvisorInvitePaymentStatus {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'APPROVED' || normalized === 'PAID') return 'APPROVED'
  if (normalized === 'FAILED') return 'FAILED'
  if (normalized === 'NOT_REQUIRED' || normalized === 'NONE') return 'NOT_REQUIRED'
  return 'PENDING'
}

function addDaysIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + Math.max(1, Math.trunc(days)))
  return date.toISOString()
}

function getBrowserOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function buildAdvisorInviteUrl(token: string): string {
  const safeToken = encodeURIComponent(token)
  return `${getBrowserOrigin()}/advisor/client-invite/accept?token=${safeToken}`
}

function normalizeInviteUrl(value: unknown, token: string): string {
  const raw = toOptionalString(value)
  if (!raw) return buildAdvisorInviteUrl(token)
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return `${getBrowserOrigin()}${raw}`
  return raw
}

function createLocalToken(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  return `adv_${random}`.slice(0, 48)
}

function defaultClientName(accountType: AdvisorInviteAccountType, index?: number): string {
  const suffix = typeof index === 'number' ? ` ${index}` : ''
  return accountType === 'COUPLE' ? `Casal${suffix}` : `Cliente${suffix}`
}

function toAdvisorGeneratedInvite(
  raw: unknown,
  defaults: Partial<AdvisorGeneratedInvite> = {}
): AdvisorGeneratedInvite | null {
  const source = toRecord(raw)
  const advisor = toRecord(source.advisor)
  const plan = toRecord(source.plan)
  const token = toOptionalString(source.token ?? source.inviteToken ?? defaults.token) ?? createLocalToken()
  const id = toOptionalString(source.id ?? source.inviteId ?? defaults.id) ?? `local_${token}`
  const accountType = toAdvisorInviteAccountType(source.accountType ?? defaults.accountType)
  const clientName =
    toOptionalString(source.clientName ?? source.name ?? source.emailOptional ?? source.email) ??
    defaults.clientName ??
    defaultClientName(accountType)
  const inviteUrl = normalizeInviteUrl(
    source.inviteUrl ?? source.inviteLink ?? source.url ?? defaults.inviteUrl,
    token
  )

  return {
    id,
    advisorId: toOptionalString(source.advisorId ?? advisor.id) ?? defaults.advisorId ?? null,
    advisorName:
      toOptionalString(source.advisorName ?? advisor.name ?? advisor.fullName) ??
      defaults.advisorName ??
      null,
    clientName,
    clientName2:
      toOptionalString(source.clientName2 ?? source.partnerName ?? defaults.clientName2) ?? null,
    accountType,
    paymentResponsible: toAdvisorInvitePaymentResponsible(
      source.paymentResponsible ?? source.payer ?? defaults.paymentResponsible
    ),
    packageId: toOptionalString(source.packageId ?? source.invitePackageId ?? defaults.packageId) ?? null,
    status: toAdvisorGeneratedInviteStatus(source.status ?? defaults.status),
    token,
    inviteUrl,
    maxUses: toInteger(source.maxUses ?? defaults.maxUses, 1),
    uses: toInteger(source.uses ?? source.usedCount ?? defaults.uses, 0),
    expiresAt: toIsoDate(source.expiresAt ?? defaults.expiresAt),
    acceptedAt: toIsoDate(source.acceptedAt ?? defaults.acceptedAt),
    acceptedByUserId:
      toOptionalString(source.acceptedByUserId ?? source.acceptedUserId ?? defaults.acceptedByUserId) ?? null,
    acceptedByUserName:
      toOptionalString(
        source.acceptedByUserName ?? source.acceptedByName ?? source.acceptedUserName ?? defaults.acceptedByUserName
      ) ?? null,
    createdAt: toIsoDate(source.createdAt ?? defaults.createdAt ?? new Date().toISOString()),
    updatedAt: toIsoDate(source.updatedAt ?? defaults.updatedAt ?? new Date().toISOString()),
    unitPriceCents: toNumberOrNull(source.unitPriceCents ?? source.priceCents ?? defaults.unitPriceCents),
    totalPriceCents: toNumberOrNull(source.totalPriceCents ?? defaults.totalPriceCents),
    paymentStatus:
      source.paymentStatus == null && defaults.paymentStatus == null
        ? null
        : toAdvisorInvitePaymentStatus(source.paymentStatus ?? defaults.paymentStatus),
    planSlug: toOptionalString(source.planSlug ?? plan.slug ?? defaults.planSlug) ?? null,
  }
}

function toAdvisorInvitePackage(raw: unknown, defaults: Partial<AdvisorInvitePackage>): AdvisorInvitePackage {
  const source = toRecord(raw)
  const advisor = toRecord(source.advisor)
  const id = toOptionalString(source.id ?? source.packageId ?? defaults.id) ?? `pkg_${createLocalToken()}`
  const quantity = Math.max(1, toInteger(source.quantity ?? defaults.quantity, 1))
  const unitPriceCents = Math.max(0, toInteger(source.unitPriceCents ?? defaults.unitPriceCents, 0))

  return {
    id,
    advisorId: toOptionalString(source.advisorId ?? advisor.id ?? defaults.advisorId) ?? null,
    accountType: toAdvisorInviteAccountType(source.accountType ?? defaults.accountType),
    quantity,
    unitPriceCents,
    totalPriceCents: Math.max(
      0,
      toInteger(source.totalPriceCents ?? defaults.totalPriceCents, quantity * unitPriceCents)
    ),
    status: toAdvisorInvitePackageStatus(source.status ?? defaults.status),
    paymentStatus: toAdvisorInvitePaymentStatus(source.paymentStatus ?? defaults.paymentStatus),
    createdAt: toIsoDate(source.createdAt ?? defaults.createdAt ?? new Date().toISOString()),
  }
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toAdvisorClient(raw: unknown): AdvisorClient | null {
  const source = toRecord(raw)
  const client = toRecord(source.client)
  const totals = toRecord(source.totals)
  const id = String(source.id ?? source.advisorClientId ?? '').trim()
  if (!id) return null

  const clientUserId = String(source.clientUserId ?? source.userId ?? client.id ?? id).trim()

  return {
    id,
    clientUserId,
    name: String(source.name ?? source.clientName ?? client.name ?? 'Cliente sem nome').trim(),
    email: String(source.email ?? source.clientEmail ?? client.email ?? '').trim(),
    phone:
      source.phone == null && client.phone == null
        ? null
        : String(source.phone ?? client.phone ?? '').trim() || null,
    permission: toPermission(source.permission ?? source.defaultPermission ?? source.accessLevel),
    status: toClientStatus(source.status ?? source.active),
    balance: toNumber(source.balance ?? totals.balance ?? 0, 0),
    income: toNumber(source.income ?? totals.income ?? 0, 0),
    expense: toNumber(source.expense ?? totals.expense ?? 0, 0),
    score:
      source.score == null ? null : toNumber(source.score, 0),
    createdAt: toIsoDate(source.createdAt),
    latestActivityAt: toIsoDate(source.latestActivityAt ?? source.lastActivityAt),
  }
}

function toAdvisorClientInvite(raw: unknown): AdvisorClientInvite | null {
  const source = toRecord(raw)
  const id = String(source.id ?? source.inviteId ?? '').trim()
  if (!id) return null
  const maxUses = toNumber(source.maxUses, 1)
  const quickLink = toBoolean(source.quickLink, false)
  const unlimitedUses = toBoolean(source.unlimitedUses, quickLink || maxUses >= 2_147_483_647)

  return {
    id,
    emailOptional:
      source.emailOptional == null ? null : String(source.emailOptional).trim() || null,
    expiresAt: toIsoDate(source.expiresAt),
    quickLink,
    unlimitedUses,
    maxUses,
    usedCount: toNumber(source.usedCount, 0),
    permission: toPermission(source.permission ?? source.defaultPermission),
    revokedAt: toIsoDate(source.revokedAt),
    status: toInviteStatus(source.status),
  }
}

function toEmailDelivery(raw: unknown): AdvisorClientInviteEmailDelivery | undefined {
  const source = toRecord(raw)
  const emailDelivery = toRecord(source.emailDelivery)
  const sentRaw = emailDelivery.sent ?? source.emailSent
  const errorRaw = emailDelivery.error ?? source.emailDeliveryError ?? source.emailError
  const hasSent = sentRaw !== undefined && sentRaw !== null
  const error = toOptionalString(errorRaw)
  if (!hasSent && !error) return undefined

  return {
    sent: hasSent ? Boolean(sentRaw) : undefined,
    error,
  }
}

function toGeneratedInvite(raw: unknown, defaults: Partial<AdvisorClientInviteGenerated>): AdvisorClientInviteGenerated {
  const source = toRecord(raw)
  const emailDelivery = toEmailDelivery(raw)
  const maxUsesFallback = defaults.maxUses ?? (defaults.unlimitedUses ? 0 : 1)
  const permissionFallback = defaults.permission ?? 'READ_WRITE'
  const inviteId = toOptionalString(source.inviteId ?? source.id) ?? undefined
  const inviteUrl =
    toOptionalString(source.inviteLink ?? source.inviteUrl ?? source.url) ??
    defaults.inviteUrl ??
    ''
  const token = toOptionalString(source.token)
  const quickLink = toBoolean(source.quickLink, defaults.quickLink ?? false)
  const unlimitedUses = toBoolean(source.unlimitedUses, defaults.unlimitedUses ?? quickLink)

  return {
    inviteId,
    inviteUrl,
    token: token ?? defaults.token ?? null,
    expiresAt: toIsoDate(source.expiresAt ?? defaults.expiresAt),
    quickLink,
    unlimitedUses,
    maxUses: toNumber(source.maxUses, maxUsesFallback),
    usedCount: toNumber(source.usedCount, defaults.usedCount ?? 0),
    permission: toPermission(source.permission ?? source.defaultPermission ?? permissionFallback),
    emailOptional:
      toOptionalString(source.emailOptional ?? source.email) ??
      defaults.emailOptional ??
      null,
    emailDelivery,
    emailDeliverySent:
      emailDelivery?.sent ??
      (defaults.emailDeliverySent == null ? undefined : Boolean(defaults.emailDeliverySent)),
    emailDeliveryError: emailDelivery?.error ?? defaults.emailDeliveryError ?? null,
  }
}

function hasAnyInviteData(invite: AdvisorClientInviteGenerated): boolean {
  return Boolean(invite.inviteId || invite.inviteUrl || invite.token || invite.emailOptional)
}

function toMeta(raw: unknown, fallbackPage = 1, fallbackLimit = 20): AdvisorPaginationMeta {
  const sourceRecord = toRecord(raw)
  const source =
    toRecord(sourceRecord.meta).page != null || toRecord(sourceRecord.meta).total != null
      ? toRecord(sourceRecord.meta)
      : toRecord(sourceRecord.pagination).page != null || toRecord(sourceRecord.pagination).total != null
        ? toRecord(sourceRecord.pagination)
        : sourceRecord.page != null || sourceRecord.total != null || sourceRecord.totalPages != null
          ? sourceRecord
          : {}
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

  return { page, limit, total, totalPages, hasNext }
}

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const qp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    qp.set(key, String(value))
  })
  return qp.toString()
}

async function requestWithFallback<T>(
  attempts: Array<() => Promise<T>>,
  fallbackError: string
): Promise<T> {
  let lastError: unknown

  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (error: unknown) {
      lastError = error
      if (!axios.isAxiosError(error)) break

      const status = error.response?.status
      const data = (error.response?.data ?? {}) as ApiErrorShape
      const apiMessage =
        (typeof data.message === 'string' && data.message.trim()) ||
        (typeof data.error === 'string' && data.error.trim()) ||
        ''

      const shouldTryNext =
        status === 404 ||
        status === 405 ||
        status === 403 ||
        (status === 400 && /rota|endpoint|nao encontrado|not found/i.test(apiMessage))

      if (shouldTryNext) {
        continue
      }
      break
    }
  }

  throw new Error(toAdvisorErrorMessage(lastError, fallbackError))
}

async function requestAdvisorInviteFeature<T>(
  attempts: Array<() => Promise<T>>,
  fallbackError: string
): Promise<T> {
  let lastError: unknown

  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (error: unknown) {
      lastError = error
      if (!axios.isAxiosError(error)) break

      const status = error.response?.status
      const data = (error.response?.data ?? {}) as ApiErrorShape
      const apiMessage =
        (typeof data.message === 'string' && data.message.trim()) ||
        (typeof data.error === 'string' && data.error.trim()) ||
        ''

      const shouldTryNext =
        status === 404 ||
        status === 405 ||
        (status === 400 && /rota|endpoint|nao encontrado|not found/i.test(apiMessage))

      if (shouldTryNext) continue
      break
    }
  }

  const error = new Error(toAdvisorErrorMessage(lastError, fallbackError))
  ;(error as Error & { cause?: unknown }).cause = lastError
  throw error
}

function canUseLocalInviteFallback(error: unknown): boolean {
  const cause = (error as Error & { cause?: unknown })?.cause
  if (axios.isAxiosError(cause)) {
    const status = cause.response?.status
    const message = String(
      cause.response?.data?.message ??
        cause.response?.data?.error ??
        cause.message ??
        ''
    ).toLowerCase()
    return (
      status === 404 ||
      status === 405 ||
      message.includes('endpoint') ||
      message.includes('rota') ||
      message.includes('not found') ||
      message.includes('nao encontrado')
    )
  }

  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return (
    message.includes('endpoint') ||
    message.includes('rota') ||
    message.includes('not found') ||
    message.includes('nao encontrado')
  )
}

const LOCAL_ADVISOR_INVITES_KEY = 'flynance_advisor_generated_invites_v1'

export function readLocalAdvisorGeneratedInvites(): AdvisorGeneratedInvite[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(LOCAL_ADVISOR_INVITES_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => toAdvisorGeneratedInvite(item))
      .filter((item): item is AdvisorGeneratedInvite => Boolean(item))
  } catch {
    return []
  }
}

function writeLocalAdvisorGeneratedInvites(invites: AdvisorGeneratedInvite[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_ADVISOR_INVITES_KEY, JSON.stringify(invites))
}

function upsertLocalAdvisorGeneratedInvite(invite: AdvisorGeneratedInvite) {
  const current = readLocalAdvisorGeneratedInvites()
  const next = [
    invite,
    ...current.filter((item) => item.id !== invite.id && item.token !== invite.token),
  ]
  writeLocalAdvisorGeneratedInvites(next)
}

function updateLocalAdvisorGeneratedInvite(
  inviteIdOrToken: string,
  patch: Partial<AdvisorGeneratedInvite>
): AdvisorGeneratedInvite | null {
  const safeId = String(inviteIdOrToken ?? '').trim()
  if (!safeId) return null

  let updated: AdvisorGeneratedInvite | null = null
  const next = readLocalAdvisorGeneratedInvites().map((invite) => {
    if (invite.id !== safeId && invite.token !== safeId) return invite
    updated = {
      ...invite,
      ...patch,
      id: invite.id,
      token: invite.token,
      inviteUrl: patch.inviteUrl ?? invite.inviteUrl,
      updatedAt: new Date().toISOString(),
    }
    return updated
  })

  if (updated) {
    writeLocalAdvisorGeneratedInvites(next)
  }

  return updated
}

function syncLocalWithBackend(backendInvites: AdvisorGeneratedInvite[]) {
  const backendIds = new Set(backendInvites.map((i) => i.id).filter(Boolean))
  const backendTokens = new Set(backendInvites.map((i) => i.token).filter(Boolean))
  const local = readLocalAdvisorGeneratedInvites()
  const localOnly = local.filter(
    (inv) => !backendIds.has(inv.id) && !(inv.token && backendTokens.has(inv.token))
  )
  writeLocalAdvisorGeneratedInvites([...backendInvites, ...localOnly])
}

function mergeWithLocalAdvisorGeneratedInvites(
  backendInvites: AdvisorGeneratedInvite[]
): AdvisorGeneratedInvite[] {
  const localInvites = readLocalAdvisorGeneratedInvites()
  const backendIds = new Set(backendInvites.map((i) => i.id).filter(Boolean))
  const backendTokens = new Set(backendInvites.map((i) => i.token).filter(Boolean))
  const merged = new Map<string, AdvisorGeneratedInvite>()

  for (const invite of backendInvites) {
    merged.set(invite.id, invite)
  }

  for (const invite of localInvites) {
    const idExists = invite.id && backendIds.has(invite.id)
    const tokenExists = invite.token && backendTokens.has(invite.token)
    if (!idExists && !tokenExists) {
      merged.set(invite.id || invite.token, invite)
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftDate = new Date(left.createdAt ?? 0).getTime()
    const rightDate = new Date(right.createdAt ?? 0).getTime()
    return rightDate - leftDate
  })
}

function createLocalAdvisorGeneratedInvite(
  payload: CreateAdvisorGeneratedInvitePayload,
  seed: Partial<AdvisorGeneratedInvite> = {}
): AdvisorGeneratedInvite {
  const token = seed.token ?? createLocalToken()
  const now = new Date().toISOString()
  const invite = toAdvisorGeneratedInvite(
    {
      id: seed.id ?? `local_${token}`,
      token,
      inviteUrl: seed.inviteUrl ?? buildAdvisorInviteUrl(token),
      clientName: payload.clientName,
      clientName2: payload.clientName2,
      accountType: payload.accountType,
      paymentResponsible: payload.paymentResponsible,
      maxUses: 1,
      uses: 0,
      expiresAt: seed.expiresAt ?? addDaysIso(3),
      createdAt: seed.createdAt ?? now,
      updatedAt: now,
      status: seed.status ?? 'PENDING',
      unitPriceCents: payload.unitPriceCents,
      paymentStatus: payload.paymentResponsible === 'CLIENT' ? 'NOT_REQUIRED' : 'PENDING',
      planSlug: payload.planSlug,
    },
    seed
  )

  if (!invite) {
    throw new Error('Nao foi possivel gerar o convite local.')
  }

  upsertLocalAdvisorGeneratedInvite(invite)
  return invite
}

function createLocalAdvisorInvitePackage(
  payload: CreateAdvisorInvitePackagePayload
): AdvisorInvitePackageResponse {
  const now = new Date().toISOString()
  const packageId = `pkg_${createLocalToken()}`
  const totalPriceCents = payload.quantity * payload.unitPriceCents
  const invitePackage = toAdvisorInvitePackage(
    {
      id: packageId,
      accountType: payload.accountType,
      quantity: payload.quantity,
      unitPriceCents: payload.unitPriceCents,
      totalPriceCents,
      status: 'PAID',
      paymentStatus: 'APPROVED',
      createdAt: now,
    },
    {
      accountType: payload.accountType,
      quantity: payload.quantity,
      unitPriceCents: payload.unitPriceCents,
      totalPriceCents,
      status: 'PAID',
      paymentStatus: 'APPROVED',
      createdAt: now,
    }
  )

  const invites = Array.from({ length: payload.quantity }, (_, index) => {
    const token = createLocalToken()
    const invite = toAdvisorGeneratedInvite(
      {
        id: `local_${token}`,
        token,
        inviteUrl: buildAdvisorInviteUrl(token),
        clientName: defaultClientName(payload.accountType, index + 1),
        accountType: payload.accountType,
        paymentResponsible: 'ADVISOR',
        packageId,
        maxUses: 1,
        uses: 0,
        expiresAt: addDaysIso(3),
        createdAt: now,
        updatedAt: now,
        status: 'PENDING',
        unitPriceCents: payload.unitPriceCents,
        totalPriceCents,
        paymentStatus: 'APPROVED',
        planSlug: payload.planSlug,
      },
      {
        accountType: payload.accountType,
        paymentResponsible: 'ADVISOR',
      }
    )

    if (!invite) {
      throw new Error('Nao foi possivel gerar convite do pacote.')
    }

    upsertLocalAdvisorGeneratedInvite(invite)
    return invite
  })

  return {
    package: invitePackage,
    invites,
  }
}

export async function getAdvisorClients(params?: AdvisorClientsParams): Promise<AdvisorClientsResponse> {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 20
  const query = toQuery({
    page,
    limit,
    search: params?.search?.trim() || undefined,
  })
  const suffix = query ? `?${query}` : ''

  try {
    const response = await requestWithFallback(
      [
        () => api.get(`/advisor/clients${suffix}`),
        () => api.get(`/advisor/clients/list${suffix}`),
        () => api.get(`/advisor/client-links${suffix}`),
      ],
      'Erro ao carregar clientes do advisor.'
    )

    const data = response.data ?? {}
    const clientsRaw = data?.items ?? data?.clients ?? data?.data ?? (Array.isArray(data) ? data : [])
    const clients = (Array.isArray(clientsRaw) ? clientsRaw : [])
      .map(toAdvisorClient)
      .filter((item): item is AdvisorClient => Boolean(item))

    return {
      clients,
      meta: toMeta(data, page, limit),
    }
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao carregar clientes do advisor.'))
  }
}

export async function getAdvisorClientInvites(
  params?: AdvisorClientInvitesParams
): Promise<AdvisorClientInvitesResponse> {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 20
  const query = toQuery({ page, limit })
  const suffix = query ? `?${query}` : ''

  try {
    const response = await requestWithFallback(
      [
        () => api.get(`/advisor/clients/invites${suffix}`),
        () => api.get(`/advisor/client-invites${suffix}`),
        () => api.get(`/advisor/clients/invite${suffix}`),
      ],
      'Erro ao carregar convites de cliente.'
    )
    const data = response.data ?? {}
    const invitesRaw =
      data?.items ?? data?.invites ?? data?.data ?? (Array.isArray(data) ? data : [])
    const invites = (Array.isArray(invitesRaw) ? invitesRaw : [])
      .map(toAdvisorClientInvite)
      .filter((item): item is AdvisorClientInvite => Boolean(item))

    return {
      invites,
      meta: toMeta(data, page, limit),
    }
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao carregar convites de cliente.'))
  }
}

export async function getAdvisorGeneratedInvites(): Promise<AdvisorGeneratedInvite[]> {
  try {
    const response = await requestAdvisorInviteFeature(
      [
        () => api.get('/advisor/invites'),
        () => api.get('/advisor/client-invites/commercial'),
        () => api.get('/advisor/clients/invites/commercial'),
      ],
      'Erro ao carregar convites do advisor.'
    )
    const data = response.data ?? {}
    const invitesRaw =
      data?.items ?? data?.invites ?? data?.data?.invites ?? data?.data ?? (Array.isArray(data) ? data : [])
    const invites = (Array.isArray(invitesRaw) ? invitesRaw : [])
      .map((item) => toAdvisorGeneratedInvite(item))
      .filter((item): item is AdvisorGeneratedInvite => Boolean(item))

    syncLocalWithBackend(invites)
    return mergeWithLocalAdvisorGeneratedInvites(invites)
  } catch (error: unknown) {
    if (canUseLocalInviteFallback(error)) {
      return mergeWithLocalAdvisorGeneratedInvites([])
    }

    const localInvites = readLocalAdvisorGeneratedInvites()
    if (localInvites.length > 0) return localInvites
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao carregar convites do advisor.'))
  }
}

export async function createAdvisorGeneratedInvite(
  payload: CreateAdvisorGeneratedInvitePayload
): Promise<AdvisorGeneratedInvite> {
  const clientName = String(payload.clientName ?? '').trim()
  if (clientName.length < 2) {
    throw new Error('Informe o nome do cliente.')
  }

  if (payload.accountType === 'COUPLE' && !String(payload.clientName2 ?? '').trim()) {
    throw new Error('Informe o nome da segunda pessoa.')
  }

  const requestPayload = {
    advisorId: undefined,
    clientName,
    clientName2: payload.clientName2 ? String(payload.clientName2).trim() : undefined,
    accountType: payload.accountType,
    paymentResponsible: payload.paymentResponsible,
    planSlug: payload.planSlug,
    unitPriceCents: payload.unitPriceCents,
    maxUses: 1,
    expiresInDays: 3,
    paymentMethodId: payload.paymentMethodId,
    chargeMode:
      payload.paymentResponsible === 'ADVISOR'
        ? 'ON_ACCEPTANCE_FIRST_ACCESS'
        : 'CLIENT_CHECKOUT',
  }

  try {
    const response = await requestAdvisorInviteFeature(
      [
        () => api.post('/advisor/invites', requestPayload),
        () => api.post('/advisor/client-invites/commercial', requestPayload),
        () => api.post('/advisor/clients/invites/commercial', requestPayload),
      ],
      'Erro ao gerar convite do advisor.'
    )

    const data = response.data ?? {}
    const rawInvite =
      data?.invite ?? data?.data?.invite ?? data?.data ?? data
    const invite = toAdvisorGeneratedInvite(rawInvite, {
      clientName,
      clientName2: requestPayload.clientName2 ?? null,
      accountType: payload.accountType,
      paymentResponsible: payload.paymentResponsible,
      maxUses: 1,
      uses: 0,
      expiresAt: addDaysIso(3),
      unitPriceCents: payload.unitPriceCents,
      planSlug: payload.planSlug,
    })

    if (!invite) {
      throw new Error('Resposta invalida ao gerar convite.')
    }

    upsertLocalAdvisorGeneratedInvite(invite)
    return invite
  } catch (error: unknown) {
    if (!canUseLocalInviteFallback(error)) {
      throw new Error(toAdvisorErrorMessage(error, 'Erro ao gerar convite do advisor.'))
    }

    if (payload.paymentResponsible === 'CLIENT') {
      try {
        const legacyInvite = await createAdvisorClientInvite({
          expiresInDays: 3,
          maxUses: 1,
          permission: 'READ_WRITE',
        })
        const generated = normalizeLegacyGeneratedInvite(legacyInvite)
        return createLocalAdvisorGeneratedInvite(payload, {
          id: generated?.inviteId ?? undefined,
          token: generated?.token ?? undefined,
          inviteUrl: generated?.inviteUrl ?? undefined,
          expiresAt: generated?.expiresAt ?? addDaysIso(3),
        })
      } catch {
        return createLocalAdvisorGeneratedInvite(payload)
      }
    }

    return createLocalAdvisorGeneratedInvite(payload)
  }
}

function normalizeLegacyGeneratedInvite(
  value: AdvisorClientInviteResponse | null
): AdvisorClientInviteGenerated | null {
  if (!value) return null
  if (Array.isArray(value.invites) && value.invites.length > 0) return value.invites[0] ?? null
  return value
}

export async function createAdvisorInvitePackage(
  payload: CreateAdvisorInvitePackagePayload
): Promise<AdvisorInvitePackageResponse> {
  const quantity = Math.max(1, Math.trunc(Number(payload.quantity || 0)))
  if (!payload.paymentMethodId) {
    throw new Error('Metodo de pagamento invalido.')
  }

  const requestPayload = {
    accountType: payload.accountType,
    quantity,
    unitPriceCents: payload.unitPriceCents,
    totalPriceCents: quantity * payload.unitPriceCents,
    paymentMethodId: payload.paymentMethodId,
    planSlug: payload.planSlug,
    maxUses: 1,
    expiresInDays: 3,
    chargeMode: 'IMMEDIATE',
  }

  try {
    const response = await requestAdvisorInviteFeature(
      [
        () => api.post('/advisor/invite-packages', requestPayload),
        () => api.post('/advisor/invites/packages', requestPayload),
        () => api.post('/advisor/client-invites/packages', requestPayload),
      ],
      'Erro ao gerar pacote de convites.'
    )

    const data = response.data ?? {}
    const rawPackage = data?.package ?? data?.invitePackage ?? data?.data?.package ?? data?.data ?? data
    const invitePackage = toAdvisorInvitePackage(rawPackage, {
      accountType: payload.accountType,
      quantity,
      unitPriceCents: payload.unitPriceCents,
      totalPriceCents: quantity * payload.unitPriceCents,
      status: 'PAID',
      paymentStatus: 'APPROVED',
    })
    const invitesRaw =
      data?.invites ?? data?.data?.invites ?? rawPackage?.invites ?? []
    const invites = (Array.isArray(invitesRaw) ? invitesRaw : [])
      .map((item, index) =>
        toAdvisorGeneratedInvite(item, {
          accountType: payload.accountType,
          paymentResponsible: 'ADVISOR',
          packageId: invitePackage.id,
          clientName: defaultClientName(payload.accountType, index + 1),
          maxUses: 1,
          uses: 0,
          expiresAt: addDaysIso(3),
          unitPriceCents: payload.unitPriceCents,
          totalPriceCents: invitePackage.totalPriceCents,
          paymentStatus: 'APPROVED',
          planSlug: payload.planSlug,
        })
      )
      .filter((item): item is AdvisorGeneratedInvite => Boolean(item))

    const normalizedInvites = invites.length
      ? invites
      : createLocalAdvisorInvitePackage(payload).invites.map((invite) => ({
          ...invite,
          packageId: invitePackage.id,
        }))

    normalizedInvites.forEach(upsertLocalAdvisorGeneratedInvite)
    return {
      package: invitePackage,
      invites: normalizedInvites,
    }
  } catch (error: unknown) {
    if (canUseLocalInviteFallback(error)) {
      return createLocalAdvisorInvitePackage(payload)
    }

    throw new Error(toAdvisorErrorMessage(error, 'Erro ao gerar pacote de convites.'))
  }
}

export async function updateAdvisorGeneratedInviteName(
  inviteId: string,
  payload: UpdateAdvisorGeneratedInviteNamePayload
): Promise<AdvisorGeneratedInvite> {
  const safeId = String(inviteId ?? '').trim()
  const clientName = String(payload.clientName ?? '').trim()
  const clientName2 = payload.clientName2 ? String(payload.clientName2).trim() : null

  if (!safeId) throw new Error('Convite invalido.')
  if (clientName.length < 2) throw new Error('Informe o nome do cliente.')

  const requestPayload = {
    clientName,
    clientName2,
  }

  try {
    const response = await requestAdvisorInviteFeature(
      [
        () => api.patch(`/advisor/invites/${safeId}`, requestPayload),
        () => api.patch(`/advisor/client-invites/commercial/${safeId}`, requestPayload),
        () => api.patch(`/advisor/clients/invites/commercial/${safeId}`, requestPayload),
      ],
      'Erro ao atualizar nome do convite.'
    )
    const data = response.data ?? {}
    const invite = toAdvisorGeneratedInvite(data?.invite ?? data?.data ?? data, {
      id: safeId,
      clientName,
      clientName2,
      status: 'PENDING',
    })

    if (!invite) throw new Error('Resposta invalida ao atualizar convite.')
    upsertLocalAdvisorGeneratedInvite(invite)
    return invite
  } catch (error: unknown) {
    if (canUseLocalInviteFallback(error)) {
      const updated = updateLocalAdvisorGeneratedInvite(safeId, {
        clientName,
        clientName2,
        status: 'PENDING',
      })
      if (updated) return updated
    }

    throw new Error(toAdvisorErrorMessage(error, 'Erro ao atualizar nome do convite.'))
  }
}

export async function cancelAdvisorGeneratedInvite(inviteId: string): Promise<void> {
  const safeId = String(inviteId ?? '').trim()
  if (!safeId) throw new Error('Convite invalido.')

  try {
    await requestAdvisorInviteFeature(
      [
        () => api.post(`/advisor/invites/${safeId}/cancel`, {}),
        () => api.patch(`/advisor/invites/${safeId}/cancel`, {}),
        () => api.post(`/advisor/client-invites/commercial/${safeId}/cancel`, {}),
        () => api.patch(`/advisor/client-invites/commercial/${safeId}/cancel`, {}),
      ],
      'Erro ao cancelar convite.'
    )
    updateLocalAdvisorGeneratedInvite(safeId, { status: 'CANCELLED' })
  } catch (error: unknown) {
    if (canUseLocalInviteFallback(error)) {
      const updated = updateLocalAdvisorGeneratedInvite(safeId, { status: 'CANCELLED' })
      if (updated) return
    }

    throw new Error(toAdvisorErrorMessage(error, 'Erro ao cancelar convite.'))
  }
}

function removeLocalAdvisorGeneratedInvite(inviteIdOrToken: string): boolean {
  const safeId = String(inviteIdOrToken ?? '').trim()
  if (!safeId) return false
  const current = readLocalAdvisorGeneratedInvites()
  const next = current.filter((invite) => invite.id !== safeId && invite.token !== safeId)
  if (next.length === current.length) return false
  writeLocalAdvisorGeneratedInvites(next)
  return true
}

export async function deleteAdvisorGeneratedInvite(inviteId: string): Promise<void> {
  const safeId = String(inviteId ?? '').trim()
  if (!safeId) throw new Error('Convite inválido.')

  try {
    await requestAdvisorInviteFeature(
      [
        () => api.delete(`/advisor/invites/${safeId}`),
        () => api.post(`/advisor/invites/${safeId}/delete`, {}),
        () => api.delete(`/advisor/client-invites/commercial/${safeId}`),
        () => api.post(`/advisor/client-invites/commercial/${safeId}/delete`, {}),
      ],
      'Erro ao excluir convite.'
    )
    removeLocalAdvisorGeneratedInvite(safeId)
  } catch (error: unknown) {
    if (canUseLocalInviteFallback(error)) {
      removeLocalAdvisorGeneratedInvite(safeId)
      return
    }
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao excluir convite.'))
  }
}

export async function createAdvisorClientInvite(
  payload: CreateAdvisorClientInvitePayload
): Promise<AdvisorClientInviteResponse> {
  const isQuickLink = toBoolean(payload.quickLink, false)
  const normalizedPayloadEmails = normalizeEmails(payload.emails)
  const normalizedSingleEmail = normalizeEmail(payload.emailOptional)
  const mergedEmails = normalizedPayloadEmails.length
    ? normalizedPayloadEmails
    : normalizedSingleEmail
      ? [normalizedSingleEmail]
      : []

  const expiresInHours =
    payload.expiresInHours ??
    (payload.expiresInDays ? Math.max(1, Math.round(payload.expiresInDays * 24)) : undefined)

  const requestPayload: Record<string, unknown> = isQuickLink
    ? {
        quickLink: true,
        expiresInDays: payload.expiresInDays,
        permission: payload.permission ?? payload.defaultPermission ?? 'READ_WRITE',
      }
    : {
        expiresAt: payload.expiresAt,
        expiresInHours,
        expiresInDays: payload.expiresInDays,
        maxUses: payload.maxUses ?? 1,
        permission: payload.permission ?? payload.defaultPermission ?? 'READ_WRITE',
      }
  if (!isQuickLink) {
    if (mergedEmails.length > 1) {
      requestPayload.emails = mergedEmails
    } else if (mergedEmails.length === 1) {
      requestPayload.emailOptional = mergedEmails[0]
    }
  }

  try {
    const response = await requestWithFallback(
      [
        () => api.post('/advisor/clients/invites', requestPayload),
        () => api.post('/advisor/client-invites', requestPayload),
        () => api.post('/advisor/clients/invite', requestPayload),
      ],
      'Erro ao gerar convite de cliente.'
    )

    const data = response.data ?? {}
    const requestMaxUses = isQuickLink ? 0 : toNumber(requestPayload.maxUses, 1)
    const requestPermission = toPermission(requestPayload.permission)
    const defaultEmail = !isQuickLink && mergedEmails.length === 1 ? mergedEmails[0] : null
    const requestQuickLink = toBoolean(requestPayload.quickLink, isQuickLink)
    const singleInviteRaw = {
      ...(data && typeof data === 'object' ? data : {}),
      ...(data?.data && typeof data.data === 'object' ? data.data : {}),
      ...(data?.invite && typeof data.invite === 'object' ? data.invite : {}),
    }
    const defaultInvite = toGeneratedInvite(singleInviteRaw, {
      maxUses: requestMaxUses,
      permission: requestPermission,
      emailOptional: defaultEmail,
      inviteUrl: '',
      usedCount: 0,
      quickLink: requestQuickLink,
      unlimitedUses: requestQuickLink,
    })

    const invitesRaw =
      data?.invites ??
      data?.batch?.invites ??
      data?.data?.invites ??
      data?.items ??
      []
    const parsedInvites = (Array.isArray(invitesRaw) ? invitesRaw : [])
      .map((item) =>
        toGeneratedInvite(item, {
          maxUses: requestMaxUses,
          permission: requestPermission,
          quickLink: requestQuickLink,
          unlimitedUses: requestQuickLink,
        })
      )
      .filter((item) => hasAnyInviteData(item))
    const invites = parsedInvites.length
      ? parsedInvites
      : hasAnyInviteData(defaultInvite)
        ? [defaultInvite]
        : []

    const requestedCount = mergedEmails.length || 1
    const totalRequested = Math.max(
      1,
      toInteger(data?.totalRequested ?? data?.batch?.totalRequested, requestedCount)
    )
    const totalCreated = Math.max(
      0,
      toInteger(data?.totalCreated ?? data?.batch?.totalCreated, invites.length || 1)
    )
    const totalEmailSent = Math.max(
      0,
      toInteger(
        data?.totalEmailSent ?? data?.batch?.totalEmailSent,
        invites.reduce((acc, item) => acc + (item.emailDeliverySent ? 1 : 0), 0)
      )
    )
    const totalEmailFailed = Math.max(
      0,
      toInteger(
        data?.totalEmailFailed ?? data?.batch?.totalEmailFailed,
        invites.reduce(
          (acc, item) =>
            acc +
            (item.emailDeliverySent === false || Boolean(item.emailDeliveryError) ? 1 : 0),
          0
        )
      )
    )
    const batch =
      Boolean(data?.batch) ||
      totalRequested > 1 ||
      mergedEmails.length > 1 ||
      invites.length > 1
    const firstInvite = invites[0] ?? defaultInvite
    const quickLink = toBoolean(
      data?.quickLink ?? data?.data?.quickLink ?? data?.invite?.quickLink ?? firstInvite.quickLink,
      requestQuickLink
    )
    const unlimitedUses = toBoolean(
      data?.unlimitedUses ??
      data?.data?.unlimitedUses ??
      data?.invite?.unlimitedUses ??
      firstInvite.unlimitedUses,
      quickLink
    )

    return {
      ...firstInvite,
      quickLink,
      unlimitedUses,
      batch,
      totalRequested,
      totalCreated,
      totalEmailSent,
      totalEmailFailed,
      invites,
    }
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao gerar convite de cliente.'))
  }
}

export async function revokeAdvisorClientInvite(inviteId: string): Promise<void> {
  const safeId = String(inviteId ?? '').trim()
  if (!safeId) {
    throw new Error('Convite invalido.')
  }

  await requestWithFallback(
    [
      () => api.post(`/advisor/clients/invites/${safeId}/revoke`, {}),
      () => api.patch(`/advisor/clients/invites/${safeId}/revoke`, {}),
    ],
    'Erro ao revogar convite de cliente.'
  )
}

export async function revokeAdvisorClientLink(clientLinkId: string): Promise<void> {
  const safeId = String(clientLinkId ?? '').trim()
  if (!safeId) {
    throw new Error('Vinculo invalido.')
  }

  await requestWithFallback(
    [
      () => api.post(`/advisor/clients/${safeId}/revoke`, {}),
      () => api.patch(`/advisor/clients/${safeId}/revoke`, {}),
      () => api.post(`/advisor/clients/${safeId}/disable`, {}),
      () => api.patch(`/advisor/clients/${safeId}/disable`, {}),
      () => api.post(`/advisor/client-links/${safeId}/revoke`, {}),
      () => api.patch(`/advisor/client-links/${safeId}/revoke`, {}),
    ],
    'Erro ao revogar vinculo do cliente.'
  )
}

export async function acceptAdvisorClientConnection(
  payload: AcceptAdvisorConnectionPayload
): Promise<void> {
  const value = String(payload?.tokenOrSlug ?? '').trim()
  if (value.length < 3) {
    throw new Error('Link de conexao invalido.')
  }

  const attempts = [
    () => api.post('/advisor/connect/accept', { token: value }),
    () => api.post('/advisor/connect/accept', { slug: value }),
    () => api.post('/advisor/clients/connect/accept', { token: value }),
    () => api.post('/advisor/clients/connect/accept', { slug: value }),
    () => api.post('/advisor/client-links/accept', { token: value }),
    () => api.post('/advisor/client-links/accept', { slug: value }),
  ]

  let lastError: unknown
  for (const attempt of attempts) {
    try {
      await attempt()
      return
    } catch (error: unknown) {
      lastError = error
      if (!axios.isAxiosError(error)) break
      const status = error.response?.status
      if (status === 404 || status === 405 || status === 400 || status === 422) {
        continue
      }
      break
    }
  }

  throw new Error(toAdvisorErrorMessage(lastError, 'Erro ao aceitar conexao com advisor.'))
}

export async function getAdvisorGeneratedInviteByToken(
  token: string
): Promise<AdvisorGeneratedInvite | null> {
  const safeToken = String(token ?? '').trim()
  if (safeToken.length < 10) {
    throw new Error('Token de convite invalido.')
  }

  const localInvite = readLocalAdvisorGeneratedInvites().find((invite) => invite.token === safeToken)

  try {
    const response = await requestAdvisorInviteFeature(
      [
        () => api.get(`/advisor/invites/token/${safeToken}`),
        () => api.get(`/advisor/invites/${safeToken}`),
        () => api.get(`/advisor/client-invites/commercial/${safeToken}`),
        () => api.get(`/advisor/clients/invites/commercial/${safeToken}`),
      ],
      'Erro ao carregar convite.'
    )
    const data = response.data ?? {}
    const invite = toAdvisorGeneratedInvite(data?.invite ?? data?.data ?? data, localInvite ?? {})
    return invite ?? localInvite ?? null
  } catch (error: unknown) {
    if (canUseLocalInviteFallback(error) && localInvite) {
      return localInvite
    }

    if (localInvite) return localInvite
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao carregar convite.'))
  }
}

export async function acceptAdvisorGeneratedInvite(token: string): Promise<void> {
  const safeToken = String(token ?? '').trim()
  if (safeToken.length < 10) {
    throw new Error('Token de convite invalido.')
  }

  try {
    await requestAdvisorInviteFeature(
      [
        () => api.post('/advisor/invites/accept', { token: safeToken }),
        () => api.post('/advisor/client-invites/commercial/accept', { token: safeToken }),
        () => api.post('/advisor/clients/invites/commercial/accept', { token: safeToken }),
        () => api.post('/advisor/clients/invites/accept', { token: safeToken }),
      ],
      'Erro ao aceitar convite de cliente.'
    )
    updateLocalAdvisorGeneratedInvite(safeToken, {
      status: 'ACCEPTED',
      uses: 1,
      acceptedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    if (canUseLocalInviteFallback(error)) {
      const updated = updateLocalAdvisorGeneratedInvite(safeToken, {
        status: 'ACCEPTED',
        uses: 1,
        acceptedAt: new Date().toISOString(),
      })
      if (updated) return
    }

    throw new Error(toAdvisorErrorMessage(error, 'Erro ao aceitar convite de cliente.'))
  }
}

export async function acceptAdvisorClientInvite(token: string): Promise<void> {
  const safeToken = String(token ?? '').trim()
  if (safeToken.length < 10) {
    throw new Error('Token de convite invalido.')
  }

  try {
    await api.post('/advisor/clients/invites/accept', { token: safeToken })
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao aceitar convite de cliente.'))
  }
}

export async function acceptAdvisorInvite(token: string): Promise<void> {
  const safeToken = String(token ?? '').trim()
  if (safeToken.length < 10) {
    throw new Error('Token de convite invalido.')
  }

  try {
    await api.post('/advisor/invites/accept', { token: safeToken })
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao aceitar convite de advisor.'))
  }
}

export type RegisterAdvisorPayload = {
  name: string
  email: string
  phone: string
}

export type RegisterOrganizationPayload = {
  orgName: string
  responsibleName: string
  email: string
  phone: string
}

export type RegisterResponse = {
  token: string
  access_token: string
  user: { id: string; name: string; email: string; phone: string; role: string }
  advisor: { id: string; publicSlug: string }
}

export async function registerAdvisor(data: RegisterAdvisorPayload): Promise<RegisterResponse> {
  try {
    const res = await api.post('/advisor/register', data, { withCredentials: true })
    return res.data
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao criar conta. Tente novamente.'))
  }
}

export async function registerOrganization(data: RegisterOrganizationPayload): Promise<RegisterResponse> {
  try {
    const res = await api.post('/organization/register', data, { withCredentials: true })
    return res.data
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao criar conta. Tente novamente.'))
  }
}

export type OrgAdvisorStatus = 'active' | 'pending'

export type OrgAdvisor = {
  id: string
  userId: string | null
  name: string
  email: string
  phone: string
  status: OrgAdvisorStatus
  activeClients: number
  pendingInvites: number
  criticalClients: number
  inactiveClients: number
  lastAccess: string | null
}

function toOrgAdvisor(raw: unknown): OrgAdvisor | null {
  const source = toRecord(raw)
  const id = toOptionalString(source.id)
  if (!id) return null

  const statusRaw = String(source.status ?? '').toLowerCase()
  const status: OrgAdvisorStatus = statusRaw === 'pending' ? 'pending' : 'active'

  return {
    id,
    userId: toOptionalString(source.userId),
    name: String(source.name ?? 'Advisor').trim() || 'Advisor',
    email: String(source.email ?? '').trim(),
    phone: String(source.phone ?? '').trim(),
    status,
    activeClients: toInteger(source.activeClients, 0),
    pendingInvites: toInteger(source.pendingInvites, 0),
    criticalClients: toInteger(source.criticalClients, 0),
    inactiveClients: toInteger(source.inactiveClients, 0),
    lastAccess: toIsoDate(source.lastAccess),
  }
}

export type OrgDashboardKpis = {
  totalAdvisors: number
  activeAdvisors: number
  pendingAdvisors: number
  totalClients: number
  totalPendingClientInvites: number
  newAdvisorsThisMonth: number
}

export type OrgDashboardAdvisor = {
  id: string
  userId: string | null
  name: string
  email: string
  status: 'active' | 'pending'
  activeClients: number
  pendingClientInvites: number
  joinedAt: string | null
}

export type OrgDashboardData = {
  kpis: OrgDashboardKpis
  advisors: OrgDashboardAdvisor[]
}

function toOrgDashboardAdvisor(raw: unknown): OrgDashboardAdvisor | null {
  const source = toRecord(raw)
  const id = toOptionalString(source.id)
  if (!id) return null
  const statusRaw = String(source.status ?? '').toLowerCase()
  return {
    id,
    userId: toOptionalString(source.userId),
    name: String(source.name ?? 'Advisor').trim() || 'Advisor',
    email: String(source.email ?? '').trim(),
    status: statusRaw === 'pending' ? 'pending' : 'active',
    activeClients: toInteger(source.activeClients, 0),
    pendingClientInvites: toInteger(source.pendingClientInvites, 0),
    joinedAt: toIsoDate(source.joinedAt),
  }
}

export async function getOrgDashboard(): Promise<OrgDashboardData> {
  try {
    const res = await api.get('/organization/dashboard')
    const data = res.data ?? {}
    const kpisRaw = toRecord(data.kpis)
    const kpis: OrgDashboardKpis = {
      totalAdvisors: toInteger(kpisRaw.totalAdvisors, 0),
      activeAdvisors: toInteger(kpisRaw.activeAdvisors, 0),
      pendingAdvisors: toInteger(kpisRaw.pendingAdvisors, 0),
      totalClients: toInteger(kpisRaw.totalClients, 0),
      totalPendingClientInvites: toInteger(kpisRaw.totalPendingClientInvites, 0),
      newAdvisorsThisMonth: toInteger(kpisRaw.newAdvisorsThisMonth, 0),
    }
    const rawAdvisors = data?.advisors ?? []
    const advisors = (Array.isArray(rawAdvisors) ? rawAdvisors : [])
      .map(toOrgDashboardAdvisor)
      .filter((a): a is OrgDashboardAdvisor => Boolean(a))
    return { kpis, advisors }
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao carregar dashboard da organização.'))
  }
}

export type InviteOrgAdvisorPayload = {
  email: string
  expiresInDays?: number
}

export type InviteOrgAdvisorResponse = {
  inviteId: string
  token: string
  inviteUrl: string
  email: string | null
  expiresAt: string
}

export async function inviteOrgAdvisor(data: InviteOrgAdvisorPayload): Promise<InviteOrgAdvisorResponse> {
  try {
    const res = await api.post('/organization/advisors/invite', data)
    return res.data
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao enviar convite.'))
  }
}

export type OrgAdvisorClient = {
  id: string
  clientUserId: string
  name: string
  email: string
  phone: string | null
  permission: string
  createdAt: string | null
}

export async function getOrgAdvisorClients(advisorUserId: string): Promise<OrgAdvisorClient[]> {
  const safeId = String(advisorUserId ?? '').trim()
  if (!safeId) throw new Error('ID inválido.')
  try {
    const res = await api.get(`/organization/advisors/${safeId}/clients`)
    const data = res.data ?? {}
    const raw = data?.clients ?? data?.data ?? (Array.isArray(data) ? data : [])
    return Array.isArray(raw) ? raw : []
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao carregar clientes do advisor.'))
  }
}

export async function removeOrgAdvisor(inviteId: string): Promise<void> {
  const safeId = String(inviteId ?? '').trim()
  if (!safeId) throw new Error('ID inválido.')
  try {
    await requestWithFallback(
      [
        () => api.delete(`/organization/advisors/${safeId}`),
        () => api.post(`/organization/advisors/${safeId}/remove`, {}),
      ],
      'Erro ao remover advisor.'
    )
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao remover advisor.'))
  }
}

export async function leaveOrg(): Promise<void> {
  try {
    await requestWithFallback(
      [
        () => api.post('/advisor/org/leave', {}),
        () => api.delete('/advisor/org/membership'),
      ],
      'Erro ao sair da organização.'
    )
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao sair da organização.'))
  }
}

export async function getOrgAdvisors(): Promise<OrgAdvisor[]> {
  try {
    const res = await api.get('/organization/advisors')
    const data = res.data ?? {}
    const raw = data?.advisors ?? data?.data ?? data?.items ?? (Array.isArray(data) ? data : [])
    return (Array.isArray(raw) ? raw : [])
      .map(toOrgAdvisor)
      .filter((item): item is OrgAdvisor => Boolean(item))
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao carregar advisors da organização.'))
  }
}

// ─── Delegation: org delegates subscription invites to advisors ───────────────

export type DelegateInvitePayload = {
  clientName?: string
  clientName2?: string
  accountType?: 'INDIVIDUAL' | 'COUPLE'
  planSlug?: string
  expiresInDays?: number
}

export type DelegatedInviteResult = {
  id: string
  token: string
  inviteUrl: string
  clientName: string | null
  clientName2: string | null
  accountType: string | null
  planSlug: string | null
  expiresAt: string
  createdAt: string
}

export type OrgDelegatedInviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'

export type OrgDelegatedInvite = {
  id: string
  token: string | null
  inviteUrl: string
  clientName: string | null
  clientName2: string | null
  accountType: string | null
  planSlug: string | null
  status: OrgDelegatedInviteStatus
  advisorName: string
  advisorEmail: string
  advisorUserId: string
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

function toOrgDelegatedInviteStatus(value: unknown): OrgDelegatedInviteStatus {
  const normalized = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (normalized === 'ACCEPTED') return 'ACCEPTED'
  if (normalized === 'EXPIRED') return 'EXPIRED'
  if (normalized === 'CANCELLED' || normalized === 'CANCELED' || normalized === 'REVOKED') return 'CANCELLED'
  return 'PENDING'
}

function toOrgDelegatedInvite(raw: unknown): OrgDelegatedInvite | null {
  const source = toRecord(raw)
  const id = toOptionalString(source.id)
  if (!id) return null
  return {
    id,
    token: toOptionalString(source.token),
    inviteUrl: String(source.inviteUrl ?? ''),
    clientName: toOptionalString(source.clientName),
    clientName2: toOptionalString(source.clientName2),
    accountType: toOptionalString(source.accountType),
    planSlug: toOptionalString(source.planSlug),
    status: toOrgDelegatedInviteStatus(source.status),
    advisorName: String(source.advisorName ?? 'Advisor').trim() || 'Advisor',
    advisorEmail: String(source.advisorEmail ?? '').trim(),
    advisorUserId: String(source.advisorUserId ?? '').trim(),
    expiresAt: toIsoDate(source.expiresAt) ?? new Date().toISOString(),
    acceptedAt: toIsoDate(source.acceptedAt),
    createdAt: toIsoDate(source.createdAt) ?? new Date().toISOString(),
  }
}

export async function delegateInviteToAdvisor(
  advisorUserId: string,
  payload: DelegateInvitePayload
): Promise<DelegatedInviteResult> {
  const safeId = String(advisorUserId ?? '').trim()
  if (!safeId) throw new Error('ID do advisor inválido.')
  try {
    const res = await api.post(`/organization/advisors/${safeId}/invites`, payload)
    const data = res.data ?? {}
    const inv = toRecord(data.invite ?? data)
    return {
      id: String(inv.id ?? ''),
      token: String(inv.token ?? ''),
      inviteUrl: String(inv.inviteUrl ?? ''),
      clientName: toOptionalString(inv.clientName),
      clientName2: toOptionalString(inv.clientName2),
      accountType: toOptionalString(inv.accountType),
      planSlug: toOptionalString(inv.planSlug),
      expiresAt: toIsoDate(inv.expiresAt) ?? new Date().toISOString(),
      createdAt: toIsoDate(inv.createdAt) ?? new Date().toISOString(),
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const data = (error.response?.data ?? {}) as ApiErrorShape
      const apiMsg =
        (typeof data.error === 'string' && data.error.trim()) ||
        (typeof data.message === 'string' && data.message.trim())
      if (apiMsg) throw new Error(apiMsg)
    }
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao delegar assinatura.'))
  }
}

// ─── Client-side advisor status ───────────────────────────────────────────────

export type MyAdvisorInfo = {
  advisorUserId: string
  advisorName: string
  advisorEmail: string
  permission: AdvisorPermission
  status: AdvisorClientStatus
}

/**
 * Called from the CLIENT's perspective to check if they have an active advisor.
 * Returns null when the user has no advisor linked.
 */
export async function getMyAdvisor(): Promise<MyAdvisorInfo | null> {
  try {
    const res = await api.get<MyAdvisorInfo | null>('/advisor/my-advisor')
    return res.data ?? null
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 204)) {
      return null
    }
    return null
  }
}

export async function getOrgAdvisorDelegatedInvites(
  advisorUserId: string
): Promise<OrgDelegatedInvite[]> {
  const safeId = String(advisorUserId ?? '').trim()
  if (!safeId) throw new Error('ID inválido.')
  try {
    const res = await api.get(`/organization/advisors/${safeId}/invites`)
    const data = res.data ?? {}
    const raw = data?.invites ?? data?.data ?? (Array.isArray(data) ? data : [])
    return (Array.isArray(raw) ? raw : [])
      .map(toOrgDelegatedInvite)
      .filter((item): item is OrgDelegatedInvite => Boolean(item))
  } catch (error: unknown) {
    throw new Error(toAdvisorErrorMessage(error, 'Erro ao carregar convites delegados.'))
  }
}
