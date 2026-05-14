export type HouseRole = 'OWNER' | 'PARTNER'

export type HouseStatus = 'SOLO' | 'COUPLE'

export type HouseInviteStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED' | 'UNKNOWN'

export type HouseMember = {
  id: string | null
  userId: string | null
  name: string | null
  email: string | null
  role: HouseRole | null
  active: boolean
  joinedAt: string | null
  leftAt: string | null
}

export type HouseMembership = {
  id: string | null
  role: HouseRole
  active: boolean
  joinedAt: string | null
  leftAt: string | null
}

export type HouseRecord = {
  id: string
  name: string | null
  status: HouseStatus
  ownerUserId: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type HouseInvite = {
  id: string
  token: string | null
  inviteUrl: string | null
  status: HouseInviteStatus
  createdAt: string | null
  expiresAt: string | null
  acceptedAt: string | null
  revokedAt: string | null
  acceptedByUserId: string | null
  acceptedByName: string | null
  acceptedByEmail: string | null
}

export type HouseContext = {
  id: string
  name: string | null
  role: HouseRole
  membership: HouseMembership | null
  isOwner: boolean
  status: HouseStatus
  ownerUserId: string | null
  owner: HouseMember | null
  partner: HouseMember | null
  members: HouseMember[]
  pendingInvites: HouseInvite[]
  invites: HouseInvite[]
  createdAt: string | null
  updatedAt: string | null
  linkedAt: string | null
}

export type HouseApiResponse = {
  house: HouseRecord
  membership: HouseMembership | null
  isOwner: boolean
  partner: HouseMember | null
  members: HouseMember[]
  pendingInvites: HouseInvite[]
}

export type CreateHousePayload = {
  name: string
}
