/**
 * Authentication state (Phase 7).
 * - Real backend session (JWT) when the Django API is reachable.
 * - Local "demo access" session otherwise, so all Phase 1–6 mock flows keep working.
 * Backend role is mirrored into the existing mock RoleContext so the UI (header,
 * role switcher) keeps reflecting the signed-in user.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRole, type MockRole } from '@/context/RoleContext'
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type BackendRole,
  type BackendUser,
} from '@/lib/api/auth'
import { clearTokens, getAccessToken, getRefreshToken } from '@/lib/api/client'

const BACKEND_TO_MOCK_ROLE: Record<BackendRole, MockRole> = {
  SUPER_ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  RECEPTIONIST: 'receptionist',
  PHARMACIST: 'pharmacist',
  PATHOLOGIST: 'nurse',
  PATIENT: 'patient',
}

const DEMO_KEY = 'smh_demo_session'

interface AuthContextValue {
  user: BackendUser | null
  isAuthenticated: boolean
  /** True when using local demo access (no backend session). */
  isDemo: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    first_name: string
    last_name: string
    email: string
    phone?: string
    password: string
  }) => Promise<void>
  demoLogin: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function hasStoredSession(): boolean {
  if (getAccessToken() || getRefreshToken()) return true
  try {
    return localStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setRole } = useRole()
  const [user, setUser] = useState<BackendUser | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)

  // Restore a previous session on load. Backend tokens win; demo flag is the fallback.
  useEffect(() => {
    let cancelled = false
    async function restore() {
      if (getAccessToken() || getRefreshToken()) {
        try {
          const me = await getCurrentUser()
          if (cancelled) return
          setUser(me)
          setIsDemo(false)
          setRole(BACKEND_TO_MOCK_ROLE[me.role])
        } catch {
          if (!cancelled) {
            clearTokens()
            setUser(null)
            setIsDemo(false)
          }
        }
      } else {
        try {
          if (!cancelled && localStorage.getItem(DEMO_KEY) === '1') setIsDemo(true)
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setLoading(false)
    }
    void restore()
    return () => {
      cancelled = true
    }
    // setRole is stable enough for one-shot restore; keep deps minimal on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const me = await apiLogin(email, password)
      setUser(me)
      setIsDemo(false)
      try {
        localStorage.removeItem(DEMO_KEY)
      } catch {
        /* ignore */
      }
      setRole(BACKEND_TO_MOCK_ROLE[me.role])
    },
    [setRole],
  )

  const register = useCallback(
    async (input: { first_name: string; last_name: string; email: string; phone?: string; password: string }) => {
      const me = await apiRegister(input)
      // apiRegister logs in and stores tokens; fetch the authoritative profile.
      try {
        const fresh = await getCurrentUser()
        setUser(fresh)
        setRole(BACKEND_TO_MOCK_ROLE[fresh.role])
      } catch {
        setUser(me)
      }
      setIsDemo(false)
      try {
        localStorage.removeItem(DEMO_KEY)
      } catch {
        /* ignore */
      }
    },
    [setRole],
  )

  const demoLogin = useCallback(() => {
    setUser(null)
    setIsDemo(true)
    try {
      localStorage.setItem(DEMO_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  const logout = useCallback(async () => {
    await apiLogout(getRefreshToken())
    setUser(null)
    setIsDemo(false)
    try {
      localStorage.removeItem(DEMO_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null || isDemo,
      isDemo,
      loading,
      login,
      register,
      demoLogin,
      logout,
    }),
    [user, isDemo, loading, login, register, demoLogin, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { hasStoredSession }
