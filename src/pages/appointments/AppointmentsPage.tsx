import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { SPECIALTIES } from '@/data/doctors'
import type { Appointment } from '@/data/types'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { DataPagination } from '@/components/shared/DataPagination'
import { AppointmentTable } from '@/components/appointments/AppointmentTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  listAppointments,
  deleteAppointment,
  confirmAppointment,
  completeAppointment,
  cancelAppointment,
  type AppointmentFilters,
} from '@/lib/api/appointments'
import { toAppointment } from '@/lib/api/adapters'
import { useApiList } from '@/lib/api/hooks'
import { canManageAppointments } from '@/lib/api/hooks'
import { useAuth } from '@/context/AuthContext'

const PAGE_SIZE = 8

export function AppointmentsPage() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const canManage = canManageAppointments(user?.role ?? null)
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [doctor, setDoctor] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: 'confirm' | 'complete' | 'cancel' } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const filters: AppointmentFilters = {
    doctor: doctor !== 'all' ? doctor : undefined,
    status: status !== 'all' ? status : undefined,
    date: date || undefined,
    search: query || undefined,
    page,
    page_size: PAGE_SIZE,
  }

  const list = useApiList<Appointment>(
    ({ page: p, page_size }) =>
      listAppointments({ ...filters, page: p, page_size }).then((page_) =>
        page_ ? { ...page_, results: page_.results.map(toAppointment) } : page_,
      ),
    [query, date, doctor, status, page],
    PAGE_SIZE,
  )

  const resetPage = () => setPage(1)

  const handleStatusChange = async (id: string, action: 'confirm' | 'complete' | 'cancel') => {
    if (!canManage) return
    try {
      const fn = { confirm: confirmAppointment, complete: completeAppointment, cancel: cancelAppointment }[action]
      await fn(id)
      list.refresh()
      success(`Appointment ${action === 'cancel' ? 'canceled' : action === 'complete' ? 'completed' : 'confirmed'}`, `${id} updated.`)
    } catch (err) {
      error('Status change failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!canManage) return
    try {
      await deleteAppointment(id)
      list.refresh()
      success('Appointment deleted', `${id} removed.`)
    } catch (err) {
      error('Delete failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  const applyAction = () => {
    if (!confirmTarget) return
    handleStatusChange(confirmTarget.id, confirmTarget.action)
    setConfirmTarget(null)
  }

  const actionCopy = {
    confirm: { title: 'Confirm appointment?', label: 'Confirm', destructive: false },
    complete: { title: 'Mark appointment as completed?', label: 'Mark Completed', destructive: false },
    cancel: { title: 'Cancel this appointment?', label: 'Cancel Appointment', destructive: true },
  }

  return (
    <div className="space-y-4">
      {list.errorStatus === 403 ? (
        <ApiForbiddenState message={null} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={resetPage} />
      ) : (
        <>
          <PageHeader
            title="Appointments"
            description={`${list.total} appointment${list.total === 1 ? '' : 's'} scheduled`}
            actions={
              canManage ? (
                <Button asChild disabled={list.loading}>
                  <Link to="/appointments/new">
                    <Plus className="mr-1 h-4 w-4" /> New Appointment
                  </Link>
                </Button>
              ) : null
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
                    disabled={list.loading}
                  />
                </div>
                <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); resetPage() }} aria-label="Date selector" disabled={list.loading} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={doctor} onValueChange={(v) => { setDoctor(v); resetPage() }} disabled={list.loading}>
                  <SelectTrigger aria-label="Doctor filter"><SelectValue placeholder="Doctor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All doctors</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v) => { setStatus(v); resetPage() }} disabled={list.loading}>
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

          {list.loading ? (
            <ApiLoading />
          ) : list.items.length === 0 ? (
            <EmptyState
              title="No appointments found"
              description="Try adjusting search, date or filters — or book a new appointment."
              action={
                canManage ? (
                  <Button asChild disabled={list.loading}>
                    <Link to="/appointments/new"><Plus className="mr-1 h-4 w-4" /> New Appointment</Link>
                  </Button>
                ) : null
              }
            />
          ) : (
            <Card>
              <CardContent className="p-2 sm:p-4">
                <AppointmentTable
                  appointments={list.items}
                  onAction={canManage ? (id, action) => setConfirmTarget({ id, action }) : undefined}
                  onDelete={canManage ? setPendingDelete : undefined}
                />
                <DataPagination
                  page={list.page}
                  totalPages={list.totalPages}
                  total={list.total}
                  pageSize={PAGE_SIZE}
                  onPageChange={list.setPage}
                />
              </CardContent>
            </Card>
          )}

          <ConfirmDialog
            open={confirmTarget !== null}
            onOpenChange={(o) => !o && setConfirmTarget(null)}
            title={confirmTarget ? `${actionCopy[confirmTarget.action].title} (${confirmTarget.id})` : ''}
            description="Status changes update the backend record."
            confirmLabel={confirmTarget ? actionCopy[confirmTarget.action].label : 'Confirm'}
            destructive={confirmTarget ? actionCopy[confirmTarget.action].destructive : false}
            onConfirm={applyAction}
          />

          <ConfirmDialog
            open={pendingDelete !== null}
            onOpenChange={(o) => !o && setPendingDelete(null)}
            title="Delete appointment?"
            description="This removes the appointment record. This action cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={() => {
              if (pendingDelete) handleDelete(pendingDelete)
            }}
          />
        </>
      )}
    </div>
  )
}
