'use client'

import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Info,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react'

import Header from '../components/Header'
import { ActionTriggerButton } from '../components/Buttons'
import { Skeleton } from '../components/skeleton'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import IconSelector from '../components/IconSelector'
import PageOnboardingTour, { type PageOnboardingStep } from '@/components/onboarding/PageOnboardingTour'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  CategoryDTO,
  CategoryClassification,
  CategoryClassificationBoardResponse,
  CategoryClassificationItem,
  CategoryClassificationUpdatePayload,
  CategoryResponse,
} from '@/services/category'
import { useCategoryClassificationBoard } from '@/hooks/query/useCategoryClassification'
import { useCategories } from '@/hooks/query/useCategory'
import { useUserSession } from '@/stores/useUserSession'
import { getErrorMessage } from '@/utils/getErrorMessage'
import { IconMap, IconName } from '@/utils/icon-map'

const CLASSIFICATION_ORDER: CategoryClassification[] = [
  'INCOME',
  'ESSENTIAL_EXPENSE',
  'NON_ESSENTIAL_EXPENSE',
  'NEUTRAL',
]

type ExpenseClassification =
  | 'ESSENTIAL_EXPENSE'
  | 'NON_ESSENTIAL_EXPENSE'
  | 'NEUTRAL'

  const EXPENSE_CLASSIFICATIONS: ExpenseClassification[] = [
  'NEUTRAL',
  'ESSENTIAL_EXPENSE',
  'NON_ESSENTIAL_EXPENSE',
]

const ITEM_PREFIX = 'classification-item:'
const COLUMN_PREFIX = 'classification-column:'

type BoardState = Record<CategoryClassification, CategoryClassificationItem[]>
type CategoryType = 'EXPENSE' | 'INCOME'
type CategoryFormValues = {
  name: string
  keywords: string[]
}

type TranslatorFn = (key: string, values?: Record<string, string | number | Date>) => string

function createCategoriesOnboardingSteps(t: TranslatorFn): ReadonlyArray<PageOnboardingStep> {
  return [
    {
      id: 'header',
      selector: '[data-onboarding-target="categorias-header"]',
      align: 'bottom',
      title: t('onboarding.headerTitle'),
      description: t('onboarding.headerDescription'),
    },
    {
      id: 'tabs',
      selector: '[data-onboarding-target="categorias-tabs"]',
      title: t('onboarding.tabsTitle'),
      description: t('onboarding.tabsDescription'),
    },
    {
      id: 'content',
      selector: '[data-onboarding-target="categorias-conteudo"]',
      title: t('onboarding.formListTitle'),
      description: t('onboarding.formListDescription'),
    },
  ]
}

function createEmptyBoardState(): BoardState {
  return {
    INCOME: [],
    ESSENTIAL_EXPENSE: [],
    NON_ESSENTIAL_EXPENSE: [],
    NEUTRAL: [],
  }
}

function toItemId(categoryId: string) {
  return `${ITEM_PREFIX}${categoryId}`
}

function toColumnId(classification: CategoryClassification) {
  return `${COLUMN_PREFIX}${classification}`
}

