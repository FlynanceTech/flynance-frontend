'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import Header from '../components/Header'
import { useTransactionFilter } from '@/stores/useFilter'
import { Pagination } from '../components/Pagination'
import { Skeleton } from '../components/skeleton'
import TransactionDrawer from '../components/TransactionDrawer'
import CreditCardChargeDrawer from '../components/CreditCardChargeDrawer'
import { TransactionTable } from '../components/Transaction/transactionTable'
import { TransactionCardList } from '../components/Transaction/TransactionCardList'
import { Category, CategoryType, Transaction } from '@/types/Transaction'
import { useTranscation } from '@/hooks/query/useTransaction'
import { useUserSession } from '@/stores/useUserSession'
import { useCategories } from '@/hooks/query/useCategory'
import { CreditCard, Pencil, Trash2, TrashIcon } from 'lucide-react'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { CategorySelect } from '../components/CategorySelect'
import Select from 'react-select'
import type { StylesConfig } from 'react-select'
import type { CategoryResponse } from '@/services/category'
import PageOnboardingTour, { type PageOnboardingStep } from '@/components/onboarding/PageOnboardingTour'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useCreditCardCharges } from '@/hooks/query/useCreditCardCharges'
import type { CreditCardChargeItem } from '@/services/creditCardCharges'
import { useCardMutations } from '@/hooks/query/useCreditCards'
import toast from 'react-hot-toast'
import { ADVISOR_READ_ONLY_FRIENDLY_MESSAGE, type PaymentType } from '@/services/transactions'
import { isAdvisorReadOnlyTransactionAccess } from '@/utils/transactionWriteAccess'
import { formatCurrency } from '@/utils/formatter'
import { useLocale, useTranslations } from 'next-intl'
import { useFinancialScope } from '@/hooks/useFinancialScope'
import type { HouseMember } from '@/types/house'

type TypeOption = { value: CategoryType; label: string }
type AuthorOption = { value: string; label: string }
type CardFilterOption = { value: string; label: string }

const typeSelectStyles: StylesConfig<TypeOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    borderRadius: 12,
    borderColor: state.isFocused ? '#CBD5E1' : '#E2E8F0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
    ':hover': { borderColor: '#CBD5E1' },
  }),
  valueContainer: (base) => ({ ...base, paddingLeft: 10, paddingRight: 6 }),
  placeholder: (base) => ({ ...base, color: '#64748B' }),
  menu: (base) => ({ ...base, borderRadius: 12, overflow: 'hidden' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#F1F5F9' : 'white',
    color: '#0F172A',
  }),
}

const PAGE_SIZE = 10
const CSV_TIP_AUTO_CLOSE_MS = 8000
const CASHFLOW_PAYMENT_TYPES = new Set<PaymentType>(['PIX', 'DEBIT_CARD', 'MONEY', 'CASH'])
function createTransactionsOnboardingSteps(
  tr: (key: string, values?: Record<string, string | number | Date>) => string
): ReadonlyArray<PageOnboardingStep> {
  return [
    {
      id: 'filters',
      selector: '[data-onboarding-target="transacoes-filtros"]',
      align: 'bottom',
      title: tr('onboarding.filtersTitle'),
      description: tr('onboarding.filtersDescription'),
    },
    {
      id: 'list',
      selector: '[data-onboarding-target="transacoes-lista"]',
      title: tr('onboarding.listTitle'),
      description: tr('onboarding.listDescription'),
    },
    {
      id: 'summary',
      selector: '[data-onboarding-target="transacoes-resumo"]',
      title: tr('onboarding.summaryTitle'),
      description: tr('onboarding.summaryDescription'),
    },
  ]
}

function SkeletonSection() {
  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 flex flex-col gap-8">
      <div className="w-full h-full bg-white rounded-xl border border-gray-200 p-8">
        <Skeleton type="table" rows={9} />
      </div>
    </section>
  )
}

function getHouseMemberLabel(member: HouseMember | null | undefined, fallback: string) {
  return member?.name || member?.email || fallback
}

function getKnownActorLabel(params: {
  actorId?: string | null
  currentUserId?: string | null
  currentUserName: string
  createdByUser?: { name?: string | null; email?: string | null } | null
  user?: { name?: string | null; email?: string | null } | null
}) {
  const { actorId, currentUserId, currentUserName, createdByUser, user } = params

  if (createdByUser?.name?.trim()) return createdByUser.name.trim()
  if (createdByUser?.email?.trim()) return createdByUser.email.trim()
  if (user?.name?.trim()) return user.name.trim()
  if (user?.email?.trim()) return user.email.trim()
  if (actorId && currentUserId && actorId === currentUserId) return currentUserName
  return null
}

type PlanLike = {
  slug?: unknown
  name?: unknown
  description?: unknown
  features?: unknown
}

