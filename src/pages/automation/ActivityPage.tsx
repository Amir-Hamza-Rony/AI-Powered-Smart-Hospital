import { useMemo, useState } from 'react'
import { LayoutList, ListTree, Search } from 'lucide-react'
import { useAutomationStore } from '@/store/AutomationStore'
import type { AutomationEvent, AutomationEventStatus, AutomationWorkflow } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { AutomationActivityTable } from '@/components/automation/AutomationActivityTable'
import { EventTimeline } from '@/components/automation/EventTimeline'
import { AutomationEventStatusBadge } from '@/components/automation/AutomationStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8
const WORKFLOWS: AutomationWorkflow[] = ['Appointment Reminders', 'Lab Alerts', 'Stock Alerts', 'Waiting Queue', 'System']
const STATUSES: AutomationEventStatus[] = ['Success', 'Pending', 'Failed', 'Warning']

export function ActivityPage() {
  const { events } = useAutomationStore()
  const [query, setQuery] = useState('')
  const [workflow, setWorkflow] = useState('all')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'table' | 'timeline'>('table')
  const [selected, setSelected] = useState<AutomationEvent | null>(null)

  const eventTypes = useMemo(() => [...new Set(events.map((e) => e.eventType))], [events])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      if (workflow !== 'all' && e.workflow !== workflow) return false
      if (status !== 'all' && e.status !== status) return false
      if (type !== 'all' && e.eventType !== type) return false
      if (date && !e.triggeredAt.startsWith(date)) return false
      if (!q) return true
      return (
        e.id.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.triggeredBy.toLowerCase().includes(q)
      )
    })
  }, [events, query, workflow, status, type, date])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = view === 'table' ? filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : filtered.slice(0, 20)
  const reset = () => setPage(1)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Automation Activity"
        description={`Audit trail of workflow events · ${filtered.length} event${filtered.length === 1 ? '' : 's'}`}
        actions={
          <span className="inline-flex gap-2">
            <Button size="sm" variant={view === 'table' ? 'default' : 'outline'} onClick={() => setView('table')}>
              <LayoutList className="mr-1 h-3.5 w-3.5" /> Table
            </Button>
            <Button size="sm" variant={view === 'timeline' ? 'default' : 'outline'} onClick={() => setView('timeline')}>
              <ListTree className="mr-1 h-3.5 w-3.5" /> Timeline
            </Button>
          </span>
        }
      />

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by event ID, description or actor…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                reset()
              }}
              className="pl-9"
              aria-label="Search automation events"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Select
              value={workflow}
              onValueChange={(v) => {
                setWorkflow(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Workflow filter">
                <SelectValue placeholder="Workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workflows</SelectItem>
                {WORKFLOWS.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Event status filter">
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
              value={type}
              onValueChange={(v) => {
                setType(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Event type filter">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {eventTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                reset()
              }}
              aria-label="Event date filter"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="No events found" description="Try adjusting the search or filters." />
      ) : view === 'table' ? (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <AutomationActivityTable events={pageItems} onView={setSelected} />
            <DataPagination
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      ) : (
        <EventTimeline events={pageItems} />
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Event {selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Workflow</dt>
                <dd className="font-medium">{selected.workflow}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Event type</dt>
                <dd className="font-medium">{selected.eventType}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Description</dt>
                <dd>{selected.description}</dd>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Triggered at</dt>
                  <dd className="font-medium">{selected.triggeredAt}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Triggered by</dt>
                  <dd className="font-medium">{selected.triggeredBy}</dd>
                </div>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-0.5">
                  <AutomationEventStatusBadge status={selected.status} />
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
