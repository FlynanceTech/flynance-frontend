'use client'

import React, { useMemo, useState } from 'react'
import Select, { components, GroupBase, StylesConfig } from 'react-select'
import CreatableSelect from 'react-select/creatable'
import clsx from 'clsx'

import { useCategories } from '@/hooks/query/useCategory'
import { CategoryResponse } from '@/services/category'
import { useTransactionFilter } from '@/stores/useFilter'
import CreateCategoryModal, { CreateCategoryDraft } from '../Categories/createCategoryModal'

type CategoryType = 'EXPENSE' | 'INCOME'

type CategoryOption = {
  value: string
  label: string
  color?: string | null
  type: CategoryType
  raw: CategoryResponse
}

type CategoryGroup = GroupBase<CategoryOption> & { label: string }

function normalizeStr(s: string) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function defaultGroupLabel(type: CategoryType) {
  return type === 'INCOME' ? 'Receitas' : 'Despesas'
}

function toOption(cat: CategoryResponse): CategoryOption {
  return {
    value: cat.id,
    label: cat.name,
    color: cat.color ?? '#CBD5E1',
    type: cat.type as CategoryType,
    raw: cat,
  }
}

function buildGroupedOptions(
  categories: CategoryResponse[],
  typeFilter?: CategoryType
): CategoryGroup[] {
  const filtered = typeFilter ? categories.filter((c) => c.type === typeFilter) : categories

  const byType: Record<CategoryType, CategoryOption[]> = {
    EXPENSE: [],
    INCOME: [],
  }

  filtered.forEach((c) => {
    const t = (c.type as CategoryType) || 'EXPENSE'
    byType[t].push(toOption(c))
  })

  const groups: CategoryGroup[] = []
  if (byType.EXPENSE.length) groups.push({ label: defaultGroupLabel('EXPENSE'), options: byType.EXPENSE })
  if (byType.INCOME.length) groups.push({ label: defaultGroupLabel('INCOME'), options: byType.INCOME })

  return groups
}

type CreateDraft = {
  name: string
  type: CategoryType
  color?: string | null
}

type CategorySelectProps = {
  /** single: CategoryResponse | null  |  multi: CategoryResponse[] */
  value: CategoryResponse | CategoryResponse[] | null
  onChange: (value: CategoryResponse | CategoryResponse[] | null) => void

  multiple?: boolean
  typeFilter?: CategoryType
  closeMenuOnSelect?: boolean
  menuPortalTarget?: HTMLElement | null

  /** habilita “Criar categoria…” quando não encontrar */
  allowCreate?: boolean

  /**
   * obrigatório se allowCreate=true (pra realmente criar no backend).
   * deve retornar a categoria criada (com id, etc).
   */
  onCreateCategory?: (draft: CreateCategoryDraft) => Promise<CategoryResponse>

  placeholder?: string
  className?: string
  menuPlacement?: 'auto' | 'top' | 'bottom'
}

/** --- UI: Option com bolinha de cor --- */
const Option = (props: any) => {
  const data = props.data as CategoryOption
  return (
    <components.Option {...props}>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: data.color ?? '#CBD5E1' }}
        />
        <span className="truncate">{data.label}</span>
      </div>
    </components.Option>
  )
}

/** --- UI: Value com bolinha de cor --- */
const SingleValue = (props: any) => {
  const data = props.data as CategoryOption
  return (
    <components.SingleValue {...props}>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: data.color ?? '#CBD5E1' }}
        />
        <span className="truncate">{data.label}</span>
      </div>
    </components.SingleValue>
  )
}

const MultiValueLabel = (props: any) => {
  const data = props.data as CategoryOption
  return (
    <components.MultiValueLabel {...props}>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: data.color ?? '#CBD5E1' }}
        />
        <span className="truncate">{data.label}</span>
      </div>
    </components.MultiValueLabel>
  )
}

