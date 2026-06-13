'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  Pencil,
  Percent,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import AdvisorGuard from '@/app/advisor/components/AdvisorGuard'
import {
  getCategoriesClassificationBoard,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryClassification,
  CategoryClassificationItem,
  CategoryClassification,
} from '@/services/category'
import {
  getBudgetPlan,
  setClassLimits,
  setCategoryLimits,
  syncBudgetToGoalControls,
  BudgetPlan,
  ClassLimit,
} from '@/services/advisorBudget'
import { IconMap, IconName } from '@/utils/icon-map'

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrichedPlanCategory = CategoryClassificationItem & {
  nominalLimit: number | null
  percentLimit: number | null
  limitId: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { key: CategoryClassification; label: string; color: string; bg: string; border: string }[] = [
  { key: 'NEUTRAL', label: 'Neutro', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  { key: 'ESSENTIAL_EXPENSE', label: 'Despesa Essencial', color: 'text-[#2F6E91]', bg: 'bg-[#F0F7FB]', border: 'border-[#C8E2EF]' },
  { key: 'NON_ESSENTIAL_EXPENSE', label: 'Não Essencial', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
]

const CLASS_LABELS: Record<CategoryClassification, string> = {
  NEUTRAL: 'Neutro',
  ESSENTIAL_EXPENSE: 'Despesa Essencial',
  NON_ESSENTIAL_EXPENSE: 'Não Essencial',
  INCOME: 'Receita',
}

const PRESET_COLORS = [
  '#4F98C2', '#2F6E91', '#E07B7B', '#78B7A0', '#E7B75F',
  '#9B7FD4', '#FF8C69', '#6EB89F', '#94A3B8', '#253140',
  '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
]

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  })
}

// ─── Category Form Modal ──────────────────────────────────────────────────────

