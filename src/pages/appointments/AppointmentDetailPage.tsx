import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock, User } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge'
import { AppointmentTimeline } from '@/components/appointments/AppointmentTimeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AppointmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getAppointment, setAppointmentStatus, deleteAppointment } = useHospitalStore()
  const { success } = useToast()
  const [confirmTarget, setConfirmTarget] = useState<'Confirmed' | 'Completed' | 'Cancelled' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const appointment = id ? getAppointment(id) : undefined
  if (!appointment) {
    return (
      <EmptyState
        title="Appointment not found"
        description="This appointment ID does not exist in the mock data."
        action={<Button asChild><Link to="/appointments">Back to Appointments</Link></Button>}
      />
    )
  }

  const actionable = appointment.status === 'Pending' || appointment.status === 'Confirmed'

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

      {actionable && (
        <div className="flex flex-wrap gap-2">
          {appointment.status === 'Pending' && (
            <Button onClick={() => setConfirmTarget('Confirmed')}>Confirm</Button>
          )}
          <Button variant="outline" onClick={() => success('Reschedule (mock)', 'Rescheduling UI is frontend-only; edit date via a future iteration.')}>
            Reschedule
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmTarget('Cancelled')}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => setConfirmTarget('Completed')}>Mark Completed</Button>
          <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={`${confirmTarget ?? ''} appointment ${appointment.id}?`}
        description="Status changes update the local mock list only."
        confirmLabel={confirmTarget ?? 'Confirm'}
        destructive={confirmTarget === 'Cancelled'}
        onConfirm={() => {
          if (confirmTarget) {
            setAppointmentStatus(appointment.id, confirmTarget)
            success(`Appointment ${confirmTarget.toLowerCase()}`, `${appointment.id} updated in mock state.`)
          }
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${appointment.id}?`}
        description="This removes the appointment from the local mock list only."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteAppointment(appointment.id)
          success('Appointment deleted', `${appointment.id} removed from mock state.`)
          navigate('/appointments')
        }}
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
