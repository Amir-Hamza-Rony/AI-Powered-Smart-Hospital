import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import type { Invoice } from '@/data/types'
import { INVOICE_STATUSES, SERVICE_TYPES } from '@/data/billing'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { InvoiceTable } from '@/components/billing/InvoiceTable'
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8

export function InvoiceListPage() {
  const { invoices } = useHospitalStore()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [service, setService] = useState('all')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [payFor, setPayFor] = useState<Invoice | undefined>(undefined)
  const [payOpen, setPayOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices.filter((inv) => {
      if (status !== 'all' && inv.status !== status) return false
      if (service !== 'all' && inv.serviceType !== service) return false
      if (date && inv.issueDate !== date) return false
      if (!q) return true
      return (
        inv.id.toLowerCase().includes(q) ||
        inv.patientName.toLowerCase().includes(q) ||
        inv.patientId.toLowerCase().includes(q)
      )
    })
  }, [invoices, query, status, service, date])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)

  const handlePay = (inv: Invoice) => {
    setPayFor(inv)
    setPayOpen(true)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description={`${filtered.length} invoice${filtered.length === 1 ? '' : 's'} · mock data`}
        actions={
          <Button asChild>
            <Link to="/billing/invoices/new">
              <Plus className="mr-1 h-4 w-4" /> New Invoice
            </Link>
          </Button>
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
      {pageItems.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Try adjusting search or filters — or create a new invoice."
          action={
            <Button asChild>
              <Link to="/billing/invoices/new">
                <Plus className="mr-1 h-4 w-4" /> New Invoice
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <InvoiceTable
              invoices={pageItems}
              onRecordPayment={handlePay}
              onPrint={(inv) => {
                success('Print preview ready', `${inv.id} sent to print dialog (frontend-only).`)
                window.setTimeout(() => window.print(), 300)
              }}
              onDownload={(inv) => success('Download started', `${inv.id}.pdf will download (frontend-only mock).`)}
            />
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} defaultInvoiceId={payFor?.id} />
    </div>
  )
}
