'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  acceptAdvisorClientInvite,
  acceptAdvisorClientConnection,
  AdvisorClientInvitesParams,
  AcceptAdvisorConnectionPayload,
  AdvisorClientsParams,
  CreateAdvisorClientInvitePayload,
  createAdvisorClientInvite,
  getAdvisorClientInvites,
  getAdvisorClients,
  revokeAdvisorClientInvite,
  revokeAdvisorClientLink,
} from '@/services/advisor'

const advisorKeys = {
  clients: (params?: AdvisorClientsParams) => ['advisor', 'clients', params ?? {}] as const,
  invites: (params?: AdvisorClientInvitesParams) => ['advisor', 'clients', 'invites', params ?? {}] as const,
}

export function useAdvisorClients(params?: AdvisorClientsParams) {
  return useQuery({
    queryKey: advisorKeys.clients(params),
    queryFn: () => getAdvisorClients(params),
    staleTime: 20_000,
    retry: 1,
  })
}

export function useCreateAdvisorClientInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAdvisorClientInvitePayload) => createAdvisorClientInvite(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisor', 'clients'] })
      qc.invalidateQueries({ queryKey: ['advisor', 'clients', 'invites'] })
      toast.success('Convite do cliente gerado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar convite do cliente.')
    },
  })
}

export function useAdvisorClientInvites(params?: AdvisorClientInvitesParams) {
  return useQuery({
    queryKey: advisorKeys.invites(params),
    queryFn: () => getAdvisorClientInvites(params),
    staleTime: 20_000,
    retry: 1,
  })
}

export function useRevokeAdvisorClientInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => revokeAdvisorClientInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisor', 'clients', 'invites'] })
      toast.success('Convite revogado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao revogar convite.')
    },
  })
}

export function useRevokeAdvisorClientLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clientLinkId: string) => revokeAdvisorClientLink(clientLinkId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisor', 'clients'] })
      toast.success('Vinculo do cliente revogado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao revogar vinculo do cliente.')
    },
  })
}

export function useAcceptAdvisorClientConnection() {
  return useMutation({
    mutationFn: (payload: AcceptAdvisorConnectionPayload) =>
      acceptAdvisorClientConnection(payload),
    onSuccess: () => {
      toast.success('Conexao com advisor confirmada.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao confirmar conexao com advisor.')
    },
  })
}

export function useAcceptAdvisorClientInvite() {
  return useMutation({
    mutationFn: (token: string) => acceptAdvisorClientInvite(token),
    onSuccess: () => {
      toast.success('Convite aceito com sucesso.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao aceitar convite de cliente.')
    },
  })
}
