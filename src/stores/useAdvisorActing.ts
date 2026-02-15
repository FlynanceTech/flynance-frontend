import { create } from 'zustand'

type AdvisorPermission = 'READ_ONLY' | 'READ_WRITE'

type ActingClient = {
  id: string
  name?: string | null
  email?: string | null
  permission?: AdvisorPermission | null
}

const ACTIVE_CLIENT_ID_STORAGE_KEY = 'advisor_active_client_id'
const ACTIVE_CLIENT_NAME_STORAGE_KEY = 'advisor_active_client_name'
const ACTIVE_CLIENT_EMAIL_STORAGE_KEY = 'advisor_active_client_email'
const ACTIVE_CLIENT_PERMISSION_STORAGE_KEY = 'advisor_active_client_permission'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStorageValue(key: string): string | null {
  if (!canUseStorage()) return null
  try {
    const value = window.localStorage.getItem(key)
    return value && value.trim() ? value.trim() : null
  } catch {
    return null
  }
}

function readPermission(): AdvisorPermission | null {
  const raw = readStorageValue(ACTIVE_CLIENT_PERMISSION_STORAGE_KEY)
  if (raw === 'READ_ONLY' || raw === 'READ_WRITE') return raw
  return null
}

function persistActingClient(client: {
  id: string
  name: string | null
  email: string | null
  permission: AdvisorPermission | null
}) {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(ACTIVE_CLIENT_ID_STORAGE_KEY, client.id)
    if (client.name) window.localStorage.setItem(ACTIVE_CLIENT_NAME_STORAGE_KEY, client.name)
    else window.localStorage.removeItem(ACTIVE_CLIENT_NAME_STORAGE_KEY)
    if (client.email) window.localStorage.setItem(ACTIVE_CLIENT_EMAIL_STORAGE_KEY, client.email)
    else window.localStorage.removeItem(ACTIVE_CLIENT_EMAIL_STORAGE_KEY)
    if (client.permission) window.localStorage.setItem(ACTIVE_CLIENT_PERMISSION_STORAGE_KEY, client.permission)
    else window.localStorage.removeItem(ACTIVE_CLIENT_PERMISSION_STORAGE_KEY)
  } catch {
    // ignora erro de storage bloqueado
  }
}

function clearActingClientStorage() {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(ACTIVE_CLIENT_ID_STORAGE_KEY)
    window.localStorage.removeItem(ACTIVE_CLIENT_NAME_STORAGE_KEY)
    window.localStorage.removeItem(ACTIVE_CLIENT_EMAIL_STORAGE_KEY)
    window.localStorage.removeItem(ACTIVE_CLIENT_PERMISSION_STORAGE_KEY)
  } catch {
    // ignora erro de storage bloqueado
  }
}

const initialActiveClientId = readStorageValue(ACTIVE_CLIENT_ID_STORAGE_KEY)
const initialActiveClientName = readStorageValue(ACTIVE_CLIENT_NAME_STORAGE_KEY)
const initialActiveClientEmail = readStorageValue(ACTIVE_CLIENT_EMAIL_STORAGE_KEY)
const initialActiveClientPermission = readPermission()

type AdvisorActingStore = {
  activeClientId: string | null
  activeClientName: string | null
  activeClientEmail: string | null
  activePermission: AdvisorPermission | null
  actingAsClient: boolean
  selectedClientId: string | null
  selectedClientName: string | null
  selectedClientEmail: string | null
  selectedPermission: AdvisorPermission | null
  setActingClient: (client: ActingClient) => void
  clearActingClient: () => void
}

export const useAdvisorActing = create<AdvisorActingStore>((set) => ({
  activeClientId: initialActiveClientId,
  activeClientName: initialActiveClientName,
  activeClientEmail: initialActiveClientEmail,
  activePermission: initialActiveClientPermission,
  actingAsClient: Boolean(initialActiveClientId),
  selectedClientId: initialActiveClientId,
  selectedClientName: initialActiveClientName,
  selectedClientEmail: initialActiveClientEmail,
  selectedPermission: initialActiveClientPermission,
  setActingClient: (client) => {
    const nextId = String(client.id ?? '').trim()
    const nextName = client.name?.trim() || null
    const nextEmail = client.email?.trim() || null
    const nextPermission = client.permission ?? null
    if (!nextId) return

    persistActingClient({
      id: nextId,
      name: nextName,
      email: nextEmail,
      permission: nextPermission,
    })

    set({
      activeClientId: nextId,
      activeClientName: nextName,
      activeClientEmail: nextEmail,
      activePermission: nextPermission,
      actingAsClient: true,
      selectedClientId: nextId,
      selectedClientName: nextName,
      selectedClientEmail: nextEmail,
      selectedPermission: nextPermission,
    })
  },
  clearActingClient: () => {
    clearActingClientStorage()
    set({
      activeClientId: null,
      activeClientName: null,
      activeClientEmail: null,
      activePermission: null,
      actingAsClient: false,
      selectedClientId: null,
      selectedClientName: null,
      selectedClientEmail: null,
      selectedPermission: null,
    })
  },
}))
