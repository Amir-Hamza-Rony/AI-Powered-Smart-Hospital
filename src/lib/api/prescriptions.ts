import { apiFetch } from '@/lib/api/client'
import { toQuery, type Page } from '@/lib/api/common'

/** Raw backend shapes (snake_case) for /api/prescriptions/. */

export interface BackendPrescriptionItem {
  id: string
  medicine: string | null
  medicine_name: string
  strength: string
  dosage: string
  frequency: string
  duration: string
  route: string
  quantity: number
  instructions: string
  notes: string
}

export interface BackendPrescription {
  id: string
  patient: string
  patient_name: string
  doctor: string
  doctor_name: string
  appointment: string | null
  date: string
  chief_complaint: string
  diagnosis: string
  symptoms: string
  clinical_notes: string
  follow_up_required: boolean
  follow_up_date: string | null
  follow_up_instructions: string
  status: 'Active' | 'Completed' | 'Cancelled'
  items: BackendPrescriptionItem[]
  created_at: string
  updated_at: string
}

export interface PrescriptionItemInput {
  medicine?: string | null
  medicine_name: string
  strength?: string
  dosage: string
  frequency: string
  duration: string
  route?: string
  quantity: number
  instructions?: string
  notes?: string
}

export interface PrescriptionInput {
  patient: string
  doctor: string
  appointment?: string | null
  date: string
  chief_complaint?: string
  diagnosis: string
  symptoms?: string
  clinical_notes?: string
  follow_up_required?: boolean
  follow_up_date?: string | null
  follow_up_instructions?: string
  items: PrescriptionItemInput[]
}

export interface PrescriptionFilters {
  patient?: string
  doctor?: string
  status?: string
  date?: string
  search?: string
  page?: number
  page_size?: number
}

export function listPrescriptions(filters: PrescriptionFilters = {}) {
  return apiFetch<Page<BackendPrescription>>(
    `/prescriptions/${toQuery({ ...filters })}`,
  )
}

export function getPrescription(id: string) {
  return apiFetch<BackendPrescription>(`/prescriptions/${id}/`)
}

export function createPrescription(input: PrescriptionInput) {
  return apiFetch<BackendPrescription>('/prescriptions/', {
    method: 'POST',
    body: input,
  })
}

export function updatePrescription(id: string, input: Partial<PrescriptionInput> & { status?: BackendPrescription['status'] }) {
  return apiFetch<BackendPrescription>(`/prescriptions/${id}/`, {
    method: 'PATCH',
    body: input,
  })
}

export function completePrescription(id: string) {
  return updatePrescription(id, { status: 'Completed' })
}

export function cancelPrescription(id: string) {
  return updatePrescription(id, { status: 'Cancelled' })
}
