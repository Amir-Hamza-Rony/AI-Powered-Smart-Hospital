import { useEffect, useState } from 'react'
import { useToast } from '@/context/ToastContext'
import { PAYMENT_METHODS, formatBDT } from '@/data/billing'
import type { PaymentMethod } from '@/data/types'
import { createPayment, listInvoices, type BackendInvoice } from '@/lib/api/billing'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function RecordPaymentDialog({
  open,
  onOpenChange,
  defaultInvoiceId,
  onRecorded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultInvoiceId?: string
  onRecorded?: () => void
}) {
  const { success, error } = useToast()
  const [invoices, setInvoices] = useState<BackendInvoice[]>([])
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId ?? '')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('Cash')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset dialog fields whenever it opens (possibly with a different invoice).
  useEffect(() => {
    if (!open) return
    setInvoiceId(defaultInvoiceId ?? '')
    setAmount('')
    setReference('')
    setNotes('')
    setDate(new Date().toISOString().slice(0, 10))
    setMethod('Cash')
    listInvoices({ page_size: 100 })
      .then((page) => {
        const openInvoices = page.results.filter(
          (inv) => inv.status !== 'Cancelled' && inv.status !== 'Draft',
        )
        setInvoices(openInvoices)
        const preselected = openInvoices.find((inv) => inv.id === defaultInvoiceId)
        if (preselected) setAmount(preselected.due_amount)
      })
      .catch(() => setInvoices([]))
  }, [open, defaultInvoiceId])

  const selected = invoices.find((i) => i.id === invoiceId)

  const submit = async () => {
    if (!invoiceId || !selected) {
      error('Select an invoice', 'Choose the invoice this payment belongs to.')
      return
    }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      error('Invalid amount', 'Enter a payment amount greater than zero.')
      return
    }
    if (amt > Number(selected.due_amount) + 0.001 && Number(selected.due_amount) > 0) {
      error('Amount exceeds due', `${selected.invoice_number} has ${formatBDT(Number(selected.due_amount))} outstanding.`)
      return
    }
    setSaving(true)
    try {
      await createPayment({
        invoice: selected.id,
        patient: selected.patient,
        amount: amt,
        payment_date: date,
        payment_method: method,
        reference: reference.trim(),
        status: 'Completed',
        notes: notes.trim(),
      })
      success('Payment recorded', `${formatBDT(amt)} applied to ${selected.invoice_number}.`)
      onOpenChange(false)
      onRecorded?.()
    } catch (err) {
      error('Payment failed', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Apply a payment to an invoice. No gateway involved.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Invoice *</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.invoice_number} · {i.patient_name} · due {formatBDT(Number(i.due_amount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <p className="text-xs text-muted-foreground">
                {selected.patient_name} · Total {formatBDT(Number(selected.total))} · Paid{' '}
                {formatBDT(Number(selected.paid_amount))} · Due {formatBDT(Number(selected.due_amount))}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (৳) *</Label>
              <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference number</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TXN / TRX ID…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional note…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={submit}>{saving ? 'Recording…' : 'Record Payment'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
