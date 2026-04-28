'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HouseContext } from '@/types/house'
import { HeartHandshake, ShieldCheck, UserRoundX, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { getCounterpartMember, getHouseMemberDisplayName } from './house-utils'

type HousePartnerCardProps = {
  house: HouseContext
  canManagePartner: boolean
  isRemoving: boolean
  onRequestRemove: () => void
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function HousePartnerCard({
  house,
  canManagePartner,
  isRemoving,
  onRequestRemove,
}: HousePartnerCardProps) {
  const t = useTranslations('coupleAccountPage')
  const counterpart = getCounterpartMember(house)
  const counterpartName = getHouseMemberDisplayName(counterpart, t('partnerCard.fallbacks.noName'))
  const counterpartRole = house.role === 'OWNER' ? 'PARTNER' : 'OWNER'

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl text-[#333C4D]">{t('partnerCard.title')}</CardTitle>
            <p className="mt-1 text-sm text-slate-600">{t('partnerCard.description')}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {counterpart ? (
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <Avatar className="h-12 w-12 border border-slate-200 bg-white">
                <AvatarFallback className="bg-[#EAF4FA] text-sm font-semibold text-[#2F6E91]">
                  {getInitials(counterpartName || 'F')}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#333C4D]">{counterpartName}</p>
                  <Badge
                    variant="outline"
                    className={
                      counterpartRole === 'OWNER'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-[#BFE0F5] bg-[#F3FAFF] text-[#2F6E91]'
                    }
                  >
                    {t(`roles.${counterpartRole}`)}
                  </Badge>
                </div>

                <p className="mt-1 text-sm text-slate-600">
                  {counterpart.email || t('partnerCard.fallbacks.noEmail')}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-slate-100 p-2 text-slate-700">
                  {counterpartRole === 'OWNER' ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <HeartHandshake className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#333C4D]">
                    {counterpartRole === 'OWNER'
                      ? t('partnerCard.ownerConnectedTitle')
                      : t('partnerCard.partnerConnectedTitle')}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {counterpartRole === 'OWNER'
                      ? t('partnerCard.ownerConnectedDescription')
                      : t('partnerCard.partnerConnectedDescription')}
                  </p>
                </div>
              </div>
            </div>

            {canManagePartner && (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={onRequestRemove}
                disabled={isRemoving}
              >
                <UserRoundX className="h-4 w-4" />
                {isRemoving ? t('partnerCard.actions.removing') : t('partnerCard.actions.remove')}
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
            <p className="font-semibold text-[#333C4D]">{t('partnerCard.emptyTitle')}</p>
            <p className="mt-2">
              {canManagePartner
                ? t('partnerCard.emptyOwnerDescription')
                : t('partnerCard.emptyPartnerDescription')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
