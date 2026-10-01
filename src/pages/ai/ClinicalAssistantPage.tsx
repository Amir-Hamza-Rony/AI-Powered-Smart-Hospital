import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bot, Copy, RotateCcw, Send, Stethoscope } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { AI_SUGGESTED_QUESTIONS, answerClinicalQuestionMock, getClinicalSummaryMock } from '@/data/ai'
import type { AIClinicalMessage } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { AIStatusBadge } from '@/components/ai/AIBadges'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

function timestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function ClinicalAssistantPage() {
  const { patients } = useHospitalStore()
  const { success } = useToast()
  const [patientId, setPatientId] = useState('')
  const [messages, setMessages] = useState<AIClinicalMessage[]>([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)
  const msgSeq = useRef(0)
  const nextMsgId = (suffix: string) => {
    msgSeq.current += 1
    return `m-${msgSeq.current}-${suffix}`
  }

  const patient = patients.find((p) => p.id === patientId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, thinking])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const send = (text: string) => {
    const q = text.trim()
    if (!q || !patient || thinking) return
    const now = timestamp()
    const doctorMsg: AIClinicalMessage = { id: nextMsgId('d'), role: 'doctor', text: q, timestamp: now }
    setMessages((prev) => [...prev, doctorMsg])
    setDraft('')
    setThinking(true)
    timerRef.current = window.setTimeout(() => {
      const reply: AIClinicalMessage = {
        id: nextMsgId('a'),
        role: 'ai',
        text: answerClinicalQuestionMock(patient, q),
        timestamp: timestamp(),
      }
      setMessages((prev) => [...prev, reply])
      setThinking(false)
    }, 1100)
  }

  const summarize = () => {
    if (!patient || thinking) return
    const now = timestamp()
    setMessages((prev) => [...prev, { id: nextMsgId('d'), role: 'doctor', text: 'Summarize this patient for my review.', timestamp: now }])
    setThinking(true)
    timerRef.current = window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextMsgId('a'), role: 'ai', text: getClinicalSummaryMock(patient), timestamp: timestamp() }])
      setThinking(false)
    }, 1100)
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      success('Copied', 'AI response copied to clipboard.')
    } catch {
      success('Copy ready', 'Select the response text to copy manually.')
    }
  }

  const abnormalLabs = patient?.labReports.filter((l) => l.status === 'Abnormal') ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Clinical Assistant"
        description="Mock doctor copilot over the selected patient record · frontend only"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai">
              <ArrowLeft className="mr-1 h-4 w-4" /> AI Hub
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Patient *</Label>
            <Select
              value={patientId}
              onValueChange={(id) => {
                setPatientId(id)
                setMessages([])
                setDraft('')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select patient to assist with" />
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
          <Button variant="outline" onClick={summarize} disabled={!patient || thinking}>
            <Stethoscope className="mr-1 h-4 w-4" /> Auto-summarize
          </Button>
        </CardContent>
      </Card>

      {!patient ? (
        <EmptyState title="No patient selected" description="Select a patient above to see their summary and start asking the mock assistant." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Patient summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patient Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-semibold">
                  {patient.firstName} {patient.lastName} <span className="font-normal text-muted-foreground">({patient.id})</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {patient.age}y · {patient.gender} · {patient.bloodGroup} · {patient.phone}
                </p>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chronic conditions</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {patient.chronicConditions.length === 0 && <span className="text-xs text-muted-foreground">None recorded</span>}
                    {patient.chronicConditions.map((c) => (
                      <Badge key={c} variant="secondary">{c}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Allergies</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {patient.allergies.length === 0 && <span className="text-xs text-muted-foreground">None recorded</span>}
                    {patient.allergies.map((a) => (
                      <Badge key={a} variant="outline">{a}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent visits</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {patient.history.slice(0, 3).map((v) => (
                      <li key={v.id}>• {v.date} — {v.doctor}: {v.diagnosis}</li>
                    ))}
                    {patient.history.length === 0 && <li className="text-muted-foreground">No visits recorded</li>}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active medications</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {patient.currentMedications.slice(0, 4).map((m) => (
                      <li key={m}>• {m}</li>
                    ))}
                    {patient.currentMedications.length === 0 && <li className="text-muted-foreground">None recorded</li>}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Abnormal labs ({abnormalLabs.length})</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {abnormalLabs.slice(0, 3).map((l) => (
                      <li key={l.id}>• {l.test} ({l.date}): {l.result}</li>
                    ))}
                    {abnormalLabs.length === 0 && <li className="text-muted-foreground">None on file</li>}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat */}
          <Card className="flex min-h-[480px] flex-col">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4 text-primary" aria-hidden /> Assistant
              </CardTitle>
              <span className="flex items-center gap-2">
                <AIStatusBadge />
                <Button size="sm" variant="ghost" onClick={() => setMessages([])} aria-label="Clear conversation">
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Clear
                </Button>
              </span>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap gap-1.5" aria-label="Suggested questions">
                {AI_SUGGESTED_QUESTIONS.map((q) => (
                  <Button key={q} size="sm" variant="outline" onClick={() => send(q)} disabled={thinking}>
                    {q}
                  </Button>
                ))}
              </div>
              <div className="max-h-[380px] min-h-[220px] flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3" aria-live="polite">
                {messages.length === 0 && !thinking && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Ask about {patient.firstName} {patient.lastName} — or tap a suggested question above.
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.role === 'doctor' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                        m.role === 'doctor' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card',
                      )}
                    >
                      {m.role === 'ai' && (
                        <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <Bot className="h-3 w-3" aria-hidden /> Mock AI
                        </p>
                      )}
                      <p className="whitespace-pre-line">{m.text}</p>
                      <div className={cn('mt-1 flex items-center gap-2 text-[11px]', m.role === 'doctor' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        <span>{m.timestamp}</span>
                        {m.role === 'ai' && (
                          <button
                            type="button"
                            onClick={() => copy(m.text)}
                            className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
                            aria-label="Copy response"
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                      <span className="animate-pulse">Mock AI is reviewing the record…</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  send(draft)
                }}
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask about history, labs, medications…"
                  aria-label="Ask the clinical assistant"
                />
                <Button type="submit" disabled={!draft.trim() || thinking} aria-label="Send question">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <AIDisclaimer variant="clinical" />
    </div>
  )
}
