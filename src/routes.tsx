import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage, PlaceholderPage } from '@/pages/PlaceholderPage'
import { PatientsPage } from '@/pages/patients/PatientsPage'
import { PatientDetailPage } from '@/pages/patients/PatientDetailPage'
import { PatientFormPage } from '@/pages/patients/PatientFormPage'
import { DoctorsPage } from '@/pages/doctors/DoctorsPage'
import { DoctorDetailPage } from '@/pages/doctors/DoctorDetailPage'
import { DoctorFormPage } from '@/pages/doctors/DoctorFormPage'
import { AppointmentsPage } from '@/pages/appointments/AppointmentsPage'
import { AppointmentDetailPage } from '@/pages/appointments/AppointmentDetailPage'
import { NewAppointmentPage } from '@/pages/appointments/NewAppointmentPage'

/**
 * Phase 2 routing structure.
 * Patients, Doctors and Appointments are fully implemented (mock data).
 * Pharmacy / Laboratory / Billing / Settings remain placeholders.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/new" element={<PatientFormPage mode="add" />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/patients/:id/edit" element={<PatientFormPage mode="edit" />} />

        <Route path="/doctors" element={<DoctorsPage />} />
        <Route path="/doctors/new" element={<DoctorFormPage mode="add" />} />
        <Route path="/doctors/:id" element={<DoctorDetailPage />} />
        <Route path="/doctors/:id/edit" element={<DoctorFormPage mode="edit" />} />

        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/new" element={<NewAppointmentPage />} />
        <Route path="/appointments/:id" element={<AppointmentDetailPage />} />

        <Route path="/pharmacy" element={<PlaceholderPage title="Pharmacy" />} />
        <Route path="/laboratory" element={<PlaceholderPage title="Laboratory" />} />
        <Route path="/billing" element={<PlaceholderPage title="Billing" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
