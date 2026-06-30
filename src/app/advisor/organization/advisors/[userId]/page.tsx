'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Mail, Phone, Users } from 'lucide-react'
import { toast } from 'sonner'

import AdvisorGuard from '@/app/advisor/components/AdvisorGuard'
import { getOrgAdvisorClients, getOrgAdvisors, OrgAdvisorClient } from '@/services/advisor'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'CL'
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export default function OrgAdvisorCarteiraPage() {
  return (
    <AdvisorGuard>
      <Suspense fallback={<OrgAdvisorCarteiraFallback />}>
        <OrgAdvisorCarteiraInner />
      </Suspense>
    </AdvisorGuard>
  )
}

function OrgAdvisorCarteiraFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  )
}

function OrgAdvisorCarteiraInner() {
  const router = useRouter()
  const params = useParams<{ userId: string }>()
  const searchParams = useSearchParams()
  const advisorUserId = String(params?.userId ?? '').trim()

  const [clients, setClients] = useState<OrgAdvisorClient[]>([])
  const [advisorName, setAdvisorName] = useState(searchParams.get('name') ?? '')
  const [advisorEmail, setAdvisorEmail] = useState(searchParams.get('email') ?? '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!advisorUserId) return
    void loadData()
  }, [advisorUserId])

  async function loadData() {
    // Load advisor name and clients independently so one failure doesn't block the other
    const namePromise = getOrgAdvisors().then((advisors) => {
      const found = advisors.find((a) => a.userId === advisorUserId)
      if (found) {
        setAdvisorName(found.name)
        setAdvisorEmail(found.email)
      }
    }).catch(() => null)

    const clientsPromise = getOrgAdvisorClients(advisorUserId).then((data) => {
      setClients(data)
    }).catch((err: any) => {
      toast.error(err?.message || 'Erro ao carregar clientes do advisor.')
    })

    await Promise.allSettled([namePromise, clientsPromise])
    setLoading(false)
  }

  return (
    <section className="w-full px-4 pb-28 pt-6 md:px-6 lg:px-8 lg:pt-8 lg:pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/advisor/organization')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase text-[#2F6E91]">Carteira do Advisor</p>
          <h1 className="text-xl font-semibold text-[#253140]">
            {advisorName || 'Carregando…'}
          </h1>
          {advisorEmail && (
            <p className="text-sm text-slate-500">{advisorEmail}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7FB]">
            <Users className="h-5 w-5 text-[#2F6E91]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Clientes ativos</p>
            <p className="text-2xl font-bold text-[#253140]">{loading ? '—' : clients.length}</p>
          </div>
        </div>
      </div>

      {/* Client list */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-[#253140]">Clientes vinculados</h2>
          <p className="mt-0.5 text-sm text-slate-500">Carteira atual do advisor — somente leitura.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Este advisor ainda não possui clientes vinculados.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Contato</th>
                    <th className="px-5 py-3 font-semibold">Permissão</th>
                    <th className="px-5 py-3 font-semibold">Vinculado em</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-slate-100 align-middle hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#253140] text-xs font-semibold text-white">
                            {initials(client.name)}
                          </div>
                          <p className="font-semibold text-[#253140]">{client.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="h-3.5 w-3.5" />
                            {client.email}
                          </div>
                          {client.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Phone className="h-3.5 w-3.5" />
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={[
                          'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                          client.permission === 'READ_ONLY'
                            ? 'border-slate-200 bg-slate-50 text-slate-600'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                        ].join(' ')}>
                          {client.permission === 'READ_ONLY' ? 'Somente leitura' : 'Leitura e escrita'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(client.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 p-4 md:hidden">
              {clients.map((client) => (
                <article key={client.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#253140] text-xs font-semibold text-white">
                      {initials(client.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-[#253140]">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Vinculado em {formatDate(client.createdAt)}</span>
                    <span className={[
                      'rounded-full border px-2 py-0.5 font-semibold',
                      client.permission === 'READ_ONLY'
                        ? 'border-slate-200 bg-slate-50 text-slate-600'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                    ].join(' ')}>
                      {client.permission === 'READ_ONLY' ? 'Leitura' : 'Leitura e escrita'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
