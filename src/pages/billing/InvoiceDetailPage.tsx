import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, HandCoins, Pencil, Printer, XCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { HOSPITAL_INFO, formatBDT } from '@/data/billing'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ApiErrorState, ApiLoading } from '@/components/shared/ApiState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { InvoiceStatusBadge, PaymentStatusBadge } from '@/components/billing/BillingStatusBadges'
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog'
import { cancelInvoice, getInvoice, listPayments } from '@/lib/api/billing'
import { toInvoice, toPayment } from '@/lib/api/adapters'
import { canManageBilling, useApiDetail } from '@/lib/api/hooks'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { success, error } = useToast()
  const [payOpen, setPayOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const detail = useApiDetail(() => getInvoice(id ?? ''), [id])
  const [historyNonce, setHistoryNonce] = useState(0)
  const history = useApiDetail(
    () => listPayments({ invoice: id ?? '', page_size: 100 }).then((page) => page.results.map(toPayment)),
    [id, historyNonce],
  )
  const manageable = canManageBilling(user?.role ?? null)

  const inv = detail.data ? toInvoice(detail.data) : null
  const payments = history.data ?? []

  const refreshAll = () => {
    detail.refresh()
    setHistoryNonce((n) => n + 1)
  }

  const confirmCancel = async () => {
    if (!inv) return
    try {
      await cancelInvoice(inv.id)
      success('Invoice cancelled', `${inv.invoiceNumber ?? inv.id} marked Cancelled.`)
      setCancelOpen(false)
      refreshAll()
    } catch (err) {
      error('Cancel failed', err instanceof ApiError ? err.message : 'Request failed.')
    }
  }

  if (detail.loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/billing/invoices">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <ApiLoading label="Loading invoice…" />
      </div>
    )
  }

  if (detail.error || !inv) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/billing/invoices">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        {detail.error && detail.errorStatus !== 404 ? (
          <ApiErrorState message={detail.error} onRetry={detail.refresh} />
        ) : (
          <EmptyState
            title="Invoice not found"
            description={`No invoice with ID ${id ?? ''}.`}
            action={
              <Button asChild>
                <Link to="/billing/invoices">Back to list</Link>
              </Button>
            }
          />
        )}
      </div>
    )
  }

  const cancellable = manageable && inv.status !== 'Cancelled' && inv.status !== 'Paid'

  return (
    <div className="space-y-4">
      <PageHeader
        title={inv.invoiceNumber ?? inv.id}
        description={`${inv.serviceType} · Issued ${inv.issueDate} · Due ${inv.dueDate}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/billing/invoices">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                success('Print preview ready', `${inv.invoiceNumber ?? inv.id} sent to print.`)
                window.setTimeout(() => window.print(), 300)
              }}
            >
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => success('Download started', `${inv.invoiceNumber ?? inv.id}.pdf.`)}>
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
            {manageable && inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
              <Button variant="outline" size="sm" onClick={() => setPayOpen(true)}>
                <HandCoins className="mr-1 h-4 w-4" /> Record Payment
              </Button>
            )}
            {manageable && inv.status === 'Draft' && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/billing/invoices/new?edit=${inv.id}`}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {cancellable && (
              <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                <XCircle className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-bold">{HOSPITAL_INFO.name}</h3>
            <p className="text-xs text-muted-foreground">{HOSPITAL_INFO.tagline}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {HOSPITAL_INFO.address}
              <br />
              {HOSPITAL_INFO.phone} · {HOSPITAL_INFO.email}
            </p>
          </div>
          <div className="text-sm">
            <p><strong>Invoice:</strong> {inv.invoiceNumber ?? inv.id}</p>
            <p><strong>Issue date:</strong> {inv.issueDate}</p>
            <p><strong>Due date:</strong> {inv.dueDate}</p>
            <p><strong>Terms:</strong> {inv.paymentTerms || '—'}</p>
          </div>
          <div className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill to</p>
            <p className="mt-1 font-semibold">
              {inv.patientName} <span className="font-normal text-muted-foreground">({inv.patientId.slice(0, 8)})</span>
            </p>
            <p className="text-xs text-muted-foreground">{inv.patientPhone}</p>
            <p className="mt-2">
              <InvoiceStatusBadge status={inv.status} />
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itemized Services ({inv.items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{it.category}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatBDT(it.unitPrice)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatBDT(it.discount)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatBDT(it.tax)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium">{formatBDT(it.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBDT(inv.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>− {formatBDT(inv.discount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>+ {formatBDT(inv.tax)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-base"><span className="font-semibold">Total</span><strong>{formatBDT(inv.total)}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{formatBDT(inv.paid)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Due</span><strong className="text-destructive">{formatBDT(inv.due)}</strong></div>
            {inv.notes && (
              <p className="pt-1 text-xs text-muted-foreground">Notes: {inv.notes}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History ({payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {history.loading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading payments…</p>
            ) : payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {p.id.slice(0, 8)} · {formatBDT(p.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.date} · {p.paymentMethod} · {p.reference || 'no reference'}
                      </p>
                    </div>
                    <PaymentStatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} defaultInvoiceId={inv.id} onRecorded={refreshAll} />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel invoice ${inv.invoiceNumber ?? inv.id}?`}
        description="The invoice will be marked Cancelled. Invoices with completed payments cannot be cancelled."
        confirmLabel="Cancel Invoice"
        destructive
        onConfirm={confirmCancel}
      />
    </div>
  )
}
