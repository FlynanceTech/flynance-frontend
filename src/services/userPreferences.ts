import type {
  UpdateUserCyclePreferencesInput,
  UserCyclePreferences,
} from '@/utils/cyclePreferences'

type PreferencesApiResponse = {
  ok: boolean
  preferences?: UserCyclePreferences
  message?: string
}

async function parsePreferencesResponse(response: Response): Promise<UserCyclePreferences> {
  const payload = (await response.json()) as PreferencesApiResponse
  if (!response.ok || !payload.ok || !payload.preferences) {
    throw new Error(payload.message || 'Nao foi possivel carregar preferencias de ciclo.')
  }
  return payload.preferences
}

export async function getUserCyclePreferences(): Promise<UserCyclePreferences> {
  const response = await fetch('/api/users/preferences', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  })
  return parsePreferencesResponse(response)
}

export async function updateUserCyclePreferences(
  input: UpdateUserCyclePreferencesInput
): Promise<UserCyclePreferences> {
  const response = await fetch('/api/users/preferences', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parsePreferencesResponse(response)
}
