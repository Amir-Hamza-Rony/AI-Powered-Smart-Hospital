import { Check, X } from 'lucide-react'
import type { AppointmentStatus } from '@/data/types'
import { cn } from '@/lib/utils'

const STEPS: AppointmentStatus[] = ['Pending', 'Confirmed', 'Completed']

export function AppointmentTimeline({ status }: { status: AppointmentStatus }) {
  if (status === 'Cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
          <X className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-destructive">Cancelled</p>
          <p className="text-xs text-muted-foreground">Terminal state — this appointment will not proceed.</p>
        </div>
      </div>
    )
  }

  const currentIndex = STEPS.indexOf(status)
  return (
    <ol className="flex items-center" aria-label="Appointment progress">
      {STEPS.map((step, i) => {
        const done = i < currentIndex
        const current = i === currentIndex
        return (
          <li key={step} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold',
                  done && 'border-primary bg-primary text-primary-foreground',
                  current && 'border-primary bg-primary/15 text-primary',
                  !done && !current && 'border-border bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn('text-[11px] font-medium', current ? 'text-primary' : 'text-muted-foreground')}>{step}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={cn('mx-2 mb-5 h-[2px] flex-1 rounded', i < currentIndex ? 'bg-primary' : 'bg-border')} aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}
