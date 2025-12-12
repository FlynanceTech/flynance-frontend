// hooks/useUsers.ts
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '@/services/users'
import { userResponse } from '@/types/Transaction'
import { UserDTO } from '@/types/user'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'

export function useUsers(userId?: string, fetchSingle = true) {
    const queryClient = useQueryClient()
    const pathname = usePathname()
    const shouldFetchList = pathname.includes('/dashboard')

    const usersQuery = useQuery<UserDTO[], Error>({
        queryKey: ['users'],
        queryFn: getUsers,
        enabled: shouldFetchList
    })

    const userQuery = useQuery<userResponse, Error>({
      queryKey: ['user', userId],
      queryFn: () => getUserById(userId!),
      enabled: fetchSingle && !!userId, // só busca se tiver id E se você quiser
    })

    const createMutation =  useMutation({
        mutationFn: createUser,
        onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users'] })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<UserDTO> }) =>
          updateUser(id, data),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['users'] })
        },
      })
    
    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['users'] })
        },
      })


    return {
        usersQuery,
        userQuery,
        createMutation,
        updateMutation,
        deleteMutation
    }
}

