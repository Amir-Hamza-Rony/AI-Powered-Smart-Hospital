import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { MOCK_PATIENTS } from '@/data/patients'
import { MOCK_DOCTORS } from '@/data/doctors'
import { MOCK_APPOINTMENTS } from '@/data/appointments'
import type { Appointment, AppointmentStatus, Doctor, Patient } from '@/data/types'

interface HospitalStoreValue {
  patients: Patient[]
  doctors: Doctor[]
  appointments: Appointment[]
  getPatient: (id: string) => Patient | undefined
  getDoctor: (id: string) => Doctor | undefined
  getAppointment: (id: string) => Appointment | undefined
  addPatient: (p: Patient) => void
  updatePatient: (id: string, patch: Partial<Patient>) => void
  deletePatient: (id: string) => void
  addDoctor: (d: Doctor) => void
  updateDoctor: (id: string, patch: Partial<Doctor>) => void
  deleteDoctor: (id: string) => void
  addAppointment: (a: Appointment) => void
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void
  deleteAppointment: (id: string) => void
}

const HospitalStoreContext = createContext<HospitalStoreValue | null>(null)

export function HospitalStoreProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS)
  const [doctors, setDoctors] = useState<Doctor[]>(MOCK_DOCTORS)
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS)

  const value = useMemo<HospitalStoreValue>(
    () => ({
      patients,
      doctors,
      appointments,
      getPatient: (id) => patients.find((p) => p.id === id),
      getDoctor: (id) => doctors.find((d) => d.id === id),
      getAppointment: (id) => appointments.find((a) => a.id === id),
      addPatient: (p) => setPatients((prev) => [p, ...prev]),
      updatePatient: (id, patch) => setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      deletePatient: (id) => setPatients((prev) => prev.filter((p) => p.id !== id)),
      addDoctor: (d) => setDoctors((prev) => [d, ...prev]),
      updateDoctor: (id, patch) => setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d))),
      deleteDoctor: (id) => setDoctors((prev) => prev.filter((d) => d.id !== id)),
      addAppointment: (a) => setAppointments((prev) => [a, ...prev]),
      setAppointmentStatus: (id, status) =>
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a))),
      deleteAppointment: (id) => setAppointments((prev) => prev.filter((a) => a.id !== id)),
    }),
    [patients, doctors, appointments],
  )

  return <HospitalStoreContext.Provider value={value}>{children}</HospitalStoreContext.Provider>
}

export function useHospitalStore() {
  const ctx = useContext(HospitalStoreContext)
  if (!ctx) throw new Error('useHospitalStore must be used within HospitalStoreProvider')
  return ctx
}

export function nextId(prefix: string, existing: string[]) {
  const nums = existing
    .map((id) => Number.parseInt(id.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `${prefix}-${max + 1}`
}
