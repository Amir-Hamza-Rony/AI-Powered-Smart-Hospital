import { apiFetch } from '@/lib/api/client'
import { toQuery, type Page } from '@/lib/api/common'

/** Raw backend shapes (snake_case) for /api/patients/. */

export interface BackendPatient {
  id: string
  name: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  blood_group: string
  phone: string
  email: string
  nid: string | null
  address: string
  emergency_contact: string | null
  emergency_phone: string | null
  allergies: string[]
  chronic_conditions: string[]
  medical_history: string | null
  notes: string | null
  status: 'Active' | 'Inactive' | 'Critical' | 'Recovered'
  created_at: string
  updated_at: string
}

export interface PatientInput {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  blood_group: string
  phone: string
  email: string
  nid?: string | null
  address?: string
  emergency_contact?: string | null
  emergency_phone?: string | null
  allergies?: string[]
  chronic_conditions?: string[]
  medical_history?: string | null
  notes?: string | null
  status?: 'Active' | 'Inactive' | 'Critical' | 'Recovered'
}

export interface PatientFilters {
  gender?: string
  status?: string
  blood_group?: string
  search?: string
  page?: number
  page_size?: number
}

export function listPatients(filters: PatientFilters = {}) {
  return apiFetch<Page<BackendPatient>>(`/patients/${toQuery({ ...filters })}`)
}

export function getPatient(id: string) {
  return apiFetch<BackendPatient>(`/patients/${id}/`)
}

export function createPatient(input: PatientInput) {
  return apiFetch<BackendPatient>('/patients/', { method: 'POST', body: input })
}

export function updatePatient(id: string, input: Partial<PatientInput>) {
  return apiFetch<BackendPatient>(`/patients/${id}/`, { method: 'PATCH', body: input })
}

export function deletePatient(id: string) {
  return apiFetch<never>(`/patients/${id}/`, { method: 'DELETE' })
}
