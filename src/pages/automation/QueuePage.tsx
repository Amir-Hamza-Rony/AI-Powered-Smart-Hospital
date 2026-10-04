import { useEffect, useMemo, useState } from 'react'
import { Megaphone, Users } from 'lucide-react'
import { useAutomationStore } from '@/store/AutomationStore'
import { useToast } from '@/context/ToastContext'
import type { QueueStatus } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { QueueHero, QueueTable } from '@/components/automation/LiveQueue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const AUTO_MS = 8000

export function QueuePage() {
  const {
    queue,
    callNextPatient,
    callPatient,
    startConsultation,
    completeConsultation,
    skipPatient,
    autoAdvanceQueue,
  } = useAutomationStore()
  const { success } = useToast()
  const [statusFilter, setStatusFilter] = useState('all')
  const [autoUpdate, setAutoUpdate] = useState(false)

  useEffect(() => {
    if (!autoUpdate) return
    const t = window.setInterval(() => autoAdvanceQueue(), AUTO_MS)
    return () => window.clearInterval(t)
  }, [autoUpdate, autoAdvanceQueue])

  const ordered = useMemo(() => [...queue].sort((a, b) => a.serial.localeCompare(b.serial)), [queue])
  const waiting = queue.filter((q) => q.status === 'Waiting')
  const current = [...queue].reverse().find((q) => q.status === 'Called')
  const nowServing = [...queue].reverse().find((q) => q.status === 'In Consultation')
  const next = waiting[0]
  const avgWait = waiting.length
    ? Math.round(waiting.reduce((s, q) => s + q.waitingMinutes, 0) / waiting.length)
    : 0

  const filtered =
    statusFilter === 'all' ? ordered : ordered.filter((q) => q.status === (statusFilter as QueueStatus))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Waiting Room Live Queue"
        description="Live Queue Simulation — WebSocket integration will be connected in the backend phase."
        actions={
          <Button
            onClick={() => {
              callNextPatient()
              success('Next patient called', 'Queue advanced in mock state.')
            }}
            disabled={waiting.length === 0}
          >
            <Megaphone className="mr-1 h-4 w-4" /> Call Next Patient
          </Button>
        }
      />

      <QueueHero current={current} nowServing={nowServing} next={next} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Waiting Now" value={waiting.length} hint="In the waiting room" />
        <StatCard icon={Megaphone} label="Called" value={queue.filter((q) => q.status === 'Called').length} hint="Heading to room" />
        <StatCard icon={Users} label="In Consultation" value={queue.filter((q) => q.status === 'In Consultation').length} hint="With doctors" />
        <StatCard icon={Users} label="Avg. Wait" value={`${avgWait} min`} hint="Waiting patients" />
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', autoUpdate ? 'animate-pulse bg-primary' : 'bg-muted-foreground')} />
            <p className="text-sm font-medium">Auto Update Queue {autoUpdate ? '· ON' : '· OFF'}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Demo Simulation — advances the queue every {AUTO_MS / 1000}s using a lightweight local timer. No WebSocket connection.
          </p>
          <Button
            size="sm"
            variant={autoUpdate ? 'outline' : 'default'}
            className="ms-auto"
            onClick={() => {
              setAutoUpdate((v) => !v)
              success(autoUpdate ? 'Auto-update stopped' : 'Auto-update started', 'Queue simulation toggled (mock).')
            }}
          >
            {autoUpdate ? 'Stop Auto Update' : 'Start Auto Update'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
          <p className="text-sm font-medium">Queue ({filtered.length})</p>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:ms-auto sm:w-52" aria-label="Queue status filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(['Waiting', 'Called', 'In Consultation', 'Completed', 'Skipped'] as QueueStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <QueueTable
            rows={filtered}
            onCall={(serial) => {
              callPatient(serial)
              success('Patient called', `Serial ${serial} called (mock).`)
            }}
            onStart={(serial) => {
              startConsultation(serial)
              success('Consultation started', `Serial ${serial} in consultation (mock).`)
            }}
            onComplete={(serial) => {
              completeConsultation(serial)
              success('Consultation completed', `Serial ${serial} completed (mock).`)
            }}
            onSkip={(serial) => {
              skipPatient(serial)
              success('Patient skipped', `Serial ${serial} skipped (mock).`)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
