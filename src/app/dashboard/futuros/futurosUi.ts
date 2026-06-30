/**
 * Tokens visuais da aba Futuros — alinhados à aba Transações
 * (rounded-xl, border-gray-200, shadow-sm, tipografia semibold).
 */
export const futurosUi = {
  page: 'min-h-full w-full bg-slate-50 px-4 pb-20 pt-6 dark:bg-background lg:pb-8 lg:px-8 lg:py-8 rounded-xl',
  container: 'mx-auto flex w-full flex-col gap-5 lg:gap-6',

  surface: 'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-800',
  surfaceFlat: 'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-800',
  surfacePadding: 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-800 sm:p-5',
  surfaceDashed: 'rounded-xl border border-dashed border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-800',

  listScroll: 'max-h-[min(28rem,52vh)] overflow-y-auto overscroll-contain',
  listScrollSm: 'max-h-[min(16rem,36vh)] overflow-y-auto overscroll-contain',
  forecastScroll: 'max-h-[min(42rem,70vh)] space-y-4 overflow-y-auto overscroll-contain pr-0.5',

  chipScroll:
    'flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5',

  pillActive:
    'h-9 shrink-0 rounded-full border border-primary bg-primary px-4 text-sm font-semibold text-white shadow-sm',
  pillIdle:
    'h-9 shrink-0 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white',

  btnPrimary:
    'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-50',
  btnOutline:
    'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-slate-700 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-slate-600',

  modalBackdrop: 'fixed inset-0 bg-gray-900/60 dark:bg-slate-950/70',
  modalShell: 'fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4',
  modalPanel:
    'flex max-h-[min(92vh,52rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-800 sm:max-w-5xl sm:rounded-xl',
  modalPanelLg:
    'flex max-h-[min(92vh,52rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-800 sm:max-w-4xl sm:rounded-xl',
  modalHeader:
    'flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-4 py-4 dark:border-white/5 sm:px-6',
  modalBody: 'min-h-0 flex-1 overflow-y-auto overscroll-contain',
  modalFooter: 'shrink-0 border-t border-gray-100 px-4 py-4 dark:border-white/5 sm:px-6',

  input:
    'h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-white/10 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400',
  select:
    'h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-white/10 dark:bg-slate-700 dark:text-slate-200',

  tableHead:
    'hidden border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-white/5 dark:bg-slate-700/50 dark:text-slate-400 md:grid',

  sectionTitle: 'text-sm font-semibold text-gray-900 dark:text-white',
  sectionSubtitle: 'mt-0.5 text-xs font-medium text-gray-500 dark:text-slate-400',

  menuItems:
    'absolute right-0 z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1 text-sm shadow-lg outline-none dark:border-white/10 dark:bg-slate-700',
  menuItem:
    'w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300 dark:text-slate-200 dark:disabled:text-slate-500',
  menuItemFocus: 'bg-gray-50 text-gray-900 dark:bg-slate-600 dark:text-white',
  menuItemDanger: 'text-red-600 dark:text-red-400',
  menuItemDangerFocus: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
} as const

export function futurosPillClass(active: boolean) {
  return active ? futurosUi.pillActive : futurosUi.pillIdle
}
