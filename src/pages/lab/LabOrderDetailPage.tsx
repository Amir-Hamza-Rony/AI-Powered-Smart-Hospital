import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Download, Eye, Upload } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { LabPriorityBadge, LabStatusBadge } from '@/components/phase3/StatusBadges'
import type { LabOrderStatus } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const STAGES: LabOrderStatus[] = ['Pending', 'Processing', 'Ready', 'Completed']

export function LabOrderDetailPage() {
  const { id } = useParams()
  const { getLabOrder, setLabOrderStatus } = useHospitalStore()
  const { success } = useToast()
  const order = id ? getLabOrder(id) : undefined

  if (!order) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild><Link to="/lab"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        <EmptyState title="Lab order not found" description={`No order ${id ?? ''} in mock state.`} action={<Button asChild><Link to="/lab">Back to lab</Link></Button>} />
      </div>
    )
  }

  const stageIdx = STAGES.indexOf(order.status === 'Cancelled' ? 'Pending' : order.status)
  const advance = () => {
    if (order.status === 'Cancelled' || order.status === 'Completed') return
    const next = STAGES[Math.min(stageIdx + 1, STAGES.length - 1)]
    setLabOrderStatus(order.id, next)
    success(`Order moved to ${next}`, `${order.id} updated in mock state.`)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={order.id}
        description={`Ordered ${order.orderedDate} · ${order.priority} priority`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/lab"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
            <Button variant="outline" size="sm" onClick={() => success('Upload dialog opened', 'Frontend-only mock — no file is uploaded.')}><Upload className="mr-1 h-4 w-4" /> Upload Report</Button>
            <Button variant="outline" size="sm" onClick={() => success('Report viewer opened', 'Frontend-only mock.')}><Eye className="mr-1 h-4 w-4" /> View Report</Button>
            <Button size="sm" onClick={() => success('Download started', `${order.id}-report.pdf (frontend-only mock).`)}><Download className="mr-1 h-4 w-4" /> Download Report</Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Patient</CardTitle></CardHeader>
          <CardContent className="text-sm"><p className="font-semibold">{order.patientName}</p><p className="text-muted-foreground">{order.patientId}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Doctor</CardTitle></CardHeader>
          <CardContent className="text-sm"><p className="font-semibold">{order.doctorName}</p><p className="text-muted-foreground">{order.doctorId}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Order Meta</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><LabStatusBadge status={order.status} /> <LabPriorityBadge priority={order.priority} /></p>
            <p className="text-muted-foreground">Instructions: {order.instructions || '—'}</p>
            <p className="text-muted-foreground">Notes: {order.notes || '—'}</p>
            {order.status !== 'Completed' && order.status !== 'Cancelled' && (
              <Button size="sm" className="mt-2" onClick={advance}><Check className="mr-1 h-4 w-4" /> Advance to {STAGES[Math.min(stageIdx + 1, 3)]}</Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-0 sm:flex-row sm:items-center" aria-label="Lab order timeline">
            {STAGES.map((s, i) => {
              const done = order.status === 'Cancelled' ? false : i <= stageIdx
              return (
                <li key={s} className="flex flex-1 items-start gap-2 sm:items-center">
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold', done ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground')}>{i + 1}</span>
                  <span className={cn('py-2 text-sm font-medium', done ? '' : 'text-muted-foreground')}>{s}</span>
                  {i < STAGES.length - 1 && <span className="mx-2 hidden h-px flex-1 bg-border sm:block" aria-hidden />}
                </li>
              )
            })}
          </ol>
          {order.status === 'Cancelled' && <p className="mt-2 text-sm text-destructive">This order was cancelled.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tests ({order.tests.length})</CardTitle></CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Sample</TableHead>
                  <TableHead>Reference Range</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.tests.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{t.testName}</TableCell>
                    <TableCell>{t.sampleType}</TableCell>
                    <TableCell>{t.referenceRange}</TableCell>
                    <TableCell>{t.result || '—'}</TableCell>
                    <TableCell>{t.unit}</TableCell>
                    <TableCell>{t.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
