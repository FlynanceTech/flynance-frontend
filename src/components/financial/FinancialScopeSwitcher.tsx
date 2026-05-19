'use client'

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { useFinancialScope } from '@/hooks/useFinancialScope'
import type { FinancialDataScope } from '@/lib/financialScope'
import { useTranslations } from 'next-intl'

function toFirstName(name?: string | null) {
  const first = String(name || '').trim().split(/\s+/)[0] ?? ''
  if (!first) return ''
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

export default function FinancialScopeSwitcher() {
  const t = useTranslations('financialScope')
  const { canSelectScope, scope, houseContext, setScope } = useFinancialScope()

  if (!canSelectScope) return null

  const currentScope = scope ?? 'house'
  const ownerName = toFirstName(houseContext?.owner?.name) || t('options.owner')
  const partnerName = toFirstName(houseContext?.partner?.name) || t('options.partner')
  const currentLabel =
    currentScope === 'house'
      ? t('options.house')
      : currentScope === 'partner'
      ? partnerName
      : ownerName

  return (
    <Select value={currentScope} onValueChange={(value) => setScope(value as FinancialDataScope)}>
      <SelectTrigger className="h-7 w-fit min-w-[184px] rounded-full border-0 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 shadow-none hover:bg-slate-200 focus:ring-1 focus:ring-primary/30">
        <span>{t('current', { scope: currentLabel })}</span>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="house">{t('options.house')}</SelectItem>
        <SelectItem value="owner">{ownerName}</SelectItem>
        <SelectItem value="partner">{partnerName}</SelectItem>
      </SelectContent>
    </Select>
  )
}
