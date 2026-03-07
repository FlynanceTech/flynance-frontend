'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Check, X, ChevronUp, PlusIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import IconSelector from '../IconSelector'
import { IconName } from '@/utils/icon-map'
import { CategoryDTO, CategoryResponse } from '@/services/category'
import { UseMutationResult } from '@tanstack/react-query'
import clsx from 'clsx'
import { Button } from '@headlessui/react'

type FormData = {
  name: string
  keywords: string[]
}

interface CategoryFormProps {
  type: 'EXPENSE' | 'INCOME'
  tab: number
  editing: CategoryResponse | null
  onCancelEdit: () => void
  createMutation: UseMutationResult<CategoryResponse, Error, CategoryDTO>
  updateMutation: UseMutationResult<
    CategoryResponse,
    Error,
    { id: string; data: CategoryDTO }
  >
}

export function CategoryForm({
  type,
  editing,
  onCancelEdit,
  createMutation,
  updateMutation,
  tab,
}: CategoryFormProps) {
  const t = useTranslations('categoryForm')
  const [color, setColor] = useState(editing?.color || '#22C55E')
  const [icon, setIcon] = useState<IconName>(editing?.icon || 'Wallet')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>(
    editing?.keywords.map((k) => k.name) || [],
  )
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(!!editing)

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('errors.nameRequired')),
        keywords: z.array(z.string().min(1)).min(1, t('errors.keywordsRequired')),
      }),
    [t]
  )

  useEffect(() => {
    if (editing) setIsMobileOpen(true)
  }, [editing])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editing?.name || '',
      keywords: editing?.keywords.map((k) => k.name) || [],
    },
  })

  useEffect(() => {
    setValue('keywords', keywords)
  }, [keywords, setValue])

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        keywords: editing.keywords.map((k) => k.name),
      })
      setKeywords(editing.keywords.map((k) => k.name))
      setColor(editing.color)
      setIcon(editing.icon as IconName)
    }
  }, [editing, reset])

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      const updated = [...keywords, trimmed]
      setKeywords(updated)
      setValue('keywords', updated)
      setKeywordInput('')
    }
  }

  const handleRemoveKeyword = (kw: string) => {
    const updated = keywords.filter((k) => k !== kw)
    setKeywords(updated)
    setValue('keywords', updated)
  }

  const internalSubmit = (data: FormData) => {
    const payload: CategoryDTO = {
      name: data.name,
      color,
      icon,
      keywords,
      type,
    }

    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }

    reset()
    setKeywords([])
    setValue('name', '')
    setColor('#22C55E')
    setIcon('Wallet')
    onCancelEdit()
  }

  const title = editing
    ? t('editTitle')
    : tab === 0
      ? t('addExpenseTitle')
      : t('addIncomeTitle')

  const subtitle = type === 'EXPENSE' ? t('subtitleExpense') : t('subtitleIncome')

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 sm:p-6">
      <div className={clsx('flex items-start justify-between lg:mb-4', isMobileOpen && 'mb-4')}>
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold lg:text-lg">{title}</h2>
          <h3 className="text-xs font-light text-gray-500 sm:text-sm">
            {subtitle}
          </h3>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm lg:hidden"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          aria-label={isMobileOpen ? t('toggleCloseAria') : t('toggleOpenAria')}
        >
          {isMobileOpen ? <ChevronUp className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
        </button>
      </div>

      <form
        onSubmit={handleSubmit(internalSubmit)}
        className={clsx(
          'flex flex-col gap-4 sm:gap-4 lg:flex-row lg:items-end lg:gap-4',
          !isMobileOpen && 'hidden lg:flex',
        )}
      >
        <div className="flex w-full flex-col items-start">
          <label className="mb-1 block text-sm text-gray-600">{t('nameLabel')}</label>
          <input
            {...register('name')}
            className={clsx(
              'h-12 w-full rounded-full border px-3 py-2 text-sm outline-none',
              errors.name
                ? 'border-2 border-red-300 placeholder:text-red-400'
                : 'border-gray-300',
            )}
            placeholder={errors.name ? t('errors.nameRequired') : t('namePlaceholder')}
          />
        </div>

        <div className="flex w-full flex-col items-start">
          <label className="mb-1 block text-sm text-gray-600">{t('keywordsLabel')}</label>
          <div
            className={clsx(
              'flex h-12 w-full items-center gap-2 rounded-full text-sm outline-none',
              errors.keywords ? 'border-2 border-red-300' : 'border border-gray-300',
            )}
          >
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className={clsx(
                'h-12 w-full px-3 py-2 text-sm outline-none',
                errors.keywords ? 'placeholder:text-red-400' : '',
              )}
              placeholder={errors.keywords ? t('errors.keywordsRequired') : t('keywordsPlaceholder')}
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="flex h-12 min-w-12 cursor-pointer items-center justify-center rounded-full bg-secondary text-sm text-black hover:bg-secondary/80"
              aria-label={t('addKeywordAria')}
            >
              <Plus />
            </button>
          </div>
        </div>

        <div className="flex w-full flex-col lg:max-w-12 lg:items-center lg:justify-center">
          <label className="mb-1 block text-sm text-gray-600">{t('colorLabel')}</label>
          <div className="relative w-full">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute h-12 w-full cursor-pointer opacity-0 lg:w-12"
              aria-label={t('colorPickerAria')}
            />
            <div
              className="h-12 w-full cursor-pointer rounded-full border-4 border-gray-200 lg:w-12"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>

        <div className="flex w-full flex-col items-center justify-end lg:max-w-56">
          <IconSelector value={icon} onChange={setIcon} label={t('iconLabel')} />
        </div>

        <Button
          type="submit"
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2 text-white hover:bg-secondary/80 lg:w-auto"
        >
          {editing ? <Check /> : <Plus />}
          {editing ? t('updateButton') : t('addButton')}
        </Button>
      </form>

      {keywords.length > 0 && (
        <div
          className={clsx(
            'mt-4 flex flex-wrap gap-2',
            !isMobileOpen && 'hidden lg:flex',
          )}
        >
          {keywords.map((kw, idx) => (
            <span
              key={idx}
              className="flex items-center rounded-full bg-gray-200 px-3 py-1 text-xs"
            >
              {kw}
              <X
                onClick={() => handleRemoveKeyword(kw)}
                className="ml-1 cursor-pointer"
                size={14}
                aria-label={t('removeKeywordAria')}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
