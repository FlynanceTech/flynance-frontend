// src/lib/axios.ts
import axios from 'axios'
import { useAdvisorActing } from '@/stores/useAdvisorActing'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api',
  withCredentials: true,
})

function resolveRequestPath(url?: string) {
  if (!url) return ''
  try {
    return new URL(url, 'http://localhost').pathname
  } catch {
    return String(url)
  }
}

function shouldAttachActingHeader(pathname: string) {
  if (!pathname) return true
  return !pathname.startsWith('/auth')
}

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config

  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const requestPath = resolveRequestPath(config.url)
  const actingClientId = useAdvisorActing.getState().selectedClientId
  if (actingClientId && shouldAttachActingHeader(requestPath)) {
    config.headers['x-acting-user-id'] = actingClientId
  } else if (config.headers && 'x-acting-user-id' in config.headers) {
    delete config.headers['x-acting-user-id']
  }

  if (process.env.NODE_ENV !== 'production') {
    const method = String(config.method ?? 'get').toUpperCase()
    const base = String(config.baseURL ?? '')
    const path = String(config.url ?? '')
    let finalUrl = path
    try {
      finalUrl = new URL(path, base).toString()
    } catch {
      finalUrl = `${base}${path}`
    }
    console.debug(`[api] ${method} ${finalUrl}`)
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV !== 'production' && error?.config) {
      const method = String(error.config.method ?? 'get').toUpperCase()
      const base = String(error.config.baseURL ?? '')
      const path = String(error.config.url ?? '')
      let finalUrl = path
      try {
        finalUrl = new URL(path, base).toString()
      } catch {
        finalUrl = `${base}${path}`
      }
      const status = error?.response?.status ?? 'NO_STATUS'
      console.debug(`[api:error] ${method} ${finalUrl} -> ${status}`, error?.response?.data)
    }
    return Promise.reject(error)
  }
)

export default api
