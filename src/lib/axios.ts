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

function normalizeApiPath(pathname: string) {
  if (!pathname) return ''
  return pathname.replace(/^\/api(?=\/|$)/, '')
}

const ACTING_CONTEXT_PREFIXES = [
  '/transactions',
  '/dashboard/finance-status',
  '/dashboard/payment-summary',
  '/cards',
  '/categories',
  '/category',
  '/fixed-accounts',
  '/controls',
]

const ACTING_QUERY_KEYS = ['userId', 'clientUserId', 'asUserId'] as const

function hasContextInSearchParams(searchParams: URLSearchParams) {
  return ACTING_QUERY_KEYS.some((key) => {
    const value = searchParams.get(key)
    return typeof value === 'string' && value.trim().length > 0
  })
}

function hasContextInUrl(url?: string) {
  if (!url) return false
  try {
    const parsed = new URL(url, 'http://localhost')
    return hasContextInSearchParams(parsed.searchParams)
  } catch {
    return false
  }
}

function hasContextInParams(params: unknown) {
  if (!params) return false

  if (params instanceof URLSearchParams) {
    return hasContextInSearchParams(params)
  }

  if (typeof params === 'object') {
    const asRecord = params as Record<string, unknown>
    return ACTING_QUERY_KEYS.some((key) => {
      const value = asRecord[key]
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null && String(value).trim().length > 0
    })
  }

  return false
}

function shouldApplyActingContext(pathname: string) {
  if (!pathname) return false
  const normalized = normalizeApiPath(pathname)
  if (!normalized || normalized.startsWith('/auth')) return false
  return ACTING_CONTEXT_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  )
}

function addActingUserIdToParams(
  params: unknown,
  activeClientId: string
): Record<string, unknown> | URLSearchParams {
  if (params instanceof URLSearchParams) {
    params.set('userId', activeClientId)
    return params
  }

  if (params && typeof params === 'object') {
    return { ...(params as Record<string, unknown>), userId: activeClientId }
  }

  return { userId: activeClientId }
}

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config

  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const requestPath = resolveRequestPath(config.url)
  const actingState = useAdvisorActing.getState()
  const activeClientId = actingState.activeClientId ?? actingState.selectedClientId
  const shouldApply = Boolean(activeClientId) && shouldApplyActingContext(requestPath)

  if (shouldApply && activeClientId) {
    config.headers['x-client-user-id'] = activeClientId

    const hasContextParam = hasContextInUrl(config.url) || hasContextInParams(config.params)
    if (!hasContextParam) {
      config.params = addActingUserIdToParams(config.params, activeClientId)
    }
  } else {
    if (config.headers && 'x-client-user-id' in config.headers) {
      delete config.headers['x-client-user-id']
    }
    if (config.headers && 'x-acting-user-id' in config.headers) {
      delete config.headers['x-acting-user-id']
    }
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
