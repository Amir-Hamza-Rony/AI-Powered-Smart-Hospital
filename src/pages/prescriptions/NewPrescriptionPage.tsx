import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useHospitalStore, nextId } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import type { FullPrescription, PrescriptionMedicine } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const EMPTY_MED: PrescriptionMedicine = { name: '', strength: '', dosage: '1 tablet', frequency: '3 times daily', duration: '5 days', route: 'Oral', instructions: 'After meal' }

export function NewPrescriptionPage() {
  const { patients, doctors, prescriptions, addPrescription } = useHospitalStore()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [visitDate, setVisitDate] = useState('2026-10-01')
  const [complaint, setComplaint] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([{ ...EMPTY_MED }])
  const [followUpRequired, setFollowUpRequired] = useState(true)
  const [followUpDate, setFollowUpDate] = useState('2026-10-15')
  const [followUpInstructions, setFollowUpInstructions] = useState('')

  const updateMed = (idx: number, patch: Partial<PrescriptionMedicine>) =>
    setMedicines((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !doctorId || !diagnosis.trim()) {
      error('Missing required fields', 'Select patient, doctor and enter a diagnosis.')
      return
    }
    if (medicines.some((m) => !m.name.trim())) {
      error('Medicine name required', 'Every medicine row needs a name.')
      return
    }
    const patient = patients.find((p) => p.id === patientId)
    const doctor = doctors.find((d) => d.id === doctorId)
    const id = nextId('RX', prescriptions.map((p) => p.id))
    const rx: FullPrescription = {
      id,
      patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : patientId,
      patientAge: patient?.age ?? 30,
      patientGender: patient?.gender ?? 'Male',
      patientBloodGroup: patient?.bloodGroup ?? 'O+',
      patientPhone: patient?.phone ?? '',
      doctorId,
      doctorName: doctor?.name ?? doctorId,
      doctorSpecialty: doctor?.specialty ?? '',
      doctorRegistrationNo: doctor?.registrationNo ?? '',
      date: visitDate,
      chiefComplaint: complaint,
      diagnosis,
      symptoms: complaint,
      clinicalNotes: notes,
      medicines,
      followUpRequired,
      followUpDate: followUpRequired ? followUpDate : '',
      followUpInstructions,
      status: 'Active',
    }
    addPrescription(rx)
    success('Prescription created', `${id} saved to mock state.`)
    navigate(`/prescriptions/${id}`)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Prescription"
        description="Create a prescription — saved to frontend mock state only."
        actions={<Button variant="outline" size="sm" asChild><Link to="/prescriptions"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>}
      />
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Visit Information</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Doctor *</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} · {d.specialty}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Visit Date</Label>
              <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label>Chief Complaint</Label>
              <Input value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="e.g. Fever and sore throat for 3 days" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label>Diagnosis *</Label>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Acute pharyngitis" />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label>Clinical Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Examination findings, advice…" rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Medicines ({medicines.length})</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setMedicines((p) => [...p, { ...EMPTY_MED }])}><Plus className="mr-1 h-4 w-4" /> Add Medicine</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {medicines.map((m, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5 lg:col-span-2"><Label>Medicine name *</Label><Input value={m.name} onChange={(e) => updateMed(idx, { name: e.target.value })} placeholder="Paracetamol" /></div>
                <div className="space-y-1.5"><Label>Strength</Label><Input value={m.strength} onChange={(e) => updateMed(idx, { strength: e.target.value })} placeholder="500 mg" /></div>
                <div className="space-y-1.5"><Label>Dosage</Label><Input value={m.dosage} onChange={(e) => updateMed(idx, { dosage: e.target.value })} placeholder="1 tablet" /></div>
                <div className="space-y-1.5"><Label>Frequency</Label><Input value={m.frequency} onChange={(e) => updateMed(idx, { frequency: e.target.value })} placeholder="3 times daily" /></div>
                <div className="space-y-1.5"><Label>Duration</Label><Input value={m.duration} onChange={(e) => updateMed(idx, { duration: e.target.value })} placeholder="5 days" /></div>
                <div className="space-y-1.5"><Label>Route</Label><Input value={m.route} onChange={(e) => updateMed(idx, { route: e.target.value })} placeholder="Oral" /></div>
                <div className="space-y-1.5"><Label>Instructions</Label><Input value={m.instructions} onChange={(e) => updateMed(idx, { instructions: e.target.value })} placeholder="After meal" /></div>
                <div className="flex items-end sm:col-span-2 lg:col-span-4">
                  <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={medicines.length === 1} onClick={() => setMedicines((p) => p.filter((_, i) => i !== idx))}><Trash2 className="mr-1 h-4 w-4" /> Remove Medicine</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Follow-up</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Follow-up required</Label>
              <Select value={followUpRequired ? 'yes' : 'no'} onValueChange={(v) => setFollowUpRequired(v === 'yes')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Follow-up date</Label><Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} disabled={!followUpRequired} /></div>
            <div className="space-y-1.5"><Label>Follow-up instructions</Label><Input value={followUpInstructions} onChange={(e) => setFollowUpInstructions(e.target.value)} placeholder="Bring reports…" disabled={!followUpRequired} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs text-muted-foreground">
            <p>Doctor signature placeholder — name & registration auto-filled from selected doctor on submit.</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild><Link to="/prescriptions">Cancel</Link></Button>
              <Button type="submit">Save Prescription</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