function normalizeCategoryId(raw: string): string | null {
  let value = String(raw ?? '').trim()
  if (!value) return null

  while (value.startsWith(ITEM_PREFIX)) {
    value = value.slice(ITEM_PREFIX.length)
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function parseItemId(raw: string): string | null {
  if (!raw.startsWith(ITEM_PREFIX)) return null
  return normalizeCategoryId(raw)
}

function parseExpenseColumnId(raw: string): ExpenseClassification | null {
  if (!raw.startsWith(COLUMN_PREFIX)) return null
  const classification = raw.slice(COLUMN_PREFIX.length) as ExpenseClassification
  return EXPENSE_CLASSIFICATIONS.includes(classification) ? classification : null
}

function isExpenseClassification(
  classification: CategoryClassification
): classification is ExpenseClassification {
  return EXPENSE_CLASSIFICATIONS.includes(classification as ExpenseClassification)
}

function isClassificationAllowed(type: string, classification: CategoryClassification) {
  if (type === 'INCOME') {
    return classification === 'INCOME' || classification === 'NEUTRAL'
  }
  return (
    classification === 'ESSENTIAL_EXPENSE' ||
    classification === 'NON_ESSENTIAL_EXPENSE' ||
    classification === 'NEUTRAL'
  )
}

function buildBoardState(
  categories: CategoryResponse[],
  board?: CategoryClassificationBoardResponse
): BoardState {
  const byBoardId = new Map<
    string,
    { item: CategoryClassificationItem; order: number }
  >()

  for (const classification of CLASSIFICATION_ORDER) {
    const serverColumn = board?.columns?.find((column) => column.classification === classification)
    const seenIds = new Set<string>()
    const sortedItems = [...(serverColumn?.items ?? [])].sort(
      (a, b) => (a.classificationOrder ?? 0) - (b.classificationOrder ?? 0)
    )

    sortedItems.forEach((item, index) => {
      const normalizedCategoryId = normalizeCategoryId(item.id)
      if (!normalizedCategoryId) return
      if (seenIds.has(normalizedCategoryId)) return
      seenIds.add(normalizedCategoryId)

      byBoardId.set(normalizedCategoryId, {
        item: {
          ...item,
          id: normalizedCategoryId,
          classification,
          keywords: Array.isArray(item.keywords) ? item.keywords : [],
          hasCustomClassification: Boolean(item.hasCustomClassification),
        },
        order: item.classificationOrder ?? index + 1,
      })
    })
  }

  const next = createEmptyBoardState()

  for (const classification of CLASSIFICATION_ORDER) {
    next[classification] = []
  }

  for (const classification of CLASSIFICATION_ORDER) {
    const boardItems = Array.from(byBoardId.values())
      .filter((entry) => entry.item.classification === classification)
      .sort((a, b) => a.order - b.order || a.item.name.localeCompare(b.item.name))
      .map((entry) => entry.item)

    next[classification] = boardItems.map((item, index) => ({
      ...item,
      classification,
      classificationOrder: index + 1,
    }))
  }

  for (const category of categories) {
    const normalizedCategoryId = normalizeCategoryId(category.id)
    if (!normalizedCategoryId) continue
    if (byBoardId.has(normalizedCategoryId)) continue

    const fallbackClassification = category.type === 'INCOME' ? 'INCOME' : 'NEUTRAL'
    const fallbackItem: CategoryClassificationItem = {
      ...category,
      id: normalizedCategoryId,
      classification: fallbackClassification,
      classificationOrder: 0,
      hasCustomClassification: false,
      keywords: Array.isArray(category.keywords) ? category.keywords : [],
    }

    next[fallbackClassification].push(fallbackItem)
  }

  for (const classification of CLASSIFICATION_ORDER) {
    next[classification] = next[classification].map((item, index) => ({
      ...item,
      classification,
      classificationOrder: index + 1,
    }))
  }

  return next
}

function getBoardSourceIds(board?: CategoryClassificationBoardResponse) {
  const ids = new Set<string>()
  for (const classification of CLASSIFICATION_ORDER) {
    const serverColumn = board?.columns?.find((column) => column.classification === classification)
    for (const item of serverColumn?.items ?? []) {
      const normalizedCategoryId = normalizeCategoryId(item.id)
      if (!normalizedCategoryId) continue
      ids.add(normalizedCategoryId)
    }
  }
  return ids
}

function removeIdsFromBoard(board: BoardState, idsToRemove: ReadonlySet<string>): BoardState {
  if (idsToRemove.size === 0) return board

  const next = createEmptyBoardState()

  for (const classification of CLASSIFICATION_ORDER) {
    next[classification] = board[classification]
      .filter((item) => !idsToRemove.has(item.id))
      .map((item, index) => ({
        ...item,
        classification,
        classificationOrder: index + 1,
      }))
  }

  return next
}

function getSkippedIds(
  board?: CategoryClassificationBoardResponse
) {
  return (board?.skippedCategoryIds ?? [])
    .map((id) => normalizeCategoryId(id))
    .filter((id): id is string => Boolean(id))
}

function getBoardValidIds(board: BoardState) {
  const ids = new Set<string>()
  for (const classification of CLASSIFICATION_ORDER) {
    for (const item of board[classification]) {
      const normalizedCategoryId = normalizeCategoryId(item.id)
      if (!normalizedCategoryId) continue
      ids.add(normalizedCategoryId)
    }
  }
  return ids
}

function sanitizeClassificationItems(
  items: CategoryClassificationUpdatePayload['items'],
  validIds: ReadonlySet<string>,
  blockedCategoryIds?: ReadonlySet<string>
) {
  const sentIds = new Set<string>()
  const invalidIds = new Set<string>()
  const itemsValidos: CategoryClassificationUpdatePayload['items'] = []

  for (const item of items) {
    const normalizedCategoryId = normalizeCategoryId(item.categoryId)
    if (!normalizedCategoryId) continue
    if (!validIds.has(normalizedCategoryId)) {
      invalidIds.add(normalizedCategoryId)
      continue
    }
    if (blockedCategoryIds?.has(normalizedCategoryId)) {
      invalidIds.add(normalizedCategoryId)
      continue
    }
    if (sentIds.has(normalizedCategoryId)) continue

    sentIds.add(normalizedCategoryId)
    itemsValidos.push({
      ...item,
      categoryId: normalizedCategoryId,
    })
  }

  return {
    itemsValidos,
    idsInvalidos: Array.from(invalidIds),
  }
}

function getExpenseItems(
  board: BoardState,
  classification: ExpenseClassification
) {
  return board[classification].filter((item) => item.type === 'EXPENSE')
}

function findItemPosition(board: BoardState, categoryId: string) {
  for (const classification of CLASSIFICATION_ORDER) {
    const index = board[classification].findIndex((item) => item.id === categoryId)
    if (index >= 0) {
      return { classification, index, item: board[classification][index] }
    }
  }
  return null
}

function findExpensePosition(board: BoardState, categoryId: string) {
  for (const classification of EXPENSE_CLASSIFICATIONS) {
    const items = getExpenseItems(board, classification)
    const visibleIndex = items.findIndex((item) => item.id === categoryId)
    if (visibleIndex >= 0) {
      return { classification, visibleIndex, item: items[visibleIndex] }
    }
  }
  return null
}

function moveExpenseItem(
  board: BoardState,
  categoryId: string,
  targetClassification: ExpenseClassification,
  targetVisibleIndex: number
): BoardState {
  const sourceFull = findItemPosition(board, categoryId)
  if (!sourceFull) return board
  if (!isExpenseClassification(sourceFull.classification)) return board

  const cloned: BoardState = {
    INCOME: [...board.INCOME],
    ESSENTIAL_EXPENSE: [...board.ESSENTIAL_EXPENSE],
    NON_ESSENTIAL_EXPENSE: [...board.NON_ESSENTIAL_EXPENSE],
    NEUTRAL: [...board.NEUTRAL],
  }

  const sourceArr = cloned[sourceFull.classification]
  const sourceIndex = sourceArr.findIndex((item) => item.id === categoryId)
  if (sourceIndex < 0) return board
  const [movingItem] = sourceArr.splice(sourceIndex, 1)
  if (!movingItem) return board

  const targetArr = cloned[targetClassification]
  const expenseIndices: number[] = []
  for (let i = 0; i < targetArr.length; i += 1) {
    if (targetArr[i].type === 'EXPENSE') expenseIndices.push(i)
  }

  const insertionIndex =
    targetVisibleIndex >= expenseIndices.length
      ? targetArr.length
      : expenseIndices[targetVisibleIndex]

  targetArr.splice(insertionIndex, 0, {
    ...movingItem,
    classification: targetClassification,
  })

  for (const classification of CLASSIFICATION_ORDER) {
    cloned[classification] = cloned[classification].map((item, index) => ({
      ...item,
      classification,
      classificationOrder: index + 1,
    }))
  }

  return cloned
}

function preserveMissingSourceItems(
  nextBoard: BoardState,
  fallbackBoard: BoardState,
  missingSourceIds: string[]
): BoardState {
  if (missingSourceIds.length === 0) return nextBoard

  const cloned: BoardState = {
    INCOME: [...nextBoard.INCOME],
    ESSENTIAL_EXPENSE: [...nextBoard.ESSENTIAL_EXPENSE],
    NON_ESSENTIAL_EXPENSE: [...nextBoard.NON_ESSENTIAL_EXPENSE],
    NEUTRAL: [...nextBoard.NEUTRAL],
  }

  for (const missingId of missingSourceIds) {
    const fallbackPosition = findItemPosition(fallbackBoard, missingId)
    if (!fallbackPosition) continue

    const currentPosition = findItemPosition(cloned, missingId)
    if (currentPosition) {
      cloned[currentPosition.classification] = cloned[currentPosition.classification].filter(
        (item) => item.id !== missingId
      )
    }

    const targetItems = cloned[fallbackPosition.classification]
    const insertionIndex = Math.min(fallbackPosition.index, targetItems.length)
    targetItems.splice(insertionIndex, 0, {
      ...fallbackPosition.item,
      classification: fallbackPosition.classification,
    })
  }

  for (const classification of CLASSIFICATION_ORDER) {
    cloned[classification] = cloned[classification].map((item, index) => ({
      ...item,
      classification,
      classificationOrder: index + 1,
    }))
  }

  return cloned
}

function boardToPayload(
  board: BoardState
): CategoryClassificationUpdatePayload {
  const items: CategoryClassificationUpdatePayload['items'] = []
  const seenIds = new Set<string>()

  for (const classification of CLASSIFICATION_ORDER) {
    let order = 1

    for (const item of board[classification]) {
      const normalizedCategoryId = normalizeCategoryId(item.id)
      if (!normalizedCategoryId) continue
      if (seenIds.has(normalizedCategoryId)) continue

      seenIds.add(normalizedCategoryId)
      items.push({
        categoryId: normalizedCategoryId,
        classification,
        order,
      })
      order += 1
    }
  }

  return { items }
}

type CardLabels = {
  incomeTypeLabel: string
  expenseTypeLabel: string
  sourceDefault: string
  sourceCustom: string
  noKeywords: string
  editAria: string
  deleteAria: string
  defaultLockedTitle: string
  keywordCount: (count: number) => string
}

function CategoryCard({
  item,
  labels,
  onEdit,
  onDelete,
  draggable = false,
  dragHandleProps,
  dragging = false,
  canManage = false,
}: {
  item: CategoryClassificationItem
  labels: CardLabels
  onEdit?: (category: CategoryClassificationItem) => void
  onDelete?: (category: CategoryClassificationItem) => void
  draggable?: boolean
  dragHandleProps?: Record<string, unknown>
  dragging?: boolean
  canManage?: boolean
}) {
  const Icon = IconMap[item.icon] ?? Tag
  const showActions = Boolean(onEdit || onDelete)
  const [expanded, setExpanded] = useState(false)
  const keywordNames = item.keywords?.map((keyword) => keyword.name).filter(Boolean) ?? []

  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition ${dragging ? 'opacity-50' : ''}`}
      onClick={() => setExpanded((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setExpanded((current) => !current)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        {draggable && canManage ? (
          <button
            type="button"
            className="mt-1 cursor-grab touch-none text-slate-400"
            onClick={(event) => event.stopPropagation()}
            {...(dragHandleProps as Record<string, unknown>)}
          >
            <GripVertical size={16} />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 rounded-full border border-slate-300"
                style={{ backgroundColor: item.color || '#CBD5E1' }}
              />
              <Icon size={14} className="text-slate-500" />
              <h4 className="truncate text-sm font-semibold text-slate-800">{item.name}</h4>
            </div>

            {showActions ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit?.(item)
                  }}
                  disabled={!canManage || !onEdit}
                  title={!canManage ? labels.defaultLockedTitle : undefined}
                  className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={labels.editAria}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete?.(item)
                  }}
                  disabled={!canManage || !onDelete}
                  title={!canManage ? labels.defaultLockedTitle : undefined}
                  className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={labels.deleteAria}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  item.type === 'INCOME'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {item.type === 'INCOME' ? labels.incomeTypeLabel : labels.expenseTypeLabel}
              </span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  item.userId ? 'bg-sky-100 text-sky-700' : 'bg-slate-500 text-slate-700'
                }`}
              >
                {item.userId ? labels.sourceCustom : labels.sourceDefault}
              </span>
            </div>
            <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          </div>

          <div className="mt-1 text-right text-[11px] text-slate-500">
            {labels.keywordCount(keywordNames.length)}
          </div>

          {expanded ? (
            <div className="mt-2 flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
              {keywordNames.length > 0 ? (
                keywordNames.map((keyword) => (
                  <span
                    key={`${item.id}-${keyword}`}
                    className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-600"
                  >
                    {keyword}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-500">{labels.noKeywords}</span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function SortableExpenseCard({
  item,
  labels,
  onEdit,
  onDelete,
  disabled,
  canManage = false,
}: {
  item: CategoryClassificationItem
  labels: CardLabels
  onEdit: (category: CategoryClassificationItem) => void
  onDelete: (category: CategoryClassificationItem) => void
  disabled?: boolean
  canManage?: boolean
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({
      id: toItemId(item.id),
      disabled,
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <CategoryCard
        item={item}
        labels={labels}
        onEdit={onEdit}
        onDelete={onDelete}
        draggable={canManage}
        dragging={isDragging}
        canManage={canManage}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function ExpenseClassificationColumn({
  classification,
  title,
  infoText,
  infoAria,
  labels,
  onEdit,
  onDelete,
  items,
  activeItemType,
  disabled,
  emptyPlaceholder,
  canManageItem,
}: {
  classification: ExpenseClassification
  title: string
  infoText: string
  infoAria: string
  labels: CardLabels
  onEdit: (category: CategoryClassificationItem) => void
  onDelete: (category: CategoryClassificationItem) => void
  items: CategoryClassificationItem[]
  activeItemType: string | null
  disabled: boolean
  emptyPlaceholder: string
  canManageItem: (item: CategoryClassificationItem) => boolean
}) {
  const droppable = useDroppable({
    id: toColumnId(classification),
    disabled,
  })

  const forbidden =
    Boolean(activeItemType) &&
    !isClassificationAllowed(activeItemType ?? '', classification)

  return (
    <section
      ref={droppable.setNodeRef}
      className={`flex h-[min(68vh,620px)] min-h-[320px] flex-col rounded-2xl border bg-slate-50/70 p-3 transition lg:h-[min(70vh,720px)] lg:min-h-[380px] ${
        forbidden
          ? 'border-red-200 bg-red-50/70'
          : droppable.isOver
          ? 'border-primary'
          : 'border-slate-200'
      }`}
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:bg-slate-100"
                aria-label={infoAria}
              >
                <Info size={12} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-xs">{infoText}</TooltipContent>
          </Tooltip>
        </div>
        <span className="rounded-full dark:bg-slate-400 bg-slate-200 px-2 py-0.5 text-xs font-semibold dark:text-slate-900">
          {items.length}
        </span>
      </header>

      <SortableContext
        items={items.map((item) => toItemId(item.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <SortableExpenseCard
              key={item.id}
              item={item}
              labels={labels}
              onEdit={onEdit}
              onDelete={onDelete}
              disabled={disabled || !canManageItem(item)}
              canManage={canManageItem(item)}
            />
          ))}
          {items.length === 0 ? (
            <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-3 text-center text-xs text-slate-500">
              {emptyPlaceholder}
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  )
}

function IncomeSection({
  title,
  subtitle,
  items,
  labels,
  onEdit,
  onDelete,
  emptyText,
  canManageItem,
}: {
  title: string
  subtitle: string
  items: CategoryClassificationItem[]
  labels: CardLabels
  onEdit: (category: CategoryClassificationItem) => void
  onDelete: (category: CategoryClassificationItem) => void
  emptyText: string
  canManageItem: (item: CategoryClassificationItem) => boolean
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {items.length}
        </span>
      </header>
      <p className="mb-3 text-xs text-slate-500">{subtitle}</p>

      <div className="flex min-h-[180px] flex-col gap-2">
        {items.map((item) => (
          <CategoryCard
            key={item.id}
            item={item}
            labels={labels}
            onEdit={onEdit}
            onDelete={onDelete}
            canManage={canManageItem(item)}
          />
        ))}

        {items.length === 0 ? (
          <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-3 text-center text-xs text-slate-500">
            {emptyText}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default function CategoriasPage() {
  const t = useTranslations('categoriesPage')
  const tForm = useTranslations('categoryForm')
  const tList = useTranslations('categoryList')
  const onboardingSteps = useMemo(() => createCategoriesOnboardingSteps(t), [t])
  const currentUserId = useUserSession((state) => state.user?.userData?.user?.id ?? '')
  const {
    categoriesQuery: {
      data: categories = [],
      isLoading: isLoadingCategories,
      isError: isCategoriesError,
      error: categoriesError,
      refetch: refetchCategories,
    },
    createMutation,
    updateMutation,
    deleteMutation,
  } = useCategories()
  const {
    boardQuery: { data, isLoading, isError, error, refetch },
    saveBoardMutation,
    saveCategoryClassificationMutation,
  } = useCategoryClassificationBoard()

  const [board, setBoard] = useState<BoardState>(() => createEmptyBoardState())
  const [selectedTab, setSelectedTab] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryResponse | null>(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [color, setColor] = useState('#22C55E')
  const [icon, setIcon] = useState<IconName>('Wallet')
  const [boardSourceCategoryIds, setBoardSourceCategoryIds] = useState<string[]>([])
  const [sessionSkippedCategoryIds, setSessionSkippedCategoryIds] = useState<string[]>([])

  const drawerSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, tForm('errors.nameRequired')),
        keywords: z.array(z.string().trim().min(1)).min(1, tForm('errors.keywordsRequired')),
      }),
    [tForm]
  )

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(drawerSchema),
    defaultValues: {
      name: '',
      keywords: [],
    },
  })

  const sessionSkippedCategoryIdSet = useMemo(
    () => new Set(sessionSkippedCategoryIds),
    [sessionSkippedCategoryIds]
  )
  const boardSourceCategoryIdSet = useMemo(
    () => new Set(boardSourceCategoryIds),
    [boardSourceCategoryIds]
  )

  useEffect(() => {
    const nextBoard = buildBoardState(categories, data)
    setBoard(nextBoard)

    const sourceIds = getBoardSourceIds(data)
    setBoardSourceCategoryIds(Array.from(sourceIds))

    setSessionSkippedCategoryIds((previousIds) =>
      previousIds.filter((id) => !sourceIds.has(id))
    )
  }, [categories, data])

  useEffect(() => {
    setValue('keywords', keywords, { shouldValidate: drawerOpen })
  }, [drawerOpen, keywords, setValue])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const expenseColumns = useMemo(
    () => ({
      ESSENTIAL_EXPENSE: t('classification.columns.ESSENTIAL_EXPENSE'),
      NON_ESSENTIAL_EXPENSE: t('classification.columns.NON_ESSENTIAL_EXPENSE'),
      NEUTRAL: t('classification.columns.NEUTRAL'),
    }),
    [t]
  )

  const expenseColumnHelp = useMemo(
    () => ({
      ESSENTIAL_EXPENSE: t('classification.columnsHelp.ESSENTIAL_EXPENSE'),
      NON_ESSENTIAL_EXPENSE: t('classification.columnsHelp.NON_ESSENTIAL_EXPENSE'),
      NEUTRAL: t('classification.columnsHelp.NEUTRAL'),
    }),
    [t]
  )

  const cardLabels = useMemo<CardLabels>(
    () => ({
      incomeTypeLabel: t('classification.type.INCOME'),
      expenseTypeLabel: t('classification.type.EXPENSE'),
      sourceDefault: t('classification.badges.default'),
      sourceCustom: t('classification.badges.custom'),
      noKeywords: t('classification.noKeywords'),
      editAria: tList('editAria'),
      deleteAria: tList('deleteAria'),
      defaultLockedTitle: t('classification.defaultActionsLocked'),
      keywordCount: (count: number) => t('classification.keywordsCount', { count }),
    }),
    [t, tList]
  )

  const expenseItemsByColumn = useMemo(
    () => ({
      ESSENTIAL_EXPENSE: getExpenseItems(board, 'ESSENTIAL_EXPENSE'),
      NON_ESSENTIAL_EXPENSE: getExpenseItems(board, 'NON_ESSENTIAL_EXPENSE'),
      NEUTRAL: getExpenseItems(board, 'NEUTRAL'),
    }),
    [board]
  )

  const incomeItems = useMemo(
    () =>
      [...board.INCOME, ...board.NEUTRAL]
        .filter((item) => item.type === 'INCOME')
        .sort(
          (a, b) => a.classificationOrder - b.classificationOrder || a.name.localeCompare(b.name)
        ),
    [board]
  )

  const activeItem = useMemo(() => {
    if (!activeCategoryId) return null
    return findItemPosition(board, activeCategoryId)?.item ?? null
  }, [activeCategoryId, board])

  const effectiveDrawerType: CategoryType = useMemo(() => {
    if (editingCategory?.type === 'INCOME') return 'INCOME'
    if (editingCategory?.type === 'EXPENSE') return 'EXPENSE'
    return selectedTab === 0 ? 'EXPENSE' : 'INCOME'
  }, [editingCategory?.type, selectedTab])

  const drawerSubmitting = createMutation.isPending || updateMutation.isPending
  const classificationSaving =
    saveBoardMutation.isPending || saveCategoryClassificationMutation.isPending
  const canManageCategory = (category: Pick<CategoryResponse, 'userId'>) =>
    Boolean(category.userId && category.userId === currentUserId)
  const boardLoading = isLoading || isLoadingCategories
  const boardError = isError || isCategoriesError

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingCategory(null)
    setKeywordInput('')
    setKeywords([])
    setColor('#22C55E')
    setIcon('Wallet')
    reset({
      name: '',
      keywords: [],
    })
  }

  const openCreateDrawer = () => {
    setEditingCategory(null)
    setDrawerOpen(true)
  }

  useEffect(() => {
    if (!drawerOpen) return

    if (editingCategory) {
      const nextKeywords = editingCategory.keywords.map((kw) => kw.name)
      reset({
        name: editingCategory.name,
        keywords: nextKeywords,
      })
      setKeywords(nextKeywords)
      setColor(editingCategory.color || '#22C55E')
      setIcon((editingCategory.icon as IconName) || 'Wallet')
      return
    }

    reset({
      name: '',
      keywords: [],
    })
    setKeywords([])
    setKeywordInput('')
    setColor('#22C55E')
    setIcon('Wallet')
  }, [drawerOpen, editingCategory, reset])

  const handleDrawerSubmit = handleSubmit(async ({ name }) => {
    const payload: CategoryDTO = {
      name: name.trim(),
      color,
      icon,
      keywords,
      type: effectiveDrawerType,
    }

    try {
      if (editingCategory?.id) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      closeDrawer()
    } catch (e) {
      toast.error(
        getErrorMessage(
          e,
          editingCategory ? t('classification.updateError') : t('classification.createError')
        )
      )
    }
  })

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim()
    if (!trimmed) return
    if (keywords.some((kw) => kw.toLowerCase() === trimmed.toLowerCase())) {
      setKeywordInput('')
      return
    }

    const next = [...keywords, trimmed]
    setKeywords(next)
    setValue('keywords', next, { shouldValidate: true })
    setKeywordInput('')
  }

  const handleRemoveKeyword = (keyword: string) => {
    const next = keywords.filter((value) => value !== keyword)
    setKeywords(next)
    setValue('keywords', next, { shouldValidate: true })
  }

  const handleEditCategory = (category: CategoryClassificationItem | CategoryResponse) => {
    if (!canManageCategory(category)) {
      toast.error(t('classification.defaultActionsLocked'))
      return
    }
    setEditingCategory(category)
    setDrawerOpen(true)
  }

  const handleAskDeleteCategory = (category: CategoryClassificationItem | CategoryResponse) => {
    if (!canManageCategory(category)) {
      toast.error(t('classification.defaultActionsLocked'))
      return
    }
    setCategoryToDelete(category)
  }

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      await deleteMutation.mutateAsync(categoryToDelete.id)
      if (editingCategory?.id === categoryToDelete.id) {
        closeDrawer()
      }
      setCategoryToDelete(null)
    } catch (e) {
      toast.error(getErrorMessage(e, t('classification.deleteError')))
    }
  }

  const applyBoardResponse = (
    response: CategoryClassificationBoardResponse,
    options?: {
      attemptedCategoryIds?: ReadonlySet<string>
      fallbackBoard?: BoardState
    }
  ) => {
    const skippedIds = getSkippedIds(response)
    const responseSourceIds = getBoardSourceIds(response)
    const attemptedCategoryIds = options?.attemptedCategoryIds ?? new Set<string>()
    const removableSkippedIds = skippedIds.filter((id) => attemptedCategoryIds.has(id))
    const removableSkippedIdSet = new Set(removableSkippedIds)
    const fallbackBoard = options?.fallbackBoard ?? board
    const missingSourceIds = Array.from(boardSourceCategoryIdSet).filter(
      (id) => !responseSourceIds.has(id) && !removableSkippedIdSet.has(id)
    )

    const mergedBoard = buildBoardState(categories, response)
    const nextBoard = removeIdsFromBoard(mergedBoard, removableSkippedIdSet)
    const stabilizedBoard = preserveMissingSourceItems(nextBoard, fallbackBoard, missingSourceIds)
    setBoard(stabilizedBoard)

    for (const skippedId of removableSkippedIds) {
      responseSourceIds.delete(skippedId)
    }
    for (const missingSourceId of missingSourceIds) {
      responseSourceIds.add(missingSourceId)
    }
    setBoardSourceCategoryIds(Array.from(responseSourceIds))

    setSessionSkippedCategoryIds((previousIds) => {
      const nextBlockedIds = new Set(previousIds)
      for (const skippedId of removableSkippedIds) {
        nextBlockedIds.add(skippedId)
      }
      for (const sourceId of responseSourceIds) {
        nextBlockedIds.delete(sourceId)
      }
      return Array.from(nextBlockedIds)
    })

    if (skippedIds.length > 0) {
      toast.error('Algumas categorias nao puderam ser salvas e foram removidas da sessao.')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const categoryId = parseItemId(String(event.active.id))
    if (!categoryId) return
    const found = findExpensePosition(board, categoryId)
    if (!found) return
    setActiveCategoryId(categoryId)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCategoryId(null)

    const activeId = parseItemId(String(event.active.id))
    const normalizedActiveId = normalizeCategoryId(activeId ?? '')
    const overRaw = event.over ? String(event.over.id) : null
    if (!activeId || !normalizedActiveId || !overRaw) return

    const source = findExpensePosition(board, activeId)
    if (!source) return
    if (!canManageCategory(source.item)) {
      toast.error(t('classification.defaultActionsLocked'))
      return
    }

    const overItemId = parseItemId(overRaw)
    const overColumn = parseExpenseColumnId(overRaw)

    let targetClassification = source.classification
    let targetVisibleIndex = source.visibleIndex

    if (overItemId) {
      const overPosition = findExpensePosition(board, overItemId)
      if (!overPosition) return
      targetClassification = overPosition.classification
      targetVisibleIndex = overPosition.visibleIndex
    } else if (overColumn) {
      targetClassification = overColumn
      targetVisibleIndex = expenseItemsByColumn[overColumn].length
    } else {
      return
    }

    if (
      source.classification === targetClassification &&
      source.visibleIndex === targetVisibleIndex
    ) {
      return
    }

    if (!isClassificationAllowed(source.item.type, targetClassification)) {
      toast.error(t('classification.invalidMove'))
      return
    }

    const previousBoard = board
    const optimisticBoard = moveExpenseItem(
      previousBoard,
      activeId,
      targetClassification,
      targetVisibleIndex
    )
    setBoard(optimisticBoard)

    try {
      if (!boardSourceCategoryIdSet.has(normalizedActiveId)) {
        const patchResponse = await saveCategoryClassificationMutation.mutateAsync({
          categoryId: normalizedActiveId,
          payload: {
            classification: targetClassification,
            order: targetVisibleIndex + 1,
          },
        })
        applyBoardResponse(patchResponse, {
          attemptedCategoryIds: new Set([normalizedActiveId]),
          fallbackBoard: optimisticBoard,
        })
        return
      }

      const payload = boardToPayload(optimisticBoard)
      const { itemsValidos } = sanitizeClassificationItems(
        payload.items,
        boardSourceCategoryIdSet,
        sessionSkippedCategoryIdSet
      )
      const containsMovedCategory = itemsValidos.some(
        (entry) => entry.categoryId === normalizedActiveId
      )

      if (!containsMovedCategory) {
        setBoard(previousBoard)
        toast.error(t('classification.saveError'))
        return
      }

      const updatedBoard = await saveBoardMutation.mutateAsync({ items: itemsValidos })

      applyBoardResponse(updatedBoard, {
        attemptedCategoryIds: new Set(itemsValidos.map((entry) => entry.categoryId)),
        fallbackBoard: optimisticBoard,
      })
    } catch (e) {
      setBoard(previousBoard)
      toast.error(getErrorMessage(e, t('classification.saveError')))
    }
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-col gap-4 px-4 pb-28 pt-8 lg:px-8 lg:pb-0">
      <div
        className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
        data-onboarding-target="categorias-header"
      >
        <Header
          title={t('classification.title')}
          subtitle={t('classification.subtitle')}
          newTransation={false}
          rightContent={
            <ActionTriggerButton
              onClick={openCreateDrawer}
              label={t('classification.createButton')}
              icon={Plus}
            />
          }
        />
        <div className="hidden lg:flex lg:shrink-0">
          <PageOnboardingTour
            steps={onboardingSteps}
            storageKeyBase="flynance:dashboard:onboarding:categorias:v1"
            triggerLabel={t('guideButton')}
          />
        </div>
      </div>
      <div className="flex lg:hidden">
        <PageOnboardingTour
          steps={onboardingSteps}
          storageKeyBase="flynance:dashboard:onboarding:categorias:v1"
          triggerLabel={t('guideButton')}
          hideLabelOnMobile={false}
        />
      </div>
      <div className="flex lg:hidden">
        <ActionTriggerButton
          onClick={openCreateDrawer}
          label={t('classification.createButton')}
          icon={Plus}
          size="sm"
          className="w-full"
        />
      </div>

      <TabGroup
        selectedIndex={selectedTab}
        onChange={(index) => {
          setSelectedTab(index)
          setEditingCategory(null)
          if (drawerOpen) closeDrawer()
        }}
        data-onboarding-target="categorias-tabs"
      >
        <TabList className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
          <Tab
            className={({ selected }) =>
              clsx(
                'cursor-pointer whitespace-nowrap px-4 py-2 text-sm font-medium outline-none',
                selected
                  ? 'rounded-full bg-secondary/30 text-primary'
                  : ' text-gray-600'
              )
            }
          >
            {t('expenseTab')}
          </Tab>
          <Tab
            className={({ selected }) =>
              clsx(
                'cursor-pointer whitespace-nowrap px-4 py-2 text-sm font-medium outline-none',
                selected
                  ? 'rounded-full bg-secondary/30 text-primary'
                  : 'text-gray-600'
              )
            }
          >
            {t('incomeTab')}
          </Tab>
        </TabList>

        <TabPanels data-onboarding-target="categorias-conteudo">
          <TabPanel className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                {t('classification.tip')}
              </span>
              {classificationSaving ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                  {t('classification.saving')}
                </span>
              ) : null}
            </div>

            {boardLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
                {EXPENSE_CLASSIFICATIONS.map((column) => (
                  <div
                    key={column}
                    className="min-w-[85vw] rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:min-w-[420px] lg:min-w-0"
                  >
                    <div className="mb-3 h-5 w-40 rounded bg-slate-200" />
                    <Skeleton type="table" rows={4} />
                  </div>
                ))}
              </div>
            ) : null}

            {boardError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p>{getErrorMessage(error || categoriesError, t('classification.loadError'))}</p>
                <button
                  type="button"
                  onClick={() => {
                    void refetch()
                    void refetchCategories()
                  }}
                  className="mt-3 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  {t('classification.retry')}
                </button>
              </div>
            ) : null}

            {!boardLoading && !boardError ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <TooltipProvider delayDuration={100}>
                  <div className="flex gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
                    {EXPENSE_CLASSIFICATIONS.map((classification) => (
                      <div
                        key={classification}
                        className="min-w-[85vw] sm:min-w-[420px] lg:min-w-0"
                      >
                        <ExpenseClassificationColumn
                          classification={classification}
                          title={expenseColumns[classification]}
                          infoText={expenseColumnHelp[classification]}
                          infoAria={t('classification.columnInfoAria')}
                          labels={cardLabels}
                          onEdit={handleEditCategory}
                          onDelete={handleAskDeleteCategory}
                          items={expenseItemsByColumn[classification]}
                          activeItemType={activeItem?.type ?? null}
                          disabled={classificationSaving}
                          emptyPlaceholder={t('classification.emptyPlaceholder')}
                          canManageItem={canManageCategory}
                        />
                      </div>
                    ))}
                  </div>
                </TooltipProvider>

                <DragOverlay>
                  {activeItem ? (
                    <div className="w-[280px]">
                      <CategoryCard item={activeItem} labels={cardLabels} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : null}

          </TabPanel>

          <TabPanel className="flex flex-col gap-4">
            {boardLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="mb-3 h-5 w-40 rounded bg-slate-200" />
                <Skeleton type="table" rows={6} />
              </div>
            ) : null}

            {boardError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p>{getErrorMessage(error || categoriesError, t('classification.loadError'))}</p>
                <button
                  type="button"
                  onClick={() => {
                    void refetch()
                    void refetchCategories()
                  }}
                  className="mt-3 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  {t('classification.retry')}
                </button>
              </div>
            ) : null}

            {!boardLoading && !boardError ? (
              <div className="grid grid-cols-1 gap-4">
                <IncomeSection
                  title={t('classification.incomeListTitle')}
                  subtitle={t('classification.incomeListSubtitle')}
                  items={incomeItems}
                  labels={cardLabels}
                  onEdit={handleEditCategory}
                  onDelete={handleAskDeleteCategory}
                  emptyText={t('classification.emptyIncome')}
                  canManageItem={canManageCategory}
                />
              </div>
            ) : null}
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer()
          else setDrawerOpen(true)
        }}
      >
        <DrawerContent className="mx-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border-slate-200 bg-white sm:my-auto sm:rounded-2xl">
          <DrawerHeader className="shrink-0 px-5 pt-5">
            <DrawerTitle className="text-[#333C4D]">
              {editingCategory
                ? tForm('editTitle')
                : effectiveDrawerType === 'EXPENSE'
                ? tForm('addExpenseTitle')
                : tForm('addIncomeTitle')}
            </DrawerTitle>
            <DrawerDescription>
              {effectiveDrawerType === 'EXPENSE'
                ? tForm('subtitleExpense')
                : tForm('subtitleIncome')}
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleDrawerSubmit} className="grid flex-1 gap-4 overflow-y-auto px-5 pb-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-slate-600">{tForm('nameLabel')}</span>
              <input
                {...register('name')}
                className={clsx(
                  'h-12 rounded-xl border px-3 outline-none focus:border-[#7CB8D8]',
                  errors.name ? 'border-red-300' : 'border-slate-200'
                )}
                placeholder={tForm('namePlaceholder')}
              />
              <span className="text-xs text-red-400">{errors.name?.message}</span>
            </label>

            <div className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-slate-600">{tForm('keywordsLabel')}</span>
              <div
                className={clsx(
                  'flex items-center gap-2 rounded-xl border px-2',
                  errors.keywords ? 'border-red-300' : 'border-slate-200'
                )}
              >
                <input
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleAddKeyword()
                    }
                  }}
                  className="h-12 w-full border-none px-1 text-sm outline-none"
                  placeholder={tForm('keywordsPlaceholder')}
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white dark:text-black transition hover:bg-secondary/80"
                  aria-label={tForm('addKeywordAria')}
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-xs text-red-400">{errors.keywords?.message}</span>
              {keywords.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(keyword)}
                        aria-label={tForm('removeKeywordAria')}
                        className="rounded p-0.5 text-slate-500 transition hover:bg-slate-200"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{tForm('colorLabel')}</span>
              <div className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="absolute h-12 w-full cursor-pointer opacity-0"
                  aria-label={tForm('colorPickerAria')}
                />
                <div
                  className="h-12 w-full rounded-xl border border-slate-200"
                  style={{ backgroundColor: color }}
                />
              </div>
            </label>

            <div className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">{tForm('iconLabel')}</span>
              <IconSelector value={icon} onChange={setIcon} />
            </div>

            <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
              <DrawerClose asChild>
                <button
                  type="button"
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {t('classification.cancel')}
                </button>
              </DrawerClose>
              <button
                type="submit"
                disabled={drawerSubmitting}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white dark:text-black  transition hover:bg-secondary/80 disabled:opacity-60"
              >
                {drawerSubmitting ? (
                  t('classification.saving')
                ) : editingCategory ? (
                  <>
                    <Check size={16} />
                    {tForm('updateButton')}
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    {tForm('addButton')}
                  </>
                )}
              </button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      <DeleteConfirmModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => {
          void handleConfirmDeleteCategory()
        }}
        title={tList('deleteTitle')}
        description={tList('deleteDescription')}
        confirmLabel={tList('deleteConfirm')}
      />
    </section>
  )
}
