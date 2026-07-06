'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, Download, Globe, Languages, LogIn, MonitorSmartphone, Moon, Settings, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
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
  dailyNoTransactionNudgeEnabled: boolean
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
    dailyNoTransactionNudgeEnabled: preferences.dailyNoTransactionNudgeEnabled,
    loginPreference: preferences.loginPreference,
  }
}

function syncLoginMethodStorage(loginPreference: LoginPreference) {
  if (typeof window === 'undefined') return
  if (loginPreference === 'EMAIL') { window.sessionStorage.setItem(LOGIN_METHOD_STORAGE_KEY, 'email'); return }
  if (loginPreference === 'WHATSAPP') { window.sessionStorage.setItem(LOGIN_METHOD_STORAGE_KEY, 'whatsapp'); return }
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
  const intlWithSupportedValues = Intl as typeof Intl & { supportedValuesOf?: (type: string) => string[] }
  if (typeof intlWithSupportedValues.supportedValuesOf !== 'function') return [...FALLBACK_TIMEZONE_OPTIONS]
  try {
    const supported = intlWithSupportedValues.supportedValuesOf('timeZone')
    if (!Array.isArray(supported) || supported.length === 0) return [...FALLBACK_TIMEZONE_OPTIONS]
    return supported
  } catch { return [...FALLBACK_TIMEZONE_OPTIONS] }
}

function formatTimezoneOptionLabel(timezone: string, locale: string) {
  try {
    const formatter = new Intl.DateTimeFormat(locale || 'pt-BR', { timeZone: timezone, timeZoneName: 'shortOffset', hour: '2-digit', minute: '2-digit', hour12: false })
    const offset = formatter.formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value || 'GMT'
    return `(${offset}) ${timezone}`
  } catch { return timezone }
}

