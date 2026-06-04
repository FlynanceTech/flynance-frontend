export type LoginPreference = 'AUTO' | 'EMAIL' | 'WHATSAPP'
export type UserTheme = 'LIGHT' | 'DARK'

export type UserPreferences = {
  id: string
  userId: string
  currency: string
  locale: string
  timezone: string
  theme: UserTheme
  pwaInstalled: boolean
  pwaInstalledAt: string | null
  notificationsEnabled: boolean
  notificationInApp: boolean
  notificationEmail: boolean
  notificationWhatsapp: boolean
  notificationPush: boolean
  dailyNoTransactionNudgeEnabled: boolean
  loginPreference: LoginPreference
  createdAt: string
  updatedAt: string
}

export type UserPreferencesPatch = Partial<
  Pick<
    UserPreferences,
    | 'currency'
    | 'locale'
    | 'timezone'
    | 'theme'
    | 'pwaInstalled'
    | 'pwaInstalledAt'
    | 'notificationsEnabled'
    | 'notificationInApp'
    | 'notificationEmail'
    | 'notificationWhatsapp'
    | 'notificationPush'
    | 'dailyNoTransactionNudgeEnabled'
    | 'loginPreference'
  >
>
