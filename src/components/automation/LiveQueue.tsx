import { Megaphone, Play, CheckCircle2, SkipForward } from 'lucide-react'
import type { QueuePatient } from '@/data/types'
import { QueuePriorityBadge, QueueStatusBadge } from '@/components/automation/AutomationStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function QueueHero({
  current,
  nowServing,
  next,
}: {
  current: QueuePatient | undefined
  nowServing: QueuePatient | undefined
  next: QueuePatient | undefined
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="p-5 text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Current Serial</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">{current?.serial ?? '—'}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{current ? `${current.patientName} · ${current.department}` : 'Queue is empty'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Now Serving</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">{nowServing?.serial ?? '—'}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{nowServing ? `${nowServing.patientName} · ${nowServing.doctorName}` : 'No active consultation'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 text-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Next</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">{next?.serial ?? '—'}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{next ? `${next.patientName} · ${next.department}` : 'Nobody waiting'}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function QueueTable({
  rows,
  onCall,
  onStart,
  onComplete,
  onSkip,
}: {
  rows: QueuePatient[]
  onCall: (serial: string) => void
  onStart: (serial: string) => void
  onComplete: (serial: string) => void
  onSkip: (serial: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Serial</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Arrival Time</TableHead>
            <TableHead className="text-right">Waiting</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((q) => (
            <TableRow key={q.serial}>
              <TableCell className="font-bold whitespace-nowrap">{q.serial}</TableCell>
              <TableCell className="whitespace-nowrap">{q.patientName}</TableCell>
              <TableCell className="whitespace-nowrap">{q.doctorName}</TableCell>
              <TableCell className="whitespace-nowrap">{q.department}</TableCell>
              <TableCell>
                <QueueStatusBadge status={q.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{q.arrivalTime}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{q.waitingMinutes} min</TableCell>
              <TableCell>
                <QueuePriorityBadge priority={q.priority} />
              </TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={q.status !== 'Waiting'}
                    onClick={() => onCall(q.serial)}
                    aria-label={`Call ${q.serial}`}
                    title="Call Patient"
                  >
                    <Megaphone className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={q.status !== 'Called' && q.status !== 'Waiting'}
                    onClick={() => onStart(q.serial)}
                    aria-label={`Start consultation ${q.serial}`}
                    title="Start Consultation"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={q.status !== 'In Consultation' && q.status !== 'Called'}
                    onClick={() => onComplete(q.serial)}
                    aria-label={`Complete ${q.serial}`}
                    title="Complete"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={q.status === 'Completed' || q.status === 'Skipped'}
                    onClick={() => onSkip(q.serial)}
                    aria-label={`Skip ${q.serial}`}
                    title="Skip"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
