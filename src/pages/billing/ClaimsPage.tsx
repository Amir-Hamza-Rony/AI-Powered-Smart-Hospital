import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useHospitalStore, nextId } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { INSURANCE_PROVIDERS, formatBDT } from '@/data/billing'
import type { ClaimStatus, InsuranceClaim } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ClaimsTable } from '@/components/billing/ClaimsTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const PAGE_SIZE = 8
const CLAIM_STATUSES: ClaimStatus[] = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Partially Approved', 'Rejected', 'Paid']

export function ClaimsPage() {
  const { claims, invoices, setClaimStatus, addClaim } = useHospitalStore()
  const { success, error } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [provider, setProvider] = useState('all')
  const [page, setPage] = useState(1)

  const [detail, setDetail] = useState<InsuranceClaim | null>(null)
  const [statusTarget, setStatusTarget] = useState<InsuranceClaim | null>(null)
  const [newStatus, setNewStatus] = useState<ClaimStatus>('Submitted')
  const [submitOpen, setSubmitOpen] = useState(false)

  const [formInvoice, setFormInvoice] = useState('')
  const [formProvider, setFormProvider] = useState(INSURANCE_PROVIDERS[0])
  const [formAmount, setFormAmount] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return claims.filter((c) => {
      if (status !== 'all' && c.status !== status) return false
      if (provider !== 'all' && c.provider !== provider) return false
      if (!q) return true
      return (
        c.id.toLowerCase().includes(q) ||
        c.patientName.toLowerCase().includes(q) ||
        c.invoiceId.toLowerCase().includes(q) ||
        c.provider.toLowerCase().includes(q)
      )
    })
  }, [claims, query, status, provider])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)

  const handleCreate = () => {
    const inv = invoices.find((i) => i.id === formInvoice)
    if (!inv) {
      error('Select an invoice', 'Claim must be linked to an invoice.')
      return
    }
    const amt = Number(formAmount) || inv.due || inv.total
    if (amt <= 0) {
      error('Invalid amount', 'Claim amount must be greater than zero.')
      return
    }
    const id = nextId('CLM', claims.map((c) => c.id))
    addClaim({
      id,
      patientId: inv.patientId,
      patientName: inv.patientName,
      provider: formProvider,
      policyNumber: `POL-${Math.floor(1000000 + Math.random() * 9000000)}`,
      invoiceId: inv.id,
      claimAmount: amt,
      approvedAmount: 0,
      submittedDate: '2026-10-01',
      processedDate: '',
      status: 'Submitted',
      notes: formNotes.trim() || 'Submitted from billing desk (mock).',
    })
    success('Claim submitted', `${id} linked to ${inv.id} (mock state, no insurer API).`)
    setSubmitOpen(false)
    setFormInvoice('')
    setFormAmount('')
    setFormNotes('')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Insurance Claims"
        description={`${filtered.length} claim${filtered.length === 1 ? '' : 's'} · mock data, no insurer API`}
        actions={
          <Button onClick={() => setSubmitOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Submit Claim
          </Button>
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
                reset()
              }}
              className="pl-9"
              aria-label="Search claims"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Claim status filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {CLAIM_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={provider}
              onValueChange={(v) => {
                setProvider(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Provider filter">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                {INSURANCE_PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {pageItems.length === 0 ? (
        <EmptyState
          title="No claims found"
          description="Try adjusting filters — or submit a new claim."
          action={
            <Button onClick={() => setSubmitOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Submit Claim
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <ClaimsTable
              claims={pageItems}
              onView={setDetail}
              onUpdateStatus={(c) => {
                setStatusTarget(c)
                setNewStatus(c.status)
              }}
              onSubmit={(c) => {
                setClaimStatus(c.id, 'Submitted')
                success('Claim submitted', `${c.id} moved to Submitted (mock, no insurer API).`)
              }}
            />
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}

      {/* Details dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Claim {detail?.id}</DialogTitle>
            <DialogDescription>Mock insurer record — frontend only.</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><strong>{detail.patientName} ({detail.patientId})</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span>{detail.provider}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Policy</span><span>{detail.policyNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span>{detail.invoiceId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Claim amount</span><strong>{formatBDT(detail.claimAmount)}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span>{formatBDT(detail.approvedAmount)}</span></div>
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

      {/* Update status dialog */}
      <Dialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Update claim {statusTarget?.id}</DialogTitle>
            <DialogDescription>Mock status change — no insurer API call.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ClaimStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLAIM_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (statusTarget) {
                  setClaimStatus(statusTarget.id, newStatus)
                  success('Claim updated', `${statusTarget.id} → ${newStatus} (mock).`)
                  setStatusTarget(null)
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit claim dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Submit Insurance Claim</DialogTitle>
            <DialogDescription>Links an open invoice to a mock insurer. No API integration.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Invoice *</Label>
              <Select value={formInvoice} onValueChange={setFormInvoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices
                    .filter((i) => i.status !== 'Cancelled' && i.status !== 'Draft')
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.id} · {i.patientName} · due {formatBDT(i.due)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select value={formProvider} onValueChange={setFormProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSURANCE_PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Claim amount (৳)</Label>
                <Input type="number" min={0} value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} placeholder="Diagnosis codes, attachments…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Submit Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
