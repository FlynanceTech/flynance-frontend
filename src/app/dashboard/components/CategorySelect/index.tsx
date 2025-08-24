'use client'

import { Menu, MenuButton, MenuItem, MenuItems, Checkbox } from '@headlessui/react'
import { ChevronDown, Check } from 'lucide-react'
import { useTransactionFilter } from '@/stores/useFilter'
import clsx from 'clsx'
import { useCategories } from '@/hooks/query/useCategory'
import { CategoryResponse } from '@/services/category'
import { CategoryType } from '@/types/Transaction'
import { useMemo } from 'react'



export function CategoriesSelectWithCheck() {
  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategories = useTransactionFilter((s) => s.setSelectedCategories)
  const {
    categoriesQuery: { data: category = [] },
  } = useCategories()

  if (!category) return null

  const toggleCategory = (cat: CategoryResponse) => {
    setSelectedCategories(
      selectedCategories.includes(cat)
        ? selectedCategories.filter((c) => c !== cat)
        : [...selectedCategories, cat]
    )
  }
  

  const selectedNames = category
  .filter((c) => selectedCategories.includes(c))
  .map((c) => c.name)

  const displayText =
    selectedNames.length === 0
      ? 'Todas categorias'
      : selectedNames.length === 1
      ? selectedNames[0]
      : `${selectedNames.length} selecionadas`

  return (
    <Menu as="div" className="relative inline-block text-left w-full">
      <MenuButton className="flex items-center justify-between gap-2 px-4 py-2 w-full lg:w-48 rounded-full border border-[#E2E8F0] bg-white text-[#1A202C] text-sm font-medium shadow-sm hover:bg-gray-50 cursor-pointer">
        {displayText}
        <ChevronDown size={16} />
      </MenuButton>

      <MenuItems
        anchor="bottom"
        className="flex flex-col gap-1 bg-white outline-none py-4 shadow-lg w-48 rounded-md mt-2 z-50"
      >
        {category.map((cat) => (
          <MenuItem key={cat.id} as="div">
            <Checkbox
              checked={selectedCategories.includes(cat)}
              onChange={() => toggleCategory(cat)} 
              className={({ checked }) =>
                `flex items-center gap-2 px-4 py-1 text-sm cursor-pointer hover:bg-[#F0FDF4] ${
                  checked ? 'text-green-700 font-medium' : 'text-gray-700'
                }`
              }
            >
              {({ checked }) => (
                <>
                  <span
                    className={`h-4 w-4 flex items-center justify-center border rounded ${
                      checked
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {checked && <Check size={12} />}
                  </span>
                  {cat.name}
                </>
              )}
            </Checkbox>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  )
}

interface Props {
  value: string
  onChange: (value: CategoryResponse) => void
  className?: string
  typeFilter?: 'EXPENSE' | 'INCOME'   
}

export function CategoriesSelect({ value, onChange, className, typeFilter }: Props) {
  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  // Filtra por tipo (quando fornecido)
  const filtered = useMemo<CategoryResponse[]>(
    () => (typeFilter ? categories.filter((c) => c.type === typeFilter) : categories),
    [categories, typeFilter]
  )

  // Nome exibido do item selecionado
  const selected = useMemo<CategoryResponse | undefined>(
    () => categories.find((c) => c.id === value),
    [categories, value]
  )

  const displayText = selected ? selected.name : 'Categoria'

  return (
    <Menu as="div" className={clsx('relative', className)}>
      <MenuButton className="flex items-center justify-between gap-2 px-4 py-2 w-full rounded-full border border-[#E2E8F0] bg-white text-[#1A202C] text-sm font-medium shadow-sm hover:bg-gray-50 cursor-pointer">
      {displayText}
        <ChevronDown size={16} />
      </MenuButton>

      <MenuItems
        anchor="bottom"
        className="flex flex-col gap-1 bg-white outline-none py-2 shadow-lg w-56 rounded-md mt-2 z-50"
      >
        {filtered.length === 0 ? (
          <div className="px-4 py-2 text-xs text-gray-500">Nenhuma categoria</div>
        ) : (
          filtered.map((cat) => (
            <MenuItem
              key={cat.id}
              as="button"
              onClick={() => onChange(cat)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#F0FDF4] text-left"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: cat.color ?? '#CBD5E1' }}
              />
              <span className="truncate">{cat.name}</span>
            </MenuItem>
          ))
        )}
      </MenuItems>
    </Menu>
  )
}

interface TransactionTypeSelectProps {
  value: CategoryType
  onChange: (value: CategoryType) => void
  className?: string
}

export function TransactionTypeSelect({ value, onChange, className }: TransactionTypeSelectProps) {
  const options: CategoryType[] = ['EXPENSE', 'INCOME']

  return (
    <Menu as="div" className={clsx("relative", className)}>
      <MenuButton className="flex items-center justify-between gap-2 px-4 py-2 w-full rounded-full border border-[#E2E8F0] bg-white text-[#1A202C] text-sm font-medium shadow-sm hover:bg-gray-50 cursor-pointer">
        {value === 'INCOME' ? 'Receita' : 'Despesa'}
        <ChevronDown size={16} />
      </MenuButton>

      <MenuItems
        anchor="bottom"
        className="flex flex-col gap-1 bg-white outline-none py-4 shadow-lg w-48 rounded-md mt-2 z-50"
      >
        {options.map((option) => (
          <MenuItem
            key={option}
            as="div"
            onClick={() => onChange(option)}
            className="flex items-center gap-2 px-4 py-1 text-sm cursor-pointer hover:bg-[#F0FDF4]"
          >
            {option === 'INCOME' ? 'Receita' : 'Despesa'}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  )
}
