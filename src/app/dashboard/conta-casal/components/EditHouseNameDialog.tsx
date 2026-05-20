'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MAX_NAME_LENGTH = 120

type EditHouseNameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string | null | undefined
  onConfirm: (name: string) => void
  isPending: boolean
}

export function EditHouseNameDialog({
  open,
  onOpenChange,
  currentName,
  onConfirm,
  isPending,
}: EditHouseNameDialogProps) {
  const t = useTranslations('coupleAccountPage')
  const [value, setValue] = useState(currentName ?? '')

  useEffect(() => {
    if (open) setValue(currentName ?? '')
  }, [open, currentName])

  const trimmed = value.trim()
  const isUnchanged = trimmed === String(currentName ?? '').trim()
  const isInvalid = trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH
  const canSubmit = !isPending && !isInvalid && !isUnchanged

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    onConfirm(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('editNameDialog.title')}</DialogTitle>
            <DialogDescription>{t('editNameDialog.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="house-name-input">{t('editNameDialog.label')}</Label>
            <Input
              id="house-name-input"
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder={t('editNameDialog.placeholder')}
              disabled={isPending}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {t('editNameDialog.cancel')}
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={!canSubmit}
            >
              {isPending ? t('editNameDialog.saving') : t('editNameDialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