export default function UserPreferencesCard() {
  const t = useTranslations('preferences')
  const { preferencesQuery, updatePreferencesMutation } = useUserAppPreferences()
  const storePreferences = useUserPreferencesStore((s) => s.preferences)
  const { theme, saveTheme, isSavingTheme } = useUserTheme()
  const sourcePreferences = preferencesQuery.data ?? storePreferences

  const [form, setForm] = useState<FormState | null>(null)
  const [baseline, setBaseline] = useState<UserPreferences | null>(null)
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

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
    const onAppInstalled = () => { setDeferredInstallPrompt(null) }
    if (isStandaloneMode()) setDeferredInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const isBusy = preferencesQuery.isLoading || updatePreferencesMutation.isPending

  const timezoneOptions = useMemo(() => {
    const values = new Set<string>(getSupportedTimezoneOptions())
    const selectedTimezone = form?.timezone?.trim()
    const sourceTimezone = sourcePreferences?.timezone?.trim()
    if (selectedTimezone) values.add(selectedTimezone)
    if (sourceTimezone) values.add(sourceTimezone)
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [form?.timezone, sourcePreferences?.timezone])

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
      if (choice.outcome === 'accepted') { toast.success(t('pwa.installStarted')) }
      else { toast(t('pwa.installCanceled')) }
    } catch { toast.error(t('pwa.installFailed')) }
    finally { setDeferredInstallPrompt(null) }
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
      dailyNoTransactionNudgeEnabled: form.dailyNoTransactionNudgeEnabled,
      loginPreference: form.loginPreference,
    }

    const patch = diffUserPreferences(baseline, nextPreferences)
    if (Object.keys(patch).length === 0) { toast(t('actions.noChanges')); return }

    try {
      const updated = await updatePreferencesMutation.mutateAsync(patch)
      setBaseline(updated)
      setForm(toFormState(updated))
      syncLoginMethodStorage(updated.loginPreference)
      toast.success(t('actions.saveSuccess'))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('actions.saveFailed')))
    }
  }

  const handleThemeChange = async (checked: boolean) => {
    const nextTheme = checked ? 'DARK' : 'LIGHT'
    if (nextTheme === theme) return
    try { await saveTheme(nextTheme) }
    catch (error: unknown) { toast.error(getErrorMessage(error, t('theme.saveFailed'))) }
  }

  if (preferencesQuery.isLoading && !form) {
    return (
      <div className="space-y-4">
        <div className="h-60 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
        <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      </div>
    )
  }

  if (!form || !baseline) return null

  return (
    <form onSubmit={handleSave}>
      {/* ──────────────── Container 1: Preferências ──────────────── */}
      <div
        id="preferencias"
        className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-slide-up scroll-mt-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-full">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>

        {preferencesQuery.isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {preferencesQuery.error instanceof Error ? preferencesQuery.error.message : t('loadError')}
          </div>
        )}

        <div className="space-y-3">
          {/* Moeda, Idioma e Fuso Horário */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" /> {t('currency')}
                </span>
                <select
                  value={form.currency}
                  onChange={(event) => setForm((prev) => (prev ? { ...prev, currency: event.target.value } : prev))}
                  disabled={isBusy}
                  className="h-10 rounded-xl border border-border bg-white px-3 text-foreground outline-none focus:border-primary"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{t(`currencyOptions.${c}`)}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Languages className="h-4 w-4" /> {t('language')}
                </span>
                <select
                  value={form.locale}
                  onChange={(event) => setForm((prev) => (prev ? { ...prev, locale: event.target.value } : prev))}
                  disabled={isBusy}
                  className="h-10 rounded-xl border border-border bg-white px-3 text-foreground outline-none focus:border-primary"
                >
                  {LOCALE_OPTIONS.map((l) => (
                    <option key={l} value={l}>{t(`languageOptions.${l}`)}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <MonitorSmartphone className="h-4 w-4" /> {t('timezone')}
                </span>
                <select
                  value={form.timezone}
                  onChange={(event) => setForm((prev) => (prev ? { ...prev, timezone: event.target.value } : prev))}
                  disabled={isBusy}
                  className="h-10 rounded-xl border border-border bg-white px-3 text-foreground outline-none focus:border-primary"
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>{formatTimezoneOptionLabel(tz, form.locale)}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Tema */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                {theme === 'DARK' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {t('theme.title')}
              </p>
              <Switch
                checked={theme === 'DARK'}
                onCheckedChange={(checked) => { void handleThemeChange(checked) }}
                disabled={isBusy || isSavingTheme}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {theme === 'DARK' ? t('theme.darkHint') : t('theme.lightHint')}
            </p>
            {isSavingTheme && <p className="mt-1 text-[11px] text-muted-foreground">{t('theme.saving')}</p>}
          </div>

          {/* Instalar aplicativo */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Download className="h-4 w-4" /> {t('pwa.title')}
              </p>
              <button
                type="button"
                onClick={handleInstallPwa}
                disabled={isBusy}
                title={t('pwa.title')}
                aria-label={t('pwa.installButton')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/50 bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-60 transition"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            {!deferredInstallPrompt && !isStandaloneMode() && !sourcePreferences?.pwaInstalled && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t('pwa.installHelp')}</p>
            )}
          </div>

          {/* Preferência de Login */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
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
                      : 'border-border bg-white text-foreground hover:bg-muted',
                  ].join(' ')}
                >
                  {t(`login.${option}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── Container 2: Notificações ──────────────── */}
      <hr className="border-slate-200 my-4" />
      <div
        id="notificacoes"
        className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-slide-up scroll-mt-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-primary/10 rounded-full">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t('notifications.title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{t('notifications.description')}</p>

        <div className="space-y-2">
          {/* E-mail */}
          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-foreground">
            <span className="font-medium">{t('notifications.email')}</span>
            <Switch
              checked={form.notificationEmail}
              onCheckedChange={(checked) => setForm((prev) => (prev ? { ...prev, notificationEmail: checked } : prev))}
              disabled={isBusy}
            />
          </label>

          {/* WhatsApp */}
          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-foreground">
            <span className="font-medium">{t('notifications.whatsapp')}</span>
            <Switch
              checked={form.notificationWhatsapp}
              onCheckedChange={(checked) => setForm((prev) => (prev ? { ...prev, notificationWhatsapp: checked } : prev))}
              disabled={isBusy}
            />
          </label>

          {/* Lembrete diário */}
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-foreground">
            <span className="flex flex-col">
              <span className="font-medium">{t('notifications.dailyReminder')}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">{t('notifications.dailyReminderHint')}</span>
            </span>
            <Switch
              checked={form.dailyNoTransactionNudgeEnabled}
              onCheckedChange={(checked) => setForm((prev) => prev ? { ...prev, dailyNoTransactionNudgeEnabled: checked } : prev)}
              disabled={isBusy}
            />
          </label>
        </div>

        <div className="mt-4">
          <Button type="submit" disabled={isBusy} variant="default">
            {updatePreferencesMutation.isPending ? t('actions.saving') : t('actions.save')}
          </Button>
        </div>
      </div>
    </form>
  )
}
