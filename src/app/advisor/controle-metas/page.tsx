'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Target, TrendingUp, Users } from 'lucide-react'
import { toast } from 'sonner'

import AdvisorGuard from '@/app/advisor/components/AdvisorGuard'
import { getAdvisorClients } from '@/services/advisor'
import type { AdvisorClient } from '@/services/advisor'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'CL'
}

export default function ControleMatasAdvisorPage() {
  return (
    <AdvisorGuard>
      <ControleMatasIndex />
    </AdvisorGuard>
  )
}

function ControleMatasIndex() {
  const router = useRouter()
  const [clients, setClients] = useState<AdvisorClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getAdvisorClients()
      .then((res) => setClients(res.clients))
      .catch((err: any) => toast.error(err?.message ?? 'Erro ao carregar clientes.'))
      .finally(() => setLoading(false))
  }, [])

  const activeClients = clients.filter((c) => c.status === 'ACTIVE')
  const filtered = activeClients.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  function goToProgress(client: AdvisorClient) {
    router.push(
      `/advisor/planejamento/${encodeURIComponent(client.clientUserId)}/progresso?name=${encodeURIComponent(client.name)}`
    )
  }

  return (
    <section className="w-full px-4 pb-28 pt-6 md:px-6 lg:pb-8 lg:pt-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7FB] text-[#2F6E91]">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-[#2F6E91]">Fly Advisory</p>
            <h1 className="text-xl font-semibold text-[#253140]">Controle de Metas</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Acompanhe o progresso das metas de cada cliente em relação ao planejamento definido.
        </p>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nome ou e-mail"
          className="h-10 w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#7CB8D8] focus:bg-white"
        />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16">
          <Users className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">Nenhum cliente ativo encontrado</p>
          <p className="mt-1 text-xs text-slate-400">
            Clientes com convite pendente ou revogado não aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => goToProgress(client)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#4F98C2] hover:shadow-md transition"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#253140] text-xs font-semibold text-white">
                {initials(client.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[#253140]">{client.name}</p>
                <p className="truncate text-xs text-slate-500">{client.email}</p>
              </div>
              <TrendingUp className="ml-auto h-4 w-4 shrink-0 text-[#4F98C2]" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
