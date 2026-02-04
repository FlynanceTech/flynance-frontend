'use client'

import React, { useEffect, useMemo, useState } from 'react'
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

  /** texto sugerido (do "Criar “xxx”") */
  initialName?: string

  /** tipo sugerido (normalmente do filtro atual) */
  initialType?: CategoryType

  /** se true: não mostra select de tipo (tipo fica travado no initialType) */
  typeLocked?: boolean

  onClose: () => void
  onConfirm: (draft: CreateCategoryDraft) => void
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
  const [color, setColor] = useState<string>('#22C55E')
  const [icon, setIcon] = useState<IconName>('Wallet')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [type, setType] = useState<CategoryType>(initialType)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName, keywords: [] },
  })

  // re-hidrata quando abrir / mudar sugestões
  useEffect(() => {
    if (!open) return
    reset({ name: initialName, keywords: [] })
    setKeywords([])
    setKeywordInput('')
    setColor('#22C55E')
    setIcon('Wallet')
    setType(initialType)
  }, [open, initialName, initialType, reset])

  // mantém RHF sincronizado com keywords
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
    const draft: CreateCategoryDraft = {
      name: data.name.trim(),
      keywords,
      color,
      icon,
      type: typeLocked ? initialType : type,
    }

    onConfirm(draft)
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Fechar modal"
        disabled={loading}
      />

      <div className="relative w-[92vw] max-w-xl rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">Criar categoria</h3>
            <p className="text-xs sm:text-sm text-slate-500">
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
            // ✅ evita o Enter submeter o FORM pai (TransactionDrawer)
            if (e.key === 'Enter') {
              // não atrapalhar o campo de keywords (ele já tem lógica própria)
              const el = e.target as HTMLElement | null
              const isKeywordInput = el?.getAttribute?.('data-keyword-input') === 'true'
              if (!isKeywordInput) {
                e.preventDefault()
                e.stopPropagation()
                submit()
              }
            }
          }}
          >
          {/* Tipo (opcional) */}
          {!typeLocked && (
            <div className="w-full flex flex-col items-start">
              <label className="text-sm text-gray-600 mb-1 block">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CategoryType)}
                className="w-full h-12 border border-gray-300 rounded-full px-3 py-2 text-sm outline-none"
                disabled={loading}
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </select>
            </div>
          )}

          {/* Nome */}
          <div className="w-full flex flex-col items-start">
            <label className="text-sm text-gray-600 mb-1 block">Nome da Categoria</label>
            <input
              {...register('name')}
              className={clsx(
                'w-full h-12 border rounded-full px-3 py-2 text-sm outline-none',
                errors.name ? 'border-red-300 border-2 placeholder:text-red-400' : 'border-gray-300'
              )}
              placeholder={errors.name ? 'Nome de categoria é obrigatória' : 'Nome da categoria'}
              disabled={loading}
            />
          </div>

          {/* Keywords */}
          <div className="w-full flex flex-col items-start">
            <label className="text-sm text-gray-600 mb-1 block">Palavras-chave</label>

            <div
              className={clsx(
                'flex items-center gap-2 w-full h-12 rounded-full text-sm outline-none',
                errors.keywords ? 'border-red-300 border-2' : 'border border-gray-300'
              )}
            >
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                className={clsx(
                  'w-full h-12 px-3 py-2 text-sm outline-none',
                  errors.keywords ? 'placeholder:text-red-400' : ''
                )}
                placeholder={errors.keywords ? 'Pelo menos uma palavra chave' : 'Digite uma palavra-chave'}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    handleAddKeyword()
                  }
                }}
              />

              <button
                type="button"
                onClick={handleAddKeyword}
                className="h-12 min-w-12 flex items-center justify-center bg-secondary text-white rounded-full hover:bg-secondary/80 text-sm cursor-pointer disabled:opacity-60"
                disabled={loading}
              >
                +
              </button>
            </div>

            {keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <span key={kw} className="flex items-center text-xs px-3 py-1 bg-gray-200 rounded-full">
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

          {/* Cor + Ícone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="w-full flex flex-col items-start">
              <label className="text-sm text-gray-600 mb-1 block">Cor</label>
              <div className="relative w-full">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute opacity-0 w-full h-12 cursor-pointer"
                  disabled={loading}
                />
                <div
                  className="w-full h-12 rounded-full border-4 cursor-pointer border-gray-200"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>

            <div className="w-full flex flex-col items-start">
              <IconSelector value={icon} onChange={setIcon} label="Ícone" />
            </div>
          </div>

          {/* Ações */}
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
