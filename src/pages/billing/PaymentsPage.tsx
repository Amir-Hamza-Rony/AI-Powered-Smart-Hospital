import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PAYMENT_METHODS } from '@/data/billing'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { PaymentTable } from '@/components/billing/PaymentTable'
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog'
import { listPayments } from '@/lib/api/billing'
import { toPayment } from '@/lib/api/adapters'
import { canManageBilling, useApiList } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8
const STATUSES = ['Completed', 'Pending', 'Failed', 'Refunded'] as const

export function PaymentsPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState('all')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState(false)
  const manageable = canManageBilling(user?.role ?? null)

  const list = useApiList(
    ({ page, page_size }) =>
      listPayments({
        search: query.trim() || undefined,
        payment_method: method !== 'all' ? method : undefined,
        status: status !== 'all' ? status : undefined,
        date_from: from || undefined,
        date_to: to || undefined,
        page,
        page_size,
      }),
    [query, method, status, from, to],
    PAGE_SIZE,
  )

  const reset = () => list.setPage(1)
  const payments = list.items.map(toPayment)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        description={`${list.total} transaction${list.total === 1 ? '' : 's'}`}
        actions={
          manageable ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Record Payment
            </Button>
          ) : undefined
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
      {list.loading ? (
        <ApiLoading label="Loading payments…" />
      ) : list.errorStatus === 403 ? (
        <ApiForbiddenState message={list.error} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={list.refresh} />
      ) : payments.length === 0 ? (
        <EmptyState title="No transactions found" description="Try adjusting search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <PaymentTable payments={payments} />
            <DataPagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={list.setPage} />
          </CardContent>
        </Card>
      )}
      <RecordPaymentDialog open={open} onOpenChange={setOpen} onRecorded={list.refresh} />
    </div>
  )
}
