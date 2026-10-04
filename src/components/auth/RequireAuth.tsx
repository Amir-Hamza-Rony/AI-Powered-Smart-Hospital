/**
 * Route protection (Phase 7).
 * - RequireAuth: redirects visitors without any session (backend or demo) to /login.
 * - RequireRole: role-aware gate for future per-module enforcement. Backend data
 *   is not connected yet, so it is exported ready-to-use but not yet applied to
 *   routes — mock data must remain reachable (see Phase 7 scope).
 */

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRole, type MockRole } from '@/context/RoleContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function AuthLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-label="Loading session">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <AuthLoading />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

export function RequireRole({ allowed, children }: { allowed: MockRole[]; children: ReactNode }) {
  const { role } = useRole()
  if (!allowed.includes(role)) {
    return (
      <div className="mx-auto max-w-md py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">Access restricted</p>
            <p className="text-sm text-muted-foreground">
              This area requires one of: {allowed.join(', ')}. Your current view is “{role}”.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  return <>{children}</>
}
