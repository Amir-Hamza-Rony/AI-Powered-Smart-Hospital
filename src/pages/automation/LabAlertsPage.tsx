import { useMemo, useState } from 'react'
import { Search, FlaskConical, CheckCircle2, BellRing, UserCheck, Zap } from 'lucide-react'
import { useAutomationStore } from '@/store/AutomationStore'
import { useToast } from '@/context/ToastContext'
import type { LabAlertStatus, LabCompletionAlert } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { StatCard } from '@/components/shared/StatCard'
import { LabAlertTable } from '@/components/automation/LabAlertTable'
import { LabAlertStatusBadge, NotificationStateBadge } from '@/components/automation/AutomationStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8
const STATUSES: LabAlertStatus[] = ['Processing', 'Ready', 'Reviewed', 'Notification Sent']

export function LabAlertsPage() {
  const { labAlerts, notifyDoctor, notifyPatient, markLabReviewed, simulateLabCompletion } = useAutomationStore()
  const { success, error } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<LabCompletionAlert | null>(null)

  const processing = labAlerts.filter((l) => l.status === 'Processing').length
  const ready = labAlerts.filter((l) => l.status === 'Ready').length
  const doctorSent = labAlerts.filter((l) => l.doctorNotification === 'Sent').length
  const patientSent = labAlerts.filter((l) => l.patientNotification === 'Sent').length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return labAlerts.filter((l) => {
      if (status !== 'all' && l.status !== status) return false
      if (!q) return true
      return (
        l.labOrderId.toLowerCase().includes(q) ||
        l.patientName.toLowerCase().includes(q) ||
        l.test.toLowerCase().includes(q)
      )
    })
  }, [labAlerts, query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)
  const detail = selected ? labAlerts.find((l) => l.id === selected.id) ?? selected : null

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lab Completion Alerts"
        description="Doctor & patient notifications for ready reports · simulated locally"
        actions={
          <Button
            onClick={() => {
              const orderId = simulateLabCompletion()
              if (orderId) {
                success('Lab completion simulated', `${orderId} moved Processing → Ready; notifications sent (mock).`)
              } else {
                error('Nothing to simulate', 'No Processing tests remain in mock state.')
              }
            }}
          >
            <Zap className="mr-1 h-3.5 w-3.5" /> Simulate Lab Completion
          </Button>
        }
      />

      <Card className="border-dashed">
        <CardContent className="p-3 text-xs text-muted-foreground">
          Frontend Demo — Real-time backend integration will be connected later. The simulation button moves one
          Processing test to Ready and fans out mock notifications, counts, and an activity event.
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FlaskConical} label="Tests Processing" value={processing} hint="In the lab now" />
        <StatCard icon={CheckCircle2} label="Reports Ready" value={ready} hint="Awaiting pickup" />
        <StatCard icon={UserCheck} label="Doctor Notifications" value={doctorSent} hint="Sent to doctors" />
        <StatCard icon={BellRing} label="Patient Notifications" value={patientSent} hint="Sent to patients" />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, patient or test…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                reset()
              }}
              className="pl-9"
              aria-label="Search lab alerts"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              reset()
            }}
          >
            <SelectTrigger className="sm:w-52" aria-label="Lab alert status filter">
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
        </CardContent>
      </Card>

      {pageItems.length === 0 ? (
        <EmptyState title="No lab alerts found" description="Try adjusting the search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <LabAlertTable alerts={pageItems} onView={setSelected} />
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
            <DialogTitle>
              {detail?.labOrderId} · {detail?.test}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="font-medium">{detail.patientName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ordered by</p>
                  <p className="font-medium">{detail.orderedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-0.5">
                    <LabAlertStatusBadge status={detail.status} />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Result</p>
                  <p className="mt-0.5">
                    <Badge variant={detail.resultStatus === 'Abnormal' ? 'destructive' : 'outline'}>{detail.resultStatus}</Badge>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="font-medium">{detail.completedAt}</p>
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
                <div>
                  <p className="text-xs text-muted-foreground">Doctor notification</p>
                  <p className="mt-0.5">
                    <NotificationStateBadge state={detail.doctorNotification} />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Patient notification</p>
                  <p className="mt-0.5">
                    <NotificationStateBadge state={detail.patientNotification} />
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recipients</p>
                <p className="mt-0.5">{detail.recipients.join(' · ')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notification history</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {detail.history.map((h, i) => (
                    <li key={i}>• {h}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button
              onClick={() => {
                if (!detail) return
                notifyDoctor(detail.id)
                success('Doctor notified', `${detail.orderedBy} notified (mock).`)
              }}
            >
              Notify Doctor
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!detail) return
                notifyPatient(detail.id)
                success('Patient notified', `${detail.patientName} notified (mock).`)
              }}
            >
              Notify Patient
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!detail) return
                markLabReviewed(detail.id)
                success('Marked as reviewed', `${detail.labOrderId} reviewed (mock).`)
              }}
            >
              Mark as Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Real-Time Simulation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Frontend Demo — Real-time backend integration will be connected later. Use{' '}
            <strong>Simulate Lab Completion</strong> above to move a Processing test to Ready, fan out doctor +
            patient notifications, and append events to the automation activity log.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
