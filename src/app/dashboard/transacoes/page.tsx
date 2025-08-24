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
  const userId = user?.account?.userId ?? '' // evita condicionar hooks

  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  const selectedCategories = useTransactionFilter((s) => s.selectedCategories)
  const searchTerm = useTransactionFilter((s) => s.searchTerm)
  const dateRange = useTransactionFilter((s) => s.dateRange) // número de dias (ex.: 7, 30 etc.)

  // CHAME SEMPRE os hooks (sem if/return antes). Se seu hook aceitar, ative enabled:
  const { transactionsQuery, deleteMutation } = useTranscation({
    userId,
    page: currentPage,
    limit: PAGE_SIZE,
    filters: {
      category: selectedCategories.map((c) => c.id).join(','),
      search: searchTerm,
      days: dateRange,
    },
    // enabled: Boolean(userId),
  })

  // Referência estável do array base
  const allTransactions: Transaction[] = useMemo(
    () => (transactionsQuery.data ?? []) as Transaction[],
    [transactionsQuery.data]
  )

  const filteredTransactions = useMemo(() => {
    const today = new Date()
    const cutoffDate = new Date()
    const daysNum = Number(dateRange) || 0
    cutoffDate.setDate(today.getDate() - daysNum)

    return allTransactions.filter((item) => {
      const matchCategory =
        selectedCategories.length === 0 ||
        selectedCategories.some((selected) => selected.id === item.categoryId)

      const matchSearch =
        !searchTerm || item.description.toLowerCase().includes(searchTerm.toLowerCase())

      const itemDate = new Date(item.date)
      const matchDate = daysNum > 0 ? itemDate >= cutoffDate : true

      return matchCategory && matchSearch && matchDate
    })
  }, [allTransactions, selectedCategories, searchTerm, dateRange])

  const paginatedTransactions = useMemo(
    () =>
      filteredTransactions.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [filteredTransactions, currentPage]
  )

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE)

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
      <section className="w-full h-full pt-8 lg:px-8 px-4 flex flex-col gap-8">
        <Header userId={userId} subtitle="Your latest financial movements" />
        <div className="w-full h-full bg-white rounded-xl border border-gray-200 p-8">
          <p className="text-sm text-red-600">Erro ao carregar transações.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-4 overflow-auto">
      <Header
        title="Transactions"
        subtitle="Your latest financial movements"
        asFilter
        userId={userId}
        dataToFilter={Array.from(new Set(allTransactions.map((t) => t.category)))}
      />

      <div className="flex flex-wrap gap-2">
        {selectedCategories.map((item) => (
          <div
            key={item.id}
            className="px-4 py-1 text-sm font-light flex items-center justify-center rounded-full bg-[#CEF2E1]"
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

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

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
  )
}