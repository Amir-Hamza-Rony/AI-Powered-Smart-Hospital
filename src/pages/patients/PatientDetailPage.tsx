import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CalendarCheck, FileText, FlaskConical, HeartPulse, Pencil, Phone, Mail,
  MapPin, Pill, QrCode, Siren, Upload,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { StatCard } from '@/components/shared/StatCard'
import { PatientQRCard } from '@/components/patients/PatientQRCard'
import { PatientMedicalTimeline } from '@/components/patients/PatientMedicalTimeline'
import { initials } from '@/components/patients/PatientTable'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Appointment } from '@/data/types'
import type { BackendAppointment } from '@/lib/api/appointments'
import { listAppointments } from '@/lib/api/appointments'
import type { BackendPatient } from '@/lib/api/patients'
import { getPatient, deletePatient } from '@/lib/api/patients'
import { toPatient } from '@/lib/api/adapters'
import { toAppointment } from '@/lib/api/adapters'
import { useApiDetail } from '@/lib/api/hooks'
import { canManagePatients } from '@/lib/api/hooks'

export function PatientDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const canManage = canManagePatients(user?.role ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const patientQuery = useApiDetail<BackendPatient | null>(
    id ? () => getPatient(id) : () => Promise.resolve(null),
    [id],
  )
  const patient = patientQuery.data ? toPatient(patientQuery.data) : undefined

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [apptsLoading, setApptsLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    setApptsLoading(true)
    listAppointments({ patient: id, page_size: 50 })
      .then((page: { results: BackendAppointment[] }) => {
        if (active) setAppointments(page.results.map(toAppointment))
      })
      .catch(() => {
        if (active) setAppointments([])
      })
      .finally(() => {
        if (active) setApptsLoading(false)
      })
    return () => { active = false }
  }, [id])

  if (!id) {
    return (
      <EmptyState
        title="Patient not found"
        description="No patient ID provided."
        action={<Button asChild><Link to="/patients">Back to Patients</Link></Button>}
      />
    )
  }

  if (patientQuery.errorStatus === 403) return <ApiForbiddenState message={null} />
  if (patientQuery.error) return <ApiErrorState message={patientQuery.error} onRetry={() => patientQuery.refresh()} />
  if (patientQuery.loading || !patient) return <ApiLoading />

  const handleDelete = async () => {
    if (!canManage) return
    try {
      await deletePatient(id)
      success('Patient deleted', `${patient.firstName} ${patient.lastName} removed.`)
      navigate('/patients')
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
        title={`${patient.firstName} ${patient.lastName}`}
        description={`${patient.id} · ${patient.age}y · ${patient.gender} · ${patient.bloodGroup}`}
        actions={
          <>
            <Button variant="outline" asChild disabled={!canManage}>
              <Link to={`/patients/${patient.id}/edit`}><Pencil className="mr-1 h-4 w-4" /> Edit</Link>
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={!canManage}>Delete</Button>
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
              {initials(patient.firstName, patient.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">{patient.firstName} {patient.lastName}</h2>
              <Badge>{patient.status}</Badge>
              <Badge variant="outline">{patient.bloodGroup}</Badge>
            </div>
            <div className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {patient.phone}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {patient.email}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {patient.address}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground"><Siren className="h-3.5 w-3.5" /> {patient.emergencyContact} · {patient.emergencyPhone}</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">DOB: {patient.dob} · NID: {patient.nid}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={HeartPulse} label="Total Visits" value={patient.totalVisits} />
        <StatCard icon={CalendarCheck} label="Upcoming Appointments" value={patient.upcomingAppointments} />
        <StatCard icon={FileText} label="Active Conditions" value={patient.chronicConditions.length} />
        <StatCard icon={Pill} label="Prescriptions" value={patient.prescriptions.length} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Medical History</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="labs">Lab Reports</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Medical Information</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="Chronic conditions" value={patient.chronicConditions.join(', ') || 'None recorded'} />
                <InfoRow label="Allergies" value={patient.allergies.join(', ') || 'None recorded'} />
                <InfoRow label="Previous surgeries" value={patient.surgeries.join(', ') || 'None recorded'} />
                <InfoRow label="Current medications" value={patient.currentMedications.join('; ') || 'None'} />
                <InfoRow label="Family history" value={patient.familyHistory} />
                <InfoRow label="Important notes" value={patient.notes || '—'} />
              </CardContent>
            </Card>
            <PatientQRCard patient={patient} />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-base">Medical History Timeline</CardTitle></CardHeader>
            <CardContent><PatientMedicalTimeline visits={patient.history} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader><CardTitle className="text-base">Appointments ({appointments.length})</CardTitle></CardHeader>
            <CardContent>
              {apptsLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Loading appointments…</p>
              ) : appointments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No appointments for this patient.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Doctor</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {appointments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell><Link to={`/appointments/${a.id}`} className="font-medium text-primary hover:underline">{a.id}</Link></TableCell>
                          <TableCell>{a.doctorName}</TableCell>
                          <TableCell className="whitespace-nowrap">{a.date}</TableCell>
                          <TableCell className="whitespace-nowrap">{a.time}</TableCell>
                          <TableCell>{a.type}</TableCell>
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

        <TabsContent value="prescriptions">
          <Card>
            <CardHeader><CardTitle className="text-base">Prescriptions</CardTitle></CardHeader>
            <CardContent>
              {patient.prescriptions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No prescriptions yet.</p>
              ) : (
                <div className="space-y-2">
                  {patient.prescriptions.map((rx) => (
                    <div key={rx.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                      <div>
                        <p className="font-medium">{rx.medicines}</p>
                        <p className="text-xs text-muted-foreground">{rx.id} · {rx.date} · {rx.doctor} · {rx.dosage}</p>
                      </div>
                      <Badge variant={rx.status === 'Active' ? 'default' : 'secondary'}>{rx.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labs">
          <Card>
            <CardHeader><CardTitle className="text-base">Lab Reports</CardTitle></CardHeader>
            <CardContent>
              {patient.labReports.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No lab reports yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Test</TableHead><TableHead>Result</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {patient.labReports.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs text-muted-foreground">{l.id}</TableCell>
                          <TableCell className="font-medium"><span className="flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />{l.test}</span></TableCell>
                          <TableCell>{l.result}</TableCell>
                          <TableCell><Badge variant={l.status === 'Normal' ? 'secondary' : l.status === 'Abnormal' ? 'destructive' : 'outline'}>{l.status}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap">{l.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Documents</CardTitle>
              <Button size="sm" variant="outline" onClick={() => success('Upload (mock)', 'Document upload is frontend-only in Phase 2.')}>
                <Upload className="mr-1 h-4 w-4" /> Upload Document
              </Button>
            </CardHeader>
            <CardContent>
              {patient.documents.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {patient.documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <QrCode className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.type} · {d.date} · {d.size}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{d.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${patient.firstName} ${patient.lastName}?`}
        description="This removes the patient from the registry. This action cannot be undone."
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
