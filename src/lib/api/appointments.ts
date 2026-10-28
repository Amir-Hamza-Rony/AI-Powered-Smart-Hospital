import { apiFetch } from '@/lib/api/client'
import { toQuery, type Page } from '@/lib/api/common'

/** Raw backend shapes (snake_case) for /api/appointments/. */

export interface BackendAppointment {
  id: string
  patient: string
  patient_name: string
  doctor: string
  doctor_name: string
  specialty: string
  date: string
  time: string
  type: 'In-person' | 'Follow-up' | 'Emergency' | 'Online'
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
  reason: string
  notes: string
  created_at: string
  updated_at: string
}

export interface AppointmentInput {
  patient: string
  doctor: string
  date: string
  time: string
  type: 'In-person' | 'Follow-up' | 'Emergency' | 'Online'
  reason?: string
  notes?: string
  status?: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
}

export interface AppointmentFilters {
  patient?: string
  doctor?: string
  status?: string
  date?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  page_size?: number
}

export function listAppointments(filters: AppointmentFilters = {}) {
  return apiFetch<Page<BackendAppointment>>(`/appointments/${toQuery({ ...filters })}`)
}

export function getAppointment(id: string) {
  return apiFetch<BackendAppointment>(`/appointments/${id}/`)
}

export function createAppointment(input: AppointmentInput) {
  return apiFetch<BackendAppointment>('/appointments/', { method: 'POST', body: input })
}

export function updateAppointment(id: string, input: Partial<AppointmentInput>) {
  return apiFetch<BackendAppointment>(`/appointments/${id}/`, { method: 'PATCH', body: input })
}

export function deleteAppointment(id: string) {
  return apiFetch<never>(`/appointments/${id}/`, { method: 'DELETE' })
}

export function confirmAppointment(id: string) {
  return apiFetch<BackendAppointment>(`/appointments/${id}/confirm/`, { method: 'POST' })
}

export function completeAppointment(id: string) {
  return apiFetch<BackendAppointment>(`/appointments/${id}/complete/`, { method: 'POST' })
}

export function cancelAppointment(id: string) {
  return apiFetch<BackendAppointment>(`/appointments/${id}/cancel/`, { method: 'POST' })
}
