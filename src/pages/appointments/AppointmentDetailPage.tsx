import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock, User } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge'
import { AppointmentTimeline } from '@/components/appointments/AppointmentTimeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BackendAppointment } from '@/lib/api/appointments'
import {
  getAppointment,
  deleteAppointment,
  confirmAppointment,
  completeAppointment,
  cancelAppointment,
} from '@/lib/api/appointments'
import { toAppointment } from '@/lib/api/adapters'
import { useApiDetail } from '@/lib/api/hooks'
import { canManageAppointments } from '@/lib/api/hooks'
import { useAuth } from '@/context/AuthContext'

export function AppointmentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const canManage = canManageAppointments(user?.role ?? null)
  const [confirmTarget, setConfirmTarget] = useState<'Confirmed' | 'Completed' | 'Cancelled' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const apptQuery = useApiDetail<BackendAppointment>(
    id ? () => getAppointment(id) : () => Promise.reject(new Error('No appointment ID')),
    [id],
  )
  const appointment = apptQuery.data ? toAppointment(apptQuery.data) : undefined

  if (!id) {
    return (
      <EmptyState
        title="Appointment not found"
        description="No appointment ID provided."
        action={<Button asChild><Link to="/appointments">Back to Appointments</Link></Button>}
      />
    )
  }

  if (apptQuery.errorStatus === 403) return <ApiForbiddenState message={null} />
  if (apptQuery.error) return <ApiErrorState message={apptQuery.error} onRetry={() => apptQuery.refresh()} />
  if (apptQuery.loading || !appointment) return <ApiLoading />

  const actionable = appointment.status === 'Pending' || appointment.status === 'Confirmed'

  const handleStatusChange = async (target: 'Confirmed' | 'Completed' | 'Cancelled') => {
    if (!canManage) return
    try {
      const fn = {
        Confirmed: confirmAppointment,
        Completed: completeAppointment,
        Cancelled: cancelAppointment,
      }[target]
      await fn(id)
      setConfirmTarget(null)
      apptQuery.refresh()
      success(`Appointment ${target.toLowerCase()}`, `${appointment.id} updated.`)
    } catch (err) {
      error('Status change failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  const handleDelete = async () => {
    if (!canManage) return
    try {
      await deleteAppointment(id)
      success('Appointment deleted', `${appointment.id} removed.`)
      navigate('/appointments')
    } catch (err) {
      error('Delete failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="w-fit">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      <PageHeader
        title={appointment.id}
        description={`${appointment.date} · ${appointment.time} · ${appointment.type}`}
        actions={<AppointmentStatusBadge status={appointment.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Patient</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Link to={`/patients/${appointment.patientId}`} className="font-semibold text-primary hover:underline">
              {appointment.patientName}
            </Link>
            <p className="text-muted-foreground">{appointment.patientId}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Doctor</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Link to={`/doctors/${appointment.doctorId}`} className="font-semibold text-primary hover:underline">
              {appointment.doctorName}
            </Link>
            <p className="text-muted-foreground">{appointment.specialty}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Appointment Information</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <InfoRow label="Date" value={appointment.date} icon={<CalendarDays className="h-3.5 w-3.5" />} />
          <InfoRow label="Time" value={appointment.time} icon={<Clock className="h-3.5 w-3.5" />} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</p>
            <p className="mt-0.5"><Badge variant="outline">{appointment.type}</Badge></p>
          </div>
          <InfoRow label="Created" value={appointment.createdAt} />
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason</p>
            <p className="mt-0.5">{appointment.reason}</p>
          </div>
          {appointment.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="mt-0.5 text-muted-foreground">{appointment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
        <CardContent><AppointmentTimeline status={appointment.status} /></CardContent>
      </Card>

      {actionable && canManage && (
        <div className="flex flex-wrap gap-2">
          {appointment.status === 'Pending' && (
            <Button onClick={() => handleStatusChange('Confirmed')}>Confirm</Button>
          )}
          <Button variant="outline" onClick={() => success('Reschedule', 'Rescheduling is available via edit in a future iteration.')}>
            Reschedule
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => handleStatusChange('Cancelled')}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => handleStatusChange('Completed')}>Mark Completed</Button>
          <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      )}

      {confirmTarget && (
        <ConfirmDialog
          open={true}
          onOpenChange={(o) => { if (!o) setConfirmTarget(null) }}
          title={`${confirmTarget} appointment ${appointment.id}?`}
          description="This updates the backend record."
          confirmLabel={confirmTarget}
          destructive={confirmTarget === 'Cancelled'}
          onConfirm={() => handleStatusChange(confirmTarget)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${appointment.id}?`}
        description="This removes the appointment record. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5">{icon}{value}</p>
    </div>
  )
}
