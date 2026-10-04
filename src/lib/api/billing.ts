import { apiFetch } from '@/lib/api/client'
import { toQuery, type Page } from '@/lib/api/common'

/** Raw backend shapes (snake_case) for /api/billing/. */

export interface BackendInvoiceItem {
  id: string
  description: string
  item_type: string
  category: string
  quantity: number
  unit_price: string
  discount: string
  tax: string
  line_total: string
}

export interface BackendInvoice {
  id: string
  invoice_number: string
  patient: string
  patient_name: string
  patient_phone: string
  appointment: string | null
  service_type: string
  issue_date: string
  due_date: string
  payment_terms: string
  discount: string
  tax: string
  status: 'Draft' | 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled'
  notes: string
  subtotal: string
  total: string
  paid_amount: string
  due_amount: string
  is_overdue: boolean
  items: BackendInvoiceItem[]
  created_at: string
  updated_at: string
}

export interface BackendPayment {
  id: string
  invoice: string
  invoice_number: string
  patient: string
  patient_name: string
  amount: string
  payment_date: string
  payment_method: string
  reference: string
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded'
  received_by: string | null
  notes: string
  created_at: string
}

export interface BackendLedgerEntry {
  id: string
  invoice: string | null
  invoice_number: string | null
  payment: string | null
  patient: string | null
  patient_name: string | null
  type: string
  amount: string
  transaction_date: string
  payment_method: string
  reference: string
  description: string
  recorded_by: string | null
  notes: string
  created_at: string
}

export interface InvoiceItemInput {
  description: string
  item_type?: string
  category?: string
  quantity: number
  unit_price: string | number
  discount?: string | number
  tax?: string | number
}

export interface InvoiceInput {
  patient: string
  appointment?: string | null
  service_type?: string
  issue_date: string
  due_date: string
  payment_terms?: string
  discount?: string | number
  tax?: string | number
  notes?: string
  items: InvoiceItemInput[]
}

export interface PaymentInput {
  invoice: string
  patient: string
  amount: string | number
  payment_date: string
  payment_method: string
  reference?: string
  status?: BackendPayment['status']
  notes?: string
}

export interface InvoiceFilters {
  patient?: string
  status?: string
  service_type?: string
  date?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  page_size?: number
}

export interface PaymentFilters {
  invoice?: string
  patient?: string
  payment_method?: string
  status?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  page_size?: number
}

export interface LedgerFilters {
  patient?: string
  type?: string
  payment_method?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  page_size?: number
}

export function listInvoices(filters: InvoiceFilters = {}) {
  return apiFetch<Page<BackendInvoice>>(`/billing/invoices/${toQuery({ ...filters })}`)
}

export function getInvoice(id: string) {
  return apiFetch<BackendInvoice>(`/billing/invoices/${id}/`)
}

export function createInvoice(input: InvoiceInput) {
  return apiFetch<BackendInvoice>('/billing/invoices/', { method: 'POST', body: input })
}

export function updateInvoice(id: string, input: Partial<InvoiceInput>) {
  return apiFetch<BackendInvoice>(`/billing/invoices/${id}/`, { method: 'PATCH', body: input })
}

export function issueInvoice(id: string) {
  return apiFetch<BackendInvoice>(`/billing/invoices/${id}/issue/`, { method: 'POST' })
}

export function cancelInvoice(id: string) {
  return apiFetch<BackendInvoice>(`/billing/invoices/${id}/cancel/`, { method: 'POST' })
}

export function markInvoiceOverdue(id: string) {
  return apiFetch<BackendInvoice>(`/billing/invoices/${id}/overdue/`, { method: 'POST' })
}

export function listPayments(filters: PaymentFilters = {}) {
  return apiFetch<Page<BackendPayment>>(`/billing/payments/${toQuery({ ...filters })}`)
}

export function createPayment(input: PaymentInput) {
  return apiFetch<BackendPayment>('/billing/payments/', { method: 'POST', body: input })
}

export function cancelPayment(id: string, reason?: string) {
  return apiFetch<BackendPayment>(`/billing/payments/${id}/cancel/`, {
    method: 'POST',
    body: reason ? { reason } : {},
  })
}

export function listLedger(filters: LedgerFilters = {}) {
  return apiFetch<Page<BackendLedgerEntry>>(`/billing/ledger/${toQuery({ ...filters })}`)
}
