import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Download, Eye, Upload, XCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ApiErrorState, ApiLoading } from '@/components/shared/ApiState'
import { LabPriorityBadge, LabStatusBadge } from '@/components/phase3/StatusBadges'
import type { LabOrderStatus } from '@/data/types'
import {
  cancelLabOrder,
  getLabOrder,
  markLabOrderReady,
  processLabOrder,
  updateLabResults,
  type BackendLabOrder,
} from '@/lib/api/laboratory'
import { toLabOrder } from '@/lib/api/adapters'
import { canProcessLabOrders, isStaffRole, useApiDetail } from '@/lib/api/hooks'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const STAGES: LabOrderStatus[] = ['Pending', 'Processing', 'Ready', 'Completed']

export function LabOrderDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { success, error } = useToast()
  const detail = useApiDetail(() => getLabOrder(id ?? ''), [id])
  const [resultsOpen, setResultsOpen] = useState(false)
  const [resultValues, setResultValues] = useState<Record<string, { result: string; unit: string; reference_range: string; status: 'Normal' | 'Abnormal' | 'Pending' }>>({})
  const [saving, setSaving] = useState(false)

  const raw: BackendLabOrder | null = detail.data
  const order = raw ? toLabOrder(raw) : null
  const canProcess = canProcessLabOrders(user?.role ?? null)
  const staff = isStaffRole(user?.role ?? null)

  const runWorkflow = async (kind: 'process' | 'ready' | 'cancel') => {
    if (!raw) return
    setSaving(true)
    try {
      if (kind === 'process') await processLabOrder(raw.id)
      else if (kind === 'ready') await markLabOrderReady(raw.id)
      else await cancelLabOrder(raw.id)
      success(
        kind === 'process' ? 'Order processing' : kind === 'ready' ? 'Order ready' : 'Order cancelled',
        `${raw.id} updated.`,
      )
      detail.refresh()
    } catch (err) {
      error('Action failed', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  const openResults = () => {
    if (!raw) return
    const initial: Record<string, { result: string; unit: string; reference_range: string; status: 'Normal' | 'Abnormal' | 'Pending' }> = {}
    for (const item of raw.items) {
      initial[item.id] = {
        result: item.result,
        unit: item.unit,
        reference_range: item.reference_range,
        status: item.status === 'Pending' ? 'Normal' : item.status,
      }
    }
    setResultValues(initial)
    setResultsOpen(true)
  }

  const submitResults = async () => {
    if (!raw) return
    setSaving(true)
    try {
      await updateLabResults(
        raw.id,
        Object.entries(resultValues).map(([item, values]) => ({ item, ...values })),
      )
      success('Results saved', `${raw.id} results updated.`)
      setResultsOpen(false)
      detail.refresh()
    } catch (err) {
      error('Failed to save results', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  if (detail.loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild><Link to="/lab"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        <ApiLoading label="Loading lab order…" />
      </div>
    )
  }

  if (detail.error || !order || !raw) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild><Link to="/lab"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        {detail.error && detail.errorStatus !== 404 ? (
          <ApiErrorState message={detail.error} onRetry={detail.refresh} />
        ) : (
          <EmptyState title="Lab order not found" description={`No order ${id ?? ''}.`} action={<Button asChild><Link to="/lab">Back to lab</Link></Button>} />
        )}
      </div>
    )
  }

  const stageIdx = STAGES.indexOf(order.status === 'Cancelled' ? 'Pending' : order.status)
  const actionable = staff && order.status !== 'Completed' && order.status !== 'Cancelled'

  return (
    <div className="space-y-4">
      <PageHeader
        title={order.id}
        description={`Ordered ${order.orderedDate} · ${order.priority} priority`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/lab"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
            <Button variant="outline" size="sm" onClick={() => success('Upload dialog opened', 'Report upload is not connected to storage in this phase.')}><Upload className="mr-1 h-4 w-4" /> Upload Report</Button>
            <Button variant="outline" size="sm" onClick={() => success('Report viewer opened', raw.report_reference || 'No report reference on file.')}><Eye className="mr-1 h-4 w-4" /> View Report</Button>
            <Button size="sm" onClick={() => success('Download started', `${order.id}-report.pdf`)}><Download className="mr-1 h-4 w-4" /> Download Report</Button>
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
            {actionable && (
              <div className="flex flex-wrap gap-2 pt-2">
                {order.status === 'Pending' && canProcess && (
                  <Button size="sm" disabled={saving} onClick={() => runWorkflow('process')}><Check className="mr-1 h-4 w-4" /> Start Processing</Button>
                )}
                {order.status === 'Processing' && canProcess && (
                  <>
                    <Button size="sm" variant="outline" onClick={openResults}>Enter Results</Button>
                    <Button size="sm" disabled={saving} onClick={() => runWorkflow('ready')}><Check className="mr-1 h-4 w-4" /> Mark Ready</Button>
                  </>
                )}
                {order.status === 'Ready' && canProcess && (
                  <Button size="sm" variant="outline" onClick={openResults}>Update Results</Button>
                )}
                {(order.status === 'Pending' || order.status === 'Processing') && canProcess && (
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={saving} onClick={() => runWorkflow('cancel')}><XCircle className="mr-1 h-4 w-4" /> Cancel Order</Button>
                )}
              </div>
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

      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Enter results · {order.id}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {raw.items.map((item) => (
              <div key={item.id} className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-semibold">{item.test_name} <span className="font-normal text-muted-foreground">({item.test_code})</span></p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Result</Label><Input value={resultValues[item.id]?.result ?? ''} onChange={(e) => setResultValues((prev) => ({ ...prev, [item.id]: { ...prev[item.id], result: e.target.value } }))} placeholder="e.g. 13.5" /></div>
                  <div className="space-y-1.5"><Label>Unit</Label><Input value={resultValues[item.id]?.unit ?? ''} onChange={(e) => setResultValues((prev) => ({ ...prev, [item.id]: { ...prev[item.id], unit: e.target.value } }))} placeholder="e.g. g/dL" /></div>
                  <div className="space-y-1.5"><Label>Reference range</Label><Input value={resultValues[item.id]?.reference_range ?? ''} onChange={(e) => setResultValues((prev) => ({ ...prev, [item.id]: { ...prev[item.id], reference_range: e.target.value } }))} placeholder="e.g. 13–17" /></div>
                  <div className="space-y-1.5"><Label>Result status</Label>
                    <Select value={resultValues[item.id]?.status ?? 'Normal'} onValueChange={(v) => setResultValues((prev) => ({ ...prev, [item.id]: { ...prev[item.id], status: v as 'Normal' | 'Abnormal' | 'Pending' } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['Normal', 'Abnormal', 'Pending'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultsOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={submitResults}>{saving ? 'Saving…' : 'Save Results'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
