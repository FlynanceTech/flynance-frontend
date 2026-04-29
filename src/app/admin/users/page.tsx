'use client'

import { useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Switch } from '@/components/ui/switch'
import { useAdminUsers, useUpdateAdminUserTester } from '@/hooks/query/useAdmin'
import type { AdminUser } from '@/services/admin'

type TranslatorFn = (key: string, values?: Record<string, string | number | Date>) => string

function formatDate(value: string | null | undefined, locale: string, t: TranslatorFn) {
  if (!value) return t('common.empty')
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return t('common.empty')
  return `${parsed.toLocaleDateString(locale)} ${parsed.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function filterUsers(users: AdminUser[], search: string) {
  const normalizedSearch = search.trim().toLowerCase()
  if (!normalizedSearch) return users

  return users.filter((user) => {
    const haystack = [user.name, user.email, user.phone ?? '', user.role ?? '', user.id]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedSearch)
  })
}

export default function AdminUsersPage() {
  const t = useTranslations('adminUsersPage')
  const locale = useLocale()
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const usersQuery = useAdminUsers()
  const updateTesterMutation = useUpdateAdminUserTester()

  const filteredUsers = useMemo(
    () => filterUsers(usersQuery.data ?? [], appliedSearch),
    [usersQuery.data, appliedSearch]
  )

  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleTesterChange = async (user: AdminUser, isTester: boolean) => {
    setPendingUserId(user.id)

    try {
      await updateTesterMutation.mutateAsync({ userId: user.id, isTester })
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF4FA] px-3 py-1 text-xs font-semibold text-[#17557A]">
              <ShieldCheck size={14} />
              {t('hero.badge')}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#333C4D]">{t('hero.title')}</h3>
              <p className="mt-1 text-sm text-slate-500">{t('hero.description')}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <label className="flex flex-1 flex-col gap-1 text-sm sm:min-w-80">
              <span className="text-slate-600">{t('filters.searchLabel')}</span>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t('filters.searchPlaceholder')}
                className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
              />
            </label>

            <div className="flex gap-2 sm:self-end">
              <button
                type="button"
                onClick={() => {
                  setAppliedSearch(searchInput.trim())
                  setPage(1)
                }}
                className="h-10 rounded-xl bg-[#4F98C2] px-4 text-sm font-semibold text-white hover:bg-[#3f86b0]"
              >
                {t('filters.apply')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  setAppliedSearch('')
                  setPage(1)
                }}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
              >
                {t('filters.clear')}
              </button>
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-[#333C4D]">{t('list.title')}</h3>
          <p className="text-xs text-slate-500">
            {t('list.summary', { total: filteredUsers.length, testers: filteredUsers.filter((user) => user.isTester).length })}
          </p>
        </div>

        {usersQuery.isLoading ? (
          <div className="mt-4 h-56 animate-pulse rounded-xl bg-slate-100" />
        ) : usersQuery.isError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {usersQuery.error instanceof Error ? usersQuery.error.message : t('states.loadError')}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            {appliedSearch ? t('states.emptyFiltered') : t('states.empty')}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">{t('table.user')}</th>
                  <th className="pb-2 font-medium">{t('table.email')}</th>
                  <th className="pb-2 font-medium">{t('table.role')}</th>
                  <th className="pb-2 font-medium">{t('table.tester')}</th>
                  <th className="pb-2 font-medium">{t('table.devAccess')}</th>
                  <th className="pb-2 font-medium">{t('table.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const isPending = pendingUserId === user.id && updateTesterMutation.isPending

                  return (
                    <tr key={user.id} className="border-b border-slate-100 align-top">
                      <td className="py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-[#333C4D]">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.phone || user.id}</p>
                        </div>
                      </td>
                      <td className="py-3">{user.email || t('common.empty')}</td>
                      <td className="py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {user.role || t('common.empty')}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={[
                            'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                            user.isTester
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-700',
                          ].join(' ')}
                        >
                          {user.isTester ? t('table.testerEnabled') : t('table.testerDisabled')}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex min-w-[220px] items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-[#333C4D]">{t('table.devAccessToggle')}</p>
                            <p className="text-xs text-slate-500">
                              {user.isTester ? t('table.devAccessOn') : t('table.devAccessOff')}
                            </p>
                            {isPending && (
                              <p className="text-[11px] text-slate-400">{t('table.updating')}</p>
                            )}
                          </div>

                          <Switch
                            checked={user.isTester}
                            disabled={isPending || updateTesterMutation.isPending}
                            aria-label={t('table.toggleAria', { name: user.name })}
                            onCheckedChange={(checked) => {
                              void handleTesterChange(user, checked)
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3">{formatDate(user.createdAt, locale, t)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {t('pagination.pageOf', { page: currentPage, totalPages })}
            {` · ${t('pagination.total', { total: filteredUsers.length })}`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
            >
              {t('pagination.previous')}
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
            >
              {t('pagination.next')}
            </button>
          </div>
        </div>
      </article>
    </section>
  )
}
