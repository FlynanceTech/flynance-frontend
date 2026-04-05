'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTranslations } from 'next-intl'

type RemovePartnerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
  partnerName?: string | null
}

export function RemovePartnerDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  partnerName,
}: RemovePartnerDialogProps) {
  const t = useTranslations('coupleAccountPage')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('removePartnerDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('removePartnerDialog.description', {
              partnerName: partnerName || t('removePartnerDialog.defaultPartnerName'),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t('removePartnerDialog.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {isPending ? t('removePartnerDialog.confirming') : t('removePartnerDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
