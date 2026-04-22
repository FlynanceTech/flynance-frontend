'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Info, X } from 'lucide-react'

import Header from './components/Header/overview'
import { SpendingControl } from './components/SpendingControl'
import ComparisonChart from './components/ComparisonChart'
import CategorySpendingDistribution from './components/CategorySpendingDistribution'
import InstallPrompt from '@/components/cadastro/InstallPrompt/InstallPrompt'

import FinanceStatus from './components/FincanceStatus'

import { useUserSession } from '@/stores/useUserSession'
import { useTransactionFilter } from '@/stores/useFilter'
import { useTranscation } from '@/hooks/query/useTransaction'
import { getBrowserTimezone, toFutureRangeFromDays } from '@/utils/transactionPeriod'
import { useLocale, useTranslations } from 'next-intl'

const PERIOD_ZERO = {
  income: 0,
  expense: 0,
  balance: 0,
  incomeChange: 0,
  expenseChange: 0,
  balanceChange: 0,
}

const ACC_ZERO = {
  totalIncome: 0,
  totalExpense: 0,
  totalBalance: 0,
}

const DASHBOARD_ONBOARDING_STORAGE_KEY = 'flynance:dashboard:onboarding:v1'

type DashboardOnboardingStep = {
  id: string
  selector: string
  title: string
  description: string
  align?: 'top' | 'bottom'
}

type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

function createDashboardOnboardingSteps(
  t: (key: string, values?: Record<string, string | number | Date>) => string
): ReadonlyArray<DashboardOnboardingStep> {
  return [
    {
      id: 'filters',
      selector: '[data-onboarding-target="header-filters"]',
      align: 'bottom',
      title: t('onboarding.filtersTitle'),
      description: t('onboarding.filtersDescription'),
    },
    {
      id: 'summary',
      selector: '[data-onboarding-target="finance-summary"]',
      title: t('onboarding.summaryTitle'),
      description: t('onboarding.summaryDescription'),
    },
    {
      id: 'comparison',
      selector: '[data-onboarding-target="comparison-chart"]',
      title: t('onboarding.comparisonTitle'),
      description: t('onboarding.comparisonDescription'),
    },
    {
      id: 'controls',
      selector: '[data-onboarding-target="spending-control"]',
      title: t('onboarding.controlsTitle'),
      description: t('onboarding.controlsDescription'),
    },
    {
      id: 'categories',
      selector: '[data-onboarding-target="category-distribution"]',
      title: t('onboarding.categoriesTitle'),
      description: t('onboarding.categoriesDescription'),
    },
  ]
}

function pad2(v: any) {
  return String(v).padStart(2, '0')
}

function monthLabel(month: string, year: string, locale: string) {
  if (!month || !year) return ''
  const monthIndex = Number(month) - 1
  if (monthIndex < 0 || monthIndex > 11) return `${pad2(month)}/${year}`
  return new Date(Number(year), monthIndex, 1).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
}

function computeFinanceStatusFromTransactions(transactions: any[]) {
  const income = (transactions || [])
    .filter((t: { type: string }) => t.type === 'INCOME')
    .reduce((acc: number, t: { value: any }) => acc + Number(t.value || 0), 0)

  const expense = (transactions || [])
    .filter((t: { type: string }) => t.type === 'EXPENSE')
    .reduce((acc: number, t: { value: any }) => acc + Number(t.value || 0), 0)

  const balance = income - expense

  return {
    period: {
      income,
      expense,
      balance,
      incomeChange: 0,
      expenseChange: 0,
      balanceChange: 0,
    },
    accumulated: {
      totalIncome: income,
      totalExpense: expense,
      totalBalance: balance,
    },
  }
}

