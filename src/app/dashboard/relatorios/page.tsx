'use client'

import Header from '../components/Header'
import api from '@/lib/axios'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'
import { AnnualCompare, AnnualReport } from './types'
import LoadingSkeleton from './components/LoadingSkeleton'
import ScoreHeaderCard from './components/ScoreHeaderCard'
import ScoreExplanation from './components/ScoreExplanation'
import SummaryCards from './components/SummaryCards'
import SecondaryMetrics from './components/SecondaryMetrics'
import MonthlyAverages from './components/MonthlyAverages'
import AnnualCharts from './components/AnnualCharts'
import TopCategoriesRecurrence from './components/TopCategoriesRecurrence'
import InsightsSection from './components/InsightsSection'
import CompareSection from './components/CompareSection'
import { badgeForScore } from './components/utils'
import PageOnboardingTour, { type PageOnboardingStep } from '@/components/onboarding/PageOnboardingTour'

function createReportsOnboardingSteps(
  t: (key: string, values?: Record<string, string | number | Date>) => string
): ReadonlyArray<PageOnboardingStep> {
  return [
    {
      id: 'header',
      selector: '[data-onboarding-target="relatorios-header"]',
      align: 'bottom',
      title: t('onboarding.headerTitle'),
      description: t('onboarding.headerDescription'),
    },
    {
      id: 'score',
      selector: '[data-onboarding-target="relatorios-score"]',
      title: t('onboarding.scoreTitle'),
      description: t('onboarding.scoreDescription'),
    },
    {
      id: 'charts',
      selector: '[data-onboarding-target="relatorios-graficos"]',
      title: t('onboarding.chartsTitle'),
      description: t('onboarding.chartsDescription'),
    },
    {
      id: 'insights',
      selector: '[data-onboarding-target="relatorios-insights"]',
      title: t('onboarding.insightsTitle'),
      description: t('onboarding.insightsDescription'),
    },
  ]
}

export default function ReportsPage() {
  const t = useTranslations('reports.page')
  const onboardingSteps = useMemo(() => createReportsOnboardingSteps(t), [t])
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const isCurrentYear = year === currentYear
  const [reportOverride, setReportOverride] = useState<AnnualReport | null>(null)
  const [recalcLoading, setRecalcLoading] = useState(false)

  const reportQuery = useQuery({
    queryKey: ['reports', 'annual', year],
    queryFn: async () => {
      const { data } = await api.get<AnnualReport>('/reports/annual', { params: { year } })
      return data
    },
  })

  const compareQuery = useQuery({
    queryKey: ['reports', 'annual', year, 'compare'],
    queryFn: async () => {
      const { data } = await api.get<AnnualCompare>(`/reports/annual/${year}/compare`)
      return data
    },
  })

  const report = reportOverride ?? reportQuery.data
  const compare = compareQuery.data

  const topCategories = useMemo(() => {
    const list = report?.breakdowns?.categories ?? []
    return list.slice().sort((a, b) => b.total - a.total).slice(0, 5)
  }, [report])

  if (reportQuery.isLoading || !report) return <LoadingSkeleton />

  const score = Number(report.score || 0)
  const scoreBadge = badgeForScore(score)

  const handleRecalc = async () => {
    try {
      setRecalcLoading(true)
      const { data } = await api.post<AnnualReport>('/reports/annual/recalc', { year })
      setReportOverride(data)
      toast.success(t('recalcSuccess'))
    } catch {
      toast.error(t('recalcError'))
    } finally {
      setRecalcLoading(false)
    }
  }

  return (
    <section className="flex h-full w-full flex-col gap-6 overflow-auto px-4 pb-24 pt-8 lg:px-8 lg:pb-0">
      <div className="mx-auto flex w-full flex-col gap-6">
        <div data-onboarding-target="relatorios-header">
          <Header
            title={t('title')}
            subtitle={t('subtitle')}
            newTransation={false}
            rightContent={
              <div className="flex items-center justify-end gap-2">
                <PageOnboardingTour
                  steps={onboardingSteps}
                  storageKeyBase="flynance:dashboard:onboarding:relatorios:v1"
                  triggerLabel={t('guideButton')}
                />
                <span className="hidden text-sm text-gray-500 lg:block">{t('year')}</span>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm"
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRecalc}
                  disabled={recalcLoading}
                  className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {recalcLoading ? t('recalculating') : t('recalc')}
                </button>
              </div>
            }
          />
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-4" data-onboarding-target="relatorios-score">
          <div className="col-span-1 mb-4 lg:mr-4 lg:mb-0">
            <ScoreHeaderCard
              score={score}
              level={scoreBadge.level}
              badgeClass={scoreBadge.cls}
              periodStart={report.periodStart}
              periodEnd={report.periodEnd}
              isCurrentYear={isCurrentYear}
            />
          </div>
          <div className="col-span-3 flex flex-col gap-4 lg:flex-row">
            <SummaryCards
              totalIncome={report.summary.totalIncome}
              totalExpenses={report.summary.totalExpenses}
              balance={report.summary.balance}
              savingRate={report.summary.savingRate}
            />
            <SecondaryMetrics
              debtRatio={report.summary.debtRatio}
              creditCardRatio={report.summary.creditCardRatio}
              expenseVolatility={report.summary.expenseVolatility}
              goalsAchievedRate={report.summary.goalsAchievedRate}
            />
          </div>
        </section>

        <ScoreExplanation level={scoreBadge.level} />

        <MonthlyAverages
          avgMonthlyIncome={report.summary.avgMonthlyIncome}
          avgMonthlyExpenses={report.summary.avgMonthlyExpenses}
        />

        <div data-onboarding-target="relatorios-graficos">
          <AnnualCharts monthly={report.breakdowns.monthly} />
        </div>

        <TopCategoriesRecurrence
          topCategories={topCategories}
          recurring={report.breakdowns.recurring ?? []}
          recurringExpenseRatio={report.breakdowns.recurringExpenseRatio}
        />

        <div data-onboarding-target="relatorios-insights">
          <InsightsSection title={t('insightsTitle')} insights={report.insights ?? []} />

          {report.aiInsights && report.aiInsights.length > 0 && (
            <InsightsSection title={t('aiTitle')} insights={report.aiInsights} />
          )}

          <CompareSection compare={compare} isLoading={compareQuery.isLoading} />
        </div>
      </div>
    </section>
  )
}
