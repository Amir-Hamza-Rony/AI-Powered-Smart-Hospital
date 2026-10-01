import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { MOCK_LAB_TESTS } from '@/data/phase3'
import { useHospitalStore, nextId } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import type { LabOrder, LabPriority } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function NewLabOrderPage() {
  const { patients, doctors, labOrders, addLabOrder } = useHospitalStore()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [priority, setPriority] = useState<LabPriority>('Normal')
  const [instructions, setInstructions] = useState('')
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState<string[]>(['LT-001'])

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((s) => s !== id) : [...p, id]))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !doctorId) {
      error('Missing required fields', 'Select patient and doctor.')
      return
    }
    if (selected.length === 0) {
      error('No tests selected', 'Add at least one test to the order.')
      return
    }
    const patient = patients.find((p) => p.id === patientId)
    const doctor = doctors.find((d) => d.id === doctorId)
    const id = nextId('LAB', labOrders.map((o) => o.id))
    const order: LabOrder = {
      id,
      patientId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : patientId,
      doctorId,
      doctorName: doctor?.name ?? doctorId,
      tests: selected.map((tid) => {
        const t = MOCK_LAB_TESTS.find((x) => x.id === tid)
        return { testName: t?.name ?? tid, sampleType: t?.sampleType ?? '', referenceRange: '', result: '', unit: '', status: 'Pending' as const }
      }),
      orderedDate: '2026-10-01',
      priority,
      status: 'Pending',
      instructions,
      notes,
    }
    addLabOrder(order)
    success('Lab order created', `${id} with ${selected.length} test(s) saved to mock state.`)
    navigate(`/lab/${id}`)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="New Lab Order" description="Frontend-only — no backend submission." actions={<Button variant="outline" size="sm" asChild><Link to="/lab"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>} />
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Order Information</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
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
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as LabPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Normal', 'Urgent', 'Emergency'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sample type (hint)</Label>
              <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Fasting 12 hours required" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Additional notes…" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Select Tests ({selected.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {MOCK_LAB_TESTS.filter((t) => t.status === 'Active').map((t) => (
              <label key={t.id} className="flex cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-muted/50">
                <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} className="h-4 w-4 accent-current" />
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.category} · {t.sampleType} · {t.turnaroundTime} · ৳{t.price}</span>
              </label>
            ))}
            {selected.length > 0 && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-semibold">Selected tests:</p>
                <ul className="mt-1 space-y-1">
                  {selected.map((sid) => {
                    const t = MOCK_LAB_TESTS.find((x) => x.id === sid)
                    return <li key={sid} className="flex items-center justify-between gap-2"><span>{t?.name}</span><Button type="button" size="sm" variant="ghost" onClick={() => toggle(sid)}><Trash2 className="h-3.5 w-3.5" /></Button></li>
                  })}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" asChild><Link to="/lab"><Plus className="hidden" /> Cancel</Link></Button>
              <Button type="submit">Submit Lab Order</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
