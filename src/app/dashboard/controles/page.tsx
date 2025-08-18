'use client'

import { useSpendingControlStore } from '@/stores/useSpendingControlStore'
import toast from 'react-hot-toast'
import { Controller, useForm } from 'react-hook-form'
import { NumericFormat } from 'react-number-format'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CategoriesSelect } from '../components/CategorySelect'
import { MetaSlider } from '../components/MetaSlider'
import { Check, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import Header from '../components/Header'
import { useControls } from '@/hooks/query/useSpendingControl'
import { useCategoryStore } from '@/stores/useCategoryStore'
import { MenuButton, MenuItems, MenuItem,Menu } from '@headlessui/react'

const formSchema = z.object({
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  meta: z.number({ invalid_type_error: 'Informe um número válido' }).positive('Meta deve ser maior que zero'),
  limite: z.number({ invalid_type_error: 'Informe um número válido' }).positive('Limite deve ser maior que zero'),
  periodType: z.enum(['monthly', 'weekly', 'bimonthly', 'quarterly', 'half_yearly', 'annually']),
  alert: z.boolean().optional()
})


type FormData = z.infer<typeof formSchema>

const periodMap = {
  monthly: 'MONTHLY',
  weekly: 'WEEKLY',
  bimonthly: 'BIMONTHLY',
  quarterly: 'QUARTERLY',
  half_yearly: 'HALF_YEARLY',
  annually: 'ANNUALLY'
} as const


export default function SpendingControlPage() {
  const {
    controlsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useControls()

  const {
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    watch,
    getValues,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: '',
      meta: undefined,
      limite: undefined,
    },
  })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const categoriaSelecionada = watch('categoryId')
  
  const categoryStore = useCategoryStore(s => s.categoryStore)
  const { addControl, controls, removeControl, updateControl, resetControls } = useSpendingControlStore()

  useEffect(() => {
    if (controlsQuery.data) {
      resetControls()
      controlsQuery.data.forEach((c) =>
        addControl({
          id: c.id,
          categoryId: c.categoryId,
          meta: c.goal,
          limite: c.limit,
          periodType: 'monthly',
          alert: false
        })
      )
    }
  }, [controlsQuery.data])

  const onSubmit = async (data: FormData) => {
    try {
      if (editingIndex !== null) {
        const id = controlsQuery.data?.[editingIndex]?.id
        if (!id) return

        await updateMutation.mutateAsync({
          id,
          data: {
            categoryId: data.categoryId,
            goal: data.meta,
            limit: data.limite,
            periodType: periodMap[data.periodType],
            alert: data.alert ?? false
          },
        })

        updateControl(editingIndex, data)
        toast.success('Meta atualizada com sucesso!')
        setEditingIndex(null)
      } else {
        await createMutation.mutateAsync({
          categoryId: data.categoryId,
          goal: data.meta,
          limit: data.limite,
          periodType: periodMap[data.periodType],
          alert: data.alert
        })

        addControl(data)
        toast.success('Meta adicionada com sucesso!')
      }

      reset({ categoryId: '', meta: 0, limite: 0 })
    } catch {
      toast.error('Erro ao salvar controle')
    }
  }

  const handleEdit = (i: number) => {
    if (editingIndex === i) {
      const updated = getValues()
      updateControl(i, updated)
      setEditingIndex(null)
      reset({ categoryId: '', meta: 0, limite: 0 })
    } else {
      setEditingIndex(i)
      const c = controls[i]
      setValue('categoryId', c.categoryId)
      setValue('meta', c.meta)
      setValue('limite', c.limite)
      setValue('periodType', c.periodType)
      setValue('alert', c.alert ?? false)
    }
  }

  const handleDelete = async (i: number) => {
    try {
      const id = controlsQuery.data?.[i]?.id
      if (!id) return

      await deleteMutation.mutateAsync(id)
      removeControl(controls[i].categoryId)
      toast.success('Controle removido')
    } catch {
      toast.error('Erro ao remover controle')
    }
  }

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4  pb-24 lg:pb-0 flex flex-col gap-4 overflow-auto">
      <Header title='Controle de Gastos' subtitle='' newTransation={false}/>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col lg:flex-row lg:items-end gap-4 bg-white rounded-md border border-gray-200 p-8"
      >
        <div className="w-full lg:w-1/6 flex flex-col gap-1">
          <label className="text-sm text-gray-700">Categoria</label>
          <CategoriesSelect
            value={categoriaSelecionada}
            onChange={(value) => setValue('categoryId', value.id)}
          />
          {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
        </div>

        <div className="w-full lg:w-1/6 flex flex-col gap-1">
          <label className="text-sm text-gray-700">Meta</label>
          <Controller
            name="meta"
            control={control}
            render={({ field }) => (
              <NumericFormat
                placeholder="R$ 0,00"
                thousandSeparator="."
                decimalSeparator="," 
                prefix="R$ "
                allowNegative={false}
                className="outline-none bg-white border border-gray-200 h-10 shadow rounded-full pl-4"
                onValueChange={(values) => field.onChange(values.floatValue)}
                value={field.value}
              />
            )}
          />
          {errors.meta && <p className="text-xs text-red-500 mt-1">{errors.meta.message}</p>}
        </div>

        <div className="w-full lg:w-1/6 flex flex-col gap-1">
          <label className="text-sm text-gray-700">Limite</label>
          <Controller
            name="limite"
            control={control}
            render={({ field }) => (
              <NumericFormat
                placeholder="R$ 0,00"
                thousandSeparator="."
                decimalSeparator="," 
                prefix="R$ "
                allowNegative={false}
                className="outline-none bg-white border border-gray-200 h-10 shadow rounded-full pl-4"
                onValueChange={(values) => field.onChange(values.floatValue)}
                value={field.value}
              />
            )}
          />
          {errors.limite && <p className="text-xs text-red-500 mt-1">{errors.limite.message}</p>}
        </div>

        <div className="w-full lg:w-1/6 flex flex-col gap-1">
          <label className="text-sm text-gray-700">Meta</label>
          <Controller
            name="periodType"
            control={control}
            render={({ field }) => (
              <Menu>
                <MenuButton className="flex items-center justify-between gap-2 px-4 py-2 w-full rounded-full border border-[#E2E8F0] 
                  bg-white text-[#1A202C] text-sm font-medium shadow-sm hover:bg-gray-50 cursor-pointer">
                  {field.value}
                  <ChevronDown size={16} />
                </MenuButton>
                <MenuItems
                  anchor="bottom"
                  className="flex flex-col gap-1 bg-white outline-none py-4 shadow-lg w-48 rounded-md mt-2 z-50"
                >
                  {['monthly', 'weekly', 'bimonthly', 'quarterly', 'half_yearly', 'annually'].map((option) => (
                    <MenuItem
                      key={option}
                      as="div"
                      className="flex items-center gap-2 px-4 py-1 text-sm cursor-pointer hover:bg-[#F0FDF4]"
                      onClick={() => field.onChange(option)}
                    >
                      {option}
                    </MenuItem>
                  ))}
                </MenuItems>
              </Menu>
            )}
          />

        </div>
        
        <div className="w-full lg:w-1/6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
          <Controller
              name="alert"
              control={control}
              render={({ field }) => (
                <button
                  onClick={()=>{
                    setValue("alert", !field.value)
                  }}
                  type='button'
                  className='flex gap-2 cursor-pointer'
                >
                  {
                    field.value ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                            <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clipRule="evenodd" />
                          </svg>
      
                        )
                   : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                          </svg>
                      
                        )
                      }
                      
                  <label className="text-sm text-gray-700 cursor-pointer">Receber notificação</label>
                </button>
              )}
            />
          </div>
        </div>


        <div className="w-full lg:w-auto mt-2 lg:mt-0">
          <button
            type="submit"
            className="bg-[#3ECC89] cursor-pointer text-white font-semibold h-10 w-full lg:w-48 rounded-full hover:bg-green-600"
          >
            {editingIndex !== null ? 'Atualizar Controle' : 'Adicionar Controle'}
          </button>
        </div>
      </form>

      <div className="w-full ">
   
          <div className='flex flex-col gap-4'>
            <h2 className='text-xl font-semibold text-[#333C4D]'>Controle e metas de gastos</h2>
            <ul className="lg:grid lg:grid-cols-3 flex flex-col gap-4">
            {controls.map((item, i) => {
              const categoriaInfo = categoryStore.find(c => c.id === item.categoryId)

              return (
                <li key={item.id} className="w-full flex flex-col gap-2 p-4 bg-white rounded-md border border-gray-200 ">
                  <div>
                    <div className='flex items-center justify-between'>
                      <p className="text-sm font-medium ">{categoriaInfo?.name}</p>
                      <div className="flex gap-4">
                        <button 
                          className="text-gray-500 hover:text-blue-300" 
                          onClick={() => handleEdit(i)}
                        > 
                          {editingIndex === i ? <Check size={16}/> : <Pencil size={16}/>}
                        </button>
                        <button 
                          onClick={() => handleDelete(i)} 
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </div>
                    <div>
                      <span>{item.periodType}</span>
                    </div>
                  </div>

                  <MetaSlider
                    value={editingIndex === i ? watch('meta') || 0 : item.meta}
                    onChange={editingIndex === i ? (val) => setValue('meta', val) : undefined}
                    min={0}
                    max={item.limite}
                    step={50}
                    disabled={editingIndex !== i}
                  />
                </li>
              	
              )})}
            </ul>
          </div>
      </div>
    </section>
  )
}
