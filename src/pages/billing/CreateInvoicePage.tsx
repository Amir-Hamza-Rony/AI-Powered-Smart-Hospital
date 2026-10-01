import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useHospitalStore, nextId } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { BILLING_CATEGORIES, PAYMENT_METHODS, PAYMENT_TERMS, SERVICE_TYPES, formatBDT } from '@/data/billing'
import type { BillingCategory, Invoice, InvoiceItem, InvoiceServiceType, PaymentMethod } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface DraftItem {
  name: string
  category: BillingCategory
  quantity: string
  unitPrice: string
  discount: string
  tax: string
}

const EMPTY_ITEM: DraftItem = { name: '', category: 'Consultation', quantity: '1', unitPrice: '', discount: '0', tax: '0' }

function calcRow(r: DraftItem) {
  const qty = Number(r.quantity) || 0
  const price = Number(r.unitPrice) || 0
  const disc = Number(r.discount) || 0
  const tax = Number(r.tax) || 0
  return Math.max(0, qty * price - disc + tax)
}

export function CreateInvoicePage() {
  const { patients, invoices, addInvoice } = useHospitalStore()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editing = params.get('edit')
  const editTarget = editing ? invoices.find((i) => i.id === editing) : undefined

  const nextNum = useMemo(() => nextId('INV', invoices.map((i) => i.id)), [invoices])
  const [patientId, setPatientId] = useState(editTarget?.patientId ?? '')
  const [serviceType, setServiceType] = useState<InvoiceServiceType>(editTarget?.serviceType ?? 'Consultation')
  const [issueDate, setIssueDate] = useState(editTarget?.issueDate ?? '2026-10-01')
  const [dueDate, setDueDate] = useState(editTarget?.dueDate ?? '2026-10-08')
  const [terms, setTerms] = useState(editTarget?.paymentTerms ?? 'Net 7')
  const [notes, setNotes] = useState(editTarget?.notes ?? '')
  const [items, setItems] = useState<DraftItem[]>(
    editTarget
      ? editTarget.items.map((it) => ({
          name: it.name,
          category: it.category,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          discount: String(it.discount),
          tax: String(it.tax),
        }))
      : [{ ...EMPTY_ITEM }],
  )
  const [method, setMethod] = useState<PaymentMethod>(editTarget?.paymentMethod ?? 'Cash')
  const [paidAmount, setPaidAmount] = useState(editTarget ? String(editTarget.paid) : '0')
  const [reference, setReference] = useState(editTarget?.referenceNumber ?? '')

  const patient = patients.find((p) => p.id === patientId)

  const subtotal = items.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0)
  const discount = items.reduce((s, r) => s + (Number(r.discount) || 0), 0)
  const tax = items.reduce((s, r) => s + (Number(r.tax) || 0), 0)
  const grandTotal = Math.max(0, subtotal - discount + tax)
  const paid = Number(paidAmount) || 0
  const due = Math.max(0, grandTotal - paid)

  const updateItem = (idx: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  const buildInvoice = (status: Invoice['status']): Invoice | null => {
    if (!patientId || !patient) {
      error('Select a patient', 'Patient selection is required.')
      return null
    }
    if (items.some((r) => !r.name.trim() || !(Number(r.unitPrice) > 0))) {
      error('Incomplete line item', 'Every item needs a name and a unit price greater than zero.')
      return null
    }
    if (paid > grandTotal) {
      error('Paid exceeds total', `Paid amount cannot exceed ${formatBDT(grandTotal)}.`)
      return null
    }
    const built: InvoiceItem[] = items.map((r, idx) => ({
      id: `IT-${String(idx + 1).padStart(2, '0')}`,
      name: r.name.trim(),
      category: r.category,
      quantity: Number(r.quantity) || 0,
      unitPrice: Number(r.unitPrice) || 0,
      discount: Number(r.discount) || 0,
      tax: Number(r.tax) || 0,
      total: calcRow(r),
    }))
    return {
      id: editTarget?.id ?? nextNum,
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientPhone: patient.phone,
      serviceType,
      issueDate,
      dueDate,
      paymentTerms: terms,
      items: built,
      subtotal,
      discount,
      tax,
      total: grandTotal,
      paid,
      due,
      status: status === 'Draft' ? 'Draft' : due <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Pending',
      paymentMethod: method,
      referenceNumber: reference.trim(),
      notes: notes.trim(),
      createdBy: 'Reception — N. Akter',
    }
  }

  const handleSubmit = (asDraft: boolean) => {
    const inv = buildInvoice(asDraft ? 'Draft' : 'Pending')
    if (!inv) return
    if (!editTarget) addInvoice(inv)
    success(asDraft ? 'Draft saved' : 'Invoice created', `${inv.id} · ${formatBDT(inv.total)} (mock state).`)
    navigate(`/billing/invoices/${inv.id}`)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={editTarget ? `Edit Invoice ${editTarget.id}` : 'Create Invoice'}
        description="Itemized hospital billing — frontend mock only, no gateway."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/billing/invoices">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient & Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Patient *</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {patient && (
                  <p className="text-xs text-muted-foreground">
                    {patientId} · {patient.phone} · {patient.address}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Service type</Label>
                <Select value={serviceType} onValueChange={(v) => setServiceType(v as InvoiceServiceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment terms</Label>
                <Select value={terms} onValueChange={setTerms}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Issue date</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional invoice note…" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Itemized Billing ({items.length})</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={() => setItems((p) => [...p, { ...EMPTY_ITEM }])}>
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((r, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Service / product name *</Label>
                    <Input value={r.name} onChange={(e) => updateItem(idx, { name: e.target.value })} placeholder="e.g. Cardiology Consultation" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={r.category} onValueChange={(v) => updateItem(idx, { category: v as BillingCategory })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantity</Label>
                    <Input type="number" min={0} step="1" value={r.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit price (৳) *</Label>
                    <Input type="number" min={0} step="0.01" value={r.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Discount (৳)</Label>
                    <Input type="number" min={0} step="0.01" value={r.discount} onChange={(e) => updateItem(idx, { discount: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tax (৳)</Label>
                    <Input type="number" min={0} step="0.01" value={r.tax} onChange={(e) => updateItem(idx, { tax: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Line total</Label>
                    <p className="rounded-md bg-muted px-3 py-2 text-sm font-semibold">{formatBDT(calcRow(r))}</p>
                  </div>
                  <div className="flex items-end sm:col-span-2 lg:col-span-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={items.length === 1}
                      onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Remove Item
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
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
              <div className="space-y-1.5">
                <Label>Paid amount (৳)</Label>
                <Input type="number" min={0} step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Due amount</Label>
                <p className="rounded-md bg-muted px-3 py-2 text-sm font-semibold">{formatBDT(due)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice #</span><strong>{editTarget?.id ?? nextNum}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBDT(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>− {formatBDT(discount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>+ {formatBDT(tax)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-base"><span className="font-semibold">Grand Total</span><strong>{formatBDT(grandTotal)}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{formatBDT(paid)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Due</span><strong className="text-destructive">{formatBDT(due)}</strong></div>
            <div className="flex flex-col gap-2 pt-3">
              <Button onClick={() => handleSubmit(false)}>{editTarget ? 'Save Changes' : 'Create Invoice'}</Button>
              {!editTarget && (
                <Button variant="outline" onClick={() => handleSubmit(true)}>
                  Save Draft
                </Button>
              )}
              <Button variant="ghost" asChild>
                <Link to="/billing/invoices">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
