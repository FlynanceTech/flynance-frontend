'use client'

import { useState } from 'react'
import { Crown, HeartHandshake, House, Pencil } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUpdateHouseName } from '@/hooks/query/useHouse'
import type { HouseContext } from '@/types/house'

import { EditHouseNameDialog } from './EditHouseNameDialog'
import { formatHouseDate, getHouseMemberDisplayName } from './house-utils'

type HouseOverviewCardProps = {
  house: HouseContext
}

export function HouseOverviewCard({ house }: HouseOverviewCardProps) {
  const t = useTranslations('coupleAccountPage')
  const locale = useLocale()
  const [isEditOpen, setEditOpen] = useState(false)
  const updateHouseName = useUpdateHouseName()
  const canEditName = house.role === 'OWNER'

  function handleConfirmRename(name: string) {
    updateHouseName.mutate(name, {
      onSuccess: () => setEditOpen(false),
    })
  }

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#121212]">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 dark:bg-[#F4C542]/15">
              <House className="h-5 w-5 text-primary dark:text-[#F4C542]" />
            </div>
            <div>
              <CardTitle className="text-xl text-[#333C4D] dark:text-white">{t('houseCard.title')}</CardTitle>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-300">{t('houseCard.description')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[#BFE0F5] bg-[#F3FAFF] text-[#2F6E91] dark:border-[#F4C542]/30 dark:bg-[#F4C542]/10 dark:text-[#F4C542]">
              {t(`roles.${house.role}`)}
            </Badge>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {t(`statuses.${house.status}`)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-400">{t('houseCard.fields.name')}</p>
            <p className="mt-1 pr-8 text-sm font-semibold text-[#333C4D] dark:text-white">
              {house.name || t('houseCard.fallbacks.unnamedHouse')}
            </p>
            {canEditName && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 text-slate-500 hover:text-[#2F6E91] dark:text-zinc-400 dark:hover:text-[#F4C542]"
                onClick={() => setEditOpen(true)}
                aria-label={t('houseCard.editNameAction')}
                title={t('houseCard.editNameAction')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-400">{t('houseCard.fields.owner')}</p>
            <p className="mt-1 text-sm font-semibold text-[#333C4D] dark:text-white">
              {getHouseMemberDisplayName(house.owner, t('houseCard.fallbacks.ownerMissing'))}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-400">{t('houseCard.fields.createdAt')}</p>
            <p className="mt-1 text-sm font-semibold text-[#333C4D] dark:text-white">
              {formatHouseDate(house.createdAt, locale)}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-400">{t('houseCard.fields.linkedAt')}</p>
            <p className="mt-1 text-sm font-semibold text-[#333C4D] dark:text-white">
              {house.linkedAt ? formatHouseDate(house.linkedAt, locale) : t('houseCard.fallbacks.notLinkedYet')}
            </p>
          </article>
        </div>

        <div className="rounded-2xl border border-[#D7EAF5] bg-[#F3FAFF] p-4 dark:border-[#F4C542]/25 dark:bg-[#1B1B1B]">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white p-2 text-[#2F6E91] dark:bg-[#F4C542] dark:text-black">
              {house.role === 'OWNER' ? (
                <Crown className="h-4 w-4" />
              ) : (
                <HeartHandshake className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#333C4D] dark:text-white">
                {house.role === 'OWNER' ? t('houseCard.ownerNoteTitle') : t('houseCard.partnerNoteTitle')}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-zinc-300">
                {house.role === 'OWNER' ? t('houseCard.ownerNoteDescription') : t('houseCard.partnerNoteDescription')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      {canEditName && (
        <EditHouseNameDialog
          open={isEditOpen}
          onOpenChange={(next) => {
            if (!updateHouseName.isPending) setEditOpen(next)
          }}
          currentName={house.name}
          onConfirm={handleConfirmRename}
          isPending={updateHouseName.isPending}
        />
      )}
    </Card>
  )
}
