// components/CategoriasPage.tsx
'use client'

import React, { useState } from 'react'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react'
import Header from '../components/Header'
import clsx from 'clsx'
import { useCategories } from '@/hooks/query/useCategory'
import { CategoryForm } from '../components/Categories/CategoryForm'
import { CategoryList } from '../components/Categories/CategoryList'
import { CategoryResponse } from '@/services/category'

export default function CategoriasPage() {
  const {
    categoriesQuery: { data: categories = [] },
    createMutation,
    updateMutation,
    deleteMutation
  } = useCategories()

  const [categoriaEditando, setCategoriaEditando] = useState<CategoryResponse | null>(null)

  const despesas = categories.filter(c => c.type === 'EXPENSE')
  const receitas = categories.filter(c => c.type === 'INCOME')

  const handleEdit = (categoria: CategoryResponse) => setCategoriaEditando(categoria)
  const handleCancelEdit = () => setCategoriaEditando(null)

  const handleDelete = (id:string) => {
    deleteMutation.mutate(id)
  }

  return (
    <section className="w-full h-full px-4 lg:pl-0 lg:pr-8 flex flex-col gap-4 pt-4 md:pt-0">
      <Header title="Gerenciar Categorias" subtitle="Personalize as categorias para melhor organizar suas finanças" />

      <TabGroup onChange={() => {
        setCategoriaEditando(null)
      }}
       
      >
        <TabList className="flex items-center gap-2 mb-4">
          <Tab className={({ selected }) =>
            clsx(
              'px-4 py-2 text-sm font-medium outline-none cursor-pointer',
              selected ? 'bg-green-100 text-primary rounded-full' : 'bg-gray-100 text-gray-600'
            )
          }>
            Despesas
          </Tab>
          <Tab className={({ selected }) =>
            clsx(
              'px-4 py-2 text-sm font-medium outline-none cursor-pointer',
              selected ? 'bg-green-100 text-primary rounded-full' : 'text-gray-500 hover:text-black'
            )
          }>
            Receitas
          </Tab>
        </TabList>

        <TabPanels className="w-full h-full">
          {[despesas, receitas].map((categoriaList, tabIndex) => {
            const type = tabIndex === 0 ? 'EXPENSE' : 'INCOME'
            return (
              <TabPanel key={tabIndex} className="flex flex-col gap-8">
                <CategoryForm
                  tab={tabIndex}
                  type={type}
                  editing={categoriaEditando}
                  onCancelEdit={handleCancelEdit}
                  createMutation={createMutation}
                  updateMutation={updateMutation}
                />

              <CategoryList
                tab={tabIndex}
                categories={categoriaList}
                onEdit={handleEdit}
                onDelete={(id) => handleDelete(id)}
              />

              </TabPanel>
            )
          })}
        </TabPanels>
      </TabGroup>


    </section>
  )
}
