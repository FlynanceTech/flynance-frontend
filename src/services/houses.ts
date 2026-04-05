import axios from 'axios'

import api from '@/lib/axios'
import type { PlansResponse } from '@/types/plan'
import type {
  CreateHousePayload,
  HouseContext,
  HouseInvite,
  HouseInviteStatus,
  HouseMember,
  HouseRole,
  HouseStatus,
} from '@/types/house'
import { getErrorMessage } from '@/utils/getErrorMessage'

type ApiErrorShape = {
  message?: string
  error?: string
}

function toHouseErrorMessage(error: unknown, fallback: string): string {
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
    if (status === 404) return 'Nenhuma house encontrada para este usuario.'
    if (status && status >= 500) return 'Servidor indisponivel no momento. Tente novamente.'
  }

  return getErrorMessage(error, fallback)
}

function toOptionalString(value: unknown): string | null {
  if (value == null) return null
  const normalized = String(value).trim()
  return normalized || null
}

function toIsoDate(value: unknown): string | null {
  if (value == null || value === '') return null

  if (typeof value === 'number') {
    const ms = value > 10_000_000_000 ? value : value * 1000
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeRole(value: unknown, raw?: any): HouseRole {
  if (raw?.isOwner === true) return 'OWNER'
  if (raw?.isPartner === true) return 'PARTNER'

  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'PARTNER') return 'PARTNER'
  return 'OWNER'
}

function normalizeStatus(value: unknown, hasPartner: boolean): HouseStatus {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'COUPLE') return 'COUPLE'
  if (normalized === 'SOLO') return 'SOLO'
  return hasPartner ? 'COUPLE' : 'SOLO'
}

function normalizeInviteStatus(value: unknown): HouseInviteStatus {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'ACCEPTED') return 'ACCEPTED'
  if (normalized === 'REVOKED') return 'REVOKED'
  if (normalized === 'EXPIRED') return 'EXPIRED'
  if (normalized === 'PENDING') return 'PENDING'
  return 'UNKNOWN'
}

function toHouseMember(raw: any): HouseMember | null {
  if (!raw) return null

  const source = raw?.user ?? raw?.member ?? raw?.profile ?? raw
  const id = toOptionalString(source?.id ?? source?.userId ?? raw?.id ?? raw?.userId)
  const name = toOptionalString(source?.name ?? raw?.name)
  const email = toOptionalString(source?.email ?? raw?.email)

  if (!id && !name && !email) return null

  return {
    id,
    name,
    email,
  }
}

function toHouseInvite(raw: any): HouseInvite | null {
  if (!raw) return null

  const id =
    toOptionalString(raw?.id ?? raw?.inviteId ?? raw?.token ?? raw?.slug ?? raw?.url) ?? null

  if (!id) return null

  return {
    id,
    token: toOptionalString(raw?.token),
    inviteUrl: toOptionalString(raw?.inviteUrl ?? raw?.url ?? raw?.link),
    status: normalizeInviteStatus(raw?.status),
    createdAt: toIsoDate(raw?.createdAt),
    expiresAt: toIsoDate(raw?.expiresAt),
  }
}

function extractHouseSource(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw
  if (raw.houseContext) return raw.houseContext
  if (raw.house) return raw.house
  if (raw.data?.houseContext) return raw.data.houseContext
  if (raw.data?.house) return raw.data.house
  if (raw.data) return raw.data
  return raw
}

function toHouseInvites(raw: any): HouseInvite[] {
  const source = extractHouseSource(raw)
  const invitesRaw =
    source?.pendingInvites ??
    source?.invites ??
    source?.houseInvites ??
    raw?.pendingInvites ??
    raw?.invites ??
    raw?.data?.pendingInvites ??
    raw?.data?.invites ??
    []

  if (!Array.isArray(invitesRaw)) return []

  return invitesRaw
    .map(toHouseInvite)
    .filter((invite): invite is HouseInvite => Boolean(invite))
}

export function toHouseContext(raw: unknown): HouseContext | null {
  const source = extractHouseSource(raw as any)
  if (!source || typeof source !== 'object') return null

  const id = toOptionalString(source?.id ?? source?.houseId)
  if (!id) return null

  const owner = toHouseMember(source?.owner ?? source?.ownerUser)
  const partner = toHouseMember(source?.partner ?? source?.partnerUser)
  const invites = toHouseInvites(source)

  return {
    id,
    name: toOptionalString(source?.name ?? source?.houseName ?? source?.title),
    role: normalizeRole(source?.role ?? source?.userRole ?? source?.currentUserRole, source),
    status: normalizeStatus(source?.status, Boolean(partner)),
    owner,
    partner,
    invites,
    createdAt: toIsoDate(source?.createdAt),
    linkedAt: toIsoDate(source?.linkedAt ?? source?.partnerLinkedAt ?? source?.coupleSince),
  }
}

export function hasHouseContextInAuthMePayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false

  const raw = payload as Record<string, any>
  if ('houseContext' in raw) return true
  if (raw.userData && typeof raw.userData === 'object' && 'houseContext' in raw.userData) return true
  if (raw.data && typeof raw.data === 'object' && 'houseContext' in raw.data) return true

  return false
}

export function extractHouseContextFromAuthMePayload(payload: unknown): HouseContext | null {
  if (!payload || typeof payload !== 'object') return null

  const raw = payload as Record<string, any>
  const candidates = [raw.houseContext, raw.userData?.houseContext, raw.data?.houseContext, raw]

  for (const candidate of candidates) {
    const context = toHouseContext(candidate)
    if (context) return context
  }

  return null
}

export async function getHouseContext(): Promise<HouseContext | null> {
  try {
    const response = await api.get('/houses/me')
    return toHouseContext(response.data)
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }

    throw new Error(toHouseErrorMessage(error, 'Erro ao carregar a conta casal.'))
  }
}

export async function createHouse(payload: CreateHousePayload): Promise<HouseContext> {
  try {
    const response = await api.post('/houses', {
      name: String(payload.name ?? '').trim(),
    })

    const house = toHouseContext(response.data)
    if (!house) {
      throw new Error('O backend nao retornou a house criada.')
    }

    return house
  } catch (error: unknown) {
    throw new Error(toHouseErrorMessage(error, 'Erro ao criar a house.'))
  }
}

export async function createHouseInvite(): Promise<HouseInvite | null> {
  try {
    const response = await api.post('/houses/me/invites', {})
    const raw = response.data ?? {}

    const invite =
      toHouseInvite(raw?.invite) ??
      toHouseInvite(raw?.data?.invite) ??
      toHouseInvite(raw) ??
      toHouseInvites(raw)[0] ??
      null

    return invite
  } catch (error: unknown) {
    throw new Error(toHouseErrorMessage(error, 'Erro ao gerar convite da conta casal.'))
  }
}

export async function acceptHouseInvite(token: string): Promise<HouseContext | null> {
  const safeToken = String(token ?? '').trim()
  if (safeToken.length < 6) {
    throw new Error('Token de convite invalido.')
  }

  try {
    const response = await api.post('/houses/invites/accept', { token: safeToken })
    return toHouseContext(response.data)
  } catch (error: unknown) {
    throw new Error(toHouseErrorMessage(error, 'Erro ao aceitar convite da conta casal.'))
  }
}

export async function removeHousePartner(): Promise<HouseContext | null> {
  try {
    const response = await api.post('/houses/me/partner/remove', {})
    return toHouseContext(response.data)
  } catch (error: unknown) {
    throw new Error(toHouseErrorMessage(error, 'Erro ao remover o parceiro da house.'))
  }
}

export function buildHouseInviteUrl(token: string, baseUrl?: string | null): string | null {
  const safeToken = String(token ?? '').trim()
  if (!safeToken) return null

  const runtimeBase =
    typeof window !== 'undefined' ? String(window.location.origin ?? '') : ''
  const safeBase = String(baseUrl ?? runtimeBase).trim().replace(/\/+$/, '')
  if (!safeBase) return `/conta-casal/convite/${safeToken}`

  return `${safeBase}/conta-casal/convite/${safeToken}`
}

function normalizePlanText(plan: PlansResponse): string {
  return [
    plan.slug,
    plan.name,
    plan.description,
    ...(Array.isArray(plan.features)
      ? plan.features.flatMap((feature) => [feature.label, feature.key, feature.value])
      : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function scoreCouplePlan(plan: PlansResponse): number {
  const text = normalizePlanText(plan)
  let score = 0

  const keywordWeights: Array<[RegExp, number]> = [
    [/\bcasal\b/, 100],
    [/\bcouple\b/, 100],
    [/\bduo\b/, 90],
    [/\bpartner\b/, 70],
    [/\bfamily\b/, 60],
    [/\bfamilia\b/, 60],
    [/\bshared\b/, 50],
    [/\bcompartilh/, 50],
    [/\bhouse\b/, 40],
    [/\b2\s*(usuarios|pessoas|people|members)\b/, 60],
    [/\bdois\s*(usuarios|membros)\b/, 60],
  ]

  keywordWeights.forEach(([pattern, weight]) => {
    if (pattern.test(text)) score += weight
  })

  if (plan.isFeatured) score += 10
  if (plan.period === 'YEARLY') score += 2

  return score
}

export function findCouplePlan(plans: PlansResponse[]): PlansResponse | null {
  const candidates = plans
    .filter((plan) => plan.isActive && plan.isPublic)
    .map((plan) => ({ plan, score: scoreCouplePlan(plan) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return candidates[0]?.plan ?? null
}
