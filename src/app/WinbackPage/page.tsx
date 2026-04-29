"use client"

import { Button } from "@/components/ui/button"
import { useSignature } from "@/hooks/query/useSignature"
import { useUserSession } from "@/stores/useUserSession"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { useEffect, useMemo } from "react"

function formatCurrency(value: number | null | undefined, locale: string) {
  if (value == null) return ""
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(date)
}

export default function WinbackPage() {
  const t = useTranslations("winbackPage")
  const locale = useLocale()
  const { user, fetchAccount } = useUserSession()

  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  const userId = user?.userData?.user?.id
  const { useSignatureByUserId } = useSignature(userId)
  const { data, isLoading, isError, isFetching } = useSignatureByUserId

  const signature = data?.lastSubscription?.signature ?? null
  const stripeSubscription = data?.lastSubscription?.stripeSubscription ?? null

  const previousPlan = useMemo(() => {
    if (!signature) return null

    const name = signature?.plan?.name ?? signature?.description ?? t("previousPlan.fallbackName")
    const cycleSuffix = signature?.cycle === "YEARLY" ? t("cycle.year") : t("cycle.month")
    const price = `${formatCurrency(signature?.value, locale)}${cycleSuffix}`
    const cancelledAt = formatDate(signature?.endDate ?? signature?.updatedAt, locale)

    let helper = t("helpers.default")

    if (stripeSubscription?.status === "trialing" && stripeSubscription?.trial_end) {
      helper = t("helpers.trialing", {
        date: formatDate(new Date(stripeSubscription.trial_end * 1000).toISOString(), locale),
      })
    }

    if ((signature as any)?.cancelAtPeriodEnd) {
      helper = t("helpers.cancelAtPeriodEnd")
    }

    return { name, price, cancelledAt, helper }
  }, [locale, signature, stripeSubscription, t])

  return (
    <main
      className="
        w-screen h-screen flex flex-col
        bg-gradient-to-r from-primary to-secondary
        lg:bg-none lg:bg-secondary
        lg:grid lg:grid-cols-2 lg:pr-8
      "
    >
      <section className="relative w-full h-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center px-8">
        <div className="flex flex-col items-center z-20 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">{t("hero.title")}</h1>
          <p className="text-lg opacity-90 mb-8 text-center">
            {t("hero.subtitleLine1")}
            <br />
            {t("hero.subtitleLine2")}
          </p>

          <ul className="space-y-3 text-lg opacity-95 text-start">
            <li>{t("hero.bullets.autoCategorization")}</li>
            <li>{t("hero.bullets.goals")}</li>
            <li>{t("hero.bullets.reports")}</li>
            <li>{t("hero.bullets.realtimeDashboard")}</li>
          </ul>
        </div>
      </section>

      <section className="w-full h-full lg:py-8 flex flex-col gap-8 items-center justify-center z-30 lg:mt-0">
        <div className="flex flex-col gap-6 items-center justify-center w-full h-full bg-white rounded-t-[48px] lg:rounded-[64px] px-6">
          <h2 className="text-2xl font-semibold mt-4">{t("right.title")}</h2>

          <p className="text-gray-600 text-center">
            {t("right.subtitleLine1")}
            <br />
            {t("right.subtitleLine2")}
          </p>

          {(isLoading || isFetching) && <CardSkeleton />}

          {isError && (
            <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {t("errors.loadPreviousPlan")}
            </div>
          )}

          {!isLoading && !isFetching && previousPlan && (
            <div className="mb-2 border border-gray-200 rounded-lg p-4 text-left w-full max-w-md">
              <p className="text-sm font-medium text-gray-700">{t("previousPlan.title")}</p>

              <p className="mt-1 text-gray-900 font-semibold">{previousPlan.name}</p>

              <p className="text-sm text-gray-600">
                {t("previousPlan.cancelledLine", {
                  price: previousPlan.price,
                  date: previousPlan.cancelledAt,
                })}
              </p>

              <p className="mt-2 text-xs text-emerald-700">{previousPlan.helper}</p>
            </div>
          )}

          {!isLoading && !isFetching && !isError && !previousPlan && (
            <div className="mb-2 border border-gray-200 rounded-lg p-4 text-left w-full max-w-md">
              <p className="text-sm font-medium text-gray-700">{t("previousPlan.title")}</p>
              <p className="mt-1 text-gray-900 font-semibold">{t("previousPlan.emptyTitle")}</p>
              <p className="text-sm text-gray-600">{t("previousPlan.emptySubtitle")}</p>
            </div>
          )}

          <Link
            href="/WinbackPage/planos"
            className="text-primary text-center mt-1 hover:underline mb-4"
          >
            <Button className="max-w-80 w-full h-12 text-lg mb-1">{t("viewPlansAgain")}</Button>
          </Link>
        </div>
      </section>
    </main>
  )
}

function CardSkeleton() {
  return (
    <div className="mb-2 border border-gray-200 rounded-lg p-4 text-left w-full max-w-md animate-pulse">
      <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
      <div className="h-5 w-56 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-64 bg-gray-200 rounded" />
    </div>
  )
}
