import { create } from 'zustand'

type AdvisorPermission = 'READ_ONLY' | 'READ_WRITE'

type ActingClient = {
  id: string
  name?: string | null
  email?: string | null
  permission?: AdvisorPermission | null
}

type AdvisorActingStore = {
  selectedClientId: string | null
  selectedClientName: string | null
  selectedClientEmail: string | null
  selectedPermission: AdvisorPermission | null
  setActingClient: (client: ActingClient) => void
  clearActingClient: () => void
}

export const useAdvisorActing = create<AdvisorActingStore>((set) => ({
  selectedClientId: null,
  selectedClientName: null,
  selectedClientEmail: null,
  selectedPermission: null,
  setActingClient: (client) =>
    set({
      selectedClientId: client.id,
      selectedClientName: client.name ?? null,
      selectedClientEmail: client.email ?? null,
      selectedPermission: client.permission ?? null,
    }),
  clearActingClient: () =>
    set({
      selectedClientId: null,
      selectedClientName: null,
      selectedClientEmail: null,
      selectedPermission: null,
    }),
}))

