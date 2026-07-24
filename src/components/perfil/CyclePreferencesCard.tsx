'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'

import { useUserCyclePreferences } from '@/hooks/query/useUserCyclePreferences'
import type {
  AutonomousCycleKind,
  CycleMode,
  UpdateUserCyclePreferencesInput,
} from '@/utils/cyclePreferences'
import { Button } from '../ui/button'

type Feedback = {
  type: 'success' | 'error'
  message: string
}

type FormState = {
  cycleMode: CycleMode
  paydayDay: string
  autonomousCycleKind: AutonomousCycleKind
  cutoffDay: string
  timezone: string
}

function parseDay(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) return null
  return parsed
}

function toFormState(input?: {
  cycleMode: CycleMode
  paydayDay: number | null
  autonomousCycleKind: AutonomousCycleKind | null
  cutoffDay: number | null
  timezone: string
}) {
  return {
    cycleMode: input?.cycleMode ?? 'autonomous',
    paydayDay: input?.paydayDay != null ? String(input.paydayDay) : '',
    autonomousCycleKind: input?.autonomousCycleKind ?? 'calendar_month',
    cutoffDay: input?.cutoffDay != null ? String(input.cutoffDay) : '',
    timezone: input?.timezone?.trim() || 'America/Sao_Paulo',
  } as FormState
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1.5 inline-flex">
      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 text-xs bg-slate-800 text-white rounded-lg px-2.5 py-2 z-20 shadow-lg leading-relaxed whitespace-normal">
        {text}
      </span>
    </span>
  )
}

const CyclePreferencesCard = () => {
  const t = useTranslations('profile.cyclePreferencesCard')
  const { preferencesQuery, updatePreferencesMutation } = useUserCyclePreferences()
  const [form, setForm] = useState<FormState>(() => toFormState())
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  useEffect(() => {
    if (!preferencesQuery.data) return
    setForm(toFormState(preferencesQuery.data))
  }, [preferencesQuery.data])

  const isFixedPayday = form.cycleMode === 'fixed_payday'
  const isCutoffDay = form.cycleMode === 'autonomous' && form.autonomousCycleKind === 'cutoff_day'
  const isBusy = preferencesQuery.isLoading || updatePreferencesMutation.isPending

  const helperText = useMemo(() => {
    if (isFixedPayday) return t('helper.fixedPayday')
    if (isCutoffDay) return t('helper.cutoffDay')
    return t('helper.calendarMonth')
  }, [isCutoffDay, isFixedPayday, t])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    const payload: UpdateUserCyclePreferencesInput = {
      cycleMode: form.cycleMode,
      timezone: form.timezone.trim() || 'America/Sao_Paulo',
    }

    if (form.cycleMode === 'fixed_payday') {
      const paydayDay = parseDay(form.paydayDay)
      if (!paydayDay) {
        const message = t('errors.invalidPaydayDay')
        setFeedback({ type: 'error', message })
        toast.error(message)
        return
      }
      payload.paydayDay = paydayDay
    } else {
      payload.autonomousCycleKind = form.autonomousCycleKind
      if (form.autonomousCycleKind === 'cutoff_day') {
        const cutoffDay = parseDay(form.cutoffDay)
        if (!cutoffDay) {
          const message = t('errors.invalidCutoffDay')
          setFeedback({ type: 'error', message })
          toast.error(message)
          return
        }
        payload.cutoffDay = cutoffDay
      }
    }

    try {
      await updatePreferencesMutation.mutateAsync(payload)
      const message = t('toasts.saved')
      setFeedback({ type: 'success', message })
      toast.success(message)
    } catch (error: any) {
      const message = error?.message ?? t('errors.saveFallback')
      setFeedback({ type: 'error', message })
      toast.error(message)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <CalendarRange className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {preferencesQuery.isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t('errors.load')}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Como seu ciclo financeiro começa */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          <label className="flex flex-col gap-2">
            <span className="inline-flex items-center text-sm font-medium text-foreground">
              {t('fields.cycleType')}
              <InfoTooltip text={t('tooltips.cycleType')} />
            </span>
            <select
              value={form.cycleMode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  cycleMode: event.target.value as CycleMode,
                }))
              }
              disabled={isBusy}
              className="w-full rounded-xl border border-border/25 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="fixed_payday">{t('options.fixedPayday')}</option>
              <option value="autonomous">{t('options.autonomous')}</option>
            </select>
          </label>

          {isFixedPayday && (
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">{t('fields.paydayDay')}</label>
              <input
                value={form.paydayDay}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    paydayDay: event.target.value,
                  }))
                }
                type="number"
                min={1}
                max={31}
                disabled={isBusy}
                className="w-full rounded-xl border border-border/25 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder={t('placeholders.paydayDay')}
              />
            </div>
          )}
        </div>

        {/* Como a Fly fecha o ciclo autônomo */}
        {form.cycleMode === 'autonomous' && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center text-sm font-medium text-foreground">
                {t('fields.autonomousType')}
                <InfoTooltip text={t('tooltips.autonomousType')} />
              </span>
              <select
                value={form.autonomousCycleKind}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    autonomousCycleKind: event.target.value as AutonomousCycleKind,
                  }))
                }
                disabled={isBusy}
                className="w-full rounded-xl border border-border/25 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="calendar_month">{t('options.calendarMonth')}</option>
                <option value="cutoff_day">{t('options.cutoffDay')}</option>
              </select>
            </label>

            {isCutoffDay && (
              <div className="mt-3 flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">{t('fields.cutoffDay')}</label>
                <input
                  value={form.cutoffDay}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      cutoffDay: event.target.value,
                    }))
                  }
                  type="number"
                  min={1}
                  max={31}
                  disabled={isBusy}
                  className="w-full rounded-xl border border-border/25 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder={t('placeholders.cutoffDay')}
                />
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">{helperText}</p>

        {feedback && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              feedback.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <Button
          type="submit"
          variant="default"
          disabled={isBusy}
        >
          {updatePreferencesMutation.isPending ? t('actions.saving') : t('actions.save')}
        </Button>
      </form>
    </div>
  )
}

export default CyclePreferencesCard
