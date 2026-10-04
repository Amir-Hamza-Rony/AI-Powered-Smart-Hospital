/**
 * Authentication API functions (Phase 7). Used only through AuthContext.
 */

import { apiFetch, clearTokens, setTokens } from '@/lib/api/client'

export type BackendRole =
  | 'SUPER_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'PHARMACIST'
  | 'PATHOLOGIST'
  | 'PATIENT'

export interface BackendUser {
  id: string
  name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  role: BackendRole
  is_active: boolean
  date_joined: string
}

interface LoginPayload {
  access: string
  refresh: string
  user: BackendUser
}

export async function login(email: string, password: string): Promise<BackendUser> {
  const data = await apiFetch<LoginPayload>('/auth/login/', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  setTokens(data.access, data.refresh)
  return data.user
}

export async function register(input: {
  first_name: string
  last_name: string
  email: string
  phone?: string
  password: string
}): Promise<BackendUser> {
  const user = await apiFetch<BackendUser>('/auth/register/', {
    method: 'POST',
    body: input,
    auth: false,
  })
  // Registration does not issue tokens — log in right after.
  return login(input.email, input.password).then(() => user)
}

export async function refreshToken(): Promise<string> {
  const data = await apiFetch<{ access: string }>('/auth/refresh/', {
    method: 'POST',
    body: {},
    auth: false,
  })
  return data.access
}

export async function getCurrentUser(): Promise<BackendUser> {
  return apiFetch<BackendUser>('/auth/me/')
}

export async function updateCurrentUser(input: {
  first_name?: string
  last_name?: string
  phone?: string
}): Promise<BackendUser> {
  return apiFetch<BackendUser>('/auth/me/', { method: 'PATCH', body: input })
}

export async function logout(refresh: string | null): Promise<void> {
  if (refresh) {
    try {
      await apiFetch('/auth/logout/', { method: 'POST', body: { refresh } })
    } catch {
      /* best effort — tokens are cleared locally regardless */
    }
  }
  clearTokens()
}
