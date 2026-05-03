'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { LogOut, PanelLeftClose, PanelLeftOpen, Moon, Sun } from 'lucide-react'

import logoFlynance from '../../../../../assets/Logo/PNG/Logo Fly principal colorida.png'
import logoFlynanceWhite from '../../../../../assets/Logo/PNG/Logo Fly principal branca.png'
import logoBird from '../../../../../assets/Logo/PNG/Logo Fly colorida 1.png'
import logoBirdWhite from '../../../../../assets/Logo/PNG/Logo Fly branca 1.png'
import { useUserSession } from '@/stores/useUserSession'
import { canAccessAdvisorRole, isAdminRole } from '@/utils/roles'
import { useTranslations } from 'next-intl'
import { useUserTheme } from '@/providers/UserThemeProvider'

import SidebarSection from './SidebarSection'
import {
  buildSidebarSections,
  filterSidebarSections,
  isSidebarPathActive,
} from './sidebar.config'

const MAX_OPEN_SECTIONS = 3

type SidebarProps = {
  collapsed?: boolean
  onCollapsedChange?: (next: boolean) => void
}

function buildAutoCollapsedSet(params: {
  height: number
  activeSectionIds: Set<string>
}) {
  const forcedCollapsed = new Set<string>()
  const { height, activeSectionIds } = params

  const thresholds: Array<{ id: string; maxHeight: number }> = [
    { id: 'settings', maxHeight: 920 },
    { id: 'professional', maxHeight: 880 },
    { id: 'education', maxHeight: 840 },
    { id: 'financial-life', maxHeight: 800 },
    { id: 'planning', maxHeight: 740 },
  ]

  thresholds.forEach(({ id, maxHeight }) => {
    if (height < maxHeight && !activeSectionIds.has(id)) {
      forcedCollapsed.add(id)
    }
  })

  return forcedCollapsed
}

