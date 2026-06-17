'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  acceptAdvisorClientInvite,
  acceptAdvisorGeneratedInvite,
  acceptAdvisorClientConnection,
  AdvisorClientInvitesParams,
  AdvisorGeneratedInvite,
  CreateAdvisorGeneratedInvitePayload,
  CreateAdvisorInvitePackagePayload,
  AcceptAdvisorConnectionPayload,
  AdvisorClientsParams,
  CreateAdvisorClientInvitePayload,
  cancelAdvisorGeneratedInvite,
  createAdvisorGeneratedInvite,
  createAdvisorClientInvite,
  createAdvisorInvitePackage,
  deleteAdvisorGeneratedInvite,
  getAdvisorGeneratedInviteByToken,
  getAdvisorGeneratedInvites,
  getAdvisorClientInvites,
  getAdvisorClients,
  revokeAdvisorClientInvite,
  revokeAdvisorClientLink,
  UpdateAdvisorGeneratedInviteNamePayload,
  updateAdvisorGeneratedInviteName,
} from '@/services/advisor'

const advisorKeys = {
  clients: (params?: AdvisorClientsParams) => ['advisor', 'clients', params ?? {}] as const,
  invites: (params?: AdvisorClientInvitesParams) => ['advisor', 'clients', 'invites', params ?? {}] as const,
  generatedInvites: () => ['advisor', 'generated-invites'] as const,
  generatedInviteByToken: (token: string) => ['advisor', 'generated-invites', token] as const,
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

export function useAdvisorGeneratedInvites() {
  return useQuery({
    queryKey: advisorKeys.generatedInvites(),
    queryFn: getAdvisorGeneratedInvites,
    staleTime: 10_000,
    retry: 1,
  })
}

export function useAdvisorGeneratedInviteByToken(token: string) {
  return useQuery({
    queryKey: advisorKeys.generatedInviteByToken(token),
    queryFn: () => getAdvisorGeneratedInviteByToken(token),
    enabled: token.length >= 10,
    staleTime: 0,
    retry: 1,
  })
}

export function useCreateAdvisorGeneratedInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAdvisorGeneratedInvitePayload) =>
      createAdvisorGeneratedInvite(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advisorKeys.generatedInvites() })
      qc.invalidateQueries({ queryKey: ['advisor', 'clients'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar convite.')
    },
  })
}

export function useCreateAdvisorInvitePackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAdvisorInvitePackagePayload) =>
      createAdvisorInvitePackage(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advisorKeys.generatedInvites() })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar pacote.')
    },
  })
}

export function useUpdateAdvisorGeneratedInviteName() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      inviteId,
      payload,
    }: {
      inviteId: string
      payload: UpdateAdvisorGeneratedInviteNamePayload
    }): Promise<AdvisorGeneratedInvite> => updateAdvisorGeneratedInviteName(inviteId, payload),
    onSuccess: (invite) => {
      qc.invalidateQueries({ queryKey: advisorKeys.generatedInvites() })
      qc.invalidateQueries({ queryKey: advisorKeys.generatedInviteByToken(invite.token) })
      toast.success('Nome do convite atualizado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar convite.')
    },
  })
}

export function useCancelAdvisorGeneratedInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => cancelAdvisorGeneratedInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advisorKeys.generatedInvites() })
      toast.success('Convite cancelado.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar convite.')
    },
  })
}

export function useAcceptAdvisorGeneratedInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => acceptAdvisorGeneratedInvite(token),
    onSuccess: (_, token) => {
      qc.invalidateQueries({ queryKey: advisorKeys.generatedInviteByToken(token) })
      qc.invalidateQueries({ queryKey: advisorKeys.generatedInvites() })
      qc.invalidateQueries({ queryKey: ['advisor', 'clients'] })
      toast.success('Convite aceito com sucesso.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao aceitar convite.')
    },
  })
}

export function useDeleteAdvisorGeneratedInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => deleteAdvisorGeneratedInvite(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advisorKeys.generatedInvites() })
      toast.success('Convite excluído.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir convite.')
    },
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
