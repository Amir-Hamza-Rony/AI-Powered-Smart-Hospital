import { apiFetch } from '@/lib/api/client'
import { toQuery, type Page } from '@/lib/api/common'

/** Minimal lookup shapes for patient/doctor selector dropdowns. */

export interface LookupPatient {
  id: string
  name: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  blood_group: string
  phone: string
}

export interface LookupDoctor {
  id: string
  name: string
  first_name: string
  last_name: string
  specialization: string
  registration_no: string
  status: string
}

export function listPatientsLookup(params: { search?: string; page_size?: number } = {}) {
  return apiFetch<Page<LookupPatient>>(
    `/patients/${toQuery({ search: params.search, page_size: params.page_size ?? 100 })}`,
  )
}

export function listDoctorsLookup(params: { search?: string; status?: string; page_size?: number } = {}) {
  return apiFetch<Page<LookupDoctor>>(
    `/doctors/${toQuery({ search: params.search, status: params.status, page_size: params.page_size ?? 100 })}`,
  )
}

export function listActiveDoctorsLookup() {
  return listDoctorsLookup({ status: 'Active' })
}