export default function Dashboard() {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const onboardingSteps = useMemo(() => createDashboardOnboardingSteps(t), [t])

  const { user } = useUserSession()
  const userId = user?.userData?.user?.id ?? ''
  const onboardingStorageKey = useMemo(
    () => `${DASHBOARD_ONBOARDING_STORAGE_KEY}:${userId || 'anonymous'}`,
    [userId]
  )

  const mode = useTransactionFilter((s) => s.appliedMode)
  const dateRange = useTransactionFilter((s) => s.appliedDateRange)
  const selectedMonth = useTransactionFilter((s) => s.appliedSelectedMonth)
  const selectedYear = useTransactionFilter((s) => s.appliedSelectedYear)
  const includeFuture = useTransactionFilter((s) => s.appliedIncludeFuture)
  const rangeStart = useTransactionFilter((s) => s.appliedRangeStart)
  const rangeEnd = useTransactionFilter((s) => s.appliedRangeEnd)

  const [hydrated, setHydrated] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0)
  const [onboardingTargetRect, setOnboardingTargetRect] = useState<SpotlightRect | null>(null)
  const [onboardingTooltipHeight, setOnboardingTooltipHeight] = useState(300)
  const onboardingTooltipRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => setHydrated(true), [])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    const completed = window.localStorage.getItem(onboardingStorageKey)
    if (completed === 'done') return
    setOnboardingOpen(true)
    setOnboardingStepIndex(0)
  }, [hydrated, onboardingStorageKey])

  const safeDays = Math.max(1, Number(dateRange || 30))
  const periodFilters = useMemo(() => {
    if (mode === 'range' && rangeStart && rangeEnd) {
      return {
        mode: 'range' as const,
        dateFrom: rangeStart,
        dateTo: rangeEnd,
        timezone: getBrowserTimezone(),
      }
    }

    if (mode === 'month' && selectedMonth && selectedYear) {
      return {
        mode: 'month' as const,
        month: selectedMonth,
        year: selectedYear,
        timezone: getBrowserTimezone(),
      }
    }

    const futureRange = includeFuture ? toFutureRangeFromDays(safeDays) : null
    return {
      mode: 'days' as const,
      days: safeDays,
      includeFutureDays: includeFuture ? Math.max(0, safeDays - 1) : undefined,
      dateFrom: futureRange?.start,
      dateTo: futureRange?.end,
      timezone: getBrowserTimezone(),
    }
  }, [mode, rangeStart, rangeEnd, selectedMonth, selectedYear, includeFuture, safeDays])

  // Fetch using the same period semantics used in /dashboard/transacoes
  const { transactionsQuery } = useTranscation({
    userId,
    page: 1,
    limit: 5000,
    filters: periodFilters,
    useGlobalFilters: false,
  })
  const isTxLoading = transactionsQuery.isLoading

  const transactions = useMemo(() => {
    const payload = transactionsQuery.data as any
    const list = payload?.transactions ?? payload ?? []
    return Array.isArray(list) ? list : []
  }, [transactionsQuery.data])

  const periodLabel = useMemo(() => {
    const suffix = includeFuture ? t('period.includeFutureSuffix') : ''
    if (mode === 'range' && rangeStart && rangeEnd) {
      const start = new Date(`${rangeStart}T00:00:00`)
      const end = new Date(`${rangeEnd}T00:00:00`)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return `${start.toLocaleDateString(locale)} - ${end.toLocaleDateString(locale)}`
      }
    }
    if (mode === 'month' && selectedMonth && selectedYear) {
      return `${monthLabel(selectedMonth, selectedYear, locale)}${suffix}`
    }
    if (includeFuture) {
      return t('period.nextDays', { days: Number(dateRange || 30) })
    }
    return `${t('period.lastDays', { days: Number(dateRange || 30) })}${suffix}`
  }, [mode, selectedMonth, selectedYear, dateRange, includeFuture, rangeStart, rangeEnd, locale, t])

  const financeStatus = useMemo(() => {
    return computeFinanceStatusFromTransactions(transactions)
  }, [transactions])

  const onboardingStep = onboardingSteps[onboardingStepIndex]
  const onboardingIsFirstStep = onboardingStepIndex === 0
  const onboardingIsLastStep = onboardingStepIndex === onboardingSteps.length - 1

  function findOnboardingTarget(step = onboardingStep) {
    if (!step || typeof document === 'undefined') return null
    return document.querySelector<HTMLElement>(step.selector)
  }

  function syncOnboardingTargetRect(targetElement?: HTMLElement | null) {
    if (typeof window === 'undefined') return
    const target = targetElement ?? findOnboardingTarget()

    if (!target) {
      setOnboardingTargetRect(null)
      return
    }

    const rect = target.getBoundingClientRect()
    const paddedWidth = Math.min(rect.width + 12, window.innerWidth - 16)
    const paddedHeight = Math.min(rect.height + 12, window.innerHeight - 16)
    const maxLeft = Math.max(8, window.innerWidth - paddedWidth - 8)
    const maxTop = Math.max(8, window.innerHeight - paddedHeight - 8)

    setOnboardingTargetRect({
      top: Math.min(Math.max(rect.top - 6, 8), maxTop),
      left: Math.min(Math.max(rect.left - 6, 8), maxLeft),
      width: paddedWidth,
      height: paddedHeight,
    })
  }

  function markOnboardingAsDone() {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(onboardingStorageKey, 'done')
  }

  function openOnboarding() {
    setOnboardingStepIndex(0)
    setOnboardingTargetRect(null)
    setOnboardingOpen(true)
  }

  function closeOnboarding(options?: { persist?: boolean }) {
    if (options?.persist !== false) markOnboardingAsDone()
    setOnboardingOpen(false)
    setOnboardingTargetRect(null)
  }

  function goToNextOnboardingStep() {
    if (onboardingIsLastStep) {
      closeOnboarding()
      return
    }
    setOnboardingStepIndex((prev) => Math.min(prev + 1, onboardingSteps.length - 1))
  }

  function goToPreviousOnboardingStep() {
    setOnboardingStepIndex((prev) => Math.max(prev - 1, 0))
  }

  useEffect(() => {
    if (!onboardingOpen || !onboardingStep || typeof window === 'undefined') return

    const target = findOnboardingTarget(onboardingStep)
    if (!target) {
      setOnboardingTargetRect(null)
      return
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })

    const syncPosition = () => syncOnboardingTargetRect(target)
    const timerId = window.setTimeout(syncPosition, 180)

    window.addEventListener('resize', syncPosition)
    window.addEventListener('scroll', syncPosition, true)

    return () => {
      window.clearTimeout(timerId)
      window.removeEventListener('resize', syncPosition)
      window.removeEventListener('scroll', syncPosition, true)
    }
  }, [onboardingOpen, onboardingStep])

  useEffect(() => {
    if (!onboardingOpen || typeof window === 'undefined') return

    const measureTooltip = () => {
      const tooltipElement = onboardingTooltipRef.current
      if (!tooltipElement) return
      const rect = tooltipElement.getBoundingClientRect()
      if (rect.height > 0) setOnboardingTooltipHeight(rect.height)
    }

    const rafId = window.requestAnimationFrame(measureTooltip)
    const timeoutId = window.setTimeout(measureTooltip, 160)
    window.addEventListener('resize', measureTooltip)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', measureTooltip)
    }
  }, [onboardingOpen, onboardingStep, onboardingTargetRect])

  const onboardingTooltipStyle = useMemo(() => {
    if (typeof window === 'undefined') return undefined

    const tooltipWidth = Math.min(360, Math.max(260, window.innerWidth - 24))

    if (!onboardingTargetRect) {
      return {
        width: tooltipWidth,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    const centerX = onboardingTargetRect.left + onboardingTargetRect.width / 2
    const clampedLeft = Math.min(
      Math.max(centerX, tooltipWidth / 2 + 12),
      window.innerWidth - tooltipWidth / 2 - 12
    )
    const availableTop = onboardingTargetRect.top - 14
    const availableBottom = window.innerHeight - (onboardingTargetRect.top + onboardingTargetRect.height) - 14
    const estimatedHeight = Math.max(220, onboardingTooltipHeight)
    const canPlaceBottom = availableBottom >= estimatedHeight
    const canPlaceTop = availableTop >= estimatedHeight

    const shouldPlaceOnTop =
      onboardingStep?.align === 'top'
        ? true
        : onboardingStep?.align === 'bottom'
          ? false
          : canPlaceTop && (!canPlaceBottom || availableTop > availableBottom)

    const rawTop = shouldPlaceOnTop
      ? onboardingTargetRect.top - estimatedHeight - 14
      : onboardingTargetRect.top + onboardingTargetRect.height + 14
    const top = Math.min(Math.max(rawTop, 12), Math.max(12, window.innerHeight - estimatedHeight - 12))

    return {
      width: tooltipWidth,
      top,
      left: clampedLeft,
      transform: 'translateX(-50%)',
    }
  }, [onboardingTargetRect, onboardingStep?.align, onboardingTooltipHeight])

  if (!hydrated) return null

  return (
    <section className="flex flex-col gap-4 w-full overflow-auto">
      <div data-onboarding-target="header-filters">
        <Header
          title={t('title')}
          subtitle={t('subtitle', { period: periodLabel })}
          asFilter
          showFutureFilter
          userId={userId}
          rightContent={
            <button
              type="button"
              onClick={openOnboarding}
              aria-label={t('guideButton')}
              className="inline-flex items-center gap-0 rounded-full border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 sm:gap-2 sm:px-3"
            >
              <Info className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('guideButton')}</span>
            </button>
          }
        />
      </div>

      <div className="flex flex-col gap-4 md:pt-0 px-4 lg:pl-0 pb-24 lg:pb-0">
        <div data-onboarding-target="finance-summary">
          <FinanceStatus
            period={financeStatus?.period ?? PERIOD_ZERO}
            accumulated={financeStatus?.accumulated ?? ACC_ZERO}
            isLoading={isTxLoading}
            periodLabel={periodLabel}
          />
        </div>

        <section className="grid md:grid-cols-4 grid-cols-1 gap-4 lg:gap-4 w-full">
          <div className="md:col-span-4 flex gap-4 flex-col w-full">
            <div className="flex flex-col lg:grid lg:grid-cols-5 lg:gap-4">
              <div className="lg:col-span-3" data-onboarding-target="comparison-chart">
                <ComparisonChart transactions={transactions} isLoading={isTxLoading} periodTag={periodLabel} />
              </div>

              <div className="lg:col-span-2 h-full" data-onboarding-target="spending-control">
                <SpendingControl />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 h-full" data-onboarding-target="category-distribution">
              <CategorySpendingDistribution transactions={transactions} isLoading={isTxLoading} periodTag={periodLabel} />
            </div>
          </div>
        </section>

        <InstallPrompt />
      </div>

      {onboardingOpen && onboardingStep && (
        <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            className={`absolute inset-0 ${onboardingTargetRect ? 'bg-transparent' : 'bg-slate-950/60'}`}
            onClick={() => closeOnboarding()}
            aria-label={t('closeOnboardingAria')}
          />

          {onboardingTargetRect && (
            <div
              className="pointer-events-none fixed z-[91] rounded-2xl border-2 border-primary/80 bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.56)] transition-all duration-300"
              style={{
                top: onboardingTargetRect.top,
                left: onboardingTargetRect.left,
                width: onboardingTargetRect.width,
                height: onboardingTargetRect.height,
              }}
            />
          )}

          <div
            ref={onboardingTooltipRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-onboarding-title"
            className="fixed z-[92] max-h-[calc(100vh-24px)] overflow-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl transition-[top,left,transform] duration-300"
            style={onboardingTooltipStyle}
          >
            <button
              type="button"
              onClick={() => closeOnboarding()}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label={t('closeGuideAria')}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              {t('stepCounter', { current: onboardingStepIndex + 1, total: onboardingSteps.length })}
            </div>

            <h2 id="dashboard-onboarding-title" className="pr-8 text-lg font-bold text-gray-800">
              {onboardingStep.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{onboardingStep.description}</p>

            <div className="mt-5 flex items-center gap-1.5">
              {onboardingSteps.map((_, index) => (
                <span
                  key={`onboarding-step-${index}`}
                  className={`h-1.5 rounded-full transition-all ${
                    index === onboardingStepIndex ? 'w-8 bg-primary' : 'w-3 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => closeOnboarding()}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                {t('skipGuide')}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousOnboardingStep}
                  disabled={onboardingIsFirstStep}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t('previous')}
                </button>
                <button
                  type="button"
                  onClick={goToNextOnboardingStep}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-secondary"
                >
                  {onboardingIsLastStep ? t('finish') : t('next')}
                  {!onboardingIsLastStep && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
