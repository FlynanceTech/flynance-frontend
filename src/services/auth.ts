import axios from 'axios'

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api'

export async function sendLoginCode(data: { email?: string; whatsappPhone?: string }) {
  const res = await axios.post(`${baseURL}/auth/send-code`, data)
  return res.data
}

function extractAuthToken(payload: unknown): string | null {
  const data = (payload ?? {}) as Record<string, any>
  const candidates = [
    data?.token,
    data?.accessToken,
    data?.access_token,
    data?.jwt,
    data?.user?.token,
    data?.user?.accessToken,
    data?.user?.access_token,
    data?.user?.jwt,
    data?.userData?.token,
    data?.userData?.accessToken,
    data?.userData?.user?.token,
    data?.data?.token,
    data?.data?.accessToken,
    data?.data?.access_token,
    data?.data?.user?.token,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  return null
}

export async function verifyCode(data: { email?: string; whatsappPhone?: string; code: string }) {
  const res = await axios.post(`${baseURL}/auth/verify-code`, data)
  const token = extractAuthToken(res.data)

  if (!token) {
    throw new Error('Token não recebido no login.')
  }

  localStorage.setItem('token', token)
  return res.data
}
