'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import IconSelector from '../IconSelector'
import type { IconName } from '@/utils/icon-map'

export type CategoryType = 'EXPENSE' | 'INCOME'

export type CreateCategoryDraft = {
  name: string
  type: CategoryType
  color: string
  icon: IconName
  keywords: string[]
}

const schema = z.object({
  name: z.string().min(1, 'Nome de categoria é obrigatória'),
  keywords: z.array(z.string().min(1)).min(1, 'Pelo menos uma palavra chave'),
})

type FormData = z.infer<typeof schema>

export type CreateCategoryModalProps = {
  open: boolean
  loading?: boolean
  initialName?: string
  initialType?: CategoryType
  typeLocked?: boolean
  onClose: () => void
  onConfirm: (draft: CreateCategoryDraft) => void
}

function CreateCategoryModalContent({
  loading = false,
  initialName = '',
  initialType = 'EXPENSE',
  typeLocked = false,
  onClose,
  onConfirm,
}: Omit<CreateCategoryModalProps, 'open'>) {
  const [color, setColor] = useState<string>('#22C55E')
  const [icon, setIcon] = useState<IconName>('Wallet')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [type, setType] = useState<CategoryType>(initialType)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName, keywords: [] },
  })

  useEffect(() => {
    setValue('keywords', keywords)
  }, [keywords, setValue])

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim()
    if (!trimmed) return
    if (keywords.includes(trimmed)) {
      setKeywordInput('')
      return
    }
    setKeywords((prev) => [...prev, trimmed])
    setKeywordInput('')
  }

  const handleRemoveKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  const submit = handleSubmit((data) => {
    onConfirm({
      name: data.name.trim(),
      keywords,
      color,
      icon,
      type: typeLocked ? initialType : type,
    })
  })

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Fechar modal"
        disabled={loading}
      />

      <div className="relative w-[92vw] max-w-xl rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Criar categoria</h3>
            <p className="text-xs text-slate-500 sm:text-sm">
              Adicione uma categoria personalizada para classificar suas transações.
            </p>
          </div>

          <button
            className="rounded-full p-2 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Fechar"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div
          className="mt-4 flex flex-col gap-4"
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return

            const el = e.target as HTMLElement | null
            const isKeywordInput = el?.getAttribute?.('data-keyword-input') === 'true'
            if (isKeywordInput) return

            e.preventDefault()
            e.stopPropagation()
            submit()
          }}
        >
          {!typeLocked && (
            <div className="flex w-full flex-col items-start">
              <label className="mb-1 block text-sm text-gray-600">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CategoryType)}
                className="h-12 w-full rounded-full border border-gray-300 px-3 py-2 text-sm outline-none"
                disabled={loading}
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </select>
            </div>
          )}

          <div className="flex w-full flex-col items-start">
            <label className="mb-1 block text-sm text-gray-600">Nome da Categoria</label>
            <input
              {...register('name')}
              className={clsx(
                'h-12 w-full rounded-full border px-3 py-2 text-sm outline-none',
                errors.name ? 'border-2 border-red-300 placeholder:text-red-400' : 'border-gray-300'
              )}
              placeholder={errors.name ? 'Nome de categoria é obrigatória' : 'Nome da categoria'}
              disabled={loading}
            />
          </div>

          <div className="flex w-full flex-col items-start">
            <label className="mb-1 block text-sm text-gray-600">Palavras-chave</label>

            <div
              className={clsx(
                'flex h-12 w-full items-center gap-2 rounded-full text-sm outline-none',
                errors.keywords ? 'border-2 border-red-300' : 'border border-gray-300'
              )}
            >
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                className={clsx(
                  'h-12 w-full px-3 py-2 text-sm outline-none',
                  errors.keywords ? 'placeholder:text-red-400' : ''
                )}
                placeholder={errors.keywords ? 'Pelo menos uma palavra chave' : 'Digite uma palavra-chave'}
                disabled={loading}
                data-keyword-input="true"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  e.stopPropagation()
                  handleAddKeyword()
                }}
              />

              <button
                type="button"
                onClick={handleAddKeyword}
                className="flex h-12 min-w-12 cursor-pointer items-center justify-center rounded-full bg-secondary text-sm text-white hover:bg-secondary/80 disabled:opacity-60"
                disabled={loading}
              >
                +
              </button>
            </div>

            {keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <span key={kw} className="flex items-center rounded-full bg-gray-200 px-3 py-1 text-xs">
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="ml-1 cursor-pointer"
                      aria-label="Remover keyword"
                      disabled={loading}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
            <div className="flex w-full flex-col items-start">
              <label className="mb-1 block text-sm text-gray-600">Cor</label>
              <div className="relative w-full">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute h-12 w-full cursor-pointer opacity-0"
                  disabled={loading}
                />
                <div
                  className="h-12 w-full cursor-pointer rounded-full border-4 border-gray-200"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>

            <div className="flex w-full flex-col items-start">
              <IconSelector value={icon} onChange={setIcon} label="Ícone" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                submit()
              }}
              className={clsx(
                'rounded-full px-4 py-2 text-sm text-white',
                loading ? 'bg-slate-400' : 'bg-secondary hover:bg-secondary/80'
              )}
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CreateCategoryModal({
  open,
  loading = false,
  initialName = '',
  initialType = 'EXPENSE',
  typeLocked = false,
  onClose,
  onConfirm,
}: CreateCategoryModalProps) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <CreateCategoryModalContent
      key={`${initialType}:${initialName}`}
      loading={loading}
      initialName={initialName}
      initialType={initialType}
      typeLocked={typeLocked}
      onClose={onClose}
      onConfirm={onConfirm}
    />,
    document.body
  )
}
