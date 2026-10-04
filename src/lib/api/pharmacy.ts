import { apiFetch } from '@/lib/api/client'
import { toQuery, type Page } from '@/lib/api/common'

/** Raw backend shapes (snake_case) for /api/pharmacy/. */

export interface BackendMedicine {
  id: string
  name: string
  generic_name: string
  brand_name: string
  category: string
  strength: string
  dosage_form: string
  manufacturer: string
  prescription_required: boolean
  unit_price: string
  reorder_level: number
  is_active: boolean
  current_stock: number
  available_stock: number
  expired_stock: number
  is_low_stock: boolean
  has_near_expiry: boolean
  stock_status: 'In Stock' | 'Low Stock' | 'Near Expiry' | 'Out of Stock'
  created_at: string
  updated_at: string
}

export interface BackendMedicineBatch {
  id: string
  medicine: string
  medicine_name: string
  batch_number: string
  quantity: number
  purchase_price: string
  selling_price: string
  manufacture_date: string | null
  expiry_date: string
  is_expired: boolean
  is_near_expiry: boolean
  created_at: string
  updated_at: string
}

export interface BackendDispensingItem {
  id: string
  medicine: string
  medicine_name: string
  batch: string | null
  batch_number: string | null
  quantity: number
  dispensed_quantity: number
  remaining: number
  unit_price: string
}

export interface BackendDispensingRecord {
  id: string
  prescription: string
  patient: string
  patient_name: string
  dispensed_by: string | null
  date: string
  status: 'Pending' | 'Partially Dispensed' | 'Dispensed' | 'Cancelled'
  notes: string
  items: BackendDispensingItem[]
  created_at: string
  updated_at: string
}

export interface MedicineInput {
  name: string
  generic_name?: string
  brand_name?: string
  category?: string
  strength?: string
  dosage_form?: string
  manufacturer?: string
  prescription_required?: boolean
  unit_price?: string | number
  reorder_level?: number
  is_active?: boolean
}

export interface BatchInput {
  medicine: string
  batch_number: string
  quantity: number
  purchase_price?: string | number
  selling_price?: string | number
  manufacture_date?: string | null
  expiry_date: string
}

export interface DispensingItemInput {
  medicine: string
  batch?: string | null
  quantity: number
  unit_price?: string | number
}

export interface DispensingInput {
  prescription: string
  patient: string
  date: string
  notes?: string
  items: DispensingItemInput[]
}

export interface MedicineFilters {
  category?: string
  is_active?: boolean
  low_stock?: boolean
  search?: string
  page?: number
  page_size?: number
}

export interface BatchFilters {
  medicine?: string
  expired?: boolean
  search?: string
  page?: number
  page_size?: number
}

export interface DispensingFilters {
  prescription?: string
  patient?: string
  status?: string
  date?: string
  search?: string
  page?: number
  page_size?: number
}

export function listMedicines(filters: MedicineFilters = {}) {
  return apiFetch<Page<BackendMedicine>>(`/pharmacy/medicines/${toQuery({ ...filters })}`)
}

export function getMedicine(id: string) {
  return apiFetch<BackendMedicine>(`/pharmacy/medicines/${id}/`)
}

export function createMedicine(input: MedicineInput) {
  return apiFetch<BackendMedicine>('/pharmacy/medicines/', { method: 'POST', body: input })
}

export function updateMedicine(id: string, input: Partial<MedicineInput>) {
  return apiFetch<BackendMedicine>(`/pharmacy/medicines/${id}/`, { method: 'PATCH', body: input })
}

export function listBatches(filters: BatchFilters = {}) {
  return apiFetch<Page<BackendMedicineBatch>>(`/pharmacy/batches/${toQuery({ ...filters })}`)
}

export function getBatch(id: string) {
  return apiFetch<BackendMedicineBatch>(`/pharmacy/batches/${id}/`)
}

export function createBatch(input: BatchInput) {
  return apiFetch<BackendMedicineBatch>('/pharmacy/batches/', { method: 'POST', body: input })
}

export function updateBatch(id: string, input: Partial<BatchInput>) {
  return apiFetch<BackendMedicineBatch>(`/pharmacy/batches/${id}/`, { method: 'PATCH', body: input })
}

export function listDispensing(filters: DispensingFilters = {}) {
  return apiFetch<Page<BackendDispensingRecord>>(
    `/pharmacy/dispensing/${toQuery({ ...filters })}`,
  )
}

export function getDispensing(id: string) {
  return apiFetch<BackendDispensingRecord>(`/pharmacy/dispensing/${id}/`)
}

export function createDispensing(input: DispensingInput) {
  return apiFetch<BackendDispensingRecord>('/pharmacy/dispensing/', {
    method: 'POST',
    body: input,
  })
}

export function dispenseRecord(id: string, items?: Array<{ id: string; quantity: number }>) {
  return apiFetch<BackendDispensingRecord>(`/pharmacy/dispensing/${id}/dispense/`, {
    method: 'POST',
    body: items ? { items } : {},
  })
}

export function cancelDispensing(id: string) {
  return apiFetch<BackendDispensingRecord>(`/pharmacy/dispensing/${id}/cancel/`, {
    method: 'POST',
  })
}
