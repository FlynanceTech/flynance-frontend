'use client'

import { Menu, MenuButton, MenuItem, MenuItems, Checkbox } from '@headlessui/react'
import { ChevronDown, Check } from 'lucide-react'
import { useTransactionFilter } from '@/stores/useFilter'
import clsx from 'clsx'
import { useCategories } from '@/hooks/query/useCategory'
import { CategoryResponse } from '@/services/category'
import { Category, CategoryType } from '@/types/Transaction'



export function CategoriesSelectWithCheck() {
  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const setSelectedCategories = useTransactionFilter((s) => s.setSelectedCategories)
  const {
    categoriesQuery: { data: category = [], isLoading },
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
}

export function CategoriesSelect({ value, onChange, className }: Props) {
  const {
    categoriesQuery: { data: category = [], isLoading },
  } = useCategories()

  
  const selectedNames = category
  .filter((c) => value.includes(c.id))
  .map((c) => c.name)

  const displayText =
    selectedNames.length === 0
      ? 'Todas categorias'
      : selectedNames.length === 1
      ? selectedNames[0]
      : `${selectedNames.length} selecionadas`

  return (
    <Menu as="div" className={clsx("relative", className)}>
      <MenuButton className="flex items-center justify-between gap-2 px-4 py-2 w-full rounded-full border border-[#E2E8F0] bg-white text-[#1A202C] text-sm font-medium shadow-sm hover:bg-gray-50 cursor-pointer">
        {value.length > 0 ? displayText : 'Categoria'}
        <ChevronDown size={16} />
      </MenuButton>

      <MenuItems
        anchor="bottom"
        className="flex flex-col gap-1 bg-white outline-none py-4 shadow-lg w-48 rounded-md mt-2 z-50"
      >
        {category.map((cat) => (
          <MenuItem
            key={cat.id}
            as="div"
            onClick={() => onChange(cat)}
            className="flex items-center gap-2 px-4 py-1 text-sm cursor-pointer hover:bg-[#F0FDF4]"
          >
            {cat.name}
          </MenuItem>
        ))}
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
