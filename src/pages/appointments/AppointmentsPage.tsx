import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { SPECIALTIES } from '@/data/doctors'
import type { Appointment } from '@/data/types'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataPagination } from '@/components/shared/DataPagination'
import { AppointmentTable } from '@/components/appointments/AppointmentTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8

export function AppointmentsPage() {
  const { appointments, doctors, setAppointmentStatus, deleteAppointment } = useHospitalStore()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [doctor, setDoctor] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [confirmTarget, setConfirmTarget] = useState<{ a: Appointment; action: 'confirm' | 'complete' | 'cancel' } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Appointment | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return appointments.filter((a) => {
      if (date && a.date !== date) return false
      if (doctor !== 'all' && a.doctorId !== doctor) return false
      if (status !== 'all' && a.status !== status) return false
      if (!q) return true
      return (
        a.id.toLowerCase().includes(q) ||
        a.patientName.toLowerCase().includes(q) ||
        a.doctorName.toLowerCase().includes(q)
      )
    })
  }, [appointments, query, date, doctor, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const resetPage = () => setPage(1)

  const applyAction = () => {
    if (!confirmTarget) return
    const map = { confirm: 'Confirmed', complete: 'Completed', cancel: 'Cancelled' } as const
    setAppointmentStatus(confirmTarget.a.id, map[confirmTarget.action])
    success(
      `Appointment ${map[confirmTarget.action].toLowerCase()}`,
      `${confirmTarget.a.id} updated in mock state.`,
    )
  }

  const actionCopy = {
    confirm: { title: 'Confirm appointment?', label: 'Confirm', destructive: false },
    complete: { title: 'Mark appointment as completed?', label: 'Mark Completed', destructive: false },
    cancel: { title: 'Cancel this appointment?', label: 'Cancel Appointment', destructive: true },
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Appointments"
        description={`${filtered.length} appointment${filtered.length === 1 ? '' : 's'} · mock data`}
        actions={
          <Button asChild>
            <Link to="/appointments/new"><Plus className="mr-1 h-4 w-4" /> New Appointment</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="grid gap-2 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ID, patient or doctor…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); resetPage() }}
                className="pl-9"
                aria-label="Search appointments"
              />
            </div>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); resetPage() }} aria-label="Date selector" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={doctor} onValueChange={(v) => { setDoctor(v); resetPage() }}>
              <SelectTrigger aria-label="Doctor filter"><SelectValue placeholder="Doctor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All doctors</SelectItem>
                {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); resetPage() }}>
              <SelectTrigger aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">Specialties on roster: {SPECIALTIES.join(', ')}</p>
        </CardContent>
      </Card>

      {pageItems.length === 0 ? (
        <EmptyState
          title="No appointments found"
          description="Try adjusting search, date or filters — or book a new appointment."
          action={<Button asChild><Link to="/appointments/new"><Plus className="mr-1 h-4 w-4" /> New Appointment</Link></Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <AppointmentTable
              appointments={pageItems}
              onAction={(a, action) => setConfirmTarget({ a, action })}
              onDelete={setPendingDelete}
            />
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={confirmTarget ? `${actionCopy[confirmTarget.action].title} (${confirmTarget.a.id})` : ''}
        description="Status changes update the local mock list only."
        confirmLabel={confirmTarget ? actionCopy[confirmTarget.action].label : 'Confirm'}
        destructive={confirmTarget ? actionCopy[confirmTarget.action].destructive : false}
        onConfirm={applyAction}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.id ?? ''}?`}
        description="This removes the appointment from the local mock list only."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) {
            deleteAppointment(pendingDelete.id)
            success('Appointment deleted', `${pendingDelete.id} removed from mock state.`)
          }
        }}
      />
    </div>
  )
}