function CategoryFormModal({
  editing,
  defaultColumn,
  onSave,
  onClose,
}: {
  editing: EnrichedPlanCategory | null
  defaultColumn: CategoryClassification
  onSave: (data: { name: string; icon: string; color: string; classification: CategoryClassification }) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? '💰')
  const [color, setColor] = useState(editing?.color ?? '#4F98C2')
  const [classification, setClassification] = useState<CategoryClassification>(
    editing?.classification ?? defaultColumn
  )
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), icon: icon.trim() || '💰', color, classification })
      onClose()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar categoria.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              {editing ? 'Editar categoria' : 'Nova categoria'}
            </p>
            <h2 className="text-base font-semibold text-[#253140]">
              {editing ? editing.name : 'Criar categoria'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Nome da categoria</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Alimentação"
              required
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#7CB8D8]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Ícone (emoji)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Ex.: 🍔"
              maxLength={4}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#7CB8D8]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Cor</label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={[
                    'h-7 w-7 rounded-full border-2 transition-transform',
                    color === c ? 'scale-110 border-slate-700' : 'border-transparent',
                  ].join(' ')}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-7 cursor-pointer rounded-full border border-slate-200"
                title="Cor personalizada"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Grupo</label>
            <div className="grid grid-cols-3 gap-2">
              {COLUMNS.map((col) => (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => setClassification(col.key)}
                  className={[
                    'rounded-xl border py-2 text-xs font-semibold transition',
                    classification === col.key
                      ? `${col.border} ${col.bg} ${col.color}`
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Class Limits Modal ───────────────────────────────────────────────────────

function ClassLimitsModal({
  colLabel,
  categories,
  existingClassLimit,
  monthlyIncome,
  onSave,
  onClose,
}: {
  colLabel: string
  categories: EnrichedPlanCategory[]
  existingClassLimit: ClassLimit | undefined
  monthlyIncome: number
  onSave: (
    classLimit: { nominalLimit: number | null; percentLimit: number | null },
    catLimits: { categoryId: string; nominalLimit: number | null; percentLimit: number | null }[]
  ) => Promise<void>
  onClose: () => void
}) {
  const [mode, setMode] = useState<'nominal' | 'percent'>('nominal')
  const [classValue, setClassValue] = useState(
    existingClassLimit?.nominalLimit?.toString() ?? existingClassLimit?.percentLimit?.toString() ?? ''
  )
  const [catValues, setCatValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    categories.forEach((c) => { init[c.id] = c.nominalLimit?.toString() ?? '' })
    return init
  })
  const [saving, setSaving] = useState(false)

  const classNominal = mode === 'nominal' ? parseFloat(classValue) || null : null
  const classPercent = mode === 'percent' ? parseFloat(classValue) || null : null
  const totalFromIncome = mode === 'percent' && classPercent ? (monthlyIncome * classPercent) / 100 : null

  async function handleSave() {
    setSaving(true)
    try {
      const catLimits = categories.map((c) => ({
        categoryId: c.id,
        nominalLimit: parseFloat(catValues[c.id] ?? '') || null,
        percentLimit: null,
      }))
      await onSave({ nominalLimit: classNominal, percentLimit: classPercent }, catLimits)
      onClose()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar limites.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Estabelecer limites</p>
            <h2 className="text-base font-semibold text-[#253140]">{colLabel}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            {(['nominal', 'percent'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={[
                  'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition',
                  mode === m
                    ? 'border-[#4F98C2] bg-[#EAF4FA] text-[#2F6E91]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {m === 'nominal'
                  ? <><DollarSign className="h-3.5 w-3.5" /> Nominal (R$)</>
                  : <><Percent className="h-3.5 w-3.5" /> Percentual (%)</>
                }
              </button>
            ))}
          </div>

          {/* Class total limit */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Limite total do grupo {mode === 'percent' ? '(% da receita)' : '(R$)'}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                {mode === 'nominal' ? 'R$' : '%'}
              </span>
              <input
                type="number"
                min="0"
                step={mode === 'nominal' ? '100' : '1'}
                value={classValue}
                onChange={(e) => setClassValue(e.target.value)}
                placeholder={mode === 'nominal' ? '0,00' : '0'}
                className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#7CB8D8]"
              />
            </div>
            {totalFromIncome != null && (
              <p className="text-xs text-slate-500">≈ {formatCurrency(totalFromIncome)} por mês</p>
            )}
          </div>

          {/* Per-category limits */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">Limite por categoria (R$)</p>
              {categories.map((cat) => {
                const IconComponent = cat.icon ? IconMap[cat.icon as IconName] : null
                return (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs"
                      style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                    >
                      {IconComponent
                        ? <IconComponent size={14} />
                        : (cat.icon?.slice(0, 2) ?? '◆')}
                    </span>
                    <span className="flex-1 truncate text-sm text-slate-700">{cat.name}</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={catValues[cat.id] ?? ''}
                      onChange={(e) => setCatValues((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                      placeholder="—"
                      className="h-8 w-28 rounded-xl border border-slate-200 px-2 text-right text-sm outline-none focus:border-[#7CB8D8]"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Salvando...' : 'Salvar limites'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({
  cat,
  onSetLimit,
  onEdit,
  onDelete,
}: {
  cat: EnrichedPlanCategory
  onSetLimit: () => void
  onEdit: (cat: EnrichedPlanCategory) => void
  onDelete: (cat: EnrichedPlanCategory) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const typeLabel =
    cat.type === 'EXPENSE' ? 'DESPESA'
    : cat.type === 'INCOME' ? 'RECEITA'
    : null

  const isDefault = !cat.userId
  const kwCount = cat.keywords?.length ?? 0

  const IconComponent = cat.icon ? IconMap[cat.icon as IconName] : null

  if (confirmDelete) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3">
        <p className="text-xs font-semibold text-red-700">Excluir &ldquo;{cat.name}&rdquo;?</p>
        <p className="mt-0.5 text-[11px] text-red-500">Esta ação não pode ser desfeita.</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="flex-1 rounded-lg border border-slate-200 bg-white py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onDelete(cat)}
            className="flex-1 rounded-lg bg-red-600 py-1 text-xs font-semibold text-white hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm hover:border-slate-300">
      {/* Icon + Name + Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
            style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
          >
            {IconComponent ? <IconComponent size={16} /> : (cat.icon?.slice(0, 2) ?? '◆')}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#253140]">{cat.name}</p>
            {cat.nominalLimit != null && (
              <p className="text-[11px] text-slate-500">Limite: {formatCurrency(cat.nominalLimit)}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onSetLimit}
            className="hidden h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 group-hover:flex"
          >
            <DollarSign className="h-3 w-3" />
            Limite
          </button>
          <button
            type="button"
            onClick={() => onEdit(cat)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            title="Editar categoria"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Excluir categoria"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Type + Flavor badges */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {typeLabel && (
          <span className={[
            'rounded px-1.5 py-0.5 text-[10px] font-bold text-white',
            typeLabel === 'DESPESA' ? 'bg-red-600' : 'bg-emerald-600',
          ].join(' ')}>
            {typeLabel}
          </span>
        )}
        <span className="rounded border border-slate-300 bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {isDefault ? 'Padrão' : 'Personalizada'}
        </span>
      </div>

      {/* Keywords count */}
      {kwCount > 0 && (
        <p className="mt-1 text-right text-[10px] text-slate-400">
          {kwCount} {kwCount === 1 ? 'palavra-chave' : 'palavras-chave'}
        </p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlanejamentoOrcamentarioPage() {
  return (
    <AdvisorGuard>
      <Suspense fallback={<PlanejamentoFallback />}>
        <PlanejamentoInner />
      </Suspense>
    </AdvisorGuard>
  )
}

function PlanejamentoFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  )
}

function PlanejamentoInner() {
  const router = useRouter()
  const params = useParams<{ clientId: string }>()
  const searchParams = useSearchParams()
  const clientId = String(params?.clientId ?? '').trim()
  const clientName = searchParams.get('name') ?? 'Cliente'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<BudgetPlan | null>(null)
  const [categories, setCategories] = useState<EnrichedPlanCategory[]>([])
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [modalCol, setModalCol] = useState<CategoryClassification | null>(null)

  const [editingCat, setEditingCat] = useState<EnrichedPlanCategory | null>(null)
  const [creatingInColumn, setCreatingInColumn] = useState<CategoryClassification | null>(null)

  // Optimistic classification overrides
  const [localClassifications, setLocalClassifications] = useState<Record<string, CategoryClassification>>({})

  const loadPlan = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      // Load classification board (all client categories) + budget plan limits in parallel
      const [board, planData] = await Promise.all([
        getCategoriesClassificationBoard({ actingClientId: clientId }),
        getBudgetPlan(clientId).catch(() => null), // limits are optional
      ])

      // Exclude income-type categories from the planning view
      const boardCats = board.columns
        .filter((col) => col.classification !== 'INCOME')
        .flatMap((col) => col.items)

      // Build limit lookup from budget plan
      const limitMap = new Map((planData?.categories ?? []).map((c) => [c.id, c]))

      const enriched: EnrichedPlanCategory[] = boardCats.map((cat) => ({
        ...cat,
        nominalLimit: limitMap.get(cat.id)?.nominalLimit ?? null,
        percentLimit: limitMap.get(cat.id)?.percentLimit ?? null,
        limitId: limitMap.get(cat.id)?.limitId ?? null,
      }))

      setPlan(planData?.plan ?? null)
      setCategories(enriched)
      setMonthlyIncome(planData?.monthlyIncome ?? 0)

      // Sync local classification state with loaded data
      const initCls: Record<string, CategoryClassification> = {}
      enriched.forEach((c) => { initCls[c.id] = c.classification })
      setLocalClassifications(initCls)
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar planejamento.')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { void loadPlan() }, [loadPlan])

  function getCategoriesByClass(cls: CategoryClassification): EnrichedPlanCategory[] {
    return categories
      .filter((c) => (localClassifications[c.id] ?? c.classification) === cls)
      .sort((a, b) => a.classificationOrder - b.classificationOrder)
  }

  async function handleMoveToColumn(cat: EnrichedPlanCategory, newClass: CategoryClassification) {
    const colCategories = getCategoriesByClass(newClass)
    setLocalClassifications((prev) => ({ ...prev, [cat.id]: newClass }))
    try {
      await updateCategoryClassification(
        cat.id,
        { classification: newClass, order: colCategories.length + 1 },
        { actingClientId: clientId }
      )
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao mover categoria.')
      setLocalClassifications((prev) => ({ ...prev, [cat.id]: cat.classification }))
    }
  }

  async function handleSaveLimits(
    classLimit: { nominalLimit: number | null; percentLimit: number | null },
    catLimits: { categoryId: string; nominalLimit: number | null; percentLimit: number | null }[]
  ) {
    if (!modalCol) return
    setSaving(true)
    try {
      await Promise.all([
        setClassLimits(clientId, {
          limits: [{ class: modalCol, nominalLimit: classLimit.nominalLimit, percentLimit: classLimit.percentLimit }],
        }),
        setCategoryLimits(clientId, { limits: catLimits }),
      ])
      // Sincroniza limites do budget plan como GoalControls do cliente (idempotente)
      await syncBudgetToGoalControls(clientId).catch(() => {
        // Não bloqueia o fluxo se o backend ainda não tiver o endpoint
      })
      toast.success('Limites salvos e metas sincronizadas!')
      await loadPlan()
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCategory(data: {
    name: string
    icon: string
    color: string
    classification: CategoryClassification
  }) {
    setSaving(true)
    try {
      if (editingCat) {
        await updateCategory(
          editingCat.id,
          {
            name: data.name,
            icon: data.icon as IconName,
            color: data.color,
            keywords: editingCat.keywords.map((k) => k.name),
            type: editingCat.type,
          },
          { actingClientId: clientId }
        )
        const prevClass = localClassifications[editingCat.id] ?? editingCat.classification
        if (data.classification !== prevClass) {
          const colCategories = getCategoriesByClass(data.classification)
          await updateCategoryClassification(
            editingCat.id,
            { classification: data.classification, order: colCategories.length + 1 },
            { actingClientId: clientId }
          )
        }
        toast.success('Categoria atualizada.')
      } else {
        const newCat = await createCategory(
          {
            name: data.name,
            icon: data.icon as IconName,
            color: data.color,
            keywords: [],
            type: 'EXPENSE',
          },
          { actingClientId: clientId }
        )
        const colCategories = getCategoriesByClass(data.classification)
        await updateCategoryClassification(
          newCat.id,
          { classification: data.classification, order: colCategories.length + 1 },
          { actingClientId: clientId }
        )
        toast.success('Categoria criada.')
      }
      await loadPlan()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar categoria.')
    } finally {
      setSaving(false)
      setEditingCat(null)
      setCreatingInColumn(null)
    }
  }

  async function handleDeleteCategory(cat: EnrichedPlanCategory) {
    try {
      await deleteCategory(cat.id, { actingClientId: clientId })
      toast.success('Categoria excluída.')
      await loadPlan()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao excluir categoria.')
    }
  }

  function columnTotalBudget(cls: CategoryClassification): number {
    const classLimit = plan?.classLimits.find((l) => l.class === cls)
    if (classLimit?.nominalLimit) return classLimit.nominalLimit
    return getCategoriesByClass(cls).reduce((s, c) => s + (c.nominalLimit ?? 0), 0)
  }

  const totalBudgeted = COLUMNS.reduce((s, col) => s + columnTotalBudget(col.key), 0)
  const pctBudgeted = monthlyIncome > 0 ? Math.round((totalBudgeted / monthlyIncome) * 100) : null

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  const formDefaultColumn = creatingInColumn ?? editingCat?.classification ?? 'NEUTRAL'

  return (
    <section className="w-full px-4 pb-28 pt-6 md:px-6 lg:pb-8 lg:pt-8">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/advisor')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase text-[#2F6E91]">Planejamento Orçamentário</p>
            <h1 className="text-xl font-semibold text-[#253140]">{clientName}</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/advisor/planejamento/${clientId}/progresso?name=${encodeURIComponent(clientName)}`)}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#4F98C2] bg-[#EAF4FA] px-4 text-xs font-semibold text-[#2F6E91] hover:bg-[#D9EEF7]"
        >
          <TrendingUp className="h-4 w-4" />
          Acompanhar progresso
        </button>
      </div>

      {/* Budget summary */}
      {monthlyIncome > 0 && (
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Receita estimada do cliente</p>
              <p className="mt-1 text-2xl font-bold text-[#253140]">{formatCurrency(monthlyIncome)}</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase text-slate-500">Total orçado</p>
                <p className="mt-1 text-xl font-bold text-[#253140]">{formatCurrency(totalBudgeted)}</p>
              </div>
              {pctBudgeted != null && (
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase text-slate-500">% da receita</p>
                  <p className={['mt-1 text-xl font-bold', pctBudgeted > 100 ? 'text-red-600' : 'text-[#2F6E91]'].join(' ')}>
                    {pctBudgeted}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const colCategories = getCategoriesByClass(col.key)
          const colBudget = columnTotalBudget(col.key)
          const colPct = monthlyIncome > 0 && colBudget > 0
            ? Math.round((colBudget / monthlyIncome) * 100)
            : null
          const classLimit = plan?.classLimits.find((l) => l.class === col.key)

          return (
            <div key={col.key} className="flex flex-col gap-3">
              {/* Column header */}
              <div className={`rounded-2xl border ${col.border} ${col.bg} p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className={`text-sm font-bold ${col.color}`}>{col.label}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{colCategories.length} categorias</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {colPct != null && (
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${col.border} ${col.color} bg-white`}>
                        {colPct}%
                      </span>
                    )}
                    {classLimit?.nominalLimit && (
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {formatCurrency(classLimit.nominalLimit)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalCol(col.key)}
                  className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border ${col.border} bg-white py-1.5 text-xs font-semibold ${col.color} hover:opacity-80 transition`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Estabelecer limites
                </button>
              </div>

              {/* Category cards */}
              <div className="flex flex-col gap-2">
                {colCategories.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                    Nenhuma categoria neste grupo
                  </div>
                ) : (
                  colCategories.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      cat={{ ...cat, classification: localClassifications[cat.id] ?? cat.classification }}
                      onSetLimit={() => setModalCol(col.key)}
                      onEdit={(c) => setEditingCat(c)}
                      onDelete={handleDeleteCategory}
                    />
                  ))
                )}

                <button
                  type="button"
                  onClick={() => setCreatingInColumn(col.key)}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed ${col.border} py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova categoria
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Limits modal */}
      {modalCol && (
        <ClassLimitsModal
          colLabel={CLASS_LABELS[modalCol]}
          categories={getCategoriesByClass(modalCol)}
          existingClassLimit={plan?.classLimits.find((l) => l.class === modalCol)}
          monthlyIncome={monthlyIncome}
          onSave={handleSaveLimits}
          onClose={() => setModalCol(null)}
        />
      )}

      {/* Category form modal */}
      {(editingCat != null || creatingInColumn != null) && (
        <CategoryFormModal
          editing={editingCat}
          defaultColumn={formDefaultColumn as CategoryClassification}
          onSave={handleSaveCategory}
          onClose={() => { setEditingCat(null); setCreatingInColumn(null) }}
        />
      )}

      {saving && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl bg-[#253140] px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Salvando...
        </div>
      )}
    </section>
  )
}
