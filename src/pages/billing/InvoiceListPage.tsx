import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { INVOICE_STATUSES, SERVICE_TYPES } from '@/data/billing'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { InvoiceTable } from '@/components/billing/InvoiceTable'
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog'
import { listInvoices } from '@/lib/api/billing'
import { toInvoice } from '@/lib/api/adapters'
import { canManageBilling, useApiList } from '@/lib/api/hooks'
import type { Invoice } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8

export function InvoiceListPage() {
  const { user } = useAuth()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [service, setService] = useState('all')
  const [date, setDate] = useState('')
  const [payFor, setPayFor] = useState<Invoice | undefined>(undefined)
  const [payOpen, setPayOpen] = useState(false)
  const manageable = canManageBilling(user?.role ?? null)

  const list = useApiList(
    ({ page, page_size }) =>
      listInvoices({
        search: query.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        service_type: service !== 'all' ? service : undefined,
        date: date || undefined,
        page,
        page_size,
      }),
    [query, status, service, date],
    PAGE_SIZE,
  )

  const reset = () => list.setPage(1)
  const invoices = list.items.map(toInvoice)

  const handlePay = (inv: Invoice) => {
    setPayFor(inv)
    setPayOpen(true)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description={`${list.total} invoice${list.total === 1 ? '' : 's'}`}
        actions={
          manageable ? (
            <Button asChild>
              <Link to="/billing/invoices/new">
                <Plus className="mr-1 h-4 w-4" /> New Invoice
              </Link>
            </Button>
          ) : undefined
        }
      />
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice #, patient or patient ID…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                reset()
              }}
              className="pl-9"
              aria-label="Search invoices"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
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
                {INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={service}
              onValueChange={(v) => {
                setService(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Service type filter">
                <SelectValue placeholder="Service type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All service types</SelectItem>
                {SERVICE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                reset()
              }}
              aria-label="Issue date filter"
              className="col-span-2 lg:col-span-1"
            />
          </div>
        </CardContent>
      </Card>
      {list.loading ? (
        <ApiLoading label="Loading invoices…" />
      ) : list.errorStatus === 403 ? (
        <ApiForbiddenState message={list.error} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={list.refresh} />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Try adjusting search or filters — or create a new invoice."
          action={
            manageable ? (
              <Button asChild>
                <Link to="/billing/invoices/new">
                  <Plus className="mr-1 h-4 w-4" /> New Invoice
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <InvoiceTable
              invoices={invoices}
              onRecordPayment={handlePay}
              onPrint={(inv) => {
                success('Print preview ready', `${inv.invoiceNumber ?? inv.id} sent to print dialog.`)
                window.setTimeout(() => window.print(), 300)
              }}
              onDownload={(inv) => success('Download started', `${inv.invoiceNumber ?? inv.id}.pdf will download.`)}
            />
            <DataPagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={list.setPage} />
          </CardContent>
        </Card>
      )}
      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} defaultInvoiceId={payFor?.id} onRecorded={list.refresh} />
    </div>
  )
}
