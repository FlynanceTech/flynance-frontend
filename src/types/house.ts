export type HouseRole = 'OWNER' | 'PARTNER'

export type HouseStatus = 'SOLO' | 'COUPLE'

export type HouseInviteStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED' | 'UNKNOWN'

export type HouseMember = {
  id: string | null
  name: string | null
  email: string | null
}

export type HouseInvite = {
  id: string
  token: string | null
  inviteUrl: string | null
  status: HouseInviteStatus
  createdAt: string | null
  expiresAt: string | null
}

export type HouseContext = {
  id: string
  name: string | null
  role: HouseRole
  status: HouseStatus
  owner: HouseMember | null
  partner: HouseMember | null
  invites: HouseInvite[]
  createdAt: string | null
  linkedAt: string | null
}

export type CreateHousePayload = {
  name: string
}
