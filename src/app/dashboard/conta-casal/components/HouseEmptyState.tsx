'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { BellRing, History, House, Link2 } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type HouseEmptyStateProps = {
  isPending: boolean
  onCreate: (name: string) => Promise<unknown> | unknown
}

export function HouseEmptyState({ isPending, onCreate }: HouseEmptyStateProps) {
  const t = useTranslations('coupleAccountPage')
  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(2, t('emptyState.form.nameMin'))
          .max(80, t('emptyState.form.nameMax')),
      }),
    [t]
  )

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
    },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    await onCreate(values.name)
    form.reset({ name: values.name })
  })

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <House className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl text-[#333C4D]">{t('emptyState.title')}</CardTitle>
            <p className="mt-1 text-sm text-slate-600">{t('emptyState.description')}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 inline-flex rounded-full bg-[#EAF4FA] p-2 text-[#2F6E91]">
              <Link2 className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-[#333C4D]">{t('emptyState.features.sharedTitle')}</p>
            <p className="mt-1 text-xs text-slate-600">{t('emptyState.features.sharedDescription')}</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 inline-flex rounded-full bg-[#EAF4FA] p-2 text-[#2F6E91]">
              <History className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-[#333C4D]">{t('emptyState.features.historyTitle')}</p>
            <p className="mt-1 text-xs text-slate-600">{t('emptyState.features.historyDescription')}</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 inline-flex rounded-full bg-[#EAF4FA] p-2 text-[#2F6E91]">
              <BellRing className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-[#333C4D]">{t('emptyState.features.notificationTitle')}</p>
            <p className="mt-1 text-xs text-slate-600">{t('emptyState.features.notificationDescription')}</p>
          </article>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            <Label htmlFor="house-name">{t('emptyState.form.nameLabel')}</Label>
            <Input
              id="house-name"
              placeholder={t('emptyState.form.namePlaceholder')}
              disabled={isPending}
              {...form.register('name')}
            />
            <p className="text-xs text-slate-500">{t('emptyState.form.helper')}</p>
            <p className="text-xs text-red-500">{form.formState.errors.name?.message}</p>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">{t('emptyState.form.notice')}</p>
            <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
              {isPending ? t('emptyState.form.creating') : t('emptyState.form.create')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
