import { useMemo, useState } from 'react'
import { MoreHorizontal, Search } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DispensingStatusBadge } from '@/components/phase3/StatusBadges'
import type { DispensingRecord, DispensingStatus } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function DispensingPage() {
  const { dispensing, setDispensingStatus } = useHospitalStore()
  const { success, error } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [active, setActive] = useState<DispensingRecord | null>(null)
  const [qty, setQty] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return dispensing.filter((d) => {
      if (status !== 'all' && d.status !== status) return false
      if (!q) return true
      return d.prescriptionId.toLowerCase().includes(q) || d.patientName.toLowerCase().includes(q) || d.medicine.toLowerCase().includes(q)
    })
  }, [dispensing, query, status])

  const openDispense = (d: DispensingRecord) => {
    setActive(d)
    setQty(String(d.prescribedQuantity - d.dispensedQuantity))
  }

  const confirmDispense = () => {
    if (!active) return
    const n = Number(qty)
    const remaining = active.prescribedQuantity - active.dispensedQuantity
    if (Number.isNaN(n) || n <= 0 || n > remaining) {
      error('Invalid quantity', `Enter 1–${remaining}.`)
      return
    }
    const newDispensed = active.dispensedQuantity + n
    const newStatus: DispensingStatus = newDispensed >= active.prescribedQuantity ? 'Dispensed' : 'Partially Dispensed'
    setDispensingStatus(active.id, newStatus, newDispensed)
    success('Dispensing recorded', `${active.id}: ${n} unit(s) dispensed (mock state).`)
    setActive(null)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Dispensing" description="Dispense against prescriptions · mock/local state only" />
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by prescription, patient or medicine…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" aria-label="Search dispensing" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-[240px]" aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {['Pending', 'Partially Dispensed', 'Dispensed', 'Cancelled'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      {filtered.length === 0 ? (
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
                    <TableHead>Doctor</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Prescribed</TableHead>
                    <TableHead>Dispensed</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap font-medium">{d.prescriptionId}</TableCell>
                      <TableCell className="whitespace-nowrap">{d.patientName}</TableCell>
                      <TableCell className="whitespace-nowrap">{d.doctorName}</TableCell>
                      <TableCell className="whitespace-nowrap">{d.medicine}</TableCell>
                      <TableCell>{d.prescribedQuantity}</TableCell>
                      <TableCell>{d.dispensedQuantity}</TableCell>
                      <TableCell>{d.prescribedQuantity - d.dispensedQuantity}</TableCell>
                      <TableCell><DispensingStatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${d.id}`}><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => openDispense(d)}>Dispense…</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => { setDispensingStatus(d.id, 'Cancelled'); success('Dispensing cancelled', `${d.id} (mock).`) }}>Cancel</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dispense {active?.medicine}</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-2 py-2 text-sm">
              <p><strong>{active.prescriptionId}</strong> · {active.patientName}</p>
              <p className="text-muted-foreground">Prescribed {active.prescribedQuantity} · already dispensed {active.dispensedQuantity} · remaining {active.prescribedQuantity - active.dispensedQuantity}</p>
              <Label>Quantity to dispense now</Label>
              <Input type="number" min={1} max={active.prescribedQuantity - active.dispensedQuantity} value={qty} onChange={(e) => setQty(e.target.value)} />
              <p className="text-xs text-muted-foreground">No real inventory change — mock state only.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={confirmDispense}>Confirm Dispense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
