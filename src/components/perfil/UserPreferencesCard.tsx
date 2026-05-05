'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, Download, Globe, Languages, LogIn, MonitorSmartphone, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Switch } from '@/components/ui/switch'
import { useUserAppPreferences } from '@/hooks/query/useUserAppPreferences'
import { useUserPreferencesStore } from '@/stores/useUserPreferences'
import { diffUserPreferences } from '@/services/userAppPreferences'
import type { LoginPreference, UserPreferences } from '@/types/userPreferences'
import { getErrorMessage } from '@/utils/getErrorMessage'
import { useUserTheme } from '@/providers/UserThemeProvider'
import { useTranslations } from 'next-intl'
import { Button } from '../ui/button'

const LOGIN_METHOD_STORAGE_KEY = 'flynance_login_method'

const CURRENCY_OPTIONS = ['BRL', 'USD', 'EUR', 'GBP', 'ARS'] as const
const LOCALE_OPTIONS = ['pt-BR', 'en-US', 'es-ES'] as const

const FALLBACK_TIMEZONE_OPTIONS = [
  'UTC',
  'America/Sao_Paulo',
  'America/Belem',
  'America/Fortaleza',
  'America/Manaus',
  'America/Rio_Branco',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Bogota',
  'America/Buenos_Aires',
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Africa/Johannesburg',
] as const

type FormState = {
  currency: string
  locale: string
  timezone: string
  notificationsEnabled: boolean
  notificationInApp: boolean
  notificationEmail: boolean
  notificationWhatsapp: boolean
  notificationPush: boolean
  loginPreference: LoginPreference
}

function toFormState(preferences: UserPreferences): FormState {
  return {
    currency: preferences.currency,
    locale: preferences.locale,
    timezone: preferences.timezone,
    notificationsEnabled: preferences.notificationsEnabled,
    notificationInApp: preferences.notificationInApp,
    notificationEmail: preferences.notificationEmail,
    notificationWhatsapp: preferences.notificationWhatsapp,
    notificationPush: preferences.notificationPush,
    loginPreference: preferences.loginPreference,
  }
}

function syncLoginMethodStorage(loginPreference: LoginPreference) {
  if (typeof window === 'undefined') return
  if (loginPreference === 'EMAIL') {
    window.sessionStorage.setItem(LOGIN_METHOD_STORAGE_KEY, 'email')
    return
  }
  if (loginPreference === 'WHATSAPP') {
    window.sessionStorage.setItem(LOGIN_METHOD_STORAGE_KEY, 'whatsapp')
    return
  }
  window.sessionStorage.removeItem(LOGIN_METHOD_STORAGE_KEY)
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  return Boolean(mediaStandalone || iosStandalone)
}

function getSupportedTimezoneOptions() {
  if (typeof Intl === 'undefined') return [...FALLBACK_TIMEZONE_OPTIONS]
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (type: string) => string[]
  }
  if (typeof intlWithSupportedValues.supportedValuesOf !== 'function') {
    return [...FALLBACK_TIMEZONE_OPTIONS]
  }

  try {
    const supported = intlWithSupportedValues.supportedValuesOf('timeZone')
    if (!Array.isArray(supported) || supported.length === 0) {
      return [...FALLBACK_TIMEZONE_OPTIONS]
    }
    return supported
  } catch {
    return [...FALLBACK_TIMEZONE_OPTIONS]
  }
}

