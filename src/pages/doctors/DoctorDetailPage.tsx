import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Banknote, DoorOpen, Mail, Pencil, Phone, ShieldCheck, Star, Users } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { StatCard } from '@/components/shared/StatCard'
import { DoctorSchedule } from '@/components/doctors/DoctorSchedule'
import { doctorInitials } from '@/components/doctors/DoctorCard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Appointment } from '@/data/types'
import type { Patient } from '@/data/types'
import type { BackendDoctor } from '@/lib/api/doctors'
import { getDoctor, deleteDoctor } from '@/lib/api/doctors'
import { listAppointments } from '@/lib/api/appointments'
import { listPatients } from '@/lib/api/patients'
import { toDoctor } from '@/lib/api/adapters'
import { toPatient } from '@/lib/api/adapters'
import { toAppointment } from '@/lib/api/adapters'
import { useApiDetail } from '@/lib/api/hooks'
import { canManageDoctors } from '@/lib/api/hooks'

export function DoctorDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const canManage = canManageDoctors(user?.role ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const doctorQuery = useApiDetail<BackendDoctor | null>(
    id ? () => getDoctor(id) : () => Promise.resolve(null),
    [id],
  )
  const doctor = doctorQuery.data ? toDoctor(doctorQuery.data) : undefined

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingRel, setLoadingRel] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoadingRel(true)
    Promise.all([
      listAppointments({ doctor: id, page_size: 50 }),
      listPatients({ page_size: 50 }),
    ])
      .then(([apptPage, patientPage]) => {
        if (active) {
          setAppointments(apptPage.results.map(toAppointment))
          setPatients(patientPage.results.map(toPatient))
        }
      })
      .catch(() => {
        if (active) {
          setAppointments([])
          setPatients([])
        }
      })
      .finally(() => {
        if (active) setLoadingRel(false)
      })
    return () => { active = false }
  }, [id])

  if (!id) {
    return (
      <EmptyState
        title="Doctor not found"
        description="No doctor ID provided."
        action={<Button asChild><Link to="/doctors">Back to Doctors</Link></Button>}
      />
    )
  }

  if (doctorQuery.errorStatus === 403) return <ApiForbiddenState message={null} />
  if (doctorQuery.error) return <ApiErrorState message={doctorQuery.error} onRetry={() => doctorQuery.refresh()} />
  if (doctorQuery.loading || !doctor) return <ApiLoading />

  const doctorAppointments = appointments
  const recentPatients = patients.filter((p) => doctorAppointments.some((a) => a.patientId === p.id)).slice(0, 5)

  const handleDelete = async () => {
    if (!canManage) return
    try {
      await deleteDoctor(id)
      success('Doctor deleted', `${doctor.name} removed.`)
      navigate('/doctors')
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
        title={doctor.name}
        description={`${doctor.specialty} · ${doctor.id}`}
        actions={
          <>
            <Button variant="outline" asChild disabled={!canManage}>
              <Link to={`/doctors/${doctor.id}/edit`}><Pencil className="mr-1 h-4 w-4" /> Edit</Link>
            </Button>
            <Button asChild disabled={!canManage}>
              <Link to={`/appointments/new?doctor=${doctor.id}`}>Schedule</Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">{doctorInitials(doctor.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">{doctor.name}</h2>
              <Badge variant={doctor.availability === 'Available' ? 'default' : 'outline'}>{doctor.availability}</Badge>
              <Badge variant="secondary">{doctor.specialty}</Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {doctor.rating}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{doctor.qualification} · {doctor.experienceYears} years experience</p>
            <div className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {doctor.phone}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {doctor.email}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground"><DoorOpen className="h-3.5 w-3.5" /> {doctor.room}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> {doctor.registrationNo}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground"><Banknote className="h-3.5 w-3.5" /> Fee ৳{doctor.consultationFee}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" /> {doctor.department} department</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Patients" value={doctor.patientCount} />
        <StatCard icon={Star} label="Rating" value={doctor.rating} />
        <StatCard icon={Banknote} label="Fee" value={`৳${doctor.consultationFee}`} />
        <StatCard icon={DoorOpen} label="Duty" value={doctor.room.split(',')[0]} hint={doctor.department} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle className="text-base">Duty Information</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <InfoRow label="Department" value={doctor.department} />
              <InfoRow label="Room" value={doctor.room} />
              <InfoRow label="Availability status" value={doctor.availability} />
              <InfoRow label="Account status" value={doctor.status} />
              <InfoRow label="Weekly sessions" value={`${doctor.schedule.filter((s) => s.available).length} days / week`} />
              <InfoRow label="Open slots this week" value={`${doctor.schedule.reduce((n, s) => n + s.slots.length, 0)} slots`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader><CardTitle className="text-base">Weekly Availability</CardTitle></CardHeader>
            <CardContent><DoctorSchedule schedule={doctor.schedule} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader><CardTitle className="text-base">Appointments ({doctorAppointments.length})</CardTitle></CardHeader>
            <CardContent>
              {loadingRel ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Loading appointments…</p>
              ) : doctorAppointments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No appointments assigned.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {doctorAppointments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell><Link to={`/appointments/${a.id}`} className="font-medium text-primary hover:underline">{a.id}</Link></TableCell>
                          <TableCell>{a.patientName}</TableCell>
                          <TableCell className="whitespace-nowrap">{a.date}</TableCell>
                          <TableCell className="whitespace-nowrap">{a.time}</TableCell>
                          <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Patients</CardTitle></CardHeader>
            <CardContent>
              {loadingRel ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Loading patients…</p>
              ) : recentPatients.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No linked patients.</p>
              ) : (
                <div className="space-y-2">
                  {recentPatients.map((p) => (
                    <Link key={p.id} to={`/patients/${p.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/50">
                      <span className="font-medium">{p.firstName} {p.lastName}</span>
                      <Badge variant="outline">{p.id}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {doctorAppointments.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                    <span>{a.patientName} — {a.type} on {a.date}</span>
                    <Badge variant="outline">{a.status}</Badge>
                  </li>
                ))}
                {doctorAppointments.length === 0 && <p className="text-muted-foreground">No recent activity.</p>}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)} disabled={!canManage}>
          Delete doctor
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${doctor.name}?`}
        description="This removes the doctor from the roster. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  )
}
