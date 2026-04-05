'use client'

import { Crown, HeartHandshake, House } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HouseContext } from '@/types/house'

import { formatHouseDate, getHouseMemberDisplayName } from './house-utils'

type HouseOverviewCardProps = {
  house: HouseContext
}

export function HouseOverviewCard({ house }: HouseOverviewCardProps) {
  const t = useTranslations('coupleAccountPage')
  const locale = useLocale()

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <House className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl text-[#333C4D]">{t('houseCard.title')}</CardTitle>
              <p className="mt-1 text-sm text-slate-600">{t('houseCard.description')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[#BFE0F5] bg-[#F3FAFF] text-[#2F6E91]">
              {t(`roles.${house.role}`)}
            </Badge>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              {t(`statuses.${house.status}`)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{t('houseCard.fields.name')}</p>
            <p className="mt-1 text-sm font-semibold text-[#333C4D]">
              {house.name || t('houseCard.fallbacks.unnamedHouse')}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{t('houseCard.fields.owner')}</p>
            <p className="mt-1 text-sm font-semibold text-[#333C4D]">
              {getHouseMemberDisplayName(house.owner, t('houseCard.fallbacks.ownerMissing'))}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{t('houseCard.fields.createdAt')}</p>
            <p className="mt-1 text-sm font-semibold text-[#333C4D]">
              {formatHouseDate(house.createdAt, locale)}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{t('houseCard.fields.linkedAt')}</p>
            <p className="mt-1 text-sm font-semibold text-[#333C4D]">
              {house.linkedAt ? formatHouseDate(house.linkedAt, locale) : t('houseCard.fallbacks.notLinkedYet')}
            </p>
          </article>
        </div>

        <div className="rounded-2xl border border-[#D7EAF5] bg-[#F3FAFF] p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white p-2 text-[#2F6E91]">
              {house.role === 'OWNER' ? (
                <Crown className="h-4 w-4" />
              ) : (
                <HeartHandshake className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#333C4D]">
                {house.role === 'OWNER' ? t('houseCard.ownerNoteTitle') : t('houseCard.partnerNoteTitle')}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {house.role === 'OWNER' ? t('houseCard.ownerNoteDescription') : t('houseCard.partnerNoteDescription')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
