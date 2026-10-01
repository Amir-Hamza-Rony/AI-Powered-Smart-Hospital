import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, PenLine, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { analyzePrescriptionMock } from '@/data/ai'
import type { AIAdvisorySeverity, AIPrescriptionAdvisory, AIProposedMedicine } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AIStatusBadge, AIAdvisoryBadge } from '@/components/ai/AIBadges'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { AIProcessingState } from '@/components/ai/AIProcessingState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const EMPTY_MED: AIProposedMedicine = { medicine: '', dose: '', frequency: '', duration: '', route: 'Oral' }

const SEVERITY_ORDER: Record<AIAdvisorySeverity, number> = { 'High Attention': 0, Caution: 1, Informational: 2 }

export function PrescriptionAdvisoryPage() {
  const { patients } = useHospitalStore()
  const { success, error } = useToast()

  const [patientId, setPatientId] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [currentMeds, setCurrentMeds] = useState('')
  const [proposed, setProposed] = useState<AIProposedMedicine[]>([{ ...EMPTY_MED }])

  const [analyzing, setAnalyzing] = useState(false)
  const [advisory, setAdvisory] = useState<AIPrescriptionAdvisory | null>(null)
  const [signed, setSigned] = useState(false)
  const [signOpen, setSignOpen] = useState(false)
  const [signer, setSigner] = useState('')

  const patient = patients.find((p) => p.id === patientId)

  const pickPatient = (id: string) => {
    setPatientId(id)
    const p = patients.find((x) => x.id === id)
    setCurrentMeds(p ? p.currentMedications.join('\n') : '')
    setAdvisory(null)
    setSigned(false)
  }

  const updateMed = (idx: number, patch: Partial<AIProposedMedicine>) =>
    setProposed((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)))

  const runAnalysis = () => {
    if (!patient) {
      error('Select a patient', 'A patient is required before running the advisory.')
      return
    }
    if (proposed.some((m) => !m.medicine.trim())) {
      error('Medicine name required', 'Every proposed row needs a medicine name.')
      return
    }
    setSigned(false)
    setAnalyzing(true)
  }

  const finishAnalysis = () => {
    if (!patient) {
      setAnalyzing(false)
      return
    }
    setAdvisory(
      analyzePrescriptionMock(
        patient,
        diagnosis,
        currentMeds.split('\n').map((s) => s.trim()).filter(Boolean),
        proposed,
      ),
    )
    setAnalyzing(false)
  }

  const sorted = advisory ? [...advisory.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) : []

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Prescription Advisory"
        description="Mock decision-support review · physician sign-off required, frontend only"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai">
              <ArrowLeft className="mr-1 h-4 w-4" /> AI Hub
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clinical Context</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Patient *</Label>
                <Select value={patientId} onValueChange={pickPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {patient && (
                  <p className="text-xs text-muted-foreground">
                    Allergies: {patient.allergies.length > 0 ? patient.allergies.join(', ') : 'none recorded'} · Chronic:{' '}
                    {patient.chronicConditions.length > 0 ? patient.chronicConditions.join(', ') : 'none'}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Diagnosis / clinical indication</Label>
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Stable angina with hypertension" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Current medications (one per line)</Label>
                <Textarea value={currentMeds} onChange={(e) => setCurrentMeds(e.target.value)} rows={2} placeholder="Pre-filled from patient record when available" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Proposed Medicines ({proposed.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => { setProposed((p) => [...p, { ...EMPTY_MED }]); setAdvisory(null); setSigned(false) }}>
                <Plus className="mr-1 h-4 w-4" /> Add Medicine
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {proposed.map((m, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <Label>Medicine *</Label>
                    <Input value={m.medicine} onChange={(e) => updateMed(idx, { medicine: e.target.value })} placeholder="e.g. Amlodipine" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Dose</Label>
                    <Input value={m.dose} onChange={(e) => updateMed(idx, { dose: e.target.value })} placeholder="e.g. 5 mg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <Input value={m.frequency} onChange={(e) => updateMed(idx, { frequency: e.target.value })} placeholder="e.g. Once daily" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration</Label>
                    <Input value={m.duration} onChange={(e) => updateMed(idx, { duration: e.target.value })} placeholder="e.g. 30 days" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Route</Label>
                    <Select value={m.route} onValueChange={(v) => updateMed(idx, { route: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Oral', 'Inhalation', 'Topical', 'Injection', 'Sublingual'].map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end sm:col-span-2 lg:col-span-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={proposed.length === 1}
                      onClick={() => { setProposed((p) => p.filter((_, i) => i !== idx)); setAdvisory(null); setSigned(false) }}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button onClick={runAnalysis} disabled={analyzing} className="w-full sm:w-auto">
                Analyze Prescription
              </Button>
            </CardContent>
          </Card>

          {analyzing && (
            <AIProcessingState
              headline="Reviewing doses, interactions and allergy overlaps..."
              steps={['Checking dose & frequency', 'Detecting duplicate therapy', 'Screening interactions', 'Cross-checking allergies', 'Compiling advisory']}
              onDone={finishAnalysis}
            />
          )}

          {!analyzing && !advisory && (
            <EmptyState title="No advisory yet" description="Fill in the proposed medicines and run the mock analysis to see decision-support findings." />
          )}

          {!analyzing && advisory && (
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Advisory Result</CardTitle>
                <span className="flex items-center gap-2">
                  <AIStatusBadge />
                  <AIAdvisoryBadge severity={advisory.overallSeverity} />
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{advisory.summary}</p>
                {sorted.map((f, i) => (
                  <div key={i} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{f.category}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{f.message}</p>
                    </div>
                    <AIAdvisoryBadge severity={f.severity} />
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    onClick={() => setSignOpen(true)}
                    disabled={signed}
                    className={cn(signed && 'opacity-70')}
                  >
                    <ShieldCheck className="mr-1 h-4 w-4" /> {signed ? 'Signed Off' : 'Approve / Sign-off'}
                  </Button>
                  <Button variant="outline" onClick={runAnalysis}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Re-run Analysis
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/prescriptions/new">
                      <PenLine className="mr-1 h-4 w-4" /> Modify Prescription
                    </Link>
                  </Button>
                </div>
                {signed && (
                  <p className="text-xs text-muted-foreground">
                    Signed off by {signer} (mock UI flow — recorded to AI activity in this demo).
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How to read this</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p><Badge variant="outline">Informational</Badge> — FYI checks such as missing duration.</p>
              <p><Badge>Caution</Badge> — needs a second look, e.g. possible duplicate therapy.</p>
              <p><Badge variant="destructive">High Attention</Badge> — resolve before sign-off, e.g. interactions or allergy overlap.</p>
            </CardContent>
          </Card>
          <AIDisclaimer variant="prescription" />
        </div>
      </div>

      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Physician sign-off (mock)</DialogTitle>
            <DialogDescription>
              Confirm that a qualified physician has reviewed this advisory and approves the prescription. UI flow only — no real approval is issued.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Signing physician *</Label>
            <Input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="e.g. Dr. Sarah Rahman" aria-label="Signing physician" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!signer.trim()) {
                  error('Physician name required', 'Enter the signing physician\u2019s name for the mock record.')
                  return
                }
                setSigned(true)
                setSignOpen(false)
                success('Prescription signed off', `${signer.trim()} approved (mock UI flow).`)
              }}
            >
              Confirm Sign-off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
