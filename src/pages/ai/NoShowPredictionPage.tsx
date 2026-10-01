import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BellRing, CalendarClock, Eye, Search, UserX } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { MOCK_NOSHOW_PREDICTIONS } from '@/data/ai'
import type { AINoShowPrediction, AINoShowRisk, AIReminderPriority } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { StatCard } from '@/components/shared/StatCard'
import { AIPriorityBadge, AIRiskBadge, AIStatusBadge } from '@/components/ai/AIBadges'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { AIConfidenceIndicator } from '@/components/ai/AICards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 8

export function NoShowPredictionPage() {
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [risk, setRisk] = useState('all')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<AINoShowPrediction | null>(null)
  const [priorities, setPriorities] = useState<Record<string, AIReminderPriority>>({})

  const predictions = useMemo(
    () =>
      MOCK_NOSHOW_PREDICTIONS.map((p) => ({
        ...p,
        reminderPriority: priorities[p.appointmentId] ?? p.reminderPriority,
      })),
    [priorities],
  )

  const total = predictions.length
  const high = predictions.filter((p) => p.riskLevel === 'High').length
  const medium = predictions.filter((p) => p.riskLevel === 'Medium').length
  const low = predictions.filter((p) => p.riskLevel === 'Low').length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return predictions.filter((p) => {
      if (risk !== 'all' && p.riskLevel !== (risk as AINoShowRisk)) return false
      if (!q) return true
      return (
        p.appointmentId.toLowerCase().includes(q) ||
        p.patientName.toLowerCase().includes(q) ||
        p.doctorName.toLowerCase().includes(q)
      )
    })
  }, [predictions, query, risk])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI No-Show Prediction"
        description="Mock appointment risk analysis · simulated scores for frontend demo"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai">
              <ArrowLeft className="mr-1 h-4 w-4" /> AI Hub
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="Upcoming Appointments" value={total} hint="In mock prediction set" />
        <StatCard icon={UserX} label="High Risk" value={high} hint="Remind first" />
        <StatCard icon={BellRing} label="Medium Risk" value={medium} hint="Standard reminders" />
        <StatCard icon={Eye} label="Low Risk" value={low} hint="Likely to attend" />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by appointment, patient or doctor…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              className="pl-9"
              aria-label="Search predictions"
            />
          </div>
          <Select
            value={risk}
            onValueChange={(v) => {
              setRisk(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-[200px]" aria-label="Risk filter">
              <SelectValue placeholder="Risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {pageItems.length === 0 ? (
        <EmptyState title="No predictions found" description="Try adjusting the search or risk filter." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Appointment</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Prev. Attendance</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Reminder Priority</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((p) => (
                    <TableRow key={p.appointmentId}>
                      <TableCell className="whitespace-nowrap font-medium">{p.appointmentId}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.patientName}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.doctorName}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.date}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.time}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.previousAttendance}</TableCell>
                      <TableCell>
                        <AIRiskBadge level={p.riskLevel} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold">{p.riskScore}</TableCell>
                      <TableCell>
                        <AIPriorityBadge priority={p.reminderPriority} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setDetail(p)}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}

      <AIDisclaimer variant="prediction" />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Risk detail — {detail?.appointmentId} <AIStatusBadge />
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-xs text-muted-foreground">Patient</p><p className="font-medium">{detail.patientName}</p></div>
                <div><p className="text-xs text-muted-foreground">Doctor</p><p className="font-medium">{detail.doctorName}</p></div>
                <div><p className="text-xs text-muted-foreground">When</p><p className="font-medium">{detail.date} · {detail.time}</p></div>
                <div><p className="text-xs text-muted-foreground">History</p><p className="font-medium">{detail.previousAttendance}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <AIRiskBadge level={detail.riskLevel} />
                <span className="text-xs text-muted-foreground">Mock score {detail.riskScore}/100</span>
              </div>
              <AIConfidenceIndicator value={detail.riskScore} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Simulated risk factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {detail.factors.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                <Label>Reminder priority</Label>
                <Select
                  value={priorities[detail.appointmentId] ?? detail.reminderPriority}
                  onValueChange={(v) => {
                    setPriorities((prev) => ({ ...prev, [detail.appointmentId]: v as AIReminderPriority }))
                    success('Priority updated', `${detail.appointmentId} → ${v} reminders (mock).`)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['High', 'Normal', 'Low'] as AIReminderPriority[]).map((pr) => (
                      <SelectItem key={pr} value={pr}>
                        {pr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={detail ? `/appointments/${detail.appointmentId}` : '/appointments'}>View Appointment</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (detail) success('Reminder queued', `Mock reminder for ${detail.patientName} (${detail.appointmentId}).`)
              }}
            >
              <BellRing className="mr-1 h-4 w-4" /> Send Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
