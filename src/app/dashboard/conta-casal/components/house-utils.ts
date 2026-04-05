import { buildHouseInviteUrl } from '@/services/houses'
import type { HouseContext, HouseInvite, HouseMember } from '@/types/house'

export function formatHouseDate(value: string | null | undefined, locale: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(locale || 'pt-BR')
}

export function getHouseMemberDisplayName(
  member: HouseMember | null | undefined,
  fallback: string
): string {
  return member?.name || member?.email || fallback
}

export function getCounterpartMember(house: HouseContext): HouseMember | null {
  return house.role === 'OWNER' ? house.partner : house.owner
}

export function resolveHouseInviteLink(
  invite: HouseInvite,
  baseUrl?: string | null
): string | null {
  if (invite.inviteUrl) return invite.inviteUrl
  return buildHouseInviteUrl(invite.token ?? '', baseUrl)
}