function isCouplePlanLike(plan: unknown) {
  if (!plan || typeof plan !== 'object') return false

  const planData = plan as PlanLike

  const text = [
    planData.slug,
    planData.name,
    planData.description,
    ...(Array.isArray(planData.features)
      ? planData.features.flatMap((feature) => {
          const item = feature && typeof feature === 'object'
            ? (feature as { label?: unknown; key?: unknown; value?: unknown })
            : null
          return item ? [item.label, item.key, item.value] : []
        })
      : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return [
    /\bcasal\b/,
    /\bcouple\b/,
    /\bduo\b/,
    /\bpartner\b/,
    /\bcompartilh/,
    /\bshared\b/,
    /\bhouse\b/,
    /\b2\s*(usuarios|pessoas|people|members)\b/,
  ].some((pattern) => pattern.test(text))
}

function getTransactionsFromQueryData(data: unknown): Transaction[] {
  if (!data) return []
  if (Array.isArray(data)) return data as Transaction[]
  if (typeof data !== 'object') return []

  const transactions = (data as { transactions?: unknown }).transactions
  return Array.isArray(transactions) ? (transactions as Transaction[]) : []
}

function getMetaFromQueryData(data: unknown) {
  if (!data || Array.isArray(data) || typeof data !== 'object') return undefined
  return (data as { meta?: { total?: number; totalPages?: number } }).meta
}

function formatChargeCardLabel(charge: CreditCardChargeItem) {
  if (!charge.creditCard) return '-'
  return charge.creditCard.last4
    ? `${charge.creditCard.name} ••${charge.creditCard.last4}`
    : charge.creditCard.name
}

function formatCardFilterLabel(card: { name: string; last4?: string | null }) {
  return card.last4 ? `${card.name} final ${card.last4}` : card.name
}

function creditCardChargeToTransaction(charge: CreditCardChargeItem): Transaction {
  const category: Category = charge.category
    ? {
        id: charge.category.id,
        name: charge.category.name,
        color: charge.category.color,
        icon: (charge.category.icon || 'circle') as Category['icon'],
        type: 'EXPENSE',
      }
    : {
        id: '',
        name: 'Sem categoria',
        color: '#CBD5E1',
        icon: 'circle' as Category['icon'],
        type: 'EXPENSE',
      }

  return {
    id: charge.id,
    userId: charge.userId,
    createdByUserId: charge.createdByUser?.id ?? charge.userId,
    createdByUser: charge.createdByUser,
    user: null,
    updatedByUser: null,
    value: charge.amountTotal,
    description: charge.description,
    categoryId: charge.category?.id ?? '',
    category,
    date: charge.purchaseDate,
    type: 'EXPENSE',
    origin: 'DASHBOARD',
    paymentType: 'CREDIT_CARD',
    cardId: charge.cardId,
    card: charge.creditCard,
    installmentCount: charge.installmentCount,
  }
}

export default function TransactionsPage() {
  const tr = useTranslations('transactions')
  const locale = useLocale()
  const onboardingSteps = useMemo(() => createTransactionsOnboardingSteps(tr), [tr])
  const typeOptions = useMemo<TypeOption[]>(
    () => [
      { value: 'EXPENSE', label: tr('type.expense') },
      { value: 'INCOME', label: tr('type.income') },
    ],
    [tr]
  )

  const { user } = useUserSession()
  const userId = user?.userData?.user?.id ?? ''
  const houseContext = user?.houseContext ?? null
  const { scopeKey } = useFinancialScope()
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const activePermission = useAdvisorActing((s) => s.activePermission ?? s.selectedPermission)
  const isAdvisorReadOnly = isAdvisorReadOnlyTransactionAccess(activeClientId, activePermission)
  const hasCoupleSignature = isCouplePlanLike(user?.userData?.signature?.plan)

  const notifyReadOnly = () => {
    toast.error(ADVISOR_READ_ONLY_FRIENDLY_MESSAGE)
  }

  const [currentPage, setCurrentPage] = useState(1)
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('ALL')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chargeDrawerOpen, setChargeDrawerOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState<CreditCardChargeItem | null>(null)
  const [deletingChargeId, setDeletingChargeId] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[]>([])
  const [deleteConfirmMode, setDeleteConfirmMode] = useState<'single' | 'bulk'>('single')

  const [activeTab, setActiveTab] = useState<'all' | 'credit_card'>('all')
  const [selectedCardId, setSelectedCardId] = useState<string>('ALL')

  const [sortState, setSortState] = useState<{
    field: 'date' | 'value' | null
    direction: 'asc' | 'desc'
  }>({ field: null, direction: 'asc' })

  const sortField = sortState.field
  const sortDirection = sortState.direction

  // filtros globais (o hook useTranscation ja le do zustand e manda pro backend)
  const selectedCategories = useTransactionFilter((s) => s.appliedSelectedCategories)
  const searchTerm = useTransactionFilter((s) => s.appliedSearchTerm)
  const dateRange = useTransactionFilter((s) => s.appliedDateRange)
  const mode = useTransactionFilter((s) => s.appliedMode)
  const includeFuture = useTransactionFilter((s) => s.appliedIncludeFuture)
  const rangeStart = useTransactionFilter((s) => s.appliedRangeStart)
  const rangeEnd = useTransactionFilter((s) => s.appliedRangeEnd)

  const typeFilter = useTransactionFilter((s) => s.appliedTypeFilter)

  const { transactionsQuery, deleteMutation, updateMutation, createMutation, importPreviewMutation, importConfirmMutation } = useTranscation({
    userId,
    page: currentPage,
    limit: PAGE_SIZE,
    filters: {
      userIds: selectedAuthorId !== 'ALL' ? [selectedAuthorId] : undefined,
      excludePaymentType: 'CREDIT_CARD',
    },
    enabled: activeTab === 'all',
  })

  const { cardQuery } = useCardMutations()
  const { chargesQuery, deleteChargeMutation } = useCreditCardCharges({
    cardId: selectedCardId !== 'ALL' ? selectedCardId : undefined,
    page: currentPage,
    limit: PAGE_SIZE,
    enabled: activeTab === 'credit_card',
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importedTransactions, setImportedTransactions] = useState<Transaction[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [, setImportFile] = useState<File | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [showCsvTip, setShowCsvTip] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingPreviewId, setEditingPreviewId] = useState<string | null>(null)
  const [editingPreviewValue, setEditingPreviewValue] = useState('')
  const [editingPreviewOriginal, setEditingPreviewOriginal] = useState('')
  const [bulkRenameOpen, setBulkRenameOpen] = useState(false)
  const [bulkRenameFrom, setBulkRenameFrom] = useState('')
  const [bulkRenameTo, setBulkRenameTo] = useState('')
  const [bulkRenameCount, setBulkRenameCount] = useState(0)
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false)
  const [bulkCategoryTargetDesc, setBulkCategoryTargetDesc] = useState('')
  const [bulkCategoryToId, setBulkCategoryToId] = useState('')
  const [bulkCategoryCount, setBulkCategoryCount] = useState(0)
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([])
  const [previewMeta, setPreviewMeta] = useState<{
    fileName?: string
    fileMime?: string
    count?: number
    formatId?: string
    detectedCardName?: string | null
    isCreditCardStatement?: boolean
  } | null>(null)
  const [importStep, setImportStep] = useState<'review' | 'card' | 'uncategorized'>('review')
  const [selectedImportCardId, setSelectedImportCardId] = useState<string>('')

  const {
    categoriesQuery: { data: categories = [] },
  } = useCategories()

  useEffect(() => {
    if (!showCsvTip) return

    const timer = window.setTimeout(() => {
      setShowCsvTip(false)
    }, CSV_TIP_AUTO_CLOSE_MS)

    return () => window.clearTimeout(timer)
  }, [showCsvTip])

  useEffect(() => {
    if (!isAdvisorReadOnly) return
    setSelectedIds(new Set())
    setSelectAll(false)
  }, [isAdvisorReadOnly])

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
    setSelectAll(false)
  }, [scopeKey])

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
    setSelectAll(false)
  }, [selectedAuthorId])

  const activeHouseMembers = useMemo(
    () => (houseContext?.members ?? []).filter((member) => member.active),
    [houseContext?.members]
  )

  const apiTransactions = useMemo(
    () => getTransactionsFromQueryData(transactionsQuery.data),
    [transactionsQuery.data]
  )

  const apiCharges = useMemo(
    () => chargesQuery.data?.charges ?? [],
    [chargesQuery.data?.charges]
  )

  const cardFilterOptions = useMemo<CardFilterOption[]>(
    () =>
      (cardQuery.data ?? [])
        .filter((card) => card.isActive !== false)
        .map((card) => ({
          value: card.id,
          label: formatCardFilterLabel(card),
        })),
    [cardQuery.data]
  )

  useEffect(() => {
    if (selectedCardId === 'ALL' || cardQuery.isLoading) return
    if (cardFilterOptions.some((option) => option.value === selectedCardId)) return

    setSelectedCardId('ALL')
    setCurrentPage(1)
    setSelectedIds(new Set())
    setSelectAll(false)
  }, [cardFilterOptions, cardQuery.isLoading, selectedCardId])

  const hasCoupleContext =
    houseContext?.status === 'COUPLE' ||
    Boolean(houseContext?.partner?.id) ||
    activeHouseMembers.length > 1

  const showActorContext = hasCoupleContext || hasCoupleSignature

  const authorOptions = useMemo<AuthorOption[]>(() => {
    if (!showActorContext) return []

    const currentUser = user?.userData?.user
    const currentUserName =
      currentUser?.name?.trim() || currentUser?.email?.trim() || tr('authorFilter.currentUser')
    const memberOptions = activeHouseMembers
      .map((member) => ({
        value: member.userId ?? member.id ?? '',
        label:
          member.userId === currentUser?.id
            ? currentUserName
            : getHouseMemberLabel(member, tr('authorFilter.unknownMember')),
      }))
      .filter((option) => option.value && option.label !== tr('authorFilter.unknownMember'))

    const transactionActorOptions = apiTransactions
      .map((transaction) => {
        const actorId = transaction.createdByUserId ?? transaction.userId ?? ''
        const actorLabel = getKnownActorLabel({
          actorId,
          currentUserId: currentUser?.id,
          currentUserName,
          createdByUser: transaction.createdByUser,
          user: transaction.user,
        })

        return actorId && actorLabel ? { value: actorId, label: actorLabel } : null
      })
      .filter((option): option is AuthorOption => Boolean(option?.value))

    const chargeActorOptions = apiCharges
      .map((charge) => {
        const actorId = charge.createdByUser?.id ?? charge.userId ?? ''
        const actorLabel =
          charge.createdByUser?.name?.trim() ||
          charge.createdByUser?.email?.trim() ||
          null
        return actorId && actorLabel ? { value: actorId, label: actorLabel } : null
      })
      .filter((option): option is AuthorOption => Boolean(option?.value))

    const fallbackCurrentUserOption =
      currentUser?.id && !memberOptions.some((option) => option.value === currentUser.id)
        ? [
            {
              value: currentUser.id,
              label: currentUserName,
            },
          ]
        : []

    return [
      { value: 'ALL', label: tr('authorFilter.all') },
      ...fallbackCurrentUserOption,
      ...memberOptions,
      ...transactionActorOptions,
      ...chargeActorOptions,
    ].filter(
        (option, index, options) => options.findIndex((item) => item.value === option.value) === index
    )
  }, [activeHouseMembers, apiCharges, apiTransactions, showActorContext, tr, user?.userData?.user])

  const authorLabelById = useMemo(() => {
    return new Map(authorOptions.map((option) => [option.value, option.label]))
  }, [authorOptions])

  const getTransactionActorLabel = React.useCallback(
    (transaction: Transaction) => {
      if (transaction.createdByUser?.name?.trim()) return transaction.createdByUser.name.trim()
      if (transaction.createdByUser?.email?.trim()) return transaction.createdByUser.email.trim()
      if (transaction.user?.name?.trim()) return transaction.user.name.trim()
      const actorId = transaction.createdByUserId ?? transaction.userId
      if (actorId && authorLabelById.has(actorId)) {
        return authorLabelById.get(actorId) ?? tr('authorFilter.unknownMember')
      }
      if (transaction.user?.email?.trim()) return transaction.user.email.trim()
      return tr('authorFilter.unknownMember')
    },
    [authorLabelById, tr]
  )

  const canWriteTransaction = (transaction: Transaction) =>
    !isAdvisorReadOnly && transaction.userId === userId

  const handleImportClick = () => {
    if (!userId) return
    fileInputRef.current?.click()
  }

  const isValidImportFileFull = (file: File) => {
    const name = file.name.toLowerCase()
    return name.endsWith('.csv') || name.endsWith('.pdf')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isValidImportFileFull(file)) {
      setImportError(tr('invalidCsvFile'))
      e.target.value = ''
      return
    }

    try {
      setIsPreviewLoading(true)
      setImportError(null)
      const response = await importPreviewMutation.mutateAsync({ userId, file })
      const isArrayResponse = Array.isArray(response)
      const list = isArrayResponse ? response : response?.transactions ?? []
      const warnings = !isArrayResponse && Array.isArray(response?.warnings) ? response.warnings : []
      const meta = (!isArrayResponse ? response?.meta ?? null : null) as {
        fileName?: string
        fileMime?: string
        count?: number
        formatId?: string
        detectedCardName?: string | null
        isCreditCardStatement?: boolean
      } | null
      const withIds = (list as Transaction[]).map((t, idx) => ({
        ...t,
        id: t.id ?? `import-preview-${idx}`,
      }))
      setImportedTransactions(withIds)
      setPreviewWarnings(warnings)
      setPreviewMeta(meta)
      setImportFile(file)

      // Decide initial step based on card detection and uncategorized items
      const isCreditCard = meta?.isCreditCardStatement || Boolean(meta?.detectedCardName)
      const hasUncategorized = (list as Transaction[]).some((t) => !t.categoryId && !t.category?.id)

      if (isCreditCard && !meta?.detectedCardName) {
        // Credit card statement but couldn't identify which card → show card selection
        setImportStep('card')
      } else if (hasUncategorized) {
        setImportStep('uncategorized')
      } else {
        setImportStep('review')
      }

      setPreviewOpen(true)
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Erro ao pré-visualizar transações.')
    } finally {
      setIsPreviewLoading(false)
      e.target.value = ''
    }
  }

  const handleConfirmImport = async () => {
    if (!importedTransactions.length) return
    try {
      setIsImporting(true)
      setImportError(null)
      const txWithCard = selectedImportCardId
        ? importedTransactions.map((t) =>
            t.paymentType === 'CREDIT_CARD' ? { ...t, cardId: selectedImportCardId } : t
          )
        : importedTransactions
      const payload = {
        mode: 'import' as const,
        transactions: txWithCard,
      }
      await importConfirmMutation.mutateAsync({ userId, payload })
      setImportedTransactions([])
      setImportFile(null)
      setPreviewOpen(false)
      setImportStep('review')
      setSelectedImportCardId('')
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Erro ao importar transações.')
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
    setEditingPreviewOriginal('')
    setBulkRenameOpen(false)
    setBulkRenameFrom('')
    setBulkRenameTo('')
    setBulkRenameCount(0)
    setBulkCategoryOpen(false)
    setBulkCategoryTargetDesc('')
    setBulkCategoryToId('')
    setBulkCategoryCount(0)
    setPreviewWarnings([])
    setPreviewMeta(null)
    setImportStep('review')
    setSelectedImportCardId('')
  }

  const updateImportedTransaction = (id: string, patch: Partial<Transaction>) => {
    setImportedTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    )
  }

  const removeImportedTransaction = (id: string) => {
    setImportedTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const removeImportedTransactionByIndex = (index: number) => {
    setImportedTransactions((prev) => prev.filter((_, i) => i !== index))
  }

  const beginEditDescription = (id: string, currentValue: string | null | undefined) => {
    setEditingPreviewId(id)
    setEditingPreviewValue(currentValue ?? '')
    setEditingPreviewOriginal(currentValue ?? '')
  }

  const commitEditDescription = () => {
    if (!editingPreviewId) return
    const from = editingPreviewOriginal.trim()
    const to = editingPreviewValue.trim()
    updateImportedTransaction(editingPreviewId, { description: to })
    if (from && to && from !== to) {
      const sameCount = importedTransactions.filter(
        (t) => (t.description ?? '').trim() === from
      ).length
      if (sameCount > 1) {
        setBulkRenameFrom(from)
        setBulkRenameTo(to)
        setBulkRenameCount(sameCount)
        setBulkRenameOpen(true)
      }
    }
    setEditingPreviewId(null)
    setEditingPreviewValue('')
    setEditingPreviewOriginal('')
  }

  const handleCategoryChange = (rowDescription: string, nextCategoryId: string) => {
    const desc = (rowDescription ?? '').trim()
    const to = nextCategoryId
    if (!desc || !to) return
    const sameCount = importedTransactions.filter(
      (t) => (t.description ?? '').trim() === desc
    ).length
    if (sameCount > 1) {
      setBulkCategoryTargetDesc(desc)
      setBulkCategoryToId(to)
      setBulkCategoryCount(sameCount)
      setBulkCategoryOpen(true)
    }
  }
  const meta = useMemo(() => getMetaFromQueryData(transactionsQuery.data), [transactionsQuery.data])

  // Se backend ja filtra por categoria/search/days, aqui fica so ordenacao local (opcional)
  const displayedTransactions = useMemo(() => {
    let result = apiTransactions.filter((transaction) =>
      CASHFLOW_PAYMENT_TYPES.has(transaction.paymentType)
    )

    if (selectedAuthorId !== 'ALL') {
      result = result.filter(
        (transaction) => (transaction.createdByUserId ?? transaction.userId) === selectedAuthorId
      )
    }

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
  }, [apiTransactions, selectedAuthorId, sortField, sortDirection])

  const displayedCharges = useMemo(() => {
    let result = apiCharges

    if (selectedAuthorId !== 'ALL') {
      result = result.filter(
        (charge) => (charge.createdByUser?.id ?? charge.userId) === selectedAuthorId
      )
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        let compare = 0

        if (sortField === 'date') {
          compare = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
        }

        if (sortField === 'value') {
          compare = (a.amountTotal ?? 0) - (b.amountTotal ?? 0)
        }

        return sortDirection === 'asc' ? compare : -compare
      })
    }

    return result
  }, [apiCharges, selectedAuthorId, sortField, sortDirection])

  const displayedCreditCardTransactions = useMemo(
    () => displayedCharges.map(creditCardChargeToTransaction),
    [displayedCharges]
  )

  const chargeById = useMemo(() => {
    return new Map(apiCharges.map((charge) => [charge.id, charge]))
  }, [apiCharges])

  const activeDisplayedTransactions =
    activeTab === 'credit_card' ? displayedCreditCardTransactions : displayedTransactions

  const activeCategoriesToFilter = useMemo<Category[]>(() => {
    const unique = new Map<string, Category>()
    if (activeTab === 'credit_card') {
      displayedCharges.forEach((charge) => {
        if (!charge.category?.id) return
        unique.set(charge.category.id, {
          id: charge.category.id,
          name: charge.category.name,
          color: charge.category.color,
          icon: (charge.category.icon || 'circle') as Category['icon'],
          type: 'EXPENSE',
        })
      })
    } else {
      activeDisplayedTransactions.forEach((transaction) => {
        if (transaction.category?.id) {
          unique.set(transaction.category.id, transaction.category)
        }
      })
    }
    return Array.from(unique.values())
  }, [activeDisplayedTransactions, activeTab, displayedCharges])

  // totalPages agora vem do backend
  const totalPages = meta?.totalPages ?? 1
  const totalAll = meta?.total ?? apiTransactions.length
  const totalFiltered =
    selectedAuthorId === 'ALL' ? meta?.total ?? displayedTransactions.length : displayedTransactions.length

  const startIndex =
    totalFiltered === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalFiltered)

  const creditCardTotalPages = chargesQuery.data?.meta?.totalPages ?? 1
  const creditCardTotalAll = chargesQuery.data?.meta?.total ?? apiCharges.length
  const creditCardTotalFiltered =
    selectedAuthorId === 'ALL'
      ? chargesQuery.data?.meta?.total ?? displayedCharges.length
      : displayedCharges.length
  const creditCardStartIndex =
    creditCardTotalFiltered === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const creditCardEndIndex = Math.min(currentPage * PAGE_SIZE, creditCardTotalFiltered)

  const isFiltered =
    selectedCategories.length > 0 ||
    !!searchTerm ||
    typeFilter !== 'ALL' ||
    includeFuture ||
    mode === 'month' ||
    mode === 'range' ||
    Number(dateRange || 30) !== 30 ||
    (!!rangeStart && !!rangeEnd)

  const handleSortChange = (field: 'date' | 'value') => {
    setSortState((prev) => {
      if (prev.field !== field) return { field, direction: 'asc' }
      if (prev.direction === 'asc') return { field, direction: 'desc' }
      return { field: null, direction: 'asc' }
    })
    setCurrentPage(1)
  }

  const handleCardFilterChange = (nextCardId: string) => {
    setSelectedCardId(nextCardId)
    setCurrentPage(1)
    setSelectedIds(new Set())
    setSelectAll(false)
  }

  const toggleSelectRow = (id: string) => {
    if (isAdvisorReadOnly) return
    setSelectedIds((prev) => {
      const updated = new Set(prev)
      if (updated.has(id)) updated.delete(id)
      else updated.add(id)
      return updated
    })
  }

  const toggleSelectAll = () => {
    if (isAdvisorReadOnly) return
    const currentIds = activeDisplayedTransactions.filter(canWriteTransaction).map((item) => item.id)
    setSelectedIds(selectAll ? new Set() : new Set(currentIds))
    setSelectAll(!selectAll)
  }

  const handleDeleteSelected = async (ids?: string[]) => {
    if (isAdvisorReadOnly) {
      notifyReadOnly()
      return
    }
    const idsToDelete = ids ?? Array.from(selectedIds)
    try {
      if (activeTab === 'credit_card') {
        await Promise.all(idsToDelete.map((id) => deleteChargeMutation.mutateAsync(id)))
      } else {
        await Promise.all(idsToDelete.map((id) => deleteMutation.mutateAsync(id)))
      }
      setSelectedIds(new Set())
      setSelectAll(false)
    } catch (err) {
      console.error('Error deleting multiple:', err)
    }
  }

  const handleDeleteSingle = async (id: string) => {
    if (isAdvisorReadOnly) {
      notifyReadOnly()
      return
    }
    try {
      if (activeTab === 'credit_card') {
        await deleteChargeMutation.mutateAsync(id)
      } else {
        await deleteMutation.mutateAsync(id)
      }
      setSelectedIds((prev) => {
        const updated = new Set(prev)
        updated.delete(id)
        return updated
      })
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  const requestDeleteSingle = (id: string) => {
    if (isAdvisorReadOnly) {
      notifyReadOnly()
      return
    }
    setDeleteConfirmMode('single')
    setDeleteConfirmIds([id])
    setDeleteConfirmOpen(true)
  }

  const requestDeleteSelected = () => {
    if (isAdvisorReadOnly) {
      notifyReadOnly()
      return
    }
    const idsToDelete = Array.from(selectedIds)
    if (idsToDelete.length === 0) return
    setDeleteConfirmMode('bulk')
    setDeleteConfirmIds(idsToDelete)
    setDeleteConfirmOpen(true)
  }

  const isRefreshing =
    transactionsQuery.isFetching ||
    chargesQuery.isFetching ||
    deleteMutation.isPending ||
    deleteChargeMutation.isPending ||
    updateMutation.isPending ||
    createMutation.isPending

  const earliestImportDate = useMemo(() => {
    if (!importedTransactions.length) return null
    const dates = importedTransactions.map((t) => new Date(t.date).getTime()).filter((d) => !Number.isNaN(d))
    if (!dates.length) return null
    return new Date(Math.min(...dates))
  }, [importedTransactions])

  const importCountBadge = useMemo(() => {
    const count = importedTransactions.length
    if (!count) return ''
    if (earliestImportDate) {
      return tr('previewDialog.newCountSince', {
        count,
        date: earliestImportDate.toLocaleDateString(locale),
      })
    }
    return tr('previewDialog.newCount', { count })
  }, [importedTransactions.length, earliestImportDate, locale, tr])

  const uncategorizedInPreview = useMemo(
    () => importedTransactions.filter((t) => !t.categoryId && !t.category?.id),
    [importedTransactions]
  )

  const availableCards = useMemo(
    () => (cardQuery.data ?? []).filter((c) => c.isActive !== false),
    [cardQuery.data]
  )

  if (!userId) return <SkeletonSection />
  if (activeTab === 'all' && transactionsQuery.isLoading) return <SkeletonSection />
  if (activeTab === 'credit_card' && chargesQuery.isLoading) return <SkeletonSection />

  if (activeTab === 'all' && transactionsQuery.error) {
    return (
      <section className="w-full h-full px-4 lg:pl-0 lg:pr-8 flex flex-col gap-4 pt-4 md:pt-0">
        <Header
          subtitle={tr('subtitle')}
          canWriteTransactions={!isAdvisorReadOnly}
        />
        <div className="w-full h-full bg-white rounded-xl border border-gray-200 p-8">
          <p className="text-sm text-red-400">{tr('errorLoading')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full h-full px-4 lg:pl-0 lg:pr-8 flex flex-col gap-4 pt-4 md:pt-0">
      <Dialog open={previewOpen} onClose={handleClosePreview} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-3 md:p-6">
          <DialogPanel className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl md:h-[85vh]">

            {/* ── DIALOG HEADER ── */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base font-semibold text-[#333C4D] md:text-lg">
                    {importStep === 'card'
                      ? tr('previewDialog.selectCard')
                      : importStep === 'uncategorized'
                      ? tr('previewDialog.uncategorizedTitle')
                      : tr('previewDialog.title')}
                  </DialogTitle>
                  {previewMeta?.detectedCardName && (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                      {tr('previewDialog.cardDetected', { cardName: previewMeta.detectedCardName })}
                    </span>
                  )}
                  {previewMeta?.formatId?.endsWith('_AI') && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      {tr('previewDialog.aiApplied')}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
                  {importStep === 'card'
                    ? tr('previewDialog.cardNotDetected')
                    : importStep === 'uncategorized'
                    ? tr('previewDialog.uncategorizedSubtitle')
                    : tr('previewDialog.subtitle')}
                </p>
                {previewWarnings.length > 0 && (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <ul className="flex flex-col gap-0.5 text-[11px] text-amber-700">
                      {previewWarnings.map((warning, wIdx) => (
                        <li key={`${warning}-${wIdx}`} className="flex items-start gap-1">
                          <span className="mt-px flex-shrink-0">⚠</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleClosePreview}
                className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                {tr('close')}
              </button>
            </div>

            {/* ── STEP: CARD SELECTION ── */}
            {importStep === 'card' && (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-auto px-6 py-8">
                {availableCards.length === 0 ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">{tr('previewDialog.noCardsRegistered')}</p>
                    <p className="mt-1 text-xs text-slate-500">Cadastre um cartão antes de importar a fatura.</p>
                  </div>
                ) : (
                  <div className="w-full max-w-sm space-y-3">
                    {availableCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setSelectedImportCardId(card.id)}
                        className={[
                          'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition',
                          selectedImportCardId === card.id
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                        ].join(' ')}
                      >
                        <span className="h-5 w-5 flex-shrink-0 rounded-full bg-slate-400" />
                        <span className="flex-1 font-medium">
                          {card.name}
                          {card.last4 && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              •••• {card.last4}
                            </span>
                          )}
                        </span>
                        {selectedImportCardId === card.id && (
                          <span className="text-primary">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const hasUncategorized = uncategorizedInPreview.length > 0
                      setImportStep(hasUncategorized ? 'uncategorized' : 'review')
                    }}
                    disabled={availableCards.length > 0 && !selectedImportCardId}
                    className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continuar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const hasUncategorized = uncategorizedInPreview.length > 0
                      setImportStep(hasUncategorized ? 'uncategorized' : 'review')
                    }}
                    className="rounded-full border border-slate-200 px-6 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Pular
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP: UNCATEGORIZED ── */}
            {importStep === 'uncategorized' && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-auto px-5 py-4">
                  {uncategorizedInPreview.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-green-600 font-medium">Todos os gastos foram categorizados.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {uncategorizedInPreview.map((t) => {
                        const categoryId = t.categoryId ?? t.category?.id ?? ''
                        const categoryType = t.type ?? 'EXPENSE'
                        const selectedCategory =
                          t.category ?? categories.find((c) => c.id === categoryId) ?? null
                        return (
                          <div
                            key={t.id}
                            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-gray-800">{t.description}</p>
                              <p className="text-xs text-slate-400">
                                {new Date(t.date).toLocaleDateString(locale)} • {formatCurrency(Number(t.value ?? 0))}
                              </p>
                            </div>
                            <div className="w-full sm:w-56">
                              <CategorySelect
                                value={selectedCategory as CategoryResponse | null}
                                onChange={(value) => {
                                  const selected = value as CategoryResponse | null
                                  const normalizedType = selected?.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
                                  const normalizedCategory = selected
                                    ? {
                                        id: selected.id,
                                        name: selected.name,
                                        color: selected.color,
                                        icon: selected.icon,
                                        type: normalizedType as 'INCOME' | 'EXPENSE',
                                      }
                                    : undefined
                                  updateImportedTransaction(t.id, {
                                    category: normalizedCategory,
                                    categoryId: selected?.id ?? '',
                                    type: normalizedCategory?.type ?? categoryType,
                                  })
                                }}
                                allowCreate={false}
                                typeFilter={categoryType as 'INCOME' | 'EXPENSE'}
                                closeMenuOnSelect
                                placeholder="Selecionar categoria"
                                className="w-full"
                                menuPlacement="auto"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setImportStep('review')}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    {tr('previewDialog.proceedAnyway')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportStep('review')}
                    className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-secondary"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP: REVIEW (main table) ── */}
            {importStep === 'review' && (
              <>
            <div className="flex-1 overflow-auto p-3 md:p-4">
              <div className="rounded-xl border border-gray-200 bg-secondary/10 p-3">
                <div className="hidden md:block">
                  <div className="grid grid-cols-[110px_minmax(240px,1fr)_220px_160px_140px_48px] items-center gap-0 rounded-lg border border-gray-200 bg-secondary/30 px-4 py-3 text-sm font-semibold text-primary">
                    <div>{tr('previewTable.date')}</div>
                    <div>{tr('previewTable.description')}</div>
                    <div>{tr('previewTable.category')}</div>
                    <div>{tr('previewTable.type')}</div>
                    <div className="text-right pr-2">{tr('previewTable.value')}</div>
                    <div className="text-right pr-2">{tr('previewTable.remove')}</div>
                  </div>

                  <div className="max-h-[460px] overflow-auto rounded-lg border border-gray-200 bg-white">
                    {importedTransactions.map((t, idx) => {
                      const categoryId = t.categoryId ?? t.category?.id ?? ''
                      const categoryType = t.type ?? t.category?.type ?? 'EXPENSE'
                      const rowIsEditing = editingPreviewId === t.id
                      const selectedCategory =
                        t.category ?? categories.find((c) => c.id === categoryId) ?? null
                      const selectedTypeOption =
                        typeOptions.find((o) => o.value === categoryType) ?? typeOptions[0]

                      return (
                        <div
                          key={t.id}
                          className="grid grid-cols-[110px_minmax(240px,1fr)_220px_160px_140px_48px] items-center gap-0 border-b border-gray-100 px-4 py-2 text-sm"
                        >
                          <div className="text-gray-700">
                            {new Date(t.date).toLocaleDateString(locale)}
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
                                    setEditingPreviewOriginal('')
                                  }
                                }}
                                className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                              />
                            ) : (
                              <button
                                type="button"
                                onDoubleClick={() => beginEditDescription(t.id, t.description)}
                                className="w-full truncate text-left text-gray-800"
                                title={tr('doubleClickToEdit')}
                              >
                              {t.description}
                            </button>
                          )}
                          {t.isInstallment && (
                            <span className="mt-0.5 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              {t.installmentCurrent && t.installmentTotal
                                ? `${t.installmentCurrent}/${t.installmentTotal}`
                                : tr('previewDialog.installmentBadge')}
                            </span>
                          )}
                        </div>
                        <div className="pr-3">
                          <CategorySelect
                            value={selectedCategory as CategoryResponse | null}
                            onChange={(value) => {
                              const selected = value as CategoryResponse | null
                              const normalizedType: CategoryType =
                                selected?.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
                              const normalizedCategory: Transaction['category'] | undefined = selected
                                ? {
                                    id: selected.id,
                                    name: selected.name,
                                    color: selected.color,
                                    icon: selected.icon,
                                    type: normalizedType,
                                  }
                                : undefined
                              updateImportedTransaction(t.id, {
                                category: normalizedCategory,
                                categoryId: selected?.id ?? '',
                                type: normalizedCategory?.type ?? categoryType,
                              })
                              if (selected?.id) {
                                handleCategoryChange(t.description, selected.id)
                              }
                            }}
                            allowCreate={false}
                            typeFilter={categoryType}
                            closeMenuOnSelect
                            placeholder={tr('selectCategory')}
                            className="w-full"
                            menuPlacement="auto"
                          />
                        </div>
                        <div>
                          <Select
                            instanceId={`preview-type-${t.id}`}
                            options={typeOptions}
                            value={selectedTypeOption}
                            onChange={(option) => {
                              const nextType = (option?.value ?? categoryType) as CategoryType
                              const nextPatch: Partial<Transaction> = { type: nextType }
                              if (selectedCategory && selectedCategory.type !== nextType) {
                                nextPatch.category = undefined
                                nextPatch.categoryId = ''
                              }
                              updateImportedTransaction(t.id, nextPatch)
                            }}
                            styles={typeSelectStyles}
                            menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                          />
                        </div>
                        <div className="text-right pr-2 font-semibold">
                          {formatCurrency(Number(t.value ?? 0))}
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                t.id ? removeImportedTransaction(t.id) : removeImportedTransactionByIndex(idx)
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-red-400 hover:bg-red-50"
                              title={tr('removeFromPreview')}
                              aria-label={tr('removeFromPreview')}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="md:hidden">
                  {importedTransactions.map((t, idx) => {
                    const categoryId = t.categoryId ?? t.category?.id ?? ''
                    const categoryType = t.type ?? t.category?.type ?? 'EXPENSE'
                    const rowIsEditing = editingPreviewId === t.id
                    const selectedCategory =
                      t.category ?? categories.find((c) => c.id === categoryId) ?? null
                    const selectedTypeOption =
                      typeOptions.find((o) => o.value === categoryType) ?? typeOptions[0]

                    return (
                      <div
                        key={t.id}
                        className="mb-3 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            {new Date(t.date).toLocaleDateString(locale)}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              t.id ? removeImportedTransaction(t.id) : removeImportedTransactionByIndex(idx)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-red-400 hover:bg-red-50"
                            title={tr('removeFromPreview')}
                            aria-label={tr('removeFromPreview')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
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
                                  setEditingPreviewOriginal('')
                                }
                              }}
                              className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
                            />
                          ) : (
                            <button
                              type="button"
                              onDoubleClick={() => beginEditDescription(t.id, t.description)}
                              className="w-full truncate text-left text-sm font-semibold text-gray-800"
                              title={tr('doubleClickToEdit')}
                            >
                              {t.description}
                            </button>
                          )}
                        </div>

                        <div className="mt-2">
                          <CategorySelect
                            value={selectedCategory as CategoryResponse | null}
                            onChange={(value) => {
                              const selected = value as CategoryResponse | null
                              const normalizedType: CategoryType =
                                selected?.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
                              const normalizedCategory: Transaction['category'] | undefined = selected
                                ? {
                                    id: selected.id,
                                    name: selected.name,
                                    color: selected.color,
                                    icon: selected.icon,
                                    type: normalizedType,
                                  }
                                : undefined
                              updateImportedTransaction(t.id, {
                                category: normalizedCategory,
                                categoryId: selected?.id ?? '',
                                type: normalizedCategory?.type ?? categoryType,
                              })
                              if (selected?.id) {
                                handleCategoryChange(t.description, selected.id)
                              }
                            }}
                            allowCreate={false}
                            typeFilter={categoryType}
                            closeMenuOnSelect
                            placeholder={tr('selectCategory')}
                            className="w-full"
                            menuPlacement="auto"
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="w-32">
                            <Select
                              instanceId={`preview-type-mobile-${t.id}`}
                              options={typeOptions}
                              value={selectedTypeOption}
                              onChange={(option) => {
                                const nextType = (option?.value ?? categoryType) as CategoryType
                                const nextPatch: Partial<Transaction> = { type: nextType }
                                if (selectedCategory && selectedCategory.type !== nextType) {
                                  nextPatch.category = undefined
                                  nextPatch.categoryId = ''
                                }
                                updateImportedTransaction(t.id, nextPatch)
                              }}
                              styles={typeSelectStyles}
                              menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">
                            {formatCurrency(Number(t.value ?? 0))}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* ── REVIEW FOOTER ── */}
            <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <div className="flex flex-col gap-1">
                {importedTransactions.length === 0 && (
                  <p className="text-xs font-semibold text-red-400">
                    {tr('previewDialog.noneFound')}
                  </p>
                )}
                {importCountBadge && (
                  <span className="w-fit rounded-full bg-secondary/30 px-3 py-1 text-xs font-semibold text-[#333C4D]">
                    {importCountBadge}
                  </span>
                )}
                <p className="text-[11px] text-slate-400">{tr('previewDialog.tip')}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting || importedTransactions.length === 0}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImporting ? tr('previewDialog.importing') : tr('previewDialog.confirmImport')}
                </button>
                {importError && (
                  <p className="text-xs text-red-500">{importError}</p>
                )}
              </div>
            </div>
              </>
            )}

          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={bulkRenameOpen} onClose={() => setBulkRenameOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {tr('bulkRename.title')}
            </DialogTitle>
            <p className="mt-2 text-sm text-gray-600">
              {tr('bulkRename.description', {
                count: bulkRenameCount,
                value: bulkRenameTo,
              })}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkRenameOpen(false)
                  setBulkRenameFrom('')
                  setBulkRenameTo('')
                  setBulkRenameCount(0)
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {tr('bulkRename.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const from = bulkRenameFrom.trim()
                  const to = bulkRenameTo.trim()
                  if (from && to) {
                    setImportedTransactions((prev) =>
                      prev.map((t) =>
                        (t.description ?? '').trim() === from ? { ...t, description: to } : t
                      )
                    )
                  }
                  setBulkRenameOpen(false)
                  setBulkRenameFrom('')
                  setBulkRenameTo('')
                  setBulkRenameCount(0)
                }}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary"
              >
                {tr('bulkRename.confirm')}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={bulkCategoryOpen} onClose={() => setBulkCategoryOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {tr('bulkCategory.title')}
            </DialogTitle>
            <p className="mt-2 text-sm text-gray-600">
              {tr('bulkCategory.description', {
                count: bulkCategoryCount,
                description: bulkCategoryTargetDesc,
              })}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkCategoryOpen(false)
                  setBulkCategoryTargetDesc('')
                  setBulkCategoryToId('')
                  setBulkCategoryCount(0)
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {tr('bulkCategory.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const desc = bulkCategoryTargetDesc.trim()
                  const to = bulkCategoryToId
                  if (desc && to) {
                    const nextCategory = categories.find((c) => c.id === to)
                    if (nextCategory) {
                      setImportedTransactions((prev) =>
                        prev.map((t) => {
                          const currentDesc = (t.description ?? '').trim()
                          if (currentDesc !== desc) return t
                          return {
                            ...t,
                            category: {
                              id: nextCategory.id,
                              name: nextCategory.name,
                              color: nextCategory.color,
                              icon: nextCategory.icon,
                              type: nextCategory.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
                            },
                            categoryId: nextCategory.id,
                            type: nextCategory.type as CategoryType,
                          }
                        })
                      )
                    }
                  }
                  setBulkCategoryOpen(false)
                  setBulkCategoryTargetDesc('')
                  setBulkCategoryToId('')
                  setBulkCategoryCount(0)
                }}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary"
              >
                {tr('bulkCategory.confirm')}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
      <div data-onboarding-target="transacoes-filtros">
        <Header
          title={tr('title')}
          subtitle={tr('subtitle')}
          asFilter
          importTransations
          canWriteTransactions={!isAdvisorReadOnly}
          onImportClick={handleImportClick}
          importLoading={isPreviewLoading || isImporting}
          onApplyFilters={() => setCurrentPage(1)}
          rightContent={
            <PageOnboardingTour
              steps={onboardingSteps}
              storageKeyBase="flynance:dashboard:onboarding:transacoes:v1"
              triggerLabel={tr('guideButton')}
            />
          }
          inlineFilterSlot={
            showActorContext && authorOptions.length > 1 ? (
              <div className="w-full min-w-[220px] md:max-w-[220px]">
                <select
                  value={selectedAuthorId}
                  onChange={(event) => setSelectedAuthorId(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-700 bg-[#252525] px-3 text-sm text-white outline-none transition focus:border-slate-500 md:border-slate-200 md:bg-white md:text-slate-700"
                  aria-label={tr('authorFilter.label')}
                >
                  {authorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null
          }
          // se voce quer filtrar por categorias, o ideal e listar categorias do endpoint de categorias,
          // mas mantendo seu comportamento atual:
          dataToFilter={activeCategoriesToFilter}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.pdf,text/csv,application/csv,application/vnd.ms-excel,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {isAdvisorReadOnly && (
        <div className="w-full rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {tr('readOnlyBanner')}
        </div>
      )}
      {showCsvTip && (
        <div className="w-full rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">
              {tr('csvTip')} <span className="font-semibold">.csv</span>
            </p>
            <button
              type="button"
              onClick={() => setShowCsvTip(false)}
              className="rounded-md px-2 py-1 text-xs font-semibold text-sky-900 hover:bg-sky-100"
            >
              {tr('close')}
            </button>
          </div>
        </div>
      )}
      {importError && (
        <div className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {importError}
        </div>
      )}

      {isRefreshing && (
        <div className="w-full rounded-md border border-secondary/40 bg-secondary/10 px-4 py-2 text-xs text-secondary">
          {tr('refreshing')}
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-gray-200 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('all'); setCurrentPage(1); setSelectedIds(new Set()); setSelectAll(false) }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pix / Débito / Dinheiro
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('credit_card'); setCurrentPage(1); setSelectedIds(new Set()); setSelectAll(false) }}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'credit_card'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Cartão de Crédito
          </button>
        </div>
        {activeTab === 'credit_card' && (
          <div className="flex flex-wrap items-center gap-2 pb-2 sm:justify-end">
            <label htmlFor="transaction-card-filter" className="sr-only">
              {tr('cardFilter.label')}
            </label>
            <select
              id="transaction-card-filter"
              value={selectedCardId}
              onChange={(event) => handleCardFilterChange(event.target.value)}
              disabled={cardQuery.isLoading || cardFilterOptions.length === 0}
              className="h-9 min-w-[190px] rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              aria-label={tr('cardFilter.label')}
            >
              <option value="ALL">
                {cardFilterOptions.length > 0 ? tr('cardFilter.all') : tr('cardFilter.empty')}
              </option>
              {cardFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {!isAdvisorReadOnly && (
              <button
                type="button"
                onClick={() => {
                  setEditingCharge(null)
                  setChargeDrawerOpen(true)
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-secondary"
              >
                + Nova Compra
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'credit_card' && (
        <section className="flex flex-col gap-4 lg:gap-0 overflow-auto" data-onboarding-target="transacoes-lista">
          {chargesQuery.isLoading && (
            <div className="w-full bg-white rounded-xl border border-gray-200 p-8">
              <Skeleton type="table" rows={6} />
            </div>
          )}
          {chargesQuery.isError && (
            <p className="text-sm text-red-400 px-1">Erro ao carregar gastos do cartão.</p>
          )}
          {!chargesQuery.isLoading && !chargesQuery.isError && (
            <>
              <TransactionTable
                transactions={displayedCreditCardTransactions}
                getActorLabel={getTransactionActorLabel}
                showActor={showActorContext}
                selectedIds={selectedIds}
                selectAll={selectAll}
                canWrite={!isAdvisorReadOnly}
                canWriteTransaction={canWriteTransaction}
                onToggleSelectAll={toggleSelectAll}
                onToggleSelectRow={toggleSelectRow}
                onEdit={(t) => {
                  if (isAdvisorReadOnly) {
                    notifyReadOnly()
                    return
                  }
                  const charge = chargeById.get(t.id)
                  if (!charge) return
                  setEditingCharge(charge)
                  setChargeDrawerOpen(true)
                }}
                onDelete={requestDeleteSingle}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
              />

              <TransactionCardList
                transactions={displayedCreditCardTransactions}
                getActorLabel={getTransactionActorLabel}
                showActor={showActorContext}
                selectedIds={selectedIds}
                canWrite={!isAdvisorReadOnly}
                canWriteTransaction={canWriteTransaction}
                onToggleSelectRow={toggleSelectRow}
                onEdit={(t) => {
                  if (isAdvisorReadOnly) {
                    notifyReadOnly()
                    return
                  }
                  const charge = chargeById.get(t.id)
                  if (!charge) return
                  setEditingCharge(charge)
                  setChargeDrawerOpen(true)
                }}
                onDelete={handleDeleteSingle}
              />

              <div className="flex items-center justify-between lg:flex-row flex-col gap-4" data-onboarding-target="transacoes-resumo">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <span className="text-sm text-muted-foreground">
                    {creditCardTotalFiltered > 0 ? (
                      <>
                        {tr('showingRange', {
                          start: creditCardStartIndex,
                          end: creditCardEndIndex,
                          total: creditCardTotalFiltered,
                        })}
                      </>
                    ) : (
                      <>Nenhum gasto de cartão encontrado.</>
                    )}
                    {isFiltered && creditCardTotalAll > 0 && (
                      <>
                        {' '}
                        {tr('ofTotal', { total: creditCardTotalAll })}
                      </>
                    )}
                  </span>
                </div>

                {!isAdvisorReadOnly && selectedIds.size > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <div className="flex justify-end">
                      <button
                        onClick={requestDeleteSelected}
                        className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        {tr('deleteSelection', { count: selectedIds.size })}
                      </button>
                    </div>
                  </div>
                )}

                {creditCardTotalPages > 1 && (
                  <div className="lg:mt-4 flex justify-center pb-24 lg:pb-0">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={creditCardTotalPages}
                      onChange={(page) => setCurrentPage(page)}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <CreditCardChargeDrawer
            open={chargeDrawerOpen}
            initialData={editingCharge ?? undefined}
            onClose={() => {
              setChargeDrawerOpen(false)
              setEditingCharge(null)
            }}
          />

          <DeleteConfirmModal
            isOpen={deleteConfirmOpen}
            onClose={() => {
              setDeleteConfirmOpen(false)
              setDeleteConfirmIds([])
            }}
            onConfirm={() => {
              if (deleteConfirmMode === 'bulk') {
                handleDeleteSelected(deleteConfirmIds)
              } else if (deleteConfirmIds[0]) {
                handleDeleteSingle(deleteConfirmIds[0])
              }
            }}
            title={deleteConfirmMode === 'bulk' ? tr('deleteBulkTitle') : tr('deleteSingleTitle')}
            description={
              deleteConfirmMode === 'bulk'
                ? tr('deleteBulkDescription', { count: deleteConfirmIds.length })
                : tr('deleteSingleDescription')
            }
            confirmLabel={deleteConfirmMode === 'bulk' ? tr('deleteBulkConfirm') : tr('deleteSingleConfirm')}
          />

          {selectedTransaction && (
            <TransactionDrawer
              open={drawerOpen}
              onClose={() => {
                setSelectedTransaction(null)
                setDrawerOpen(false)
              }}
              initialData={selectedTransaction}
              readOnly={isAdvisorReadOnly}
            />
          )}
        </section>
      )}

      {activeTab === 'all' && (
      <section className="flex flex-col gap-4 lg:gap-0 overflow-auto" data-onboarding-target="transacoes-lista">
        <TransactionTable
          transactions={displayedTransactions}
          getActorLabel={getTransactionActorLabel}
          showActor={showActorContext}
          selectedIds={selectedIds}
          selectAll={selectAll}
          canWrite={!isAdvisorReadOnly}
          canWriteTransaction={canWriteTransaction}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelectRow={toggleSelectRow}
          onEdit={(t) => {
            if (isAdvisorReadOnly) {
              notifyReadOnly()
              return
            }
            setSelectedTransaction(t)
            setDrawerOpen(true)
          }}
          onDelete={requestDeleteSingle}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />

        <TransactionCardList
          transactions={displayedTransactions}
          getActorLabel={getTransactionActorLabel}
          showActor={showActorContext}
          selectedIds={selectedIds}
          canWrite={!isAdvisorReadOnly}
          canWriteTransaction={canWriteTransaction}
          onToggleSelectRow={toggleSelectRow}
          onEdit={(t) => {
            if (isAdvisorReadOnly) {
              notifyReadOnly()
              return
            }
            setSelectedTransaction(t)
            setDrawerOpen(true)
          }}
          onDelete={handleDeleteSingle}
        />

        <div className="flex items-center justify-between lg:flex-row flex-col gap-4" data-onboarding-target="transacoes-resumo">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="text-sm text-muted-foreground">
              {totalFiltered > 0 ? (
                <>
                  {tr('showingRange', {
                    start: startIndex,
                    end: endIndex,
                    total: totalFiltered,
                  })}
                </>
              ) : (
                <>{tr('noneFound')}</>
              )}
              {isFiltered && totalAll > 0 && (
                <>
                  {' '}
                  {tr('ofTotal', { total: totalAll })}
                </>
              )}
            </span>
          </div>
              
      {!isAdvisorReadOnly && selectedIds.size > 0 && (
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
              onClick={requestDeleteSelected}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              {tr('deleteSelection', { count: selectedIds.size })}
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

        <DeleteConfirmModal
          isOpen={deleteConfirmOpen}
          onClose={() => {
            setDeleteConfirmOpen(false)
            setDeleteConfirmIds([])
          }}
          onConfirm={() => {
            if (deleteConfirmMode === 'bulk') {
              handleDeleteSelected(deleteConfirmIds)
            } else if (deleteConfirmIds[0]) {
              handleDeleteSingle(deleteConfirmIds[0])
            }
          }}
          title={deleteConfirmMode === 'bulk' ? tr('deleteBulkTitle') : tr('deleteSingleTitle')}
          description={
            deleteConfirmMode === 'bulk'
              ? tr('deleteBulkDescription', { count: deleteConfirmIds.length })
              : tr('deleteSingleDescription')
          }
          confirmLabel={deleteConfirmMode === 'bulk' ? tr('deleteBulkConfirm') : tr('deleteSingleConfirm')}
        />

        {selectedTransaction && (
          <TransactionDrawer
            open={drawerOpen}
            onClose={() => {
              setSelectedTransaction(null)
              setDrawerOpen(false)
            }}
            initialData={selectedTransaction}
            readOnly={isAdvisorReadOnly}
          />
        )}
      </section>
      )}
    </section>
  )
}

