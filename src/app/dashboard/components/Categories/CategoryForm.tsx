'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Check, X, ChevronDown, ChevronUp, PlusCircle, PlusIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import IconSelector from '../IconSelector'
import { IconName } from '@/utils/icon-map'
import { CategoryDTO, CategoryResponse } from '@/services/category'
import { UseMutationResult } from '@tanstack/react-query'
import clsx from 'clsx'

const schema = z.object({
  name: z.string().min(1, 'Nome de categoria é obrigatória'),
  keywords: z.array(z.string().min(1)).min(1, 'Pelo menos uma palavra chave'),
})

type FormData = z.infer<typeof schema>

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
  const [color, setColor] = useState(editing?.color || '#22C55E')
  const [icon, setIcon] = useState<IconName>(editing?.icon || 'Wallet')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>(
    editing?.keywords.map((k) => k.name) || [],
  )

  // controla se o form aparece no mobile
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(!!editing)

  useEffect(() => {
    if (editing) {
      setIsMobileOpen(true) // se entrou em modo edição, garante que abre no mobile
    }
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

  const title =
    editing
      ? 'Editar Categoria'
      : `Adicionar Categoria de ${tab === 0 ? 'Despesas' : 'Receitas'}`

  return (
    <div className="bg-white rounded-md border border-gray-200 p-4 sm:p-6">
      {/* Cabeçalho + toggle mobile */}
      <div className={clsx("flex items-start justify-between lg:mb-4", isMobileOpen && "mb-4" )}>
        <div className="flex flex-col gap-1">
          <h2 className="text-base lg:text-lg font-semibold">{title}</h2>
          <h3 className="text-xs sm:text-sm font-light text-gray-500">
            Crie categorias personalizadas para classificar seus gastos
          </h3>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-full border border-gray-300 text-gray-700 bg-white shadow-sm lg:hidden"
          onClick={() => setIsMobileOpen((prev) => !prev)}
        >
          {isMobileOpen ? (
            <>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Formulário – some no mobile quando fechado, sempre visível no desktop */}
      <form
        onSubmit={handleSubmit(internalSubmit)}
        className={clsx(
          'flex flex-col gap-4 sm:gap-4 lg:flex-row lg:gap-4 lg:items-end',
          !isMobileOpen && 'hidden lg:flex',
        )}
      >
        <div className="w-full flex flex-col items-start">
          <label className="text-sm text-gray-600 mb-1 block">
            Nome da Categoria
          </label>
          <input
            {...register('name')}
            className={clsx(
              'w-full h-12 border rounded-full px-3 py-2 text-sm outline-none',
              errors.name
                ? 'border-red-300 border-2 placeholder:text-red-400'
                : 'border-gray-300',
            )}
            placeholder={
              errors.name
                ? 'Nome de categoria é obrigatória'
                : 'Nome da categoria'
            }
          />
        </div>

        <div className="w-full flex flex-col items-start">
          <label className="text-sm text-gray-600 mb-1 block">
            Palavras-chave
          </label>
          <div
            className={clsx(
              'flex items-center gap-2 w-full h-12 rounded-full text-sm outline-none',
              errors.keywords ? 'border-red-300 border-2' : 'border border-gray-300',
            )}
          >
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className={clsx(
                'w-full h-12 px-3 py-2 text-sm outline-none',
                errors.keywords ? 'placeholder:text-red-400' : '',
              )}
              placeholder={
                errors.keywords
                  ? 'Pelo menos uma palavra chave'
                  : 'Digite uma palavra-chave'
              }
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="h-12 min-w-12 flex items-center justify-center bg-secondary text-white rounded-full hover:bg-secondary/80 text-sm cursor-pointer"
            >
              <Plus />
            </button>
          </div>
        </div>

        <div className="w-full flex lg:max-w-12 flex-col lg:items-center lg:justify-center">
          <label className="text-sm text-gray-600 mb-1 block">Cor</label>
          <div className="relative w-full">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute opacity-0 w-full lg:w-12 h-12 cursor-pointer"
            />
            <div
              className="w-full lg:w-12 h-12 rounded-full border-4 cursor-pointer border-gray-200"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>

        <div className="w-full lg:max-w-56 flex flex-col items-center justify-end">
          <IconSelector value={icon} onChange={setIcon} label="Ícone" />
        </div>

        <button
          type="submit"
          className="h-12 flex items-center justify-center gap-2 bg-secondary rounded-full text-white px-4 py-2 hover:bg-secondary/80 w-full cursor-pointer lg:w-auto"
        >
          {editing ? <Check /> : <Plus />}
          {editing ? 'Atualizar' : 'Adicionar'}
        </button>
      </form>

      {/* Chips de keywords – seguem mesma lógica de visibilidade do form */}
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
              className="flex items-center text-xs px-3 py-1 bg-gray-200 rounded-full"
            >
              {kw}
              <X
                onClick={() => handleRemoveKeyword(kw)}
                className="ml-1 cursor-pointer"
                size={14}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
