import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { INSURANCE_PROVIDERS, formatBDT } from '@/data/billing'
import type { ClaimStatus, InsuranceClaim } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ClaimsTable } from '@/components/billing/ClaimsTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  createClaim,
  listClaims,
  submitClaim,
  reviewClaim,
  decideClaim,
  payClaim,
  deleteClaim,
  type ClaimFilters,
} from '@/lib/api/billing'
import { toClaim } from '@/lib/api/adapters'
import { useApiList } from '@/lib/api/hooks'
import { canManageBilling } from '@/lib/api/hooks'
import { useAuth } from '@/context/AuthContext'

const PAGE_SIZE = 8
const CLAIM_STATUSES: ClaimStatus[] = [
  'Draft', 'Submitted', 'Under Review', 'Approved', 'Partially Approved',
  'Rejected', 'Paid',
]

export function ClaimsPage() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const canManage = canManageBilling(user?.role ?? null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [provider, setProvider] = useState('all')
  const [page, setPage] = useState(1)

  const [detail, setDetail] = useState<InsuranceClaim | null>(null)
  const [actionTarget, setActionTarget] = useState<InsuranceClaim | null>(null)
  const [actionType, setActionType] = useState<'submit' | 'review' | 'decide' | 'pay'>('submit')
  const [newStatus, setNewStatus] = useState<'Approved' | 'Partially Approved' | 'Rejected'>('Approved')
  const [approveAmount, setApproveAmount] = useState('')
  const [actionNotes, setActionNotes] = useState('')
  const [submitOpen, setSubmitOpen] = useState(false)

  const [formProvider, setFormProvider] = useState(INSURANCE_PROVIDERS[0])
  const [formAmount, setFormAmount] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formInvoiceId, setFormInvoiceId] = useState('')

  const filters: ClaimFilters = {
    provider: provider !== 'all' ? provider : undefined,
    status: status !== 'all' ? status : undefined,
    search: query || undefined,
    page,
    page_size: PAGE_SIZE,
  }

  const list = useApiList<InsuranceClaim>(
    ({ page: p, page_size }) =>
      listClaims({ ...filters, page: p, page_size }).then((page_) =>
        page_ ? { ...page_, results: page_.results.map(toClaim) } : page_,
      ),
    [query, status, provider, page],
    PAGE_SIZE,
  )

  const resetPage = () => setPage(1)

  const handleSubmitClaim = async (id: string) => {
    if (!canManage) return
    try {
      await submitClaim(id)
      list.refresh()
      success('Claim submitted', `${id} moved to Submitted.`)
    } catch (err) {
      error('Submit failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  const handleReviewClaim = async (id: string) => {
    if (!canManage) return
    try {
      await reviewClaim(id)
      list.refresh()
      success('Claim under review', `${id} moved to Under Review.`)
    } catch (err) {
      error('Review failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  const handleDecideClaim = async (id: string, claim: InsuranceClaim) => {
    if (!canManage) return
    if (newStatus === 'Approved' || newStatus === 'Partially Approved') {
      const amt = Number(approveAmount) || 0
      if (amt <= 0 || amt > claim.claimAmount) {
        error('Invalid amount', 'Approved amount must be greater than zero and not exceed the claim amount.')
        return
      }
    }
    try {
      await decideClaim(id, {
        status: newStatus,
        approved_amount:
          newStatus === 'Rejected' ? 0 : (Number(approveAmount) || claim.claimAmount),
        notes: actionNotes.trim(),
      })
      list.refresh()
      setActionTarget(null)
      success('Claim decided', `${id} moved to ${newStatus}.`)
    } catch (err) {
      error('Decide failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  const handlePayClaim = async (id: string) => {
    if (!canManage) return
    try {
      await payClaim(id)
      list.refresh()
      success('Claim paid', `${id} marked Paid.`)
    } catch (err) {
      error('Pay failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  const handleCreateClaim = async () => {
    if (!canManage) return
    const amt = Number(formAmount) || 0
    if (amt <= 0) {
      error('Invalid amount', 'Claim amount must be greater than zero.')
      return
    }
    if (!formInvoiceId.trim()) {
      error('Missing invoice', 'Please enter an invoice ID.')
      return
    }
    try {
      await createClaim({
        invoice: formInvoiceId.trim(),
        provider: formProvider,
        policy_number: `POL-${Math.floor(1000000 + Math.random() * 9000000)}`,
        claim_amount: String(amt),
        notes: formNotes.trim(),
      })
      list.refresh()
      success('Claim created', 'New draft claim created.')
      setSubmitOpen(false)
      setFormInvoiceId('')
      setFormAmount('')
      setFormNotes('')
    } catch (err) {
      error('Create failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  const handleDeleteClaim = async (id: string) => {
    if (!canManage) return
    try {
      await deleteClaim(id)
      list.refresh()
      success('Claim deleted', `${id} removed.`)
    } catch (err) {
      error('Delete failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  if (list.errorStatus === 403) {
    return <ApiForbiddenState message={null} />
  }
  if (list.error) {
    return <ApiErrorState message={list.error} onRetry={resetPage} />
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Insurance Claims"
        description={`${list.total} claim${list.total === 1 ? '' : 's'} · live backend`}
        actions={
          canManage ? (
            <Button onClick={() => setSubmitOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Submit Claim
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by claim ID, patient, invoice or provider…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                resetPage()
              }}
              className="pl-9"
              aria-label="Search claims"
              disabled={list.loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={status} onValueChange={(v) => { setStatus(v); resetPage() }} disabled={list.loading}>
              <SelectTrigger aria-label="Claim status filter"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {CLAIM_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={provider} onValueChange={(v) => { setProvider(v); resetPage() }} disabled={list.loading}>
              <SelectTrigger aria-label="Provider filter"><SelectValue placeholder="Provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                {INSURANCE_PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {list.loading ? (
        <ApiLoading />
      ) : list.items.length === 0 ? (
        <EmptyState
          title="No claims found"
          description="Try adjusting filters — or submit a new claim."
          action={
            canManage ? (
              <Button onClick={() => setSubmitOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Submit Claim
              </Button>
            ) : null
          }
        />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <ClaimsTable
              claims={list.items}
              onView={setDetail}
              onSubmit={canManage ? handleSubmitClaim : undefined}
              onReview={canManage ? handleReviewClaim : undefined}
              onDecide={(c) => {
                setActionTarget(c)
                setActionType('decide')
                setNewStatus('Approved')
                setApproveAmount('')
                setActionNotes('')
              }}
              onPay={canManage ? handlePayClaim : undefined}
              onDelete={canManage ? handleDeleteClaim : undefined}
            />
            <DataPagination
              page={list.page}
              totalPages={list.totalPages}
              total={list.total}
              pageSize={PAGE_SIZE}
              onPageChange={list.setPage}
            />
          </CardContent>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Claim {detail?.id}</DialogTitle>
            <DialogDescription>Live insurer record.</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><strong>{detail.patientName} ({detail.patientId})</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span>{detail.provider}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Policy</span><span>{detail.policyNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span>{detail.invoiceId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Claim amount</span><strong>{formatBDT(detail.claimAmount)}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span>{formatBDT(detail.approvedAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span>{formatBDT(detail.claimAmount - detail.approvedAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span>{detail.submittedDate || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Processed</span><span>{detail.processedDate || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{detail.status}</span></div>
              {detail.notes && <p className="rounded-md bg-muted p-2 text-xs">{detail.notes}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decide dialog */}
      <Dialog
        open={actionTarget !== null && actionType === 'decide'}
        onOpenChange={(o) => { if (!o) setActionTarget(null) }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Decide claim {actionTarget?.id}</DialogTitle>
            <DialogDescription>Set the insurer decision and approved amount.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Decision</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as 'Approved' | 'Partially Approved' | 'Rejected')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Partially Approved">Partially Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {(newStatus === 'Approved' || newStatus === 'Partially Approved') && (
              <div className="space-y-1.5">
                <Label>Approved amount (৳)</Label>
                <Input type="number" min={0} step={0.01} value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} placeholder="0.00" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} rows={2} placeholder="Decision rationale…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)}>Cancel</Button>
            <Button onClick={() => {
              if (actionTarget) handleDecideClaim(actionTarget.id, actionTarget)
            }}>
              Decide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit claim dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Submit Insurance Claim</DialogTitle>
            <DialogDescription>Link an issued invoice to an insurer (live backend).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Invoice ID *</Label>
              <Input value={formInvoiceId} onChange={(e) => setFormInvoiceId(e.target.value)} placeholder="INV-3002" disabled={list.loading} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select value={formProvider} onValueChange={setFormProvider} disabled={list.loading}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSURANCE_PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Claim amount (৳)</Label>
                <Input type="number" min={0} step={0.01} value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" disabled={list.loading} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} placeholder="Diagnosis codes, attachments…" disabled={list.loading} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={list.loading}>Cancel</Button>
            <Button onClick={handleCreateClaim} disabled={list.loading}>Create Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
