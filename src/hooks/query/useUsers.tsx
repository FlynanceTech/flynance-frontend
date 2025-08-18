// hooks/useUsers.ts
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '@/services/users'
import { UserDTO } from '@/types/user'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'

export function useUsers(id?: string) {
    const queryClient = useQueryClient()
    const pathname = usePathname()
    const shouldFetch = pathname.includes('/dashboard')

    const usersQuery = useQuery<UserDTO[], Error>({
        queryKey: ['users'],
        queryFn: getUsers,
        enabled: shouldFetch
    })

    const userQuery = useQuery<UserDTO, Error>({
        queryKey: ['user', id],
        queryFn: () => getUserById(id!),
        enabled: !!id,
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

