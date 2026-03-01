'use client'

import React, { useEffect, useMemo, useState } from 'react'
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

const DASHBOARD_ONBOARDING_STEPS = [
  {
    title: 'Resumo financeiro',
    description:
      'No topo voce acompanha entradas, saidas e saldo no periodo selecionado. Esse bloco resume sua situacao atual.',
  },
  {
    title: 'Filtros de periodo',
    description:
      'Use os filtros do cabecalho para trocar janela de analise por dias, mes ou intervalo customizado.',
  },
  {
    title: 'Comparacao de receitas e despesas',
    description:
      'O grafico de comparacao mostra a evolucao das movimentacoes e ajuda a identificar mudancas no padrao.',
  },
  {
    title: 'Controles de gastos',
    description:
      'Em Controles voce define metas e acompanha quanto falta para atingir cada limite no periodo.',
  },
  {
    title: 'Distribuicao por categoria',
    description:
      'Veja onde voce mais gasta por categoria e use essa visao para ajustar prioridades do mes.',
  },
] as const

function pad2(v: any) {
  return String(v).padStart(2, '0')
}

function monthLabel(month: string, year: string) {
  if (!month || !year) return ''
  const shortMonths = ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.']
  const monthIndex = Number(month) - 1
  if (monthIndex < 0 || monthIndex > 11) return `${pad2(month)}/${year}`
  return `${shortMonths[monthIndex]} ${year}`
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
    const suffix = includeFuture ? ' (incluindo futuros)' : ''
    if (mode === 'range' && rangeStart && rangeEnd) {
      const start = new Date(`${rangeStart}T00:00:00`)
      const end = new Date(`${rangeEnd}T00:00:00`)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`
      }
    }
    if (mode === 'month' && selectedMonth && selectedYear) {
      return `${monthLabel(selectedMonth, selectedYear)}${suffix}`
    }
    if (includeFuture) {
      return `proximos ${Number(dateRange || 30)} dias`
    }
    return `ultimos ${Number(dateRange || 30)} dias${suffix}`
  }, [mode, selectedMonth, selectedYear, dateRange, includeFuture, rangeStart, rangeEnd])

  const financeStatus = useMemo(() => {
    return computeFinanceStatusFromTransactions(transactions)
  }, [transactions])

  const onboardingStep = DASHBOARD_ONBOARDING_STEPS[onboardingStepIndex]
  const onboardingIsFirstStep = onboardingStepIndex === 0
  const onboardingIsLastStep = onboardingStepIndex === DASHBOARD_ONBOARDING_STEPS.length - 1

  function markOnboardingAsDone() {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(onboardingStorageKey, 'done')
  }

  function openOnboarding() {
    setOnboardingStepIndex(0)
    setOnboardingOpen(true)
  }

  function closeOnboarding(options?: { persist?: boolean }) {
    if (options?.persist !== false) markOnboardingAsDone()
    setOnboardingOpen(false)
  }

  function goToNextOnboardingStep() {
    if (onboardingIsLastStep) {
      closeOnboarding()
      return
    }
    setOnboardingStepIndex((prev) => Math.min(prev + 1, DASHBOARD_ONBOARDING_STEPS.length - 1))
  }

  function goToPreviousOnboardingStep() {
    setOnboardingStepIndex((prev) => Math.max(prev - 1, 0))
  }

  if (!hydrated) return null

  return (
    <section className="flex flex-col gap-4 w-full overflow-auto">
      <Header
        title="Dashboard Financeiro"
        subtitle="Veja um resumo da sua vida financeira."
        asFilter
        showFutureFilter
        userId={userId}
      />

      <div className="flex flex-col gap-4 md:pt-0 px-4 lg:pl-0 pb-24 lg:pb-0">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={openOnboarding}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            <Info className="h-3.5 w-3.5" />
            Ver guia do dashboard
          </button>
        </div>

        <FinanceStatus
          period={financeStatus?.period ?? PERIOD_ZERO}
          accumulated={financeStatus?.accumulated ?? ACC_ZERO}
          isLoading={isTxLoading}
          periodLabel={periodLabel}
        />

        <section className="grid md:grid-cols-4 grid-cols-1 gap-4 lg:gap-4 w-full">
          <div className="md:col-span-4 flex gap-4 flex-col w-full">
            <div className="flex flex-col lg:grid lg:grid-cols-5 lg:gap-4">
              <div className="lg:col-span-3">
                <ComparisonChart transactions={transactions} isLoading={isTxLoading} periodTag={periodLabel} />
              </div>

              <div className="lg:col-span-2 h-full">
                <SpendingControl />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 h-full">
              <CategorySpendingDistribution transactions={transactions} isLoading={isTxLoading} periodTag={periodLabel} />
            </div>
          </div>
        </section>

        <InstallPrompt />
      </div>

      {onboardingOpen && onboardingStep && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => closeOnboarding()}
            aria-label="Fechar onboarding"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-onboarding-title"
            className="relative w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => closeOnboarding()}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fechar guia"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              Passo {onboardingStepIndex + 1} de {DASHBOARD_ONBOARDING_STEPS.length}
            </div>

            <h2 id="dashboard-onboarding-title" className="text-lg font-bold text-gray-800">
              {onboardingStep.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{onboardingStep.description}</p>

            <div className="mt-5 flex items-center gap-1.5">
              {DASHBOARD_ONBOARDING_STEPS.map((_, index) => (
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
                Pular guia
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousOnboardingStep}
                  disabled={onboardingIsFirstStep}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={goToNextOnboardingStep}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-secondary"
                >
                  {onboardingIsLastStep ? 'Concluir' : 'Proximo'}
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
