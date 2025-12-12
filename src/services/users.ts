// services/user.ts
import { userResponse } from '@/types/Transaction'
import { UserDTO, UserResponse } from '@/types/user'
import axios from 'axios'

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api'

export async function getUsers(): Promise<UserDTO[]> {
  const response = await axios.get(`${baseURL}/user`)
  return response.data // espera-se que a API retorne um array
}

export async function getUserById(id: string): Promise<userResponse> {
  const response = await axios.get(`${baseURL}/user/${id}`)
  return response.data
}

export async function createUser(user: Omit<UserDTO, 'id'>): Promise<UserResponse> {
  const response = await axios.post(`${baseURL}/user`, user)
  return response.data
}

export async function updateUser(id: string, user: Partial<UserDTO>): Promise<UserDTO> {
  const response = await axios.put(`${baseURL}/user/${id}`, user)
  return response.data
}

export async function deleteUser(id: string): Promise<void> {
  await axios.delete(`${baseURL}/user/${id}`)
}
