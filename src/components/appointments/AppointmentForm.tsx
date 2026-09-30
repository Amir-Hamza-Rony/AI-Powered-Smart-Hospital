import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { AppointmentType } from '@/data/types'
import { nextId, useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { DoctorSchedule } from '@/components/doctors/DoctorSchedule'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function AppointmentForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { patients, doctors, appointments, addAppointment } = useHospitalStore()
  const { success } = useToast()

  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState(params.get('doctor') ?? '')
  const [date, setDate] = useState('2026-10-05')
  const [time, setTime] = useState('')
  const [type, setType] = useState<AppointmentType>('In-person')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const doctor = useMemo(() => doctors.find((d) => d.id === doctorId), [doctors, doctorId])
  const slots = useMemo(() => doctor?.schedule.flatMap((s) => (s.available ? s.slots : [])) ?? [], [doctor])
  const uniqueSlots = useMemo(() => [...new Set(slots)], [slots])

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!patientId) return setError('Please select a patient.')
    if (!doctorId) return setError('Please select a doctor.')
    if (!date) return setError('Please choose an appointment date.')
    if (!time) return setError('Please choose a time slot.')
    if (!reason.trim()) return setError('Please enter a reason for the visit.')
    setError('')

    const patient = patients.find((p) => p.id === patientId)!
    const doc = doctors.find((d) => d.id === doctorId)!
    const id = nextId('APT', appointments.map((a) => a.id))
    addAppointment({
      id, patientId, patientName: `${patient.firstName} ${patient.lastName}`,
      doctorId, doctorName: doc.name, specialty: doc.specialty,
      date, time, type, status: 'Pending',
      reason: reason.trim(), notes: notes.trim(),
      createdAt: '2026-09-30',
    })
    success('Appointment booked', `${id} · ${patient.firstName} with ${doc.name} on ${date} at ${time}.`)
    navigate('/appointments')
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Appointment Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="af-patient">Patient *</Label>
              <div className="mt-1.5">
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger id="af-patient"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="af-doctor">Doctor *</Label>
              <div className="mt-1.5">
                <Select value={doctorId} onValueChange={(v) => { setDoctorId(v); setTime('') }}>
                  <SelectTrigger id="af-doctor"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.filter((d) => d.status === 'Active').map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name} · {d.specialty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="af-date">Appointment Date *</Label>
              <Input id="af-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="af-type">Appointment Type</Label>
              <div className="mt-1.5">
                <Select value={type} onValueChange={(v) => setType(v as AppointmentType)}>
                  <SelectTrigger id="af-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['In-person', 'Follow-up', 'Emergency', 'Online'] as AppointmentType[]).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Available Time Slots {doctor ? `— ${doctor.name}` : ''}</Label>
              {!doctor ? (
                <p className="mt-1.5 text-sm text-muted-foreground">Select a doctor to see available slots.</p>
              ) : uniqueSlots.length === 0 ? (
                <p className="mt-1.5 text-sm text-muted-foreground">This doctor has no open slots this week.</p>
              ) : (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {uniqueSlots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTime(s)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                        time === s
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
                      )}
                      aria-pressed={time === s}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="af-reason">Reason for Visit *</Label>
              <Input id="af-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Chest pain review, fever, ANC checkup" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="af-notes">Notes</Label>
              <Textarea id="af-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for the doctor…" className="mt-1.5" />
            </div>
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
          </CardContent>
        </Card>

        {doctor && (
          <Card>
            <CardHeader><CardTitle className="text-base">Doctor Weekly Availability</CardTitle></CardHeader>
            <CardContent><DoctorSchedule schedule={doctor.schedule} compact /></CardContent>
          </Card>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit">Book Appointment</Button>
        </div>
      </div>
    </form>
  )
}
