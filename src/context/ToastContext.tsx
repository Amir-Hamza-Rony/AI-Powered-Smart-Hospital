import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Toast {
  id: number
  title: string
  description?: string
  variant: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = idRef.current++
      setToasts((prev) => [...prev.slice(-3), { ...t, id }])
      window.setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const success = useCallback((title: string, description?: string) => toast({ title, description, variant: 'success' }), [toast])
  const error = useCallback((title: string, description?: string) => toast({ title, description, variant: 'error' }), [toast])

  const value = useMemo(() => ({ toasts, toast, success, error, dismiss }), [toasts, toast, success, error, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg"
          >
            {t.variant === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
            {t.variant === 'error' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
            {t.variant === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className={cn('rounded-sm p-0.5 opacity-70 transition-opacity hover:opacity-100')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
