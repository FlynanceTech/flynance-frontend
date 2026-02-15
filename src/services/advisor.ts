import axios from 'axios'
import api from '@/lib/axios'
import { getErrorMessage } from '@/utils/getErrorMessage'

export type AdvisorPermission = 'READ_ONLY' | 'READ_WRITE'
export type AdvisorClientStatus = 'ACTIVE' | 'PENDING' | 'REVOKED'
export type AdvisorClientInviteStatus = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'REVOKED'

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
  emailOptional?: string
  expiresAt?: string
  expiresInHours?: number
  expiresInDays?: number
  maxUses?: number
  permission?: AdvisorPermission
  defaultPermission?: AdvisorPermission
}

export type AdvisorClientInviteResponse = {
  inviteId?: string
  inviteUrl: string
  token?: string | null
  expiresAt?: string | null
  maxUses: number
  usedCount: number
  permission: AdvisorPermission
  emailOptional?: string | null
  emailDeliverySent?: boolean
}

export type AdvisorClientInvite = {
  id: string
  emailOptional?: string | null
  expiresAt?: string | null
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
    if (status === 403) return 'Acesso restrito a advisors.'
    const apiMessage =
      (typeof data.message === 'string' && data.message.trim()) ||
      (typeof data.error === 'string' && data.error.trim())
    if (apiMessage) return apiMessage
    if (status === 401) return 'Sua sessao expirou. Faca login novamente.'
    if (status === 400) return 'Requisicao invalida. Revise os dados informados.'
    if (status && status >= 500) return 'Servidor indisponivel no momento. Tente novamente.'
  }

  return getErrorMessage(error, fallback)
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

function toAdvisorClient(raw: any): AdvisorClient | null {
  const id = String(raw?.id ?? raw?.advisorClientId ?? '').trim()
  if (!id) return null

  const client = raw?.client ?? {}
  const clientUserId = String(raw?.clientUserId ?? raw?.userId ?? client?.id ?? id).trim()

  return {
    id,
    clientUserId,
    name: String(raw?.name ?? raw?.clientName ?? client?.name ?? 'Cliente sem nome').trim(),
    email: String(raw?.email ?? raw?.clientEmail ?? client?.email ?? '').trim(),
    phone:
      raw?.phone == null && client?.phone == null
        ? null
        : String(raw?.phone ?? client?.phone ?? '').trim() || null,
    permission: toPermission(raw?.permission ?? raw?.defaultPermission ?? raw?.accessLevel),
    status: toClientStatus(raw?.status ?? raw?.active),
    balance: toNumber(raw?.balance ?? raw?.totals?.balance ?? 0, 0),
    income: toNumber(raw?.income ?? raw?.totals?.income ?? 0, 0),
    expense: toNumber(raw?.expense ?? raw?.totals?.expense ?? 0, 0),
    score:
      raw?.score == null ? null : toNumber(raw?.score, 0),
    createdAt: toIsoDate(raw?.createdAt),
    latestActivityAt: toIsoDate(raw?.latestActivityAt ?? raw?.lastActivityAt),
  }
}

function toAdvisorClientInvite(raw: any): AdvisorClientInvite | null {
  const id = String(raw?.id ?? raw?.inviteId ?? '').trim()
  if (!id) return null

  return {
    id,
    emailOptional:
      raw?.emailOptional == null ? null : String(raw?.emailOptional).trim() || null,
    expiresAt: toIsoDate(raw?.expiresAt),
    maxUses: toNumber(raw?.maxUses, 1),
    usedCount: toNumber(raw?.usedCount, 0),
    permission: toPermission(raw?.permission ?? raw?.defaultPermission),
    revokedAt: toIsoDate(raw?.revokedAt),
    status: toInviteStatus(raw?.status),
  }
}

function toMeta(raw: any, fallbackPage = 1, fallbackLimit = 20): AdvisorPaginationMeta {
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
        (status === 403 && /administrador/i.test(apiMessage))

      if (shouldTryNext) {
        continue
      }
      break
    }
  }

  throw new Error(toAdvisorErrorMessage(lastError, fallbackError))
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

export async function createAdvisorClientInvite(
  payload: CreateAdvisorClientInvitePayload
): Promise<AdvisorClientInviteResponse> {
  const expiresInHours =
    payload.expiresInHours ??
    (payload.expiresInDays ? Math.max(1, Math.round(payload.expiresInDays * 24)) : undefined)

  const requestPayload = {
    emailOptional: payload.emailOptional?.trim() || undefined,
    expiresAt: payload.expiresAt,
    expiresInHours,
    expiresInDays: payload.expiresInDays,
    maxUses: payload.maxUses ?? 1,
    permission: payload.permission ?? payload.defaultPermission ?? 'READ_WRITE',
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
    const invite = data?.invite ?? data?.data ?? data
    return {
      inviteId: String(data?.inviteId ?? invite?.id ?? '').trim() || undefined,
      inviteUrl: String(data?.inviteLink ?? data?.inviteUrl ?? invite?.inviteUrl ?? '').trim(),
      token: String(data?.token ?? invite?.token ?? '').trim() || null,
      expiresAt: toIsoDate(data?.expiresAt ?? invite?.expiresAt),
      maxUses: toNumber(data?.maxUses ?? invite?.maxUses ?? requestPayload.maxUses, requestPayload.maxUses ?? 1),
      usedCount: toNumber(data?.usedCount ?? invite?.usedCount ?? 0, 0),
      permission: toPermission(data?.permission ?? invite?.permission ?? requestPayload.permission),
      emailOptional:
        data?.emailOptional == null ? null : String(data?.emailOptional).trim() || null,
      emailDeliverySent:
        data?.emailDelivery?.sent == null ? undefined : Boolean(data?.emailDelivery?.sent),
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
