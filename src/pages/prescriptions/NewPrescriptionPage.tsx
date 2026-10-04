import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { ApiLoading } from '@/components/shared/ApiState'
import { createPrescription, type PrescriptionItemInput } from '@/lib/api/prescriptions'
import { listActiveDoctorsLookup, listPatientsLookup, type LookupDoctor, type LookupPatient } from '@/lib/api/lookups'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface MedicineRow {
  name: string
  strength: string
  dosage: string
  frequency: string
  duration: string
  route: string
  quantity: string
  instructions: string
}

const EMPTY_MED: MedicineRow = { name: '', strength: '', dosage: '1 tablet', frequency: '3 times daily', duration: '5 days', route: 'Oral', quantity: '10', instructions: 'After meal' }

export function NewPrescriptionPage() {
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<LookupPatient[]>([])
  const [doctors, setDoctors] = useState<LookupDoctor[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(true)
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [visitDate, setVisitDate] = useState('2026-10-01')
  const [complaint, setComplaint] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [medicines, setMedicines] = useState<MedicineRow[]>([{ ...EMPTY_MED }])
  const [followUpRequired, setFollowUpRequired] = useState(true)
  const [followUpDate, setFollowUpDate] = useState('2026-10-15')
  const [followUpInstructions, setFollowUpInstructions] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([listPatientsLookup(), listActiveDoctorsLookup()])
      .then(([patientsPage, doctorsPage]) => {
        if (!active) return
        setPatients(patientsPage.results)
        setDoctors(doctorsPage.results)
      })
      .catch(() => {
        if (active) error('Failed to load lookups', 'Patient/doctor lists could not be loaded.')
      })
      .finally(() => {
        if (active) setLookupsLoading(false)
      })
    return () => {
      active = false
    }
  }, [error])

  const updateMed = (idx: number, patch: Partial<MedicineRow>) =>
    setMedicines((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !doctorId || !diagnosis.trim()) {
      error('Missing required fields', 'Select patient, doctor and enter a diagnosis.')
      return
    }
    if (medicines.some((m) => !m.name.trim())) {
      error('Medicine name required', 'Every medicine row needs a name.')
      return
    }
    if (medicines.some((m) => !Number.isInteger(Number(m.quantity)) || Number(m.quantity) <= 0)) {
      error('Invalid quantity', 'Every medicine needs a positive whole quantity.')
      return
    }
    setSaving(true)
    try {
      const items: PrescriptionItemInput[] = medicines.map((m) => ({
        medicine_name: m.name.trim(),
        strength: m.strength,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        route: m.route,
        quantity: Number(m.quantity),
        instructions: m.instructions,
      }))
      const created = await createPrescription({
        patient: patientId,
        doctor: doctorId,
        date: visitDate,
        chief_complaint: complaint,
        diagnosis,
        symptoms: complaint,
        clinical_notes: notes,
        follow_up_required: followUpRequired,
        follow_up_date: followUpRequired ? followUpDate || null : null,
        follow_up_instructions: followUpInstructions,
        items,
      })
      success('Prescription created', `${created.id} saved.`)
      navigate(`/prescriptions/${created.id}`)
    } catch (err) {
      error(
        'Failed to create prescription',
        err instanceof ApiError ? err.message : 'Request failed.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Prescription"
        description="Create a prescription linked to a real patient and doctor."
        actions={<Button variant="outline" size="sm" asChild><Link to="/prescriptions"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>}
      />
      {lookupsLoading ? (
        <ApiLoading label="Loading patients and doctors…" />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Visit Information</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Patient *</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.phone})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Doctor *</Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} · {d.specialization}</SelectItem>)}</SelectContent>
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
                  <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" min={1} step={1} value={m.quantity} onChange={(e) => updateMed(idx, { quantity: e.target.value })} placeholder="10" /></div>
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
              <p>Doctor signature placeholder — name &amp; registration auto-filled from selected doctor on submit.</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" asChild><Link to="/prescriptions">Cancel</Link></Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Prescription'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
