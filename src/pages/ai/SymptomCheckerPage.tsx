import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Plus, RotateCcw, Save, Trash2, UserRoundPlus } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { AI_SYMPTOM_CATALOG, analyzeSymptomsMock } from '@/data/ai'
import type { AISymptomEntry, AISymptomSeverity, AITriageResult, Gender } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { AIStatusBadge, AITriageBadge } from '@/components/ai/AIBadges'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { AIProcessingState } from '@/components/ai/AIProcessingState'
import { AIConfidenceIndicator, AIRecommendationCard } from '@/components/ai/AICards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const STEPS = ['Patient Information', 'Symptoms', 'Additional Information', 'AI Analysis']

export function SymptomCheckerPage() {
  const { patients } = useHospitalStore()
  const { success, error } = useToast()

  const [step, setStep] = useState(0)
  const [patientId, setPatientId] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('Male')
  const [conditions, setConditions] = useState('')
  const [allergies, setAllergies] = useState('')

  const [symptoms, setSymptoms] = useState<AISymptomEntry[]>([])
  const [catalogQuery, setCatalogQuery] = useState('')

  const [temperature, setTemperature] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [oxygenSaturation, setOxygenSaturation] = useState('')
  const [recentMedications, setRecentMedications] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AITriageResult | null>(null)

  const catalogResults = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase()
    if (!q) return AI_SYMPTOM_CATALOG.slice(0, 6)
    return AI_SYMPTOM_CATALOG.filter(
      (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q),
    ).slice(0, 6)
  }, [catalogQuery])

  const pickPatient = (id: string) => {
    setPatientId(id)
    const p = patients.find((x) => x.id === id)
    if (p) {
      setAge(String(p.age))
      setGender(p.gender)
      setConditions(p.chronicConditions.join(', '))
      setAllergies(p.allergies.join(', '))
    }
  }

  const addSymptom = (name: string, category: string) => {
    if (symptoms.some((s) => s.name === name)) {
      error('Already added', `${name} is already in the symptom list.`)
      return
    }
    setSymptoms((prev) => [...prev, { name, category, severity: 'Moderate' as AISymptomSeverity, duration: '', notes: '' }])
    setCatalogQuery('')
  }

  const updateSymptom = (name: string, patch: Partial<AISymptomEntry>) =>
    setSymptoms((prev) => prev.map((s) => (s.name === name ? { ...s, ...patch } : s)))

  const canNext = () => {
    if (step === 0) return patientId !== ''
    if (step === 1) return symptoms.length > 0
    return true
  }

  const startAnalysis = () => {
    setAnalyzing(true)
    setResult(null)
  }

  const finishAnalysis = () => {
    setResult(
      analyzeSymptomsMock(symptoms, {
        temperature,
        bloodPressure,
        heartRate,
        oxygenSaturation,
        recentMedications,
        additionalNotes,
      }),
    )
    setAnalyzing(false)
  }

  const resetAll = () => {
    setStep(0)
    setPatientId('')
    setAge('')
    setConditions('')
    setAllergies('')
    setSymptoms([])
    setTemperature('')
    setBloodPressure('')
    setHeartRate('')
    setOxygenSaturation('')
    setRecentMedications('')
    setAdditionalNotes('')
    setResult(null)
    setAnalyzing(false)
  }

  const selectedPatient = patients.find((p) => p.id === patientId)

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Symptom Checker & Triage"
        description="Mock triage prototype · clinical assistance only, never a diagnosis"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai">
              <ArrowLeft className="mr-1 h-4 w-4" /> AI Hub
            </Link>
          </Button>
        }
      />

      {/* Stepper */}
      <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Assessment steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={cn(
              'rounded-lg border px-3 py-2 text-xs font-medium',
              i === step ? 'border-primary bg-primary/10 text-foreground' : i < step ? 'border-border bg-card text-foreground' : 'border-border bg-card text-muted-foreground',
            )}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px]">
              {i < step ? '✓' : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 1 — Patient Information</CardTitle>
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
            </div>
            <div className="space-y-1.5">
              <Label>Age</Label>
              <Input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Years" />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['Male', 'Female', 'Other'] as Gender[]).map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Existing conditions</Label>
              <Input value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="e.g. Hypertension, Asthma" />
            </div>
            <div className="space-y-1.5">
              <Label>Allergies</Label>
              <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. Penicillin" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2 — Symptoms ({symptoms.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Symptom search</Label>
              <Input
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="Type to search — e.g. fever, chest pain, cough…"
                aria-label="Search symptoms"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {catalogResults.map((c) => (
                  <Button
                    key={c.name}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addSymptom(c.name, c.category)}
                    disabled={symptoms.some((s) => s.name === c.name)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> {c.name}
                  </Button>
                ))}
              </div>
            </div>
            {symptoms.length === 0 ? (
              <EmptyState title="No symptoms added" description="Search above and add at least one symptom to continue." />
            ) : (
              <div className="space-y-2">
                {symptoms.map((s) => (
                  <div key={s.name} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.category}</p>
                    </div>
                    <div className="space-y-1">
                      <Label>Severity</Label>
                      <Select value={s.severity} onValueChange={(v) => updateSymptom(s.name, { severity: v as AISymptomSeverity })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['Mild', 'Moderate', 'Severe'] as AISymptomSeverity[]).map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Duration</Label>
                      <Input value={s.duration} onChange={(e) => updateSymptom(s.name, { duration: e.target.value })} placeholder="e.g. 3 days" />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <Label>Notes</Label>
                        <Input value={s.notes} onChange={(e) => updateSymptom(s.name, { notes: e.target.value })} placeholder="Optional" />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        aria-label={`Remove ${s.name}`}
                        onClick={() => setSymptoms((prev) => prev.filter((x) => x.name !== s.name))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 3 — Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Temperature (°F)</Label>
              <Input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="e.g. 101.2" inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label>Blood pressure</Label>
              <Input value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} placeholder="e.g. 130/85" />
            </div>
            <div className="space-y-1.5">
              <Label>Heart rate (bpm)</Label>
              <Input value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="e.g. 88" inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label>Oxygen saturation (%)</Label>
              <Input value={oxygenSaturation} onChange={(e) => setOxygenSaturation(e.target.value)} placeholder="e.g. 97" inputMode="numeric" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Recent medications</Label>
              <Input value={recentMedications} onChange={(e) => setRecentMedications(e.target.value)} placeholder="e.g. Paracetamol 500mg twice daily" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Additional notes</Label>
              <Textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={2} placeholder="Anything else the clinician should know…" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {analyzing && <AIProcessingState onDone={finishAnalysis} />}
          {!analyzing && !result && (
            <Card>
              <CardContent className="space-y-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Ready to run the mock analysis for {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'the patient'} with{' '}
                  {symptoms.length} symptom{symptoms.length === 1 ? '' : 's'}.
                </p>
                <Button onClick={startAnalysis}>Run AI Analysis</Button>
              </CardContent>
            </Card>
          )}
          {!analyzing && result && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">Triage Result</CardTitle>
                  <span className="flex items-center gap-2">
                    <AIStatusBadge />
                    <AITriageBadge level={result.level} />
                  </span>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Triage level</p>
                    <p className="mt-1 text-xl font-bold">{result.level}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department recommendation</p>
                    <p className="mt-1 text-sm font-semibold">{result.department}</p>
                    <div className="mt-3">
                      <AIConfidenceIndicator value={result.confidence} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended next action</p>
                    <p className="mt-1 text-sm">{result.nextAction}</p>
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <AIRecommendationCard title="Possible clinical considerations (not a diagnosis)" items={result.considerations} />
                <AIRecommendationCard title="Risk indicators" items={result.riskIndicators} />
              </div>
              <AIDisclaimer variant="triage" />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={resetAll}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Start New Assessment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => success('Assessment saved', 'Mock assessment recorded to AI activity (frontend only).')}
                >
                  <Save className="mr-1 h-4 w-4" /> Save Assessment
                </Button>
                <Button asChild>
                  <Link to="/appointments/new">
                    <UserRoundPlus className="mr-1 h-4 w-4" /> Refer to Doctor
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wizard nav */}
      {!(step === 3 && result) && (
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < 3 ? (
            <Button
              disabled={!canNext()}
              onClick={() => {
                if (!canNext()) {
                  error('Incomplete step', step === 0 ? 'Select a patient to continue.' : 'Add at least one symptom.')
                  return
                }
                setStep((s) => s + 1)
              }}
            >
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={startAnalysis} disabled={analyzing}>
              Run AI Analysis
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
