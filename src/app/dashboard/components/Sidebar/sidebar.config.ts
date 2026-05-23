'use client'

import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  Clock3,
  House,
  Landmark,
  LayoutDashboard,
  ShieldCheck,
  Tag,
  User,
  Users,
} from 'lucide-react'

import { FEATURES, type FeatureFlag } from '@/config/features'

export const DESKTOP_SIDEBAR_EXPANDED_OFFSET_CLASS = 'lg:pl-[20rem]'
export const DESKTOP_SIDEBAR_COLLAPSED_OFFSET_CLASS = 'lg:pl-[7rem]'

export type SidebarItemConfig = {
  id: string
  label: string
  icon: LucideIcon
  path?: string
  disabled?: boolean
  disabledReason?: string
  featureFlag?: FeatureFlag
  requiresAdmin?: boolean
  requiresAdvisor?: boolean
}

export type SidebarSectionConfig = {
  id: string
  title: string
  icon: LucideIcon
  collapsible: boolean
  defaultOpen: boolean
  autoCollapsePriority?: number
  items: SidebarItemConfig[]
}

type SidebarTranslations = {
  dashboard: string
  transactions: string
  accounts: string
  categories: string
  future: string
  reports: string
  coupleAccount: string
  education: string
  clients: string
  profile: string
  admin: string
}

export function normalizeSidebarPath(pathname: string) {
  return pathname.replace(/\/+$/, '')
}

export function isSidebarPathActive(pathname: string, itemPath?: string) {
  if (!itemPath) return false

  const current = normalizeSidebarPath(pathname || '')
  const base = normalizeSidebarPath(itemPath)

  if (base === '/dashboard') {
    return current === '/dashboard' || current.startsWith('/dashboard/controles')
  }

  if (base === '/admin/dashboard') {
    return current.startsWith('/admin')
  }

  if (base === '/advisor') {
    return current.startsWith('/advisor')
  }

  return current === base || current.startsWith(`${base}/`)
}

export function buildSidebarSections(t: SidebarTranslations): SidebarSectionConfig[] {
  return [
    {
      id: 'overview',
      title: 'Visão Geral',
      icon: LayoutDashboard,
      collapsible: true,
      defaultOpen: true,
      autoCollapsePriority: 99,
      items: [
        {
          id: 'dashboard',
          label: t.dashboard,
          icon: LayoutDashboard,
          path: '/dashboard',
        },
      ],
    },
    {
      id: 'financial',
      title: 'Financeiro',
      icon: Landmark,
      collapsible: true,
      defaultOpen: true,
      autoCollapsePriority: 98,
      items: [
        {
          id: 'transactions',
          label: t.transactions,
          icon: Landmark,
          path: '/dashboard/transacoes',
        },
        {
          id: 'accounts',
          label: t.accounts,
          icon: ClipboardList,
          path: '/dashboard/contas-fixas',
        },
        {
          id: 'categories',
          label: t.categories,
          icon: Tag,
          path: '/dashboard/categorias',
        },
      ],
    },
    {
      id: 'planning',
      title: 'Planejamento',
      icon: BarChart3,
      collapsible: true,
      defaultOpen: true,
      autoCollapsePriority: 90,
      items: [
        {
          id: 'future',
          label: t.future,
          icon: Clock3,
          path: '/dashboard/futuros',
          disabled: true,
          disabledReason: 'Em revisao',
        },
        {
          id: 'reports',
          label: t.reports,
          icon: BarChart3,
          path: '/dashboard/relatorios',
          featureFlag: 'REPORTS_V1',
        },
      ],
    },
    {
      id: 'financial-life',
      title: 'Vida Financeira',
      icon: House,
      collapsible: true,
      defaultOpen: false,
      autoCollapsePriority: 30,
      items: [
        {
          id: 'coupleAccount',
          label: t.coupleAccount,
          icon: House,
          path: '/dashboard/conta-casal',
          featureFlag: 'COUPLE_ACCOUNT',
        },
      ],
    },
    {
      id: 'education',
      title: 'Educação',
      icon: BookOpenCheck,
      collapsible: true,
      defaultOpen: false,
      autoCollapsePriority: 25,
      items: [
        {
          id: 'education-item',
          label: t.education,
          icon: BookOpenCheck,
          path: '/dashboard/educacao',
          featureFlag: 'EDUCATION',
        },
      ],
    },
    {
      id: 'professional',
      title: 'Profissional',
      icon: Users,
      collapsible: true,
      defaultOpen: false,
      autoCollapsePriority: 20,
      items: [
        {
          id: 'clients',
          label: 'Advisor',
          icon: Users,
          path: '/advisor',
          requiresAdvisor: true,
        },
      ],
    },
    {
      id: 'settings',
      title: 'Configurações',
      icon: User,
      collapsible: true,
      defaultOpen: true,
      autoCollapsePriority: 10,
      items: [
        {
          id: 'profile',
          label: t.profile,
          icon: User,
          path: '/dashboard/perfil',
        },
      ],
    },
    {
      id: 'admin',
      title: 'Admin',
      icon: ShieldCheck,
      collapsible: true,
      defaultOpen: true,
      autoCollapsePriority: 5,
      items: [
        {
          id: 'admin',
          label: t.admin,
          icon: ShieldCheck,
          path: '/admin/dashboard',
          requiresAdmin: true,
        },
      ],
    },
  ]
}

export function filterSidebarSections(
  sections: SidebarSectionConfig[],
  permissions: {
    isAdmin: boolean
    canAccessAdvisor: boolean
  }
) {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.featureFlag && !FEATURES[item.featureFlag]) return false
        if (item.requiresAdmin && !permissions.isAdmin) return false
        if (item.requiresAdvisor && !permissions.canAccessAdvisor) return false
        return true
      }),
    }))
    .filter((section) => section.items.length > 0)
}
