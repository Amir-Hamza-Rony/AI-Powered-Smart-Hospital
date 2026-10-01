import { useEffect, useState } from 'react'
import { useHospitalStore, nextId } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PAYMENT_METHODS, formatBDT } from '@/data/billing'
import type { PaymentMethod } from '@/data/types'
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultInvoiceId?: string
}) {
  const { invoices, payments, addPayment } = useHospitalStore()
  const { success, error } = useToast()
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId ?? '')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('Cash')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState('2026-10-01')
  const [notes, setNotes] = useState('')

  // Reset dialog fields whenever it opens (possibly with a different invoice).
  useEffect(() => {
    if (!open) return
    const inv = invoices.find((i) => i.id === defaultInvoiceId)
    setInvoiceId(defaultInvoiceId ?? '')
    setAmount(inv ? String(inv.due) : '')
    setReference('')
    setNotes('')
    setDate('2026-10-01')
    setMethod('Cash')
  }, [open, defaultInvoiceId])

  const selected = invoices.find((i) => i.id === invoiceId)

  const submit = () => {
    if (!invoiceId || !selected) {
      error('Select an invoice', 'Choose the invoice this payment belongs to.')
      return
    }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      error('Invalid amount', 'Enter a payment amount greater than zero.')
      return
    }
    if (amt > selected.due + 0.001 && selected.due > 0) {
      error('Amount exceeds due', `${selected.id} has ${formatBDT(selected.due)} outstanding.`)
      return
    }
    const id = nextId('PAY', payments.map((p) => p.id))
    addPayment({
      id,
      invoiceId: selected.id,
      patientId: selected.patientId,
      patientName: selected.patientName,
      amount: amt,
      paymentMethod: method,
      reference: reference.trim() || `${method.toUpperCase().slice(0, 4)}-${id.slice(-4)}`,
      status: 'Completed',
      date,
      recordedBy: 'Cashier — L. Begum',
      notes: notes.trim(),
    })
    success('Payment recorded', `${id} · ${formatBDT(amt)} applied to ${selected.id} (mock state).`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Apply a frontend-only payment to an invoice. No gateway involved.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Invoice *</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
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
            {selected && (
              <p className="text-xs text-muted-foreground">
                {selected.patientName} ({selected.patientId}) · Total {formatBDT(selected.total)} · Paid{' '}
                {formatBDT(selected.paid)} · Due {formatBDT(selected.due)}
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
          <Button onClick={submit}>Record Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
