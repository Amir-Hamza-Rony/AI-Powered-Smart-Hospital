import { apiFetch } from '@/lib/api/client'
import { toQuery, type Page } from '@/lib/api/common'

/** Raw backend shapes (snake_case) for /api/doctors/. */

export interface BackendDoctorSchedule {
  id: string
  day: number
  day_display: string
  is_available: boolean
  slots: string[]
}

export interface BackendDoctor {
  id: string
  name: string
  first_name: string
  last_name: string
  user: string | null
  specialization: string
  qualification: string
  experience_years: number
  registration_no: string
  phone: string
  email: string
  department: string
  room: string
  consultation_fee: number
  availability: 'Available' | 'On Leave' | 'Off Duty'
  status: 'Active' | 'Inactive'
  schedules: BackendDoctorSchedule[]
  created_at: string
  updated_at: string
}

export interface DoctorInput {
  first_name: string
  last_name: string
  specialization: string
  qualification: string
  experience_years: number
  registration_no: string
  phone: string
  email: string
  department: string
  room: string
  consultation_fee: number
  availability: 'Available' | 'On Leave' | 'Off Duty'
  status?: 'Active' | 'Inactive'
  user?: string | null
  schedules?: BackendDoctorSchedule[]
}

export interface DoctorFilters {
  specialization?: string
  department?: string
  availability?: string
  status?: string
  search?: string
  page?: number
  page_size?: number
}

export function listDoctors(filters: DoctorFilters = {}) {
  return apiFetch<Page<BackendDoctor>>(`/doctors/${toQuery({ ...filters })}`)
}

export function getDoctor(id: string) {
  return apiFetch<BackendDoctor>(`/doctors/${id}/`)
}

export function createDoctor(input: DoctorInput) {
  return apiFetch<BackendDoctor>('/doctors/', { method: 'POST', body: input })
}

export function updateDoctor(id: string, input: Partial<DoctorInput>) {
  return apiFetch<BackendDoctor>(`/doctors/${id}/`, { method: 'PATCH', body: input })
}

export function deleteDoctor(id: string) {
  return apiFetch<never>(`/doctors/${id}/`, { method: 'DELETE' })
}
