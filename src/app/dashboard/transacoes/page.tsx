'use client'

import React, { useMemo, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import Header from '../components/Header'
import { useTransactionFilter } from '@/stores/useFilter'
import { Pagination } from '../components/Pagination'
import { Skeleton } from '../components/skeleton'
import TransactionDrawer from '../components/TransactionDrawer'
import { TransactionTable } from '../components/Transaction/transactionTable'
import { TransactionCardList } from '../components/Transaction/TransactionCardList'
import { Transaction } from '@/types/Transaction'
import { useTranscation } from '@/hooks/query/useTransaction'
import { useUserSession } from '@/stores/useUserSession'
import { useCategories } from '@/hooks/query/useCategory'

const PAGE_SIZE = 10

function SkeletonSection() {
  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 flex flex-col gap-8">
      <div className="w-full h-full bg-white rounded-xl border border-gray-200 p-8">
        <Skeleton type="table" rows={9} />
      </div>
    </section>
  )
}

export default function TransactionsPage() {
  const { user } = useUserSession()
  const userId = user?.userData?.user?.id ?? ''

  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  const [sortState, setSortState] = useState<{
    field: 'date' | 'value' | null
    direction: 'asc' | 'desc'
  }>({ field: null, direction: 'asc' })

  const sortField = sortState.field
  const sortDirection = sortState.direction

  // filtros globais (o hook useTranscation já lê do zustand e manda pro backend)
  const selectedCategories = useTransactionFilter((s) => s.appliedSelectedCategories)
  const searchTerm = useTransactionFilter((s) => s.appliedSearchTerm)
  const dateRange = useTransactionFilter((s) => s.appliedDateRange)

  const typeFilter = useTransactionFilter((s) => s.appliedTypeFilter)

  const params = useMemo(() => ({
    userId,
    page: currentPage,
    limit: PAGE_SIZE,
    filters: {
      category: selectedCategories.map(c => c.id).join(',') || undefined,
      days: dateRange || undefined,
      type: typeFilter !== 'ALL' ? typeFilter : undefined, // ✅
      search: searchTerm || undefined, // se teu backend aceitar
    },
  }), [userId, currentPage, selectedCategories, dateRange, typeFilter, searchTerm])


 const { transactionsQuery, deleteMutation, updateMutation, createMutation, importMutation, importPreviewMutation } = useTranscation({
  userId,
  page: currentPage,
  limit: PAGE_SIZE,
})

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importedTransactions, setImportedTransactions] = useState<Transaction[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingPreviewId, setEditingPreviewId] = useState<string | null>(null)
  const [editingPreviewValue, setEditingPreviewValue] = useState('')

  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  const handleImportClick = () => {
    if (!userId) return
    fileInputRef.current?.click()
  }

  const isValidImportFile = (file: File) => {
    const name = file.name.toLowerCase()
    return name.endsWith('.pdf') || name.endsWith('.csv')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isValidImportFile(file)) {
      setImportError('Arquivo invalido. Envie PDF ou CSV.')
      e.target.value = ''
      return
    }

    try {
      setIsPreviewLoading(true)
      setImportError(null)
      const response = await importPreviewMutation.mutateAsync({ userId, file })
      const list = Array.isArray(response) ? response : response?.transactions ?? []
      const withIds = (list as Transaction[]).map((t, idx) => ({
        ...t,
        id: t.id ?? `import-preview-${idx}`,
      }))
      setImportedTransactions(withIds)
      setImportFile(file)
      setPreviewOpen(true)
    } catch (err: any) {
      setImportError(err?.message ?? 'Erro ao pré-visualizar transacoes.')
    } finally {
      setIsPreviewLoading(false)
      e.target.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (!importFile) return
    try {
      setIsImporting(true)
      setImportError(null)
      await importMutation.mutateAsync({ userId, file: importFile })
      setImportedTransactions([])
      setImportFile(null)
      setPreviewOpen(false)
    } catch (err: any) {
      setImportError(err?.message ?? 'Erro ao importar transacoes.')
    } finally {
      setIsImporting(false)
    }
  }

  const handleClosePreview = () => {
    setPreviewOpen(false)
    setImportedTransactions([])
    setImportFile(null)
    setEditingPreviewId(null)
    setEditingPreviewValue('')
  }

  const updateImportedTransaction = (id: string, patch: Partial<Transaction>) => {
    setImportedTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    )
  }

  const beginEditDescription = (id: string, currentValue: string | null | undefined) => {
    setEditingPreviewId(id)
    setEditingPreviewValue(currentValue ?? '')
  }

  const commitEditDescription = () => {
    if (!editingPreviewId) return
    updateImportedTransaction(editingPreviewId, { description: editingPreviewValue })
    setEditingPreviewId(null)
    setEditingPreviewValue('')
  }


