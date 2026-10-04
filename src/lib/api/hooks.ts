import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api/client'
import type { Page } from '@/lib/api/common'
import type { BackendRole } from '@/lib/api/auth'

/** Shared list state for backend-paginated API pages. */
export interface ApiListState<T> {
  items: T[]
  total: number
  loading: boolean
  error: string | null
  errorStatus: number | null
  refresh: () => void
}

export function useApiList<T>(
  fetcher: (params: { page: number; page_size: number }) => Promise<Page<T>>,
  deps: unknown[] = [],
  pageSize = 20,
): ApiListState<T> & { page: number; setPage: (page: number) => void; totalPages: number } {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [nonce, setNonce] = useState(0)
  const cancelled = useRef(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    cancelled.current = false
    setLoading(true)
    setError(null)
    setErrorStatus(null)
    fetcher({ page, page_size: pageSize })
      .then((result) => {
        if (cancelled.current) return
        setItems(result.results)
        setTotal(result.count)
      })
      .catch((err: unknown) => {
        if (cancelled.current) return
        if (err instanceof ApiError) {
          setError(err.message)
          setErrorStatus(err.status)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load data.')
          setErrorStatus(null)
        }
        setItems([])
        setTotal(0)
      })
      .finally(() => {
        if (!cancelled.current) setLoading(false)
      })
    return () => {
      cancelled.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, nonce, depsKey])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return { items, total, loading, error, errorStatus, refresh, page, setPage, totalPages }
}

/** Shared detail state for single-object API pages. */
export interface ApiDetailState<T> {
  data: T | null
  loading: boolean
  error: string | null
  errorStatus: number | null
  refresh: () => void
}

export function useApiDetail<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiDetailState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [nonce, setNonce] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const depsKey = JSON.stringify(deps)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setErrorStatus(null)
    fetcher()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiError) {
          setError(err.message)
          setErrorStatus(err.status)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load data.')
          setErrorStatus(null)
        }
        setData(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, depsKey])

  return { data, loading, error, errorStatus, refresh: useCallback(() => setNonce((n) => n + 1), []) }
}

/** Role helpers mirroring backend RBAC for permission-aware UI. */
export function canWritePrescriptions(role: BackendRole | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'DOCTOR'
}

export function canManageLabTests(role: BackendRole | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'PATHOLOGIST'
}

export function canProcessLabOrders(role: BackendRole | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'PATHOLOGIST'
}

export function canManageInventory(role: BackendRole | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'PHARMACIST'
}

export function isStaffRole(role: BackendRole | null): boolean {
  return role !== null && role !== 'PATIENT'
}