/** Tailwind-friendly styles */
const selectStyles: StylesConfig<CategoryOption, boolean, CategoryGroup> = {
  control: (base: any, state: { isFocused: any }) => ({
    ...base,
    minHeight: 40,
    borderRadius: 9999,
    borderColor: state.isFocused ? '#CBD5E1' : '#E2E8F0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59,130,246,0.15)' : 'none',
    ':hover': { borderColor: '#CBD5E1' },
  }),
  valueContainer: (base: any) => ({ ...base, paddingLeft: 12, paddingRight: 8 }),
  placeholder: (base: any) => ({ ...base, color: '#64748B' }),
  menu: (base: any) => ({ ...base, borderRadius: 12, overflow: 'hidden' }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  option: (base: any, state: { isFocused: any }) => ({
    ...base,
    backgroundColor: state.isFocused ? '#F1F5F9' : 'white',
    color: '#0F172A',
  }),
  multiValue: (base: any) => ({ ...base, borderRadius: 9999 }),
}

export function CategorySelect({
  value,
  onChange,
  multiple = false,
  typeFilter,
  closeMenuOnSelect,
  menuPortalTarget,
  allowCreate = true,
  onCreateCategory,
  placeholder = 'Categoria',
  className,
  menuPlacement = 'auto',
}: CategorySelectProps) {
  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  const groupedOptions = useMemo(() => buildGroupedOptions(categories, typeFilter), [categories, typeFilter])

  const allOptionsFlat = useMemo(() => groupedOptions.flatMap((g) => g.options), [groupedOptions])

  const selectedOption = useMemo(() => {
    if (!value) return null
    if (Array.isArray(value)) {
      const ids = new Set(value.map((v) => v.id))
      return allOptionsFlat.filter((o) => ids.has(o.value))
    }
    return allOptionsFlat.find((o) => o.value === value.id) ?? null
  }, [value, allOptionsFlat])

  // create flow
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const initialCreateType: CategoryType = typeFilter ?? 'EXPENSE'

  const Component = allowCreate ? CreatableSelect : Select

  const handleSelectChange = (opt: any) => {
    if (!opt) {
      onChange(multiple ? [] : null)
      return
    }

    if (multiple) {
      const arr = (opt as CategoryOption[]).map((o) => o.raw)
      onChange(arr)
    } else {
      onChange((opt as CategoryOption).raw)
    }
  }

  const handleCreateOption = (inputValue: string) => {
    // evita abrir modal se já existe
    const inputNorm = normalizeStr(inputValue)
    const already = allOptionsFlat.some((o) => normalizeStr(o.label) === inputNorm)
    if (already) return

    setCreateName(inputValue)
    setCreateOpen(true)
  }

const confirmCreate = async (draft: CreateCategoryDraft) => {
  if (!onCreateCategory) {
    setCreateOpen(false)
    return
  }

  try {
    setCreateLoading(true)
    const created = await onCreateCategory(draft)

    if (multiple) {
      const current = Array.isArray(value) ? value : []
      onChange([...current, created])
    } else {
      onChange(created)
    }

    setCreateOpen(false)
  } finally {
    setCreateLoading(false)
  }
}

  return (
    <div className={className}>
      <Component
        instanceId="category-select"
        isMulti={multiple}
        options={groupedOptions}
        value={selectedOption as any}
        onChange={handleSelectChange as any}
        placeholder={placeholder}
        isClearable
        isSearchable
        menuPlacement={menuPlacement}
        menuPortalTarget={
          menuPortalTarget !== undefined
            ? menuPortalTarget
            : typeof window !== 'undefined'
              ? document.body
              : null
        }
        styles={selectStyles as any}
        closeMenuOnSelect={closeMenuOnSelect}
        components={{
          Option,
          SingleValue,
          MultiValueLabel,
        }}
        formatCreateLabel={(inputValue: string) => `Criar categoria: “${inputValue}”`}
        onCreateOption={allowCreate ? handleCreateOption : undefined}
        noOptionsMessage={({ inputValue }: { inputValue: string }) =>
          inputValue ? 'Nenhuma categoria encontrada' : 'Sem categorias'
        }
      />

      <CreateCategoryModal
        open={createOpen}
        loading={createLoading}
        initialName={createName}
        initialType={initialCreateType}
        typeLocked={!!typeFilter}
        onClose={() => setCreateOpen(false)}
        onConfirm={confirmCreate}
      />
    </div>
  )
}

export function CategoriesSelectWithCheck({
  closeMenuOnSelect,
  menuPortalTarget,
}: {
  closeMenuOnSelect?: boolean
  menuPortalTarget?: HTMLElement | null
}) {
  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategories = useTransactionFilter((s) => s.setSelectedCategories)

  return (
    <CategorySelect
      multiple
      value={selectedCategories as CategoryResponse[]}
      onChange={(v) => setSelectedCategories((v as CategoryResponse[]) ?? [])}
      placeholder="Todas categorias"
      closeMenuOnSelect={closeMenuOnSelect}
      menuPortalTarget={menuPortalTarget}
      allowCreate
      // 👉 pluga sua mutation aqui quando tiver
      onCreateCategory={async (_draft) => {
        // const created = await createCategoryMutation.mutateAsync(_draft)
        // return created
        throw new Error('Implemente onCreateCategory (mutation para criar categoria)')
      }}
      className="w-full"
    />
  )
}