const apiTransactions: Transaction[] = useMemo(() => {
  const data: any = transactionsQuery.data
  if (!data) return []
  if (Array.isArray(data)) return data
  return Array.isArray(data.transactions) ? data.transactions : []
}, [transactionsQuery.data])

const meta = useMemo(() => {
  const data: any = transactionsQuery.data
  return data && !Array.isArray(data) ? data.meta : undefined
}, [transactionsQuery.data])

  // ✅ Se backend já filtra por categoria/search/days, aqui fica só ordenação local (opcional)
  const displayedTransactions = useMemo(() => {
    let result = apiTransactions

    if (sortField) {
      result = [...result].sort((a, b) => {
        let compare = 0

        if (sortField === 'date') {
          compare = new Date(a.date).getTime() - new Date(b.date).getTime()
        }

        if (sortField === 'value') {
          compare = (a.value ?? 0) - (b.value ?? 0)
        }

        return sortDirection === 'asc' ? compare : -compare
      })
    }

    return result
  }, [apiTransactions, sortField, sortDirection])

  // ✅ totalPages agora vem do backend
  const totalPages = meta?.totalPages ?? 1
  const totalAll = meta?.total ?? displayedTransactions.length
  const totalFiltered = meta?.total ?? displayedTransactions.length

  const startIndex =
    totalFiltered === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalFiltered)

  const isFiltered =
    selectedCategories.length > 0 || !!searchTerm || !!dateRange

  const handleSortChange = (field: 'date' | 'value') => {
    setSortState((prev) => {
      if (prev.field !== field) return { field, direction: 'asc' }
      if (prev.direction === 'asc') return { field, direction: 'desc' }
      return { field: null, direction: 'asc' }
    })
    setCurrentPage(1)
  }

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev)
      if (updated.has(id)) updated.delete(id)
      else updated.add(id)
      return updated
    })
  }

  const toggleSelectAll = () => {
    const currentIds = displayedTransactions.map((item) => item.id)
    setSelectedIds(selectAll ? new Set() : new Set(currentIds))
    setSelectAll(!selectAll)
  }

  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedIds)
    try {
      await Promise.all(idsToDelete.map((id) => deleteMutation.mutateAsync(id)))
      setSelectedIds(new Set())
      setSelectAll(false)
    } catch (err) {
      console.error('Error deleting multiple:', err)
    }
  }

  const handleDeleteSingle = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setSelectedIds((prev) => {
        const updated = new Set(prev)
        updated.delete(id)
        return updated
      })
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  if (!userId) return <SkeletonSection />
  if (transactionsQuery.isLoading) return <SkeletonSection />

  if (transactionsQuery.error) {
    return (
      <section className="w-full h-full px-4 lg:pl-0 lg:pr-8 flex flex-col gap-4 pt-4 md:pt-0">
        <Header subtitle="Seus últimos movimentos financeiros"  />
        <div className="w-full h-full bg-white rounded-xl border border-gray-200 p-8">
          <p className="text-sm text-red-600">Erro ao carregar transações.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full h-full px-4 lg:pl-0 lg:pr-8 flex flex-col gap-4 pt-4 md:pt-0">
      <Dialog open={previewOpen} onClose={handleClosePreview} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-5xl rounded-2xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
              <div>
                <DialogTitle className="text-lg font-semibold text-[#333C4D]">
                  Preview de transacoes importadas
                </DialogTitle>
                <p className="text-sm text-slate-500">
                  Revise, categorize ou renomeie antes de finalizar.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-secondary/30 px-3 py-1 text-xs font-semibold text-[#333C4D]">
                  {importedTransactions.length} novas
                </span>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImporting ? 'Importando...' : 'Confirmar importacao'}
                </button>
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto p-4">
              <div className="rounded-xl border border-gray-200 bg-secondary/10 p-3">
                <div className="hidden md:block">
                  <div className="grid grid-cols-[110px_minmax(240px,1fr)_220px_110px_140px] items-center gap-0 rounded-lg border border-gray-200 bg-secondary/30 px-4 py-3 text-sm font-semibold text-primary">
                    <div>Data</div>
                    <div>Descricao</div>
                    <div>Categoria</div>
                    <div>Tipo</div>
                    <div className="text-right pr-2">Valor</div>
                  </div>

                  <div className="max-h-[460px] overflow-auto rounded-lg border border-gray-200 bg-white">
                    {importedTransactions.map((t) => {
                      const categoryId = t.category?.id ?? ''
                      const categoryType = t.category?.type ?? t.type ?? 'EXPENSE'
                      const isIncome = categoryType === 'INCOME'
                      const rowIsEditing = editingPreviewId === t.id

                      return (
                        <div
                          key={t.id}
                          className="grid grid-cols-[110px_minmax(240px,1fr)_220px_110px_140px] items-center gap-0 border-b border-gray-100 px-4 py-2 text-sm"
                        >
                          <div className="text-gray-700">
                            {new Date(t.date).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="min-w-0 pr-3">
                            {rowIsEditing ? (
                              <input
                                autoFocus
                                value={editingPreviewValue}
                                onChange={(e) => setEditingPreviewValue(e.target.value)}
                                onBlur={commitEditDescription}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEditDescription()
                                  if (e.key === 'Escape') {
                                    setEditingPreviewId(null)
                                    setEditingPreviewValue('')
                                  }
                                }}
                                className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                              />
                            ) : (
                              <button
                                type="button"
                                onDoubleClick={() => beginEditDescription(t.id, t.description)}
                                className="w-full truncate text-left text-gray-800"
                                title="Duplo clique para editar"
                              >
                                {t.description ?? 'Sem descricao'}
                              </button>
                            )}
                          </div>
                          <div className="pr-3">
                            <select
                              value={categoryId}
                              onChange={(e) => {
                                const id = e.target.value
                                const selected = categories.find((c) => c.id === id)
                                updateImportedTransaction(t.id, {
                                  category: selected
                                    ? {
                                        id: selected.id,
                                        name: selected.name,
                                        color: selected.color,
                                        icon: selected.icon,
                                        type: selected.type,
                                      } as any
                                    : undefined,
                                })
                              }}
                              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                            >
                              <option value="">Selecionar categoria</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span
                              className={[
                                'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                                isIncome ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
                              ].join(' ')}
                            >
                              {isIncome ? 'Receita' : 'Despesa'}
                            </span>
                          </div>
                          <div className="text-right pr-2 font-semibold">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(Number(t.value ?? 0))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="md:hidden">
                  {importedTransactions.map((t) => {
                    const categoryId = t.category?.id ?? ''
                    const categoryType = t.category?.type ?? t.type ?? 'EXPENSE'
                    const isIncome = categoryType === 'INCOME'
                    const rowIsEditing = editingPreviewId === t.id

                    return (
                      <div
                        key={t.id}
                        className="mb-3 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div className="text-xs text-gray-500">
                          {new Date(t.date).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="mt-2">
                          {rowIsEditing ? (
                            <input
                              autoFocus
                              value={editingPreviewValue}
                              onChange={(e) => setEditingPreviewValue(e.target.value)}
                              onBlur={commitEditDescription}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEditDescription()
                                if (e.key === 'Escape') {
                                  setEditingPreviewId(null)
                                  setEditingPreviewValue('')
                                }
                              }}
                              className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                            />
                          ) : (
                            <button
                              type="button"
                              onDoubleClick={() => beginEditDescription(t.id, t.description)}
                              className="w-full truncate text-left text-sm font-semibold text-gray-800"
                              title="Duplo clique para editar"
                            >
                              {t.description ?? 'Sem descricao'}
                            </button>
                          )}
                        </div>

                        <div className="mt-2">
                          <select
                            value={categoryId}
                            onChange={(e) => {
                              const id = e.target.value
                              const selected = categories.find((c) => c.id === id)
                              updateImportedTransaction(t.id, {
                                category: selected
                                  ? {
                                      id: selected.id,
                                      name: selected.name,
                                      color: selected.color,
                                      icon: selected.icon,
                                      type: selected.type,
                                    } as any
                                  : undefined,
                              })
                            }}
                            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                          >
                            <option value="">Selecionar categoria</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span
                            className={[
                              'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                              isIncome ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
                            ].join(' ')}
                          >
                            {isIncome ? 'Receita' : 'Despesa'}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(Number(t.value ?? 0))}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-3 text-xs text-slate-500">
              Dica: duplo clique na descricao para editar. Use o select de categoria para ajustar.
            </div>
          </DialogPanel>
        </div>
      </Dialog>
      <Header
        title="Transações Financeiras"
        subtitle="Seus últimos movimentos financeiros"
        asFilter
        importTransations
        onImportClick={handleImportClick}
        importLoading={isPreviewLoading || isImporting}
        onApplyFilters={() => setCurrentPage(1)}
        // ⚠️ se você quer filtrar por categorias, o ideal é listar categorias do endpoint de categorias,
        // mas mantendo seu comportamento atual:
        dataToFilter={Array.from(new Set(displayedTransactions.map((t) => t.category))).filter(Boolean) as any}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,application/pdf,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {importError && (
        <div className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {importError}
        </div>
      )}

      <section className="flex flex-col gap-4 lg:gap-0 overflow-auto">
        <TransactionTable
          transactions={displayedTransactions}
          selectedIds={selectedIds}
          selectAll={selectAll}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelectRow={toggleSelectRow}
          onEdit={(t) => {
            setSelectedTransaction(t)
            setDrawerOpen(true)
          }}
          onDelete={handleDeleteSingle}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />

        <TransactionCardList
          transactions={displayedTransactions}
          selectedIds={selectedIds}
          onToggleSelectRow={toggleSelectRow}
          onEdit={(t) => {
            setSelectedTransaction(t)
            setDrawerOpen(true)
          }}
          onDelete={handleDeleteSingle}
        />

        <div className="flex items-center justify-between lg:flex-row flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="text-sm text-muted-foreground">
              {totalFiltered > 0 ? (
                <>
                  Exibindo <span className="font-medium">{startIndex}–{endIndex}</span> de{' '}
                  <span className="font-medium">{totalFiltered}</span> transações
                </>
              ) : (
                <>Nenhuma transação encontrada</>
              )}
              {isFiltered && totalAll > 0 && (
                <>
                  {' '}
                  (de <span className="font-medium">{totalAll}</span> no total)
                </>
              )}
            </span>
          </div>
              
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap gap-2">
         {/*  {selectedCategories.map((item) => (
            <div
              key={item.id}
              className="px-4 py-1 text-sm font-light flex items-center justify-center rounded-full bg-secondary/30"
            >
              {item.name}
            </div>
          ))}
 */}
          <div className="flex justify-end">
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              Deletar seleção ({selectedIds.size})
            </button>
          </div>
        </div>
      )}
          {totalPages > 1 && (
            <div className="lg:mt-4 flex justify-center pb-24 lg:pb-0">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>

        {selectedTransaction && (
          <TransactionDrawer
            open={drawerOpen}
            onClose={() => {
              setSelectedTransaction(null)
              setDrawerOpen(false)
            }}
            initialData={selectedTransaction}
          />
        )}
      </section>
    </section>
  )
}
