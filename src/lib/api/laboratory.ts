import { apiFetch } from '@/lib/api/client'
import { toQuery, type Page } from '@/lib/api/common'

/** Raw backend shapes (snake_case) for /api/laboratory/. */

export interface BackendLabTest {
  id: string
  name: string
  code: string
  category: string
  description: string
  price: string
  sample_type: string
  turnaround_time: string
  preparation: string
  status: 'Active' | 'Inactive'
  created_at: string
  updated_at: string
}

export interface BackendLabOrderItem {
  id: string
  test: string
  test_name: string
  test_code: string
  result: string
  unit: string
  reference_range: string
  result_notes: string
  status: 'Normal' | 'Abnormal' | 'Pending'
}

export interface BackendLabOrder {
  id: string
  patient: string
  patient_name: string
  doctor: string
  doctor_name: string
  appointment: string | null
  order_date: string
  priority: 'Normal' | 'Urgent' | 'Emergency'
  status: 'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Cancelled'
  instructions: string
  notes: string
  report_reference: string
  items: BackendLabOrderItem[]
  created_at: string
  updated_at: string
}

export interface LabTestInput {
  name: string
  code: string
  category?: string
  description?: string
  price?: string | number
  sample_type?: string
  turnaround_time?: string
  preparation?: string
  status?: BackendLabTest['status']
}

export interface LabOrderInput {
  patient: string
  doctor: string
  appointment?: string | null
  order_date: string
  priority?: BackendLabOrder['priority']
  instructions?: string
  notes?: string
  items: Array<{ test: string }>
}

export interface LabResultInput {
  test?: string
  item?: string
  result?: string
  unit?: string
  reference_range?: string
  result_notes?: string
  status?: BackendLabOrderItem['status']
}

export interface LabTestFilters {
  category?: string
  status?: string
  search?: string
  page?: number
  page_size?: number
}

export interface LabOrderFilters {
  patient?: string
  doctor?: string
  status?: string
  priority?: string
  date?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  page_size?: number
}

export function listLabTests(filters: LabTestFilters = {}) {
  return apiFetch<Page<BackendLabTest>>(`/laboratory/tests/${toQuery({ ...filters })}`)
}

export function createLabTest(input: LabTestInput) {
  return apiFetch<BackendLabTest>('/laboratory/tests/', { method: 'POST', body: input })
}

export function updateLabTest(id: string, input: Partial<LabTestInput>) {
  return apiFetch<BackendLabTest>(`/laboratory/tests/${id}/`, { method: 'PATCH', body: input })
}

export function listLabOrders(filters: LabOrderFilters = {}) {
  return apiFetch<Page<BackendLabOrder>>(`/laboratory/orders/${toQuery({ ...filters })}`)
}

export function getLabOrder(id: string) {
  return apiFetch<BackendLabOrder>(`/laboratory/orders/${id}/`)
}

export function createLabOrder(input: LabOrderInput) {
  return apiFetch<BackendLabOrder>('/laboratory/orders/', { method: 'POST', body: input })
}

export function processLabOrder(id: string) {
  return apiFetch<BackendLabOrder>(`/laboratory/orders/${id}/process/`, { method: 'POST' })
}

export function markLabOrderReady(id: string) {
  return apiFetch<BackendLabOrder>(`/laboratory/orders/${id}/ready/`, { method: 'POST' })
}

export function cancelLabOrder(id: string) {
  return apiFetch<BackendLabOrder>(`/laboratory/orders/${id}/cancel/`, { method: 'POST' })
}

export function updateLabResults(id: string, items: LabResultInput[]) {
  return apiFetch<BackendLabOrder>(`/laboratory/orders/${id}/results/`, {
    method: 'POST',
    body: { items },
  })
}
