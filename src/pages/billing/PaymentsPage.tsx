import { useMemo, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { PAYMENT_METHODS } from '@/data/billing'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { PaymentTable } from '@/components/billing/PaymentTable'
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8
const STATUSES = ['Completed', 'Pending', 'Failed', 'Refunded'] as const

export function PaymentsPage() {
  const { payments } = useHospitalStore()
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState('all')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return payments.filter((p) => {
      if (method !== 'all' && p.paymentMethod !== method) return false
      if (status !== 'all' && p.status !== status) return false
      if (from && p.date < from) return false
      if (to && p.date > to) return false
      if (!q) return true
      return (
        p.id.toLowerCase().includes(q) ||
        p.invoiceId.toLowerCase().includes(q) ||
        p.patientName.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q)
      )
    })
  }, [payments, query, method, status, from, to])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        description={`${filtered.length} transaction${filtered.length === 1 ? '' : 's'} · mock data`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Record Payment
          </Button>
        }
      />
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by transaction, invoice, patient or reference…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                reset()
              }}
              className="pl-9"
              aria-label="Search payments"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Select
              value={method}
              onValueChange={(v) => {
                setMethod(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Payment method filter">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {PAYMENT_METHODS.map((m) => (
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
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                reset()
              }}
              aria-label="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                reset()
              }}
              aria-label="To date"
            />
          </div>
        </CardContent>
      </Card>
      {pageItems.length === 0 ? (
        <EmptyState title="No transactions found" description="Try adjusting search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <PaymentTable payments={pageItems} />
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
      <RecordPaymentDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
