'use client'

import React, { useMemo, useState } from 'react'
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
  const userId =  user?.userData.user.id ?? ''

  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [sortState, setSortState] = useState<{
    field: 'date' | 'value' | null
    direction: 'asc' | 'desc'
  }>({
    field: null,
    direction: 'asc',
  })

  const sortField = sortState.field
  const sortDirection = sortState.direction

  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const searchTerm = useTransactionFilter((s) => s.searchTerm)
  const dateRange = useTransactionFilter((s) => s.dateRange)

  const params = React.useMemo(() => ({
    userId,
    page: currentPage,
    limit: PAGE_SIZE,
    filters: {
      category: selectedCategories.map(c => c.id).join(',') || undefined,
      days: dateRange || undefined,
    },
  }), [userId, currentPage, selectedCategories, dateRange]);

  const { transactionsQuery, deleteMutation } = useTranscation(params);
 
  const allTransactions: Transaction[] = useMemo(
    () => (transactionsQuery.data ?? []) as Transaction[],
    [transactionsQuery.data]
  )

  const filteredTransactions = useMemo(() => {
  const today = new Date()
  const cutoffDate = new Date()
  const daysNum = Number(dateRange) || 0
  cutoffDate.setDate(today.getDate() - daysNum)

  // filtro base
  let result = allTransactions.filter((item) => {
    const matchCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some((selected) => selected.id === item.categoryId)

    const matchSearch =
      !searchTerm ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())

    return matchCategory && matchSearch
  })

  // ordenação
  if (sortField) {
    result = [...result].sort((a, b) => {
      let compare = 0

      if (sortField === 'date') {
        const da = new Date(a.date).getTime()
        const db = new Date(b.date).getTime()
        compare = da - db
      }

      if (sortField === 'value') {
        compare = a.value - b.value
      }

      return sortDirection === 'asc' ? compare : -compare
    })
  }

  return result
}, [
  allTransactions,
  selectedCategories,
  searchTerm,
  dateRange,
  sortField,
  sortDirection,
])




  const paginatedTransactions = useMemo(
    () =>
      filteredTransactions.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [filteredTransactions, currentPage]
  )

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE)
  const totalAll = allTransactions.length
  const totalFiltered = filteredTransactions.length
  const startIndex = totalFiltered === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalFiltered)
  const isFiltered =
    selectedCategories.length > 0 || !!searchTerm || !!dateRange

  const handleSortChange = (field: 'date' | 'value') => {
  setSortState((prev) => {
    // 1º clique numa coluna nova → asc
    if (prev.field !== field) {
      return { field, direction: 'asc' }
    }

    // 2º clique na mesma coluna → desc
    if (prev.direction === 'asc') {
      return { field, direction: 'desc' }
    }

    // 3º clique na mesma coluna → limpa ordenação
    return { field: null, direction: 'asc' }
  })

  // sempre volta pra página 1 ao mudar ordenação
  setCurrentPage(1)
}


  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev)
      if (updated.has(id)) {
        updated.delete(id)
      } else {
        updated.add(id)
      }
      return updated
    })
  }
  

  const toggleSelectAll = () => {
    const currentIds = paginatedTransactions.map((item) => item.id)
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

  // RETURNS condicionais APENAS DEPOIS DOS HOOKS
  if (!userId) return <SkeletonSection />
  if (transactionsQuery.isLoading) return <SkeletonSection />
  if (transactionsQuery.error) {
    return (
      <section className="w-full h-full px-4 lg:pl-0 lg:pr-8 flex flex-col gap-4 pt-4 md:pt-0">
        <Header title="Transações" subtitle="Seus últimos movimentos financeiros" />
        <div className="w-full h-full bg-white rounded-xl border border-gray-200 p-8">
          <p className="text-sm text-red-600">Erro ao carregar transações.</p>
        </div>
      </section>
    )
  }
  

  return (
    <section className="w-full h-full px-4 lg:pl-0 lg:pr-8 flex flex-col gap-4 pt-4 md:pt-0">
      <Header
        title="Transações"
        subtitle="Seus últimos movimentos financeiros"
        asFilter
        dataToFilter={Array.from(new Set(allTransactions.map((t) => t.category)))}
      />

      {
        selectedIds.size > 0 && 
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((item) => (
            <div
              key={item.id}
              className="px-4 py-1 text-sm font-light flex items-center justify-center rounded-full bg-secondary/30"
            >
              {item.name}
            </div>
          ))}
          {selectedIds.size > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>
      }

      <section className='flex flex-col gap-4 lg:gap-0 overflow-auto'>
          <TransactionTable
            transactions={paginatedTransactions}
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
            transactions={paginatedTransactions}
            selectedIds={selectedIds}
            onToggleSelectRow={toggleSelectRow}
            onEdit={(t) => {
              setSelectedTransaction(t)
              setDrawerOpen(true)
            }}
            onDelete={handleDeleteSingle}
          />
          <div className='flex items-center justify-between lg:flex-row flex-col gap-4'>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-sm text-muted-foreground">
                {totalFiltered > 0
                  ? <>Exibindo <span className="font-medium">{startIndex}–{endIndex}</span> de <span className="font-medium">{totalFiltered}</span> transações</>
                  : <>Nenhuma transação encontrada</>
                }
                {isFiltered && totalAll > 0 && (
                  <> (de <span className="font-medium">{totalAll}</span> no total)</>
                )}
              </span>
            </div>

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