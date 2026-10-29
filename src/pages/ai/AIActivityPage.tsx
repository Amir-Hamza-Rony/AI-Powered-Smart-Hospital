import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye, Search, ShieldCheck } from 'lucide-react'
import type { AIActivityStatus } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { AIActivityStatusBadge } from '@/components/ai/AIBadges'
import { listAIInsights, reviewInsight, completeInsight, type BackendAIInsight } from '@/lib/api/ai'
import { canUseClinicalAI, useApiList } from '@/lib/api/hooks'
import { ApiError } from '@/lib/api/client'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 8
const MODULES = ['Symptom Checker', 'Clinical Assistant', 'Prescription Advisory', 'No-Show Prediction', 'Health Analytics']
const STATUSES: AIActivityStatus[] = ['Completed', 'Reviewed', 'Pending Review']

function toActivityStatus(status: string): AIActivityStatus {
  return status === 'Reviewed' ? 'Reviewed' : status === 'Completed' ? 'Completed' : 'Pending Review'
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join('; ')
  return JSON.stringify(value)
}

export function AIActivityPage() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [query, setQuery] = useState('')
  const [module, setModule] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<BackendAIInsight | null>(null)
  const [note, setNote] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [completing, setCompleting] = useState(false)

  const canReview = canUseClinicalAI(user?.role ?? null)

  const list = useApiList(
    ({ page, page_size }) =>
      listAIInsights({
        module: module !== 'all' ? module : undefined,
        review_status: status !== 'all' ? status : undefined,
        search: query.trim() || undefined,
        page,
        page_size,
      }),
    [query, module, status],
    PAGE_SIZE,
  )

  const reset = () => list.setPage(1)

  const openDetail = (insight: BackendAIInsight) => {
    setSelected(insight)
    setNote('')
  }

  const confirmReview = async () => {
    if (!selected || !canReview || reviewing) return
    setReviewing(true)
    try {
      const updated = await reviewInsight(selected.id, note.trim())
      setSelected(updated)
      list.refresh()
      success('Insight reviewed', 'Physician sign-off recorded in the review trail.')
    } catch (err) {
      error('Review failed', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setReviewing(false)
    }
  }

  const confirmComplete = async () => {
    if (!selected || !canReview || completing) return
    setCompleting(true)
    try {
      const updated = await completeInsight(selected.id)
      setSelected(updated)
      list.refresh()
      success('Insight completed', 'Insight archived as completed.')
    } catch (err) {
      error('Complete failed', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Activity"
        description={`${list.total} AI-related event${list.total === 1 ? '' : 's'} · persisted review trail`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai">
              <ArrowLeft className="mr-1 h-4 w-4" /> AI Hub
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by insight, patient or session…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                reset()
              }}
              className="pl-9"
              aria-label="Search AI activity"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={module}
              onValueChange={(v) => {
                setModule(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="AI module filter">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Status filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {list.loading ? (
        <ApiLoading label="Loading AI activity…" />
      ) : list.errorStatus === 403 ? (
        <ApiForbiddenState message={list.error} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={list.refresh} />
      ) : list.items.length === 0 ? (
        <EmptyState title="No activity found" description="Run an AI assessment to populate this trail." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insight</TableHead>
                    <TableHead>AI Module</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="min-w-[200px] font-medium">{a.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.module}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.patient_name ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.requested_by_email ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.created_at.slice(0, 16).replace('T', ' ')}</TableCell>
                      <TableCell>
                        <AIActivityStatusBadge status={toActivityStatus(a.review_status)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(a)} aria-label={`View ${a.title}`}>
                          <Eye className="mr-1 h-4 w-4" /> Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={list.setPage} />
          </CardContent>
        </Card>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.title ?? 'Insight detail'}</DialogTitle>
            <DialogDescription>
              {selected?.module} · {selected?.kind} · requested by {selected?.requested_by_email ?? '—'}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="font-medium">{selected.patient_name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{selected.created_at.slice(0, 16).replace('T', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="font-medium">{selected.confidence ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="font-medium">{selected.provider || 'local'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <AIActivityStatusBadge status={toActivityStatus(selected.review_status)} />
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Advisory content</p>
                <dl className="space-y-1">
                  {Object.entries(selected.content ?? {}).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2">
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="col-span-2 break-words">{formatValue(value)}</dd>
                    </div>
                  ))}
                  {Object.keys(selected.content ?? {}).length === 0 && (
                    <p className="text-muted-foreground">No structured content recorded.</p>
                  )}
                </dl>
              </div>
              {selected.review_status === 'Reviewed' || selected.review_status === 'Completed' ? (
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Physician review</p>
                  <p>
                    Reviewed at {selected.reviewed_at ? selected.reviewed_at.slice(0, 16).replace('T', ' ') : '—'}
                  </p>
                  {selected.review_note && <p className="mt-1 text-muted-foreground">“{selected.review_note}”</p>}
                </div>
              ) : canReview ? (
                <div className="space-y-1.5">
                  <Label htmlFor="ai-review-note">Review note</Label>
                  <Textarea
                    id="ai-review-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Findings verified against chart — safe to proceed."
                    rows={3}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sign-off requires a doctor or admin account with a pending insight.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected?.review_status === 'Pending Review' && canReview && (
              <Button onClick={confirmReview} disabled={reviewing}>
                <ShieldCheck className="mr-1 h-4 w-4" />
                {reviewing ? 'Recording…' : 'Confirm Sign-off'}
              </Button>
            )}
            {selected?.review_status === 'Reviewed' && canReview && (
              <Button variant="secondary" onClick={confirmComplete} disabled={completing}>
                {completing ? 'Archiving…' : 'Complete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
