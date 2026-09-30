import { CalendarDays } from 'lucide-react'
import type { MedicalVisit } from '@/data/types'

export function PatientMedicalTimeline({ visits }: { visits: MedicalVisit[] }) {
  if (visits.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No medical history recorded yet.</p>
  }
  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {visits.map((v) => (
        <li key={v.id} className="relative">
          <span className="absolute -left-[27px] flex h-4 w-4 items-center justify-center rounded-full bg-primary/15">
            <span className="h-2 w-2 rounded-full bg-primary" />
          </span>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{v.diagnosis}</p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> {v.date}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{v.visitType} · {v.doctor}</p>
            <p className="mt-2 text-sm"><strong className="font-medium">Treatment:</strong> {v.treatment}</p>
            {v.notes && <p className="mt-1 text-sm text-muted-foreground">{v.notes}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
