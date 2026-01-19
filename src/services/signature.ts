import api from "@/lib/axios"

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api'

export async function getLastSignatureByUserId(): Promise<any> {
  const response = await api.get(`${baseURL}/signature/last`)
  return response.data
}