'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HouseInvite } from '@/types/house'
import { Copy, Link2, Loader2, Plus, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { formatHouseDate } from './house-utils'

type PendingInviteCardProps = {
  invites: HouseInvite[]
  canManageInvites: boolean
  isGenerating: boolean
  deletingInviteId?: string | null
  onCopyInvite: (invite: HouseInvite) => void
  onDeleteInvite: (invite: HouseInvite) => void
  onGenerateInvite: () => void
}

function statusClass(status: HouseInvite['status']) {
  if (status === 'ACCEPTED') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'REVOKED') return 'border-red-200 bg-red-50 text-red-700'
  if (status === 'EXPIRED') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (status === 'PENDING') return 'border-[#BFE0F5] bg-[#F3FAFF] text-[#2F6E91]'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

export function PendingInviteCard({
  invites,
  canManageInvites,
  isGenerating,
  deletingInviteId,
  onCopyInvite,
  onDeleteInvite,
  onGenerateInvite,
}: PendingInviteCardProps) {
  const t = useTranslations('coupleAccountPage')
  const locale = useLocale()

  const sortedInvites = useMemo(
    () =>
      [...invites].sort((a, b) => {
        const left = new Date(a.createdAt ?? 0).getTime()
        const right = new Date(b.createdAt ?? 0).getTime()
        return right - left
      }),
    [invites]
  )

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#121212]">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 dark:bg-[#F4C542]/15">
              <Link2 className="h-5 w-5 text-primary dark:text-[#F4C542]" />
            </div>
            <div>
              <CardTitle className="text-xl text-[#333C4D] dark:text-white">{t('invitesCard.title')}</CardTitle>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-300">
                {canManageInvites
                  ? t('invitesCard.ownerDescription')
                  : t('invitesCard.partnerDescription')}
              </p>
            </div>
          </div>

          {canManageInvites && (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={onGenerateInvite}
              disabled={isGenerating}
            >
              <Plus className="h-4 w-4" />
              {isGenerating ? t('invitesCard.actions.generating') : t('invitesCard.actions.generate')}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {sortedInvites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
            {canManageInvites ? t('invitesCard.emptyOwner') : t('invitesCard.emptyPartner')}
          </div>
        ) : (
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {sortedInvites.map((invite) => {
              const isPending = invite.status === 'PENDING'
              const acceptedName = invite.acceptedByName || invite.acceptedByEmail
              const isDeleting = deletingInviteId === invite.id

              return (
                <article key={invite.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Badge variant="outline" className={statusClass(invite.status)}>
                      {t(`inviteStatuses.${invite.status}`)}
                    </Badge>

                    {canManageInvites && (
                      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        {isPending && (
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 sm:flex-none"
                            onClick={() => onCopyInvite(invite)}
                            disabled={isDeleting}
                          >
                            <Copy className="h-4 w-4" />
                            {t('invitesCard.actions.copy')}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 sm:flex-none"
                          onClick={() => onDeleteInvite(invite)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          {isDeleting
                            ? t('invitesCard.actions.deleting')
                            : t('invitesCard.actions.delete')}
                        </Button>
                      </div>
                    )}
                  </div>

                  {invite.status === 'ACCEPTED' && acceptedName && (
                    <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
                      {t('invitesCard.acceptedBy', {
                        name: acceptedName,
                        date: invite.acceptedAt ? formatHouseDate(invite.acceptedAt, locale) : '',
                      })}
                    </p>
                  )}

                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                        {t('invitesCard.fields.createdAt')}
                      </dt>
                      <dd className="mt-1 font-medium text-[#333C4D] dark:text-white">
                        {formatHouseDate(invite.createdAt, locale)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                        {t('invitesCard.fields.expiresAt')}
                      </dt>
                      <dd className="mt-1 font-medium text-[#333C4D] dark:text-white">
                        {formatHouseDate(invite.expiresAt, locale)}
                      </dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
