import { useMemo, useState } from 'react'
import { Search, Send, CalendarClock, CheckCircle2, UserX, BellRing } from 'lucide-react'
import { useAutomationStore } from '@/store/AutomationStore'
import { useToast } from '@/context/ToastContext'
import type { AppointmentReminder, ReminderStatus } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { StatCard } from '@/components/shared/StatCard'
import { ReminderTable } from '@/components/automation/ReminderTable'
import { NoShowRiskBadge, ReminderStatusBadge } from '@/components/automation/AutomationStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8
const STATUSES: ReminderStatus[] = ['Scheduled', 'Pending', 'Sent', 'Failed', 'Cancelled']

export function RemindersPage() {
  const { reminders, sendReminder, rescheduleReminder, cancelReminder } = useAutomationStore()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [risk, setRisk] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AppointmentReminder | null>(null)

  const upcoming = reminders.filter((r) => r.status !== 'Cancelled').length
  const scheduled = reminders.filter((r) => r.status === 'Scheduled' || r.status === 'Pending').length
  const sent = reminders.filter((r) => r.status === 'Sent').length
  const highRisk = reminders.filter((r) => r.noShowRisk === 'High' && r.status !== 'Cancelled').length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reminders.filter((r) => {
      if (status !== 'all' && r.status !== status) return false
      if (risk !== 'all' && r.noShowRisk !== risk) return false
      if (!q) return true
      return (
        r.appointmentId.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.doctorName.toLowerCase().includes(q)
      )
    })
  }, [reminders, query, status, risk])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)
  const detail = selected ? reminders.find((r) => r.id === selected.id) ?? selected : null

  return (
    <div className="space-y-4">
      <PageHeader
        title="Appointment Reminders"
        description="Automated reminder workflow · actions simulated in local mock state"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="Upcoming Appointments" value={upcoming} hint="Tracked by workflow" />
        <StatCard icon={BellRing} label="Reminders Scheduled" value={scheduled} hint="Queued batches" />
        <StatCard icon={CheckCircle2} label="Reminders Sent" value={sent} hint="This cycle" />
        <StatCard icon={UserX} label="High No-Show Risk" value={highRisk} hint="Prioritize outreach" />
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by appointment, patient or doctor…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                reset()
              }}
              className="pl-9"
              aria-label="Search reminders"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Reminder status filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={risk}
              onValueChange={(v) => {
                setRisk(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="No-show risk filter">
                <SelectValue placeholder="No-show risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk levels</SelectItem>
                {['High', 'Medium', 'Low'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {pageItems.length === 0 ? (
        <EmptyState title="No reminders found" description="Try adjusting the search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <ReminderTable reminders={pageItems} onView={setSelected} />
            <DataPagination
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reminder {detail?.id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="font-medium">{detail.patientName}</p>
                  <p className="text-xs text-muted-foreground">{detail.patientId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Doctor</p>
                  <p className="font-medium">{detail.doctorName}</p>
                  <p className="text-xs text-muted-foreground">{detail.specialty}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Appointment</p>
                  <p className="font-medium">
                    {detail.appointmentId} · {detail.date} · {detail.time}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-0.5">
                    <ReminderStatusBadge status={detail.status} />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">No-show risk</p>
                  <p className="mt-0.5">
                    <NoShowRiskBadge level={detail.noShowRisk} />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Channels</p>
                  <p className="mt-0.5 flex flex-wrap gap-1">
                    {detail.channels.map((c) => (
                      <Badge key={c} variant="outline">
                        {c}
                      </Badge>
                    ))}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Message preview</p>
                <Card className="mt-1">
                  <CardContent className="p-3 text-sm">{detail.messagePreview}</CardContent>
                </Card>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reminder schedule & history</p>
                {detail.history.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">No reminders sent yet — scheduled for the next batch.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {detail.history.map((h, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                        <span>{h.at}</span>
                        <Badge variant="outline">{h.channel}</Badge>
                        <Badge variant={h.result === 'Sent' ? 'secondary' : 'destructive'}>{h.result}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button
              onClick={() => {
                if (!detail) return
                sendReminder(detail.id)
                success('Reminder sent', `${detail.appointmentId} marked Sent (mock).`)
              }}
            >
              <Send className="mr-1 h-3.5 w-3.5" /> Send Reminder
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!detail) return
                rescheduleReminder(detail.id)
                success('Reminder rescheduled', `${detail.appointmentId} moved to the next batch (mock).`)
              }}
            >
              Reschedule
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!detail) return
                cancelReminder(detail.id)
                success('Reminder cancelled', `${detail.appointmentId} reminder cancelled (mock).`)
                setSelected(null)
              }}
            >
              Cancel Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
