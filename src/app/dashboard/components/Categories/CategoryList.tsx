// components/category/CategoryList.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
  return (
    <div className="flex justify-between items-center gap-3 border border-gray-200 rounded-md px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />

        {IconMap[cat.icon as IconName] ? (
          React.createElement(IconMap[cat.icon as IconName], { size: 16 })
        ) : (
          <div className="w-4 h-4 bg-gray-300 rounded-full shrink-0" />
        )}

        <span className="text-sm font-medium text-gray-800 truncate">{cat.name}</span>
      </div>

      {canEdit && (
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onEdit(cat)} className="text-gray-500 hover:text-blue-600" aria-label="Editar">
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(cat.id)} className="text-gray-500 hover:text-red-600" aria-label="Excluir">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export function CategoryList({ categories, onEdit, onDelete, typeFilter, tab }: CategoryListProps) {
  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [idCategorieToDelete, setIdCategorieToDelete] = useState<string>('')

  const { userCategories, defaultCategories } = useMemo(() => {
    const byType = typeFilter ? categories.filter((c) => c.type === typeFilter) : categories

    // ✅ heurística atual: se tem userId => é do usuário
    const user = byType.filter((c) => !!c.userId)
    const defaults = byType.filter((c) => !c.userId)

    // opcional: ordenar (ex: alfabético) ou reverse por criação
    user.sort((a, b) => a.name.localeCompare(b.name))
    defaults.sort((a, b) => a.name.localeCompare(b.name))

    return { userCategories: user, defaultCategories: defaults }
  }, [categories, typeFilter])

  const titleType = tab === 0 ? 'Despesas' : 'Receitas'
  const subtitleType = tab === 0 ? 'despesas' : 'receitas'

  const handleAskDelete = (id: string) => {
    setIdCategorieToDelete(id)
    setOpenDeleteModal(true)
  }

  const hasAny = userCategories.length + defaultCategories.length > 0
  if (!hasAny) {
    return <p className="text-sm text-gray-500">Nenhuma categoria encontrada.</p>
  }

  return (
    <>
      <div className="flex flex-col gap-6 bg-white rounded-md border border-gray-200 p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">Categorias de {titleType}</h2>
          <h3 className="text-sm font-light text-gray-500">
            Suas categorias (personalizadas) e as categorias padrão da plataforma.
          </h3>
        </div>

        {/* ✅ Suas categorias */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-semibold text-gray-800">Suas categorias</h4>
            <span className="text-xs text-gray-500">{userCategories.length} {userCategories.length === 1 ? 'item' : 'itens'}</span>
          </div>

          {userCategories.length === 0 ? (
            <p className="text-sm text-gray-500">
              Você ainda não criou categorias de {subtitleType}.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pr-2 overflow-auto max-h-[240px]">
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

        {/* ✅ Categorias padrão */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-semibold text-gray-800">Categorias padrão</h4>
            <span className="text-xs text-gray-500">{defaultCategories.length} {defaultCategories.length === 1 ? 'item' : 'itens'}</span>
          </div>

          {defaultCategories.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhuma categoria padrão disponível para {subtitleType}.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pr-2 overflow-auto max-h-[240px]">
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
        title="Excluir categoria"
        description="Tem certeza que deseja excluir esta categoria? Todos os dados associados serão removidos."
        confirmLabel="Sim, excluir"
      />
    </>
  )
}
