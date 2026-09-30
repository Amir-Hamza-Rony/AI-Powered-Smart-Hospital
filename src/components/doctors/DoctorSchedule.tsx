import { Check, X } from 'lucide-react'
import type { DaySchedule } from '@/data/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function DoctorSchedule({ schedule, compact = false }: { schedule: DaySchedule[]; compact?: boolean }) {
  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>
      {schedule.map((d) => (
        <div key={d.day} className={cn('rounded-lg border p-3', d.available ? 'border-border bg-card' : 'border-dashed bg-muted/40 opacity-70')}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{d.day}</p>
            {d.available ? (
              <Badge variant="default" className="text-[10px]"><Check className="mr-0.5 h-3 w-3" /> Available</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]"><X className="mr-0.5 h-3 w-3" /> Unavailable</Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {d.available && d.slots.length > 0 ? (
              d.slots.map((s) => (
                <span key={s} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium">{s}</span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No slots</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
