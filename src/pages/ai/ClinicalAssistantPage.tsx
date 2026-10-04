import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bot, Copy, RotateCcw, Send, Stethoscope } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { AI_SUGGESTED_QUESTIONS } from '@/data/ai'
import type { AIClinicalMessage } from '@/data/types'
import { clinicalAsk, clinicalSummary } from '@/lib/api/ai'
import { getPatientDetail, listPatientsLookup, type LookupPatient, type LookupPatientDetail } from '@/lib/api/lookups'
import { canUseClinicalAI } from '@/lib/api/hooks'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api/client'
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
  const { user } = useAuth()
  const { success, error } = useToast()
  const [lookupPatients, setLookupPatients] = useState<LookupPatient[]>([])
  const [patientId, setPatientId] = useState('')
  const [detail, setDetail] = useState<LookupPatientDetail | null>(null)
  const [recordSummary, setRecordSummary] = useState<string | null>(null)
  const [messages, setMessages] = useState<AIClinicalMessage[]>([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const msgSeq = useRef(0)
  const authorized = canUseClinicalAI(user?.role ?? null)
  const nextMsgId = (suffix: string) => {
    msgSeq.current += 1
    return `m-${msgSeq.current}-${suffix}`
  }

  useEffect(() => {
    listPatientsLookup()
      .then((page) => setLookupPatients(page.results))
      .catch(() => setLookupPatients([]))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, thinking])

  const selectPatient = (id: string) => {
    setPatientId(id)
    setMessages([])
    setDraft('')
    setRecordSummary(null)
    setDetail(null)
    if (!id) return
    getPatientDetail(id)
      .then(setDetail)
      .catch(() => setDetail(null))
  }

  const askBackend = async (question: string, asSummary: boolean) => {
    const q = question.trim()
    if (!q || !patientId || thinking) return
    if (!authorized) {
      error('Not permitted', 'Clinical assistant requires a doctor or admin account.')
      return
    }
    const now = timestamp()
    setMessages((prev) => [...prev, { id: nextMsgId('d'), role: 'doctor', text: q, timestamp: now }])
    setDraft('')
    setThinking(true)
    try {
      const reply = asSummary
        ? await clinicalSummary(patientId)
        : await clinicalAsk(patientId, q)
      const text = (reply.summary ?? reply.answer ?? '').trim()
      setMessages((prev) => [...prev, { id: nextMsgId('a'), role: 'ai', text, timestamp: timestamp() }])
      if (asSummary) setRecordSummary(text)
    } catch (err) {
      error('Assistant failed', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setThinking(false)
    }
  }

  const send = (text: string) => askBackend(text, false)
  const summarize = () => askBackend('Summarize this patient for my review.', true)

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      success('Copied', 'AI response copied to clipboard.')
    } catch {
      success('Copy ready', 'Select the response text to copy manually.')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Clinical Assistant"
        description="Record-grounded doctor copilot · decision support only, physician review required"
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
              onValueChange={selectPatient}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select patient to assist with" />
              </SelectTrigger>
              <SelectContent>
                {lookupPatients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={summarize} disabled={!patientId || thinking}>
            <Stethoscope className="mr-1 h-4 w-4" /> Auto-summarize
          </Button>
        </CardContent>
      </Card>

      {!patientId ? (
        <EmptyState title="No patient selected" description="Select a patient above to see their summary and start asking the assistant." />
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
                  {detail?.name ?? 'Loading…'}
                </p>
                {detail && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {detail.date_of_birth} · {detail.gender} · {detail.blood_group} · {detail.phone}
                    </p>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chronic conditions</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(detail.chronic_conditions ?? []).length === 0 && <span className="text-xs text-muted-foreground">None recorded</span>}
                        {(detail.chronic_conditions ?? []).map((c) => (
                          <Badge key={c} variant="secondary">{c}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Allergies</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(detail.allergies ?? []).length === 0 && <span className="text-xs text-muted-foreground">None recorded</span>}
                        {(detail.allergies ?? []).map((a) => (
                          <Badge key={a} variant="outline">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            {recordSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Record Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-xs text-muted-foreground">{recordSummary}</p>
                </CardContent>
              </Card>
            )}
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
                    Ask about {detail?.name ?? 'the patient'} — or tap a suggested question above.
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
                          <Bot className="h-3 w-3" aria-hidden /> AI · decision support
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
                      <span className="animate-pulse">AI is reviewing the live record…</span>
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
