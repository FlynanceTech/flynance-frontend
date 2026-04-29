'use client'

import React, { useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { IconMap, IconName } from '@/utils/icon-map'
import { CategoryResponse } from '@/services/category'
import DeleteConfirmModal from '../DeleteConfirmModal'

interface CategoryListProps {
  categories: CategoryResponse[]
  onEdit: (category: CategoryResponse) => void
  onDelete: (id: string) => void
  typeFilter?: 'EXPENSE' | 'INCOME'
  tab: number
}

function CategoryCard({
  cat,
  canEdit,
  onEdit,
  onDelete,
}: {
  cat: CategoryResponse
  canEdit: boolean
  onEdit: (cat: CategoryResponse) => void
  onDelete: (id: string) => void
}) {
  const t = useTranslations('categoryList')

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-4 py-3">
      <div className="min-w-0 flex items-center gap-3">
        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />

        {IconMap[cat.icon as IconName] ? (
          React.createElement(IconMap[cat.icon as IconName], { size: 16 })
        ) : (
          <div className="h-4 w-4 shrink-0 rounded-full bg-gray-300" />
        )}

        <span className="truncate text-sm font-medium text-gray-800">{cat.name}</span>
      </div>

      {canEdit && (
        <div className="flex shrink-0 gap-2">
          <button onClick={() => onEdit(cat)} className="text-gray-500 hover:text-blue-600" aria-label={t('editAria')}>
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(cat.id)} className="text-gray-500 hover:text-red-400" aria-label={t('deleteAria')}>
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export function CategoryList({ categories, onEdit, onDelete, typeFilter, tab }: CategoryListProps) {
  const t = useTranslations('categoryList')
  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [idCategorieToDelete, setIdCategorieToDelete] = useState<string>('')

  const { userCategories, defaultCategories } = useMemo(() => {
    const byType = typeFilter ? categories.filter((c) => c.type === typeFilter) : categories

    const user = byType.filter((c) => !!c.userId)
    const defaults = byType.filter((c) => !c.userId)

    user.sort((a, b) => a.name.localeCompare(b.name))
    defaults.sort((a, b) => a.name.localeCompare(b.name))

    return { userCategories: user, defaultCategories: defaults }
  }, [categories, typeFilter])

  const titleType = tab === 0 ? t('expenseType') : t('incomeType')
  const subtitleType = tab === 0 ? t('expenseTypeLower') : t('incomeTypeLower')
  const itemLabel = (count: number) => (count === 1 ? t('item') : t('items'))

  const handleAskDelete = (id: string) => {
    setIdCategorieToDelete(id)
    setOpenDeleteModal(true)
  }

  const hasAny = userCategories.length + defaultCategories.length > 0
  if (!hasAny) {
    return <p className="text-sm text-gray-500">{t('noCategories')}</p>
  }

  return (
    <>
      <div className="flex flex-col gap-6 rounded-md border border-gray-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{t('title', { type: titleType })}</h2>
          <h3 className="text-sm font-light text-gray-500">
            {t('subtitle')}
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-semibold text-gray-800">{t('yourCategories')}</h4>
            <span className="text-xs text-gray-500">
              {userCategories.length} {itemLabel(userCategories.length)}
            </span>
          </div>

          {userCategories.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('noUserCategories', { type: subtitleType })}
            </p>
          ) : (
            <div className="grid max-h-[240px] grid-cols-1 gap-4 overflow-auto pr-2 sm:grid-cols-2 md:grid-cols-3">
              {userCategories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  canEdit
                  onEdit={onEdit}
                  onDelete={handleAskDelete}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-semibold text-gray-800">{t('defaultCategories')}</h4>
            <span className="text-xs text-gray-500">
              {defaultCategories.length} {itemLabel(defaultCategories.length)}
            </span>
          </div>

          {defaultCategories.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('noDefaultCategories', { type: subtitleType })}
            </p>
          ) : (
            <div className="grid max-h-[240px] grid-cols-1 gap-4 overflow-auto pr-2 sm:grid-cols-2 md:grid-cols-3">
              {defaultCategories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  canEdit={false}
                  onEdit={onEdit}
                  onDelete={handleAskDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        onConfirm={() => {
          onDelete(idCategorieToDelete)
          setOpenDeleteModal(false)
          setIdCategorieToDelete('')
        }}
        title={t('deleteTitle')}
        description={t('deleteDescription')}
        confirmLabel={t('deleteConfirm')}
      />
    </>
  )
}
