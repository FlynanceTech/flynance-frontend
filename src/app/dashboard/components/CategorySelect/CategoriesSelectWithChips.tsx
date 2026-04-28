'use client'

import React, { useMemo } from 'react'
import Select, { components, GroupBase, StylesConfig } from 'react-select'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useCategories } from '@/hooks/query/useCategory'
import type { CategoryResponse } from '@/services/category'
import { useTransactionFilter } from '@/stores/useFilter'

type CategoryType = 'EXPENSE' | 'INCOME'

type CategoryOption = {
  value: string
  label: string
  color?: string | null
  type: CategoryType
  raw: CategoryResponse
}

type CategoryGroup = GroupBase<CategoryOption> & { label: string }

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
  labels: { income: string; expense: string }
): CategoryGroup[] {
  const byType: Record<CategoryType, CategoryOption[]> = { EXPENSE: [], INCOME: [] }

  categories.forEach((c) => {
    const t = (c.type as CategoryType) || 'EXPENSE'
    byType[t].push(toOption(c))
  })

  const groups: CategoryGroup[] = []
  if (byType.EXPENSE.length) groups.push({ label: labels.expense, options: byType.EXPENSE })
  if (byType.INCOME.length) groups.push({ label: labels.income, options: byType.INCOME })
  return groups
}

/** Option com bolinha */
const Option = (props: any) => {
  const data = props.data as CategoryOption
  const isSelected = props.isSelected

  return (
    <components.Option {...props}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: data.color ?? '#CBD5E1' }}
          />
          <span className="min-w-0 truncate">{data.label}</span>
        </div>

        {/* ✅ reserva largura fixa pro check (não quebra layout) */}
        <span
          className={`w-4 text-right text-xs ${isSelected ? 'text-slate-700' : 'text-transparent'}`}
        >
          ✓
        </span>
      </div>
    </components.Option>
  )
}

/** styles: control fixo (não cresce) */
const selectStyles: StylesConfig<CategoryOption, true, CategoryGroup> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: 'hsl(var(--input))',
    borderColor: state.isFocused ? 'hsl(var(--ring) / 0.45)' : 'hsl(var(--border) / 0.24)',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.22)' : 'none',
    ':hover': { borderColor: 'hsl(var(--border) / 0.4)' },
    overflow: 'hidden',
  }),

  valueContainer: (base) => ({
    ...base,
    height: 40,
    paddingLeft: 12,
    paddingRight: 8,
    overflow: 'hidden',
    flexWrap: 'nowrap',
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: 'hsl(var(--foreground))',
  }),

  placeholder: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),

  indicatorsContainer: (base) => ({ ...base, height: 40 }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: 'hsl(var(--border) / 0.3)' }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base, state) => ({
    ...base,
    padding: 6,
    color: state.isFocused ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
    ':hover': { color: 'hsl(var(--foreground))' },
  }),

  menu: (base) => ({
    ...base,
    borderRadius: 12,
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border) / 0.22)',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
    overflow: 'hidden',
    minWidth: '100%',
  }),

  menuList: (base) => ({
    ...base,
    padding: 6,
    maxHeight: 320,
  }),

  menuPortal: (base) => ({ ...base, zIndex: 9999 }),

  option: (base, state) => ({
    ...base,
    borderRadius: 10,
    margin: '2px 0',
    backgroundColor: state.isSelected
      ? 'hsl(var(--accent))'
      : state.isFocused
      ? 'hsl(var(--muted))'
      : 'transparent',
    color: 'hsl(var(--foreground))',
    padding: '10px 10px',
    cursor: 'pointer',
  }),

  groupHeading: (base) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }),

  multiValue: (base) => ({ ...base, display: 'none' }),
}
/** Chips externos */
function CategoryChip({
  item,
  onRemove,
}: {
  item: CategoryResponse
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: item.color ?? '#CBD5E1' }}
      />
      <span className="max-w-[180px] truncate">{item.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-100"
        aria-label={`Remover ${item.name}`}
        title="Remover"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function CategoriesSelectWithChips() {
  const tFilters = useTranslations('filters')
  const tType = useTranslations('quickTypeFilter')
  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategories = useTransactionFilter((s) => s.setSelectedCategories)

  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  const groupedOptions = useMemo(
    () =>
      buildGroupedOptions(categories, {
        income: tType('income'),
        expense: tType('expense'),
      }),
    [categories, tType]
  )

  // react-select precisa dos options selecionados como "option"
  const selectedOptions = useMemo(() => {
    const ids = new Set((selectedCategories ?? []).map((c) => c.id))
    const flat = groupedOptions.flatMap((g) => g.options)
    return flat.filter((o) => ids.has(o.value))
  }, [selectedCategories, groupedOptions])

  const placeholder = selectedCategories?.length
    ? tFilters('selectedCategories', { count: selectedCategories.length })
    : tFilters('categoryPlaceholder')

  const onChange = (opts: readonly CategoryOption[] | null) => {
    const list = (opts ?? []).map((o) => o.raw)
    setSelectedCategories(list)
  }

  const removeOne = (id: string) => {
    setSelectedCategories(selectedCategories.filter((c) => c.id !== id))
  }

  const clearAll = () => setSelectedCategories([])

  return (
    <div className="w-full max-w-52">
      {/* Linha: select + limpar */}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
        <Select
          isMulti
          closeMenuOnSelect={false}
          hideSelectedOptions={false}
          controlShouldRenderValue={false} // ✅ reforça: não renderiza chips dentro
          options={groupedOptions}
          value={selectedOptions}
          onChange={onChange as any}
          placeholder={placeholder}
          isClearable={false}
          isSearchable
          menuPlacement="auto"
          menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
          styles={selectStyles}
          components={{
            Option,
            IndicatorSeparator: () => null, // opcional: remove o “|”
          }}
        />
        </div>

       {/*  {selectedCategories.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Limpar
          </button>
        )} */}
      </div>

      {/* Chips fora */}
     {/*  {selectedCategories.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedCategories.map((cat) => (
            <CategoryChip key={cat.id} item={cat} onRemove={() => removeOne(cat.id)} />
          ))}
        </div>
      )} */}
    </div>
  )
}
