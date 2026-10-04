import { useState } from 'react'
import { MoreHorizontal, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { DispensingStatusBadge } from '@/components/phase3/StatusBadges'
import type { DispensingRecord } from '@/data/types'
import {
  cancelDispensing,
  dispenseRecord,
  listDispensing,
  type BackendDispensingRecord,
} from '@/lib/api/pharmacy'
import { toDispensingRecord } from '@/lib/api/adapters'
import { canManageInventory, useApiList } from '@/lib/api/hooks'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 8

export function DispensingPage() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [active, setActive] = useState<BackendDispensingRecord | null>(null)
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)
  const manageable = canManageInventory(user?.role ?? null)

  const list = useApiList(
    ({ page, page_size }) =>
      listDispensing({
        search: query.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        page,
        page_size,
      }),
    [query, status],
    PAGE_SIZE,
  )

  const reset = () => list.setPage(1)
  const rows: DispensingRecord[] = list.items.map(toDispensingRecord)
  const rawById = new Map(list.items.map((r) => [r.id, r]))

  const openDispense = (d: DispensingRecord) => {
    const raw = rawById.get(d.id) ?? null
    setActive(raw)
    setQty(raw ? String(raw.items.reduce((sum, item) => sum + item.remaining, 0)) : '')
  }

  const confirmDispense = async () => {
    if (!active) return
    const remaining = active.items.reduce((sum, item) => sum + item.remaining, 0)
    const n = Number(qty)
    if (!Number.isInteger(n) || n <= 0 || n > remaining) {
      error('Invalid quantity', `Enter 1–${remaining}.`)
      return
    }
    setSaving(true)
    try {
      // Distribute across items in order; the backend deducts FEFO batches.
      let left = n
      const lines: Array<{ id: string; quantity: number }> = []
      for (const item of active.items) {
        if (left <= 0) break
        const take = Math.min(item.remaining, left)
        if (take > 0) {
          lines.push({ id: item.id, quantity: take })
          left -= take
        }
      }
      await dispenseRecord(active.id, lines)
      success('Dispensing recorded', `${n} unit(s) dispensed — stock updated by the backend.`)
      setActive(null)
      list.refresh()
    } catch (err) {
      error('Dispense failed', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  const confirmCancel = async (d: DispensingRecord) => {
    try {
      await cancelDispensing(d.id)
      success('Dispensing cancelled', d.id)
      list.refresh()
    } catch (err) {
      error('Cancel failed', err instanceof ApiError ? err.message : 'Request failed.')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Dispensing" description="Dispense against prescriptions — stock deducted by the backend (FEFO)." />
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by prescription, patient or medicine…" value={query} onChange={(e) => { setQuery(e.target.value); reset() }} className="pl-9" aria-label="Search dispensing" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); reset() }}>
            <SelectTrigger className="sm:w-[240px]" aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {['Pending', 'Partially Dispensed', 'Dispensed', 'Cancelled'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      {list.loading ? (
        <ApiLoading label="Loading dispensing records…" />
      ) : list.errorStatus === 403 ? (
        <ApiForbiddenState message={list.error} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={list.refresh} />
      ) : rows.length === 0 ? (
        <EmptyState title="No dispensing records" description="Try adjusting search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prescription</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Prescribed</TableHead>
                    <TableHead>Dispensed</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    {manageable && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap font-medium">{d.prescriptionId.slice(0, 8)}</TableCell>
                      <TableCell className="whitespace-nowrap">{d.patientName}</TableCell>
                      <TableCell className="whitespace-nowrap">{d.medicine}</TableCell>
                      <TableCell>{d.prescribedQuantity}</TableCell>
                      <TableCell>{d.dispensedQuantity}</TableCell>
                      <TableCell>{d.prescribedQuantity - d.dispensedQuantity}</TableCell>
                      <TableCell><DispensingStatusBadge status={d.status} /></TableCell>
                      {manageable && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${d.id}`}><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(d.status === 'Pending' || d.status === 'Partially Dispensed') && (
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openDispense(d)}>Dispense…</DropdownMenuItem>
                              )}
                              {(d.status === 'Pending' || d.status === 'Partially Dispensed') && (
                                <DropdownMenuItem className="cursor-pointer" onClick={() => confirmCancel(d)}>Cancel</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={list.setPage} />
          </CardContent>
        </Card>
      )}
      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dispense {active ? toDispensingRecord(active).medicine : ''}</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-2 py-2 text-sm">
              <p><strong>{toDispensingRecord(active).patientName}</strong> · prescribed {toDispensingRecord(active).prescribedQuantity} · already dispensed {toDispensingRecord(active).dispensedQuantity}</p>
              <Label>Quantity to dispense now</Label>
              <Input type="number" min={1} max={toDispensingRecord(active).prescribedQuantity - toDispensingRecord(active).dispensedQuantity} value={qty} onChange={(e) => setQty(e.target.value)} />
              <p className="text-xs text-muted-foreground">Stock is deducted by the backend using earliest-expiry batches first.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button disabled={saving} onClick={confirmDispense}>{saving ? 'Dispensing…' : 'Confirm Dispense'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