function formatTimezoneOptionLabel(timezone: string, locale: string) {
  try {
    const formatter = new Intl.DateTimeFormat(locale || 'pt-BR', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const offset =
      formatter.formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value ||
      'GMT'
    return `(${offset}) ${timezone}`
  } catch {
    return timezone
  }
}

function resolvePermissionBadgeClasses(permission: NotificationPermission | 'unsupported') {
  if (permission === 'granted') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (permission === 'denied') {
    return 'border-red-200 bg-red-50 text-red-700'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function resolveSubscriptionBadgeClasses(isActive: boolean) {
  return isActive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-50 text-slate-700'
}

export default function UserPreferencesCard() {
  const t = useTranslations('preferences')
  const { preferencesQuery, updatePreferencesMutation } = useUserAppPreferences()
  const storePreferences = useUserPreferencesStore((s) => s.preferences)
  const { theme, saveTheme, isSavingTheme } = useUserTheme()
  const pushNotifications = usePushNotifications()
  const sourcePreferences = preferencesQuery.data ?? storePreferences

  const [form, setForm] = useState<FormState | null>(null)
  const [baseline, setBaseline] = useState<UserPreferences | null>(null)
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (!sourcePreferences) return
    setBaseline(sourcePreferences)
    setForm(toFormState(sourcePreferences))
  }, [sourcePreferences])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onBeforeInstallPrompt = (event: Event) => {
      if (!('prompt' in event)) return
      const promptEvent = event as BeforeInstallPromptEvent
      promptEvent.preventDefault()
      setDeferredInstallPrompt(promptEvent)
    }

    const onAppInstalled = () => {
      setDeferredInstallPrompt(null)
    }

    if (isStandaloneMode()) {
      setDeferredInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const isBusy = preferencesQuery.isLoading || updatePreferencesMutation.isPending

  const pwaInstalledLabel = useMemo(() => {
    if (!sourcePreferences?.pwaInstalled) return t('pwa.notDetected')
    if (!sourcePreferences.pwaInstalledAt) return t('pwa.installed')
    const installedAt = new Date(sourcePreferences.pwaInstalledAt)
    if (Number.isNaN(installedAt.getTime())) return t('pwa.installed')
    const locale = sourcePreferences.locale || undefined
    return t('pwa.installedAt', { date: installedAt.toLocaleString(locale) })
  }, [sourcePreferences?.pwaInstalled, sourcePreferences?.pwaInstalledAt, sourcePreferences?.locale, t])

  const timezoneOptions = useMemo(() => {
    const values = new Set<string>(getSupportedTimezoneOptions())
    const selectedTimezone = form?.timezone?.trim()
    const sourceTimezone = sourcePreferences?.timezone?.trim()
    if (selectedTimezone) values.add(selectedTimezone)
    if (sourceTimezone) values.add(sourceTimezone)

    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [form?.timezone, sourcePreferences?.timezone])

  const canShowPwaInstallAction = Boolean(sourcePreferences && !sourcePreferences.pwaInstalled)
  const permissionLabel = t(`notifications.permission.${pushNotifications.permission}`)
  const subscriptionLabel = pushNotifications.hasActiveSubscription
    ? t('notifications.subscription.active')
    : t('notifications.subscription.inactive')
  const pushHint = !pushNotifications.support.isSupported
    ? t('notifications.unsupportedHint')
    : pushNotifications.permission === 'denied'
      ? t('notifications.deniedHint')
      : pushNotifications.hasActiveSubscription
        ? t('notifications.activeHint')
        : t('notifications.inactiveHint')

  const handleInstallPwa = async () => {
    if (isStandaloneMode() || sourcePreferences?.pwaInstalled) {
      toast(t('pwa.alreadyInstalled'))
      return
    }

    if (!deferredInstallPrompt) {
      toast(t('pwa.noPrompt'))
      return
    }

    try {
      await deferredInstallPrompt.prompt()
      const choice = await deferredInstallPrompt.userChoice
      if (choice.outcome === 'accepted') {
        toast.success(t('pwa.installStarted'))
      } else {
        toast(t('pwa.installCanceled'))
      }
    } catch {
      toast.error(t('pwa.installFailed'))
    } finally {
      setDeferredInstallPrompt(null)
    }
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!baseline || !form) return

    const nextPreferences: UserPreferences = {
      ...baseline,
      currency: form.currency.trim().toUpperCase() || baseline.currency,
      locale: form.locale.trim() || baseline.locale,
      timezone: form.timezone.trim() || baseline.timezone,
      notificationsEnabled: form.notificationsEnabled,
      notificationInApp: form.notificationInApp,
      notificationEmail: form.notificationEmail,
      notificationWhatsapp: form.notificationWhatsapp,
      notificationPush: form.notificationPush,
      loginPreference: form.loginPreference,
    }

    const patch = diffUserPreferences(baseline, nextPreferences)
    if (Object.keys(patch).length === 0) {
      toast(t('actions.noChanges'))
      return
    }

    try {
      const updated = await updatePreferencesMutation.mutateAsync(patch)
      setBaseline(updated)
      setForm(toFormState(updated))
      syncLoginMethodStorage(updated.loginPreference)

      try {
        await pushNotifications.syncWithPreferences({
          notificationsEnabled: updated.notificationsEnabled,
          notificationPush: updated.notificationPush,
        })
      } catch (error: unknown) {
        toast.success(t('actions.saveSuccess'))
        toast.error(getErrorMessage(error, t('notifications.syncError')))
        return
      }

      toast.success(t('actions.saveSuccess'))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('actions.saveFailed')))
    }
  }

  const handleMasterToggle = (enabled: boolean) => {
    setForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        notificationsEnabled: enabled,
      }
    })
  }

  const handleThemeChange = async (checked: boolean) => {
    const nextTheme = checked ? 'DARK' : 'LIGHT'
    if (nextTheme === theme) return
    try {
      await saveTheme(nextTheme)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('theme.saveFailed')))
    }
  }

  const handleActivatePushNotifications = async () => {
    if (!baseline || !form) return

    try {
      const activationResult = await pushNotifications.activate()

      if (activationResult.permission === 'denied') {
        toast.error(t('notifications.activationDenied'))
        return
      }

      if (activationResult.permission !== 'granted' || !activationResult.hasActiveSubscription) {
        toast(t('notifications.activationPending'))
        return
      }

      if (!baseline.notificationsEnabled || !baseline.notificationPush) {
        const updated = await updatePreferencesMutation.mutateAsync({
          notificationsEnabled: true,
          notificationPush: true,
        })
        setBaseline(updated)
        setForm((prev) =>
          prev
            ? {
                ...prev,
                notificationsEnabled: true,
                notificationPush: true,
              }
            : toFormState(updated)
        )
      } else {
        setForm((prev) =>
          prev
            ? {
                ...prev,
                notificationsEnabled: true,
                notificationPush: true,
              }
            : prev
        )
      }

      toast.success(t('notifications.activationSuccess'))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('notifications.syncError')))
    }
  }

  if (preferencesQuery.isLoading && !form) {
    return <div className="h-60 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
  }

  if (!form || !baseline) return null

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-slide-up">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {preferencesQuery.isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {preferencesQuery.error instanceof Error ? preferencesQuery.error.message : t('loadError')}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" /> {t('currency')}
            </span>
            <select
              value={form.currency}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, currency: event.target.value } : prev))
              }
              disabled={isBusy}
              className="h-10 rounded-xl border border-border bg-[hsl(var(--input))] px-3 text-foreground outline-none focus:border-primary"
            >
              {CURRENCY_OPTIONS.map((currencyOption) => (
                <option key={currencyOption} value={currencyOption}>
                  {t(`currencyOptions.${currencyOption}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Languages className="h-4 w-4" /> {t('language')}
            </span>
            <select
              value={form.locale}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, locale: event.target.value } : prev))
              }
              disabled={isBusy}
              className="h-10 rounded-xl border border-border bg-[hsl(var(--input))] px-3 text-foreground outline-none focus:border-primary"
            >
              {LOCALE_OPTIONS.map((localeOption) => (
                <option key={localeOption} value={localeOption}>
                  {t(`languageOptions.${localeOption}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <MonitorSmartphone className="h-4 w-4" /> {t('timezone')}
            </span>
            <select
              value={form.timezone}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, timezone: event.target.value } : prev))
              }
              disabled={isBusy}
              className="h-10 rounded-xl border border-border bg-[hsl(var(--input))] px-3 text-foreground outline-none focus:border-primary"
            >
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {formatTimezoneOptionLabel(timezone, form.locale)}
                </option>
              ))}
            </select>
          </label>

        </div>

        <div className="rounded-xl p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              {theme === 'DARK' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}{' '}
              {t('theme.title')}
            </p>
            <Switch
              checked={theme === 'DARK'}
              onCheckedChange={(checked) => {
                void handleThemeChange(checked)
              }}
              disabled={isBusy || isSavingTheme}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {theme === 'DARK' ? t('theme.darkHint') : t('theme.lightHint')}
          </p>
          {isSavingTheme && <p className="mt-1 text-[11px] text-muted-foreground">{t('theme.saving')}</p>}
        </div>

        <div className="rounded-xl p-3">
          <p className="text-sm font-medium text-foreground">{t('pwa.title')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{pwaInstalledLabel}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t('pwa.autoUpdate')}</p>
          {canShowPwaInstallAction && (
            <div className="mt-3 flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={handleInstallPwa}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25 disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                {t('pwa.installButton')}
              </button>
              {!deferredInstallPrompt && (
                <p className="text-[11px] text-muted-foreground">{t('pwa.installHelp')}</p>
              )}
            </div>
          )}
        </div>

        <div id="notifications" className="rounded-xl p-3 scroll-mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <Bell className="h-4 w-4" /> {t('notifications.title')}
            </p>
            <Switch
              checked={form.notificationsEnabled}
              onCheckedChange={handleMasterToggle}
              disabled={isBusy}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t('notifications.description')}</p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-foreground">
              <span>{t('notifications.email')}</span>
              <Switch
                checked={form.notificationEmail}
                onCheckedChange={(checked) =>
                  setForm((prev) => (prev ? { ...prev, notificationEmail: checked } : prev))
                }
                disabled={isBusy || !form.notificationsEnabled}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-foreground">
              <span>{t('notifications.whatsapp')}</span>
              <Switch
                checked={form.notificationWhatsapp}
                onCheckedChange={(checked) =>
                  setForm((prev) => (prev ? { ...prev, notificationWhatsapp: checked } : prev))
                }
                disabled={isBusy || !form.notificationsEnabled}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-foreground">
              <span>{t('notifications.push')}</span>
              <Switch
                checked={form.notificationPush}
                onCheckedChange={(checked) =>
                  setForm((prev) => (prev ? { ...prev, notificationPush: checked } : prev))
                }
                disabled={
                  isBusy || !form.notificationsEnabled || !pushNotifications.support.isSupported
                }
              />
            </label>
          </div>

          <div className="mt-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t('notifications.permissionLabel')}
                </p>
                <span
                  className={[
                    'mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                    resolvePermissionBadgeClasses(pushNotifications.permission),
                  ].join(' ')}
                >
                  {permissionLabel}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t('notifications.subscriptionLabel')}
                </p>
                <span
                  className={[
                    'mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                    resolveSubscriptionBadgeClasses(pushNotifications.hasActiveSubscription),
                  ].join(' ')}
                >
                  {subscriptionLabel}
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">{t('notifications.pushHelp')}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{pushHint}</p>

            {pushNotifications.permission === 'default' && form.notificationPush && (
              <p className="mt-2 text-[11px] text-amber-700">{t('notifications.pendingHint')}</p>
            )}

            {pushNotifications.status === 'loading' &&
              pushNotifications.currentAction !== 'activate' && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t('notifications.statusSyncing')}
              </p>
            )}

            {pushNotifications.error && (
              <p className="mt-2 text-[11px] text-red-700">{pushNotifications.error}</p>
            )}

            <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted-foreground">{t('notifications.ctaHint')}</p>
              <Button
                type="button"
                onClick={handleActivatePushNotifications}
                disabled={
                  isBusy ||
                  pushNotifications.status === 'loading' ||
                  !pushNotifications.support.isSupported
                }
                variant="outline"
              >
                {pushNotifications.currentAction === 'activate'
                  ? t('notifications.activating')
                  : t('notifications.activateAction')}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-3">
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <LogIn className="h-4 w-4" /> {t('login.title')}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(['EMAIL', 'WHATSAPP'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setForm((prev) => (prev ? { ...prev, loginPreference: option } : prev))}
                disabled={isBusy}
                className={[
                  'rounded-lg border px-3 py-2 text-sm transition',
                  form.loginPreference === option
                    ? 'border-primary bg-primary/20 text-primary font-semibold'
                    : 'border-border bg-card text-foreground hover:bg-muted',
                ].join(' ')}
              >
                {t(`login.${option}`)}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isBusy}
          variant="default"
        >
          {updatePreferencesMutation.isPending ? t('actions.saving') : t('actions.save')}
        </Button>
      </form>
    </div>
  )
}
