'use client'

import React, { useMemo } from 'react'
import Select, { components, GroupBase, StylesConfig } from 'react-select'
import { X } from 'lucide-react'

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

function buildGroupedOptions(categories: CategoryResponse[]): CategoryGroup[] {
  const byType: Record<CategoryType, CategoryOption[]> = { EXPENSE: [], INCOME: [] }

  categories.forEach((c) => {
    const t = (c.type as CategoryType) || 'EXPENSE'
    byType[t].push(toOption(c))
  })

  const groups: CategoryGroup[] = []
  if (byType.EXPENSE.length) groups.push({ label: defaultGroupLabel('EXPENSE'), options: byType.EXPENSE })
  if (byType.INCOME.length) groups.push({ label: defaultGroupLabel('INCOME'), options: byType.INCOME })
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
    borderColor: state.isFocused ? '#CBD5E1' : '#E2E8F0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59,130,246,0.15)' : 'none',
    ':hover': { borderColor: '#CBD5E1' },
    overflow: 'hidden', // ✅ evita “saltar” conteúdo
  }),

  valueContainer: (base) => ({
    ...base,
    height: 40,
    paddingLeft: 12,
    paddingRight: 8,
    overflow: 'hidden',
    flexWrap: 'nowrap', // ✅ importante: não quebrar linha
  }),

  // ✅ input não pode empurrar a altura
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),

  placeholder: (base) => ({
    ...base,
    color: '#64748B',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),

  indicatorsContainer: (base) => ({ ...base, height: 40 }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),

  menu: (base) => ({
    ...base,
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: '100%',      // ✅ menu acompanha largura do control
  }),

  menuList: (base) => ({
    ...base,
    padding: 6,            // ✅ respiro
    maxHeight: 320,        // ✅ scroll estável
  }),

  menuPortal: (base) => ({ ...base, zIndex: 9999 }),

  option: (base, state) => ({
    ...base,
    borderRadius: 10,
    margin: '2px 0',
    backgroundColor: state.isFocused ? '#F1F5F9' : 'white',
    color: '#0F172A',
    padding: '10px 10px', // ✅ altura “clicável”
  }),

  // 🔥 não renderizar chips dentro do input
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
  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategories = useTransactionFilter((s) => s.setSelectedCategories)

  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  const groupedOptions = useMemo(() => buildGroupedOptions(categories), [categories])

  // react-select precisa dos options selecionados como "option"
  const selectedOptions = useMemo(() => {
    const ids = new Set((selectedCategories ?? []).map((c) => c.id))
    const flat = groupedOptions.flatMap((g) => g.options)
    return flat.filter((o) => ids.has(o.value))
  }, [selectedCategories, groupedOptions])

  const placeholder = selectedCategories?.length
    ? `${selectedCategories.length} categoria(s) selecionada(s)`
    : 'Filtrar categorias'

  const onChange = (opts: readonly CategoryOption[] | null) => {
    const list = (opts ?? []).map((o) => o.raw)
    setSelectedCategories(list)
  }

  const removeOne = (id: string) => {
    setSelectedCategories(selectedCategories.filter((c) => c.id !== id))
  }

  const clearAll = () => setSelectedCategories([])

  return (
    <div className="w-full">
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
