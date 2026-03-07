// services/users.ts
import api from '@/lib/axios'
import { userResponse } from '@/types/Transaction'
import { UserDTO, UserResponse } from '@/types/user'

export async function getUsers(): Promise<UserDTO[]> {
  const response = await api.get('/users')
  return response.data // rota de listagem no backend
}

export async function getUserById(id: string): Promise<userResponse> {
  const response = await api.get(`/user/${id}`)
  return response.data
}

export async function createUser(user: Omit<UserDTO, 'id'>): Promise<UserResponse> {
  const response = await api.post('/user', user)
  return response.data
}

export async function updateUser(id: string, user: Partial<UserDTO>): Promise<UserDTO> {
  const response = await api.put(`/user/${id}`, user)
  return response.data
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/user/${id}`)
}

export async function getUserByPhone(phone: string): Promise<UserDTO | null> {
  try {
    const { data } = await api.get(`/automation/user/${phone}`);
    // pode vir { user } ou direto o user ou array
    if (Array.isArray(data)) return data[0] ?? null;
    return (data?.user ?? data) as UserDTO;
  } catch {
    return null;
  }
}
