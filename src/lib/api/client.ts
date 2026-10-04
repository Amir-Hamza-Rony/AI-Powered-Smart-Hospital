/**
 * Minimal backend API client (Phase 7).
 * Single place for fetch calls — components must not scatter fetch/axios usage.
 * Backend is optional at runtime: all auth flows fall back to demo access.
 */

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000/api'

const ACCESS_KEY = 'smh_access_token'
const REFRESH_KEY = 'smh_refresh_token'

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY)
  } catch {
    return null
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function setTokens(access: string | null, refresh: string | null) {
  try {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    else localStorage.removeItem(ACCESS_KEY)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
    else localStorage.removeItem(REFRESH_KEY)
  } catch {
    /* storage unavailable — session stays in memory only */
  }
}

export function clearTokens() {
  setTokens(null, null)
}

export class ApiError extends Error {
  status: number
  errors: Record<string, unknown>

  constructor(status: number, message: string, errors: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

interface ApiOptions {
  method?: string
  body?: unknown
  auth?: boolean
  retry?: boolean
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { success: boolean; data: { access: string } }
    if (data?.success && data?.data?.access) {
      setTokens(data.data.access, refresh)
      return true
    }
    return false
  } catch {
    return false
  }
}

/** Backend envelope: { success, message, data } / { success: false, message, errors } */
export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, retry = true } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = auth ? getAccessToken() : null
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Backend is unreachable. Check that the Django server is running.')
  }

  if (res.status === 401 && auth && retry) {
    if (await tryRefresh()) {
      return apiFetch<T>(path, { ...options, retry: false })
    }
  }

  let payload: { success?: boolean; message?: string; data?: T; errors?: Record<string, unknown> } = {}
  try {
    payload = (await res.json()) as typeof payload
  } catch {
    /* non-JSON response (e.g. HTML error page) */
  }

  if (!res.ok || payload.success === false) {
    throw new ApiError(res.status, payload.message || `Request failed (${res.status}).`, payload.errors ?? {})
  }
  return (payload.data ?? payload) as T
}