export default function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tPreferences = useTranslations('preferences')
  const { logout, user } = useUserSession()
  const { theme, saveTheme, isSavingTheme } = useUserTheme()

  const role = user?.userData?.user?.role
  const isAdmin = isAdminRole(role)
  const canAccessAdvisor = canAccessAdvisorRole(role)
  const isDarkTheme = theme === 'DARK'

  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(1080)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [sectionOpenOrder, setSectionOpenOrder] = useState<string[]>([])
  const sectionsCollapsed = collapsed ?? internalCollapsed

  const setSectionsCollapsed = (next: boolean | ((current: boolean) => boolean)) => {
    const resolvedValue =
      typeof next === 'function' ? next(sectionsCollapsed) : next

    if (onCollapsedChange) onCollapsedChange(resolvedValue)
    else setInternalCollapsed(resolvedValue)
  }

  const sections = useMemo(() => {
    return filterSidebarSections(buildSidebarSections({
      dashboard: t('dashboard'),
      transactions: t('transactions'),
      accounts: t('accounts'),
      categories: t('categories'),
      future: t('future'),
      reports: t('reports'),
      coupleAccount: t('coupleAccount'),
      education: t('education'),
      clients: t('clients'),
      profile: t('profile'),
      notifications: t('notifications'),
      admin: t('admin'),
    }), {
      isAdmin,
      canAccessAdvisor,
    })
  }, [canAccessAdvisor, isAdmin, t])

  const activeSectionIds = useMemo(() => {
    return new Set(
      sections
        .filter((section) =>
          section.items.some((item) => isSidebarPathActive(pathname ?? '', item.path))
        )
        .map((section) => section.id)
    )
  }, [pathname, sections])

  const forcedCollapsedSections = useMemo(() => {
    return buildAutoCollapsedSet({
      height: viewportHeight,
      activeSectionIds,
    })
  }, [activeSectionIds, viewportHeight])

  useEffect(() => {
    const defaultOpenIds = sections
      .filter((section) => section.defaultOpen || activeSectionIds.has(section.id))
      .map((section) => section.id)

    const nextOpenIds = defaultOpenIds.reduce<string[]>((acc, id) => {
      if (!acc.includes(id)) acc.push(id)
      return acc
    }, [])

    while (nextOpenIds.length > MAX_OPEN_SECTIONS) {
      const removableIndex = nextOpenIds.findIndex((id) => !activeSectionIds.has(id))
      if (removableIndex === -1) break
      nextOpenIds.splice(removableIndex, 1)
    }

    const nextState = sections.reduce<Record<string, boolean>>((acc, section) => {
      acc[section.id] = nextOpenIds.includes(section.id)
      return acc
    }, {})

    setOpenSections(nextState)
    setSectionOpenOrder(nextOpenIds)
  }, [activeSectionIds, sections])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncViewportHeight = () => setViewportHeight(window.innerHeight)

    syncViewportHeight()
    window.addEventListener('resize', syncViewportHeight)
    return () => window.removeEventListener('resize', syncViewportHeight)
  }, [])

  const openSectionWithLimit = (sectionId: string) => {
    setOpenSections((current) => {
      const currentOpenIds = Object.entries(current)
        .filter(([, isOpen]) => isOpen)
        .map(([id]) => id)

      const nextOrderBase = sectionOpenOrder.filter(
        (id) => currentOpenIds.includes(id) && id !== sectionId
      )
      const nextOrder = [...nextOrderBase, sectionId]
      const nextState = { ...current, [sectionId]: true }

      while (nextOrder.length > MAX_OPEN_SECTIONS) {
        const closableId = nextOrder.find((id) => !activeSectionIds.has(id) && id !== sectionId)
        if (!closableId) break
        nextState[closableId] = false
        nextOrder.splice(nextOrder.indexOf(closableId), 1)
      }

      setSectionOpenOrder(nextOrder)
      return nextState
    })
  }

  const handleToggleSection = (sectionId: string) => {
    const isActiveSection = activeSectionIds.has(sectionId)

    setOpenSections((current) => {
      const isCurrentlyOpen = current[sectionId] !== false

      if (isCurrentlyOpen) {
        if (isActiveSection) return current

        setSectionOpenOrder((order) => order.filter((id) => id !== sectionId))
        return {
          ...current,
          [sectionId]: false,
        }
      }

      const currentOpenIds = Object.entries(current)
        .filter(([, isOpen]) => isOpen)
        .map(([id]) => id)

      const nextOrderBase = sectionOpenOrder.filter((id) => currentOpenIds.includes(id) && id !== sectionId)
      const nextOrder = [...nextOrderBase, sectionId]
      const nextState = { ...current, [sectionId]: true }

      while (nextOrder.length > MAX_OPEN_SECTIONS) {
        const closableId = nextOrder.find((id) => !activeSectionIds.has(id))
        if (!closableId) break
        nextState[closableId] = false
        nextOrder.splice(nextOrder.indexOf(closableId), 1)
      }

      setSectionOpenOrder(nextOrder)
      return nextState
    })
  }

  const handleCollapsedSectionClick = (sectionId: string) => {
    setSectionsCollapsed(false)
    openSectionWithLimit(sectionId)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleThemeToggle = async () => {
    if (isSavingTheme) return
    try {
      await saveTheme(isDarkTheme ? 'LIGHT' : 'DARK')
    } catch {
      // feedback tratado na camada de preferencia
    }
  }

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 hidden h-screen p-4 transition-[width] duration-200 lg:block',
        sectionsCollapsed ? 'w-[7rem]' : 'w-72'
      )}
    >
      <div
        className={clsx(
          'flex h-full flex-col overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white py-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] transition-[padding] duration-200 dark:border-white/10 dark:bg-[#121212]',
          sectionsCollapsed ? 'px-3' : 'px-4'
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <Image
            src={sectionsCollapsed ? (isDarkTheme ? logoBirdWhite : logoBird) : (isDarkTheme ? logoFlynanceWhite : logoFlynance)}
            className={clsx('h-auto transition-all', sectionsCollapsed ? 'w-10' : 'w-[136px]')}
            alt="Flynance Logo"
            width={sectionsCollapsed ? 40 : 136}
            height={sectionsCollapsed ? 40 : 42}
          />

          <button
            type="button"
            onClick={() => setSectionsCollapsed((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
            title={t('toggleMenu')}
            aria-label={t('toggleMenu')}
          >
            {sectionsCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-between pt-4">
          <nav className="min-h-0 flex-1 overflow-hidden">
            <div className="space-y-4">
              {sections.map((section) => {
                const isOpen =
                  !sectionsCollapsed &&
                  !forcedCollapsedSections.has(section.id) &&
                  openSections[section.id] !== false
                const isSectionActive = activeSectionIds.has(section.id)

                return (
                  <SidebarSection
                    key={section.id}
                    title={section.title}
                    icon={section.icon}
                    collapsible={section.collapsible}
                    open={isOpen}
                    collapsed={sectionsCollapsed}
                    active={isSectionActive}
                    onToggle={section.collapsible ? () => handleToggleSection(section.id) : undefined}
                    onCollapsedClick={() => handleCollapsedSectionClick(section.id)}
                    items={section.items.map((item) => ({
                      ...item,
                      active: isSidebarPathActive(pathname ?? '', item.path),
                      onClick: () => {
                        if (!item.path) return
                        router.push(item.path)
                      },
                    }))}
                  />
                )
              })}
            </div>
          </nav>

          <footer className="mt-4 shrink-0 border-t border-slate-200 pt-4 dark:border-white/10">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  void handleThemeToggle()
                }}
                disabled={isSavingTheme}
                className={clsx(
                  'flex w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-[#333C4D] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
                  sectionsCollapsed ? 'items-center justify-center' : 'items-center justify-between'
                )}
                aria-label={tPreferences('theme.title')}
                title={tPreferences('theme.title')}
              >
                <div className="flex items-center gap-2">
                  <Sun size={16} className={clsx(isDarkTheme ? 'text-zinc-500' : 'text-amber-500')} />
                  {!sectionsCollapsed ? (
                    <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-zinc-700">
                      <span
                        className={clsx(
                          'absolute h-5 w-5 rounded-full shadow transition-transform duration-200',
                          isDarkTheme ? 'translate-x-5 bg-[#F4C542]' : 'translate-x-0.5 bg-[#111827]'
                        )}
                      />
                    </span>
                  ) : null}
                  <Moon size={16} className={clsx(isDarkTheme ? 'text-[#F4C542]' : 'text-slate-400')} />
                </div>
                {!sectionsCollapsed ? (
                  <span className="text-xs font-semibold">
                    {isDarkTheme ? tPreferences('theme.dark') : tPreferences('theme.light')}
                  </span>
                ) : null}
              </button>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    void handleLogout()
                  }}
                  className={clsx(
                    'flex items-center justify-center gap-2 rounded-xl text-sm text-[#333C4D] transition hover:bg-red-50 hover:text-red-500 dark:text-white dark:hover:bg-red-500/10 dark:hover:text-red-400',
                    sectionsCollapsed ? 'h-11 w-11' : 'px-4 py-2'
                  )}
                  aria-label={t('logout')}
                  title={t('logout')}
                >
                  <LogOut size={18} />
                  {!sectionsCollapsed ? <span className="font-medium">{t('logout')}</span> : null}
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </aside>
  )
}
