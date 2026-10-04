import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, PenLine, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import type { AIAdvisorySeverity, AIPrescriptionAdvisory, AIProposedMedicine } from '@/data/types'
import { prescriptionAdvisory, reviewInsight, type BackendAdvisory } from '@/lib/api/ai'
import { getPatientDetail, listPatientsLookup, type LookupPatient } from '@/lib/api/lookups'
import { canUseClinicalAI } from '@/lib/api/hooks'
import { ApiError } from '@/lib/api/client'
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
  const { user } = useAuth()
  const { success, error } = useToast()

  const [lookupPatients, setLookupPatients] = useState<LookupPatient[]>([])
  const [patientAllergies, setPatientAllergies] = useState<string[]>([])
  const [patientId, setPatientId] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [currentMeds, setCurrentMeds] = useState('')
  const [proposed, setProposed] = useState<AIProposedMedicine[]>([{ ...EMPTY_MED }])

  const [analyzing, setAnalyzing] = useState(false)
  const [advisory, setAdvisory] = useState<AIPrescriptionAdvisory | null>(null)
  const [insightId, setInsightId] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)
  const [signOpen, setSignOpen] = useState(false)
  const [signer, setSigner] = useState('')
  const apiResult = useRef<BackendAdvisory | null>(null)
  const apiFailed = useRef(false)

  useEffect(() => {
    listPatientsLookup()
      .then((page) => setLookupPatients(page.results))
      .catch(() => setLookupPatients([]))
  }, [])

  const pickPatient = (id: string) => {
    setPatientId(id)
    setAdvisory(null)
    setSigned(false)
    setInsightId(null)
    getPatientDetail(id)
      .then((p) => {
        setPatientAllergies(p.allergies ?? [])
      })
      .catch(() => setPatientAllergies([]))
  }

  const updateMed = (idx: number, patch: Partial<AIProposedMedicine>) =>
    setProposed((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)))

  const runAnalysis = () => {
    if (!patientId) {
      error('Select a patient', 'A patient is required before running the advisory.')
      return
    }
    if (proposed.some((m) => !m.medicine.trim())) {
      error('Medicine name required', 'Every proposed row needs a medicine name.')
      return
    }
    setSigned(false)
    setInsightId(null)
    setAnalyzing(true)
    apiResult.current = null
    apiFailed.current = false
    prescriptionAdvisory({
      patient: patientId,
      diagnosis,
      current_meds: currentMeds.split('\n').map((s) => s.trim()).filter(Boolean),
      proposed: proposed.map((m) => ({
        medicine: m.medicine,
        dose: m.dose,
        frequency: m.frequency,
        duration: m.duration,
        route: m.route,
      })),
    })
      .then((result) => {
        apiResult.current = result
      })
      .catch(() => {
        apiFailed.current = true
      })
  }

  const finishAnalysis = () => {
    const result = apiResult.current
    if (apiFailed.current || !result) {
      error('Analysis failed', 'The advisory service could not complete this review.')
      setAnalyzing(false)
      return
    }
    setAdvisory({
      findings: result.findings,
      overallSeverity: result.overallSeverity,
      summary: result.summary,
      generatedAt: new Date().toISOString(),
    })
    setInsightId(result.insight)
    setAnalyzing(false)
  }

  const confirmSignoff = async () => {
    if (!signer.trim()) {
      error('Physician name required', 'Enter the signing physician’s name for the record.')
      return
    }
    if (!canUseClinicalAI(user?.role ?? null) || !insightId) {
      error('Not permitted', 'Sign-off requires a doctor or admin account with a generated advisory.')
      return
    }
    try {
      await reviewInsight(insightId, `Signed off by ${signer.trim()}.`)
      setSigned(true)
      setSignOpen(false)
      success('Prescription signed off', `${signer.trim()} approved — review recorded.`)
    } catch (err) {
      error('Sign-off failed', err instanceof ApiError ? err.message : 'Request failed.')
    }
  }

  const sorted = advisory ? [...advisory.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) : []

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Prescription Advisory"
        description="Decision-support review · physician sign-off required"
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
                  {lookupPatients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Allergies: {patientAllergies.length > 0 ? patientAllergies.join(', ') : 'none recorded'}
              </p>
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
            <EmptyState title="No advisory yet" description="Fill in the proposed medicines and run the analysis to see decision-support findings." />
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
                    Signed off by {signer} — recorded in the AI review trail.
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
            <DialogTitle>Physician sign-off</DialogTitle>
            <DialogDescription>
              Confirm that a qualified physician has reviewed this advisory and approves the prescription. The sign-off is recorded in the AI review trail.
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
              onClick={confirmSignoff}
            >
              Confirm Sign-off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
