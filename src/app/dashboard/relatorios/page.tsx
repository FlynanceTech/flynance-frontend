'use client'

import Header from '../components/Header'
import api from '@/lib/axios'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
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

export default function ReportsPage() {
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
      toast.success('Relatório recalculado')
    } catch (err) {
      toast.error('Erro ao recalcular relatório')
    } finally {
      setRecalcLoading(false)
    }
  }

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <div className="w-full mx-auto flex flex-col gap-6">
        <Header
          title="Relatórios"
          subtitle="Saúde financeira, evolução anual e recomendações personalizadas."
          newTransation={false}
          rightContent={
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm text-gray-500 hidden lg:block">Ano</span>
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
                {recalcLoading ? 'Recalculando...' : 'Recalcular relatório'}
              </button>
            </div>
          }
        />
        <section className='grid grid-cols-1 lg:grid-cols-4'>
          <div className='col-span-1 lg:mr-4 mb-4 lg:mb-0'>
            <ScoreHeaderCard
              score={score}
              badgeLabel={scoreBadge.label}
              badgeClass={scoreBadge.cls}
              periodStart={report.periodStart}
              periodEnd={report.periodEnd}
              isCurrentYear={isCurrentYear}
            />

          </div>
          <div className='col-span-3 flex flex-col lg:flex-row gap-4'>
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

            <ScoreExplanation label={scoreBadge.label} />

        <MonthlyAverages
          avgMonthlyIncome={report.summary.avgMonthlyIncome}
          avgMonthlyExpenses={report.summary.avgMonthlyExpenses}
        />

        <AnnualCharts monthly={report.breakdowns.monthly} />

        <TopCategoriesRecurrence
          topCategories={topCategories}
          recurring={report.breakdowns.recurring ?? []}
          recurringExpenseRatio={report.breakdowns.recurringExpenseRatio}
        />

        <InsightsSection title="Insights" insights={report.insights ?? []} />

        {report.aiInsights && report.aiInsights.length > 0 && (
          <InsightsSection title="IA" insights={report.aiInsights} />
        )}

        <CompareSection compare={compare} isLoading={compareQuery.isLoading} />
      </div>
    </section>
  )
}
