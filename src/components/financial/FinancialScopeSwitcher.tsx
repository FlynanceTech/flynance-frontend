'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useFinancialScope } from '@/hooks/useFinancialScope'
import { useTranslations } from 'next-intl'

export default function FinancialScopeSwitcher() {
  const t = useTranslations('financialScope')
  const { canSelectScope, scope, setScope } = useFinancialScope()

  if (!canSelectScope) return null

  const currentScope = scope ?? 'house'
  const isMe = currentScope === 'me'

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t('label')}
          </span>
          <span className="text-sm text-slate-600">{t('description')}</span>
        </div>

        <Select value={currentScope} onValueChange={(value) => setScope(value as 'house' | 'me')}>
          <SelectTrigger className="w-full min-w-[160px] rounded-full border-slate-200 bg-white lg:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="house">{t('options.house')}</SelectItem>
            <SelectItem value="me">{t('options.me')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className={isMe ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}
        >
          {isMe ? t('badge.me') : t('badge.house')}
        </Badge>
        <span className="text-xs text-slate-500">{t('helper')}</span>
      </div>
    </div>
  )
}
