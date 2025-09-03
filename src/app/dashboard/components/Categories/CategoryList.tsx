// components/category/CategoryList.tsx
'use client'

import React, { useState } from 'react'
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

export function CategoryList({ categories, onEdit, onDelete, typeFilter, tab }: CategoryListProps) {
    const [openDeleteModal, setOpenDeleteModal] = useState(false)
    const [idCategorieToDelete, setIdCategorieToDelete] = useState<string>('')
  const filtered = typeFilter ? categories.filter(cat => cat.type === typeFilter) : categories

  if (filtered.length === 0) {
    return <p className="text-sm text-gray-500">No categories found.</p>
  } 

  const handleConfirm = (id: string) =>{
    setOpenDeleteModal(true)
    setIdCategorieToDelete(id)
  }

  return (
    <>
        <div className="flex flex-col gap-4 bg-white rounded-md border border-gray-200 p-8 ">
            <div className='flex flex-col gap-2'>
                <h2 className='text-2xl font-semibold'>Suas Categorias de {tab === 0 ? 'Despesas' : 'Receitas'}</h2>
                <h3 className='text-sm font-light text-gray-500'>Gerencie suas categorias de {tab === 0 ? 'despesas' : 'receitas'} existentes</h3>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pr-2 overflow-auto max-h-[300px]">
                {[...categories].reverse().map((cat, index) => {
                return (
                    <div key={index} className="flex justify-between items-center gap-3 border border-gray-200 rounded-md px-4 py-3">
                        <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {IconMap[cat.icon as IconName] ? (
                        React.createElement(IconMap[cat.icon as IconName], { size: 16 })
                        ) : (
                        <div className="w-4 h-4 bg-gray-300 rounded-full" />
                        )}
                        <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                    </div>
                    {
                        cat.accountId &&
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(cat)} className="text-gray-500 hover:text-blue-600"><Pencil size={16} /></button>
                            <button onClick={() => handleConfirm(cat.id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                    }
                    </div>
                )
                })}
            </div>
        </div>

        <DeleteConfirmModal
            isOpen={openDeleteModal}
            onClose={() => setOpenDeleteModal(false)}
            onConfirm={() => {
                onDelete(idCategorieToDelete)
            }}
            title="Excluir categoria"
            description="Tem certeza que deseja excluir esta categoria? Todos os dados associados serão removidos."
            confirmLabel="Sim, excluir"
        />
    </>
  )
}
