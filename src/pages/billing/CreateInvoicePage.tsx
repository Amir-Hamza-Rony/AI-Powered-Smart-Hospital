import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { BILLING_CATEGORIES, PAYMENT_METHODS, PAYMENT_TERMS, SERVICE_TYPES, formatBDT } from '@/data/billing'
import type { BillingCategory, InvoiceServiceType, PaymentMethod } from '@/data/types'
import { createInvoice, createPayment, getInvoice, issueInvoice, updateInvoice } from '@/lib/api/billing'
import { listPatientsLookup, type LookupPatient } from '@/lib/api/lookups'
import { toInvoice } from '@/lib/api/adapters'
import { ApiError } from '@/lib/api/client'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ApiLoading } from '@/components/shared/ApiState'
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
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editing = params.get('edit')
  const [patients, setPatients] = useState<LookupPatient[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [patientId, setPatientId] = useState('')
  const [serviceType, setServiceType] = useState<InvoiceServiceType>('Consultation')
  const [issueDate, setIssueDate] = useState('2026-10-01')
  const [dueDate, setDueDate] = useState('2026-10-08')
  const [terms, setTerms] = useState('Net 7')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([{ ...EMPTY_ITEM }])
  const [method, setMethod] = useState<PaymentMethod>('Cash')
  const [paidAmount, setPaidAmount] = useState('0')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit mode only supports Draft invoices: preload, then PATCH.
  useEffect(() => {
    listPatientsLookup()
      .then((page) => setPatients(page.results))
      .catch(() => setPatients([]))
      .finally(() => setLookupsLoading(false))
    if (!editing) return
    getInvoice(editing)
      .then((backend) => {
        const inv = toInvoice(backend)
        if (inv.status !== 'Draft') {
          error('Cannot edit invoice', 'Only Draft invoices can be edited.')
          navigate(`/billing/invoices/${editing}`)
          return
        }
        setPatientId(inv.patientId)
        setServiceType(inv.serviceType)
        setIssueDate(inv.issueDate)
        setDueDate(inv.dueDate)
        setNotes(inv.notes ?? '')
        setItems(
          inv.items.map((it) => ({
            name: it.name,
            category: it.category,
            quantity: String(it.quantity),
            unitPrice: String(it.unitPrice),
            discount: String(it.discount),
            tax: String(it.tax),
          })),
        )
      })
      .catch(() => setLoadError(true))
  }, [editing, error, navigate])

  const patient = patients.find((p) => p.id === patientId)

  const subtotal = items.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0)
  const discount = items.reduce((s, r) => s + (Number(r.discount) || 0), 0)
  const tax = items.reduce((s, r) => s + (Number(r.tax) || 0), 0)
  const grandTotal = Math.max(0, subtotal - discount + tax)
  const paid = Number(paidAmount) || 0
  const due = Math.max(0, grandTotal - paid)

  const updateItem = (idx: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  const buildItems = () => {
    if (items.some((r) => !r.name.trim() || !(Number(r.unitPrice) > 0))) {
      error('Incomplete line item', 'Every item needs a name and a unit price greater than zero.')
      return null
    }
    if (items.some((r) => !Number.isInteger(Number(r.quantity)) || Number(r.quantity) <= 0)) {
      error('Invalid quantity', 'Every item needs a positive whole quantity.')
      return null
    }
    return items.map((r) => ({
      description: r.name.trim(),
      item_type: r.category === 'Medicine' ? 'Pharmacy' : r.category,
      category: r.category,
      quantity: Number(r.quantity),
      unit_price: Number(r.unitPrice),
      discount: Number(r.discount) || 0,
      tax: Number(r.tax) || 0,
    }))
  }

  const handleSubmit = async (asDraft: boolean) => {
    if (!patientId) {
      error('Select a patient', 'Patient selection is required.')
      return
    }
    const lines = buildItems()
    if (!lines) return
    if (!asDraft && paid > grandTotal) {
      error('Paid exceeds total', `Paid amount cannot exceed ${formatBDT(grandTotal)}.`)
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const updated = await updateInvoice(editing, {
          patient: patientId,
          service_type: serviceType,
          issue_date: issueDate,
          due_date: dueDate,
          payment_terms: terms,
          notes: notes.trim(),
          items: lines,
        })
        success('Invoice updated', `${updated.invoice_number} saved.`)
        navigate(`/billing/invoices/${updated.id}`)
        return
      }
      const created = await createInvoice({
        patient: patientId,
        service_type: serviceType,
        issue_date: issueDate,
        due_date: dueDate,
        payment_terms: terms,
        notes: notes.trim(),
        items: lines,
      })
      if (!asDraft) {
        // New invoices start Draft: issue first, then optionally record payment.
        await issueInvoice(created.id)
        if (paid > 0) {
          await createPayment({
            invoice: created.id,
            patient: patientId,
            amount: paid,
            payment_date: issueDate,
            payment_method: method,
            reference: reference.trim(),
            status: 'Completed',
          })
        }
      }
      success(asDraft ? 'Draft saved' : 'Invoice created', `${created.invoice_number} · backend totals authoritative.`)
      navigate(`/billing/invoices/${created.id}`)
    } catch (err) {
      error('Save failed', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  if (editing && loadError) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/billing/invoices"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
        </Button>
        <EmptyState title="Invoice not found" description={`No invoice ${editing}.`} action={<Button asChild><Link to="/billing/invoices">Back to list</Link></Button>} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={editing ? 'Edit Draft Invoice' : 'Create Invoice'}
        description="Itemized hospital billing — totals calculated by the backend."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/billing/invoices">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      {lookupsLoading ? (
        <ApiLoading label="Loading patients…" />
      ) : (
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
                          {p.name} ({p.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {patient && (
                    <p className="text-xs text-muted-foreground">
                      {patient.phone}
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
                      <Label>Line total (preview)</Label>
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

            {!editing && (
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
                    <Label>Due amount (preview)</Label>
                    <p className="rounded-md bg-muted px-3 py-2 text-sm font-semibold">{formatBDT(due)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBDT(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>− {formatBDT(discount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>+ {formatBDT(tax)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-base"><span className="font-semibold">Grand Total</span><strong>{formatBDT(grandTotal)}</strong></div>
              <p className="text-xs text-muted-foreground">Preview only — the backend recalculates all totals.</p>
              {!editing && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{formatBDT(paid)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Due</span><strong className="text-destructive">{formatBDT(due)}</strong></div>
                </>
              )}
              <div className="flex flex-col gap-2 pt-3">
                <Button disabled={saving} onClick={() => handleSubmit(false)}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Invoice'}</Button>
                {!editing && (
                  <Button variant="outline" disabled={saving} onClick={() => handleSubmit(true)}>
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
      )}
    </div>
  )
}
