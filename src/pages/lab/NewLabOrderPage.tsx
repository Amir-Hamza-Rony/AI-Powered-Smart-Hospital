import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { ApiLoading } from '@/components/shared/ApiState'
import { createLabOrder, listLabTests, type BackendLabTest } from '@/lib/api/laboratory'
import { listActiveDoctorsLookup, listPatientsLookup, type LookupDoctor, type LookupPatient } from '@/lib/api/lookups'
import type { LabPriority } from '@/data/types'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function NewLabOrderPage() {
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<LookupPatient[]>([])
  const [doctors, setDoctors] = useState<LookupDoctor[]>([])
  const [tests, setTests] = useState<BackendLabTest[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(true)
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [priority, setPriority] = useState<LabPriority>('Normal')
  const [instructions, setInstructions] = useState('')
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([listPatientsLookup(), listActiveDoctorsLookup(), listLabTests({ page_size: 100 })])
      .then(([patientsPage, doctorsPage, testsPage]) => {
        if (!active) return
        setPatients(patientsPage.results)
        setDoctors(doctorsPage.results)
        setTests(testsPage.results.filter((t) => t.status === 'Active'))
      })
      .catch(() => {
        if (active) error('Failed to load lookups', 'Patient/doctor/test lists could not be loaded.')
      })
      .finally(() => {
        if (active) setLookupsLoading(false)
      })
    return () => {
      active = false
    }
  }, [error])

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((s) => s !== id) : [...p, id]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !doctorId) {
      error('Missing required fields', 'Select patient and doctor.')
      return
    }
    if (selected.length === 0) {
      error('No tests selected', 'Add at least one test to the order.')
      return
    }
    setSaving(true)
    try {
      const created = await createLabOrder({
        patient: patientId,
        doctor: doctorId,
        order_date: new Date().toISOString().slice(0, 10),
        priority,
        instructions,
        notes,
        items: selected.map((test) => ({ test })),
      })
      success('Lab order created', `Order with ${selected.length} test(s) saved.`)
      navigate(`/lab/${created.id}`)
    } catch (err) {
      error('Failed to create lab order', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="New Lab Order" description="Create a diagnostic order for a real patient." actions={<Button variant="outline" size="sm" asChild><Link to="/lab"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>} />
      {lookupsLoading ? (
        <ApiLoading label="Loading patients, doctors and tests…" />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Order Information</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
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
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as LabPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Normal', 'Urgent', 'Emergency'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Preparation instructions</Label>
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
              {tests.length === 0 && (
                <p className="text-sm text-muted-foreground">No active lab tests in the catalog.</p>
              )}
              {tests.map((t) => (
                <label key={t.id} className="flex cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-border p-2.5 text-sm hover:bg-muted/50">
                  <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} className="h-4 w-4 accent-current" />
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.category} · {t.sample_type} · {t.turnaround_time} · ৳{t.price}</span>
                </label>
              ))}
              {selected.length > 0 && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-semibold">Selected tests:</p>
                  <ul className="mt-1 space-y-1">
                    {selected.map((sid) => {
                      const t = tests.find((x) => x.id === sid)
                      return <li key={sid} className="flex items-center justify-between gap-2"><span>{t?.name}</span><Button type="button" size="sm" variant="ghost" onClick={() => toggle(sid)}><Trash2 className="h-3.5 w-3.5" /></Button></li>
                    })}
                  </ul>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" asChild><Link to="/lab">Cancel</Link></Button>
                <Button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit Lab Order'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
