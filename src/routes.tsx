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
import { PrescriptionsPage } from '@/pages/prescriptions/PrescriptionsPage'
import { PrescriptionDetailPage } from '@/pages/prescriptions/PrescriptionDetailPage'
import { NewPrescriptionPage } from '@/pages/prescriptions/NewPrescriptionPage'
import { MedicinesPage } from '@/pages/medicines/MedicinesPage'
import { FollowUpsPage } from '@/pages/followups/FollowUpsPage'
import { LabDashboardPage } from '@/pages/lab/LabDashboardPage'
import { LabOrderDetailPage } from '@/pages/lab/LabOrderDetailPage'
import { NewLabOrderPage } from '@/pages/lab/NewLabOrderPage'
import { LabTestsPage } from '@/pages/lab/LabTestsPage'
import { PharmacyDashboardPage } from '@/pages/pharmacy/PharmacyDashboardPage'
import { InventoryPage } from '@/pages/pharmacy/InventoryPage'
import { InventoryDetailPage } from '@/pages/pharmacy/InventoryDetailPage'
import { InventoryFormPage } from '@/pages/pharmacy/InventoryFormPage'
import { DispensingPage } from '@/pages/pharmacy/DispensingPage'
import { AlertsPage } from '@/pages/pharmacy/AlertsPage'

/**
 * Phase 3 routing structure.
 * Phase 1 shell + Phase 2 (patients/doctors/appointments) preserved.
 * Phase 3 adds prescriptions, lab and pharmacy (mock data, frontend-only).
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

        <Route path="/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/prescriptions/new" element={<NewPrescriptionPage />} />
        <Route path="/prescriptions/:id" element={<PrescriptionDetailPage />} />

        <Route path="/medicines" element={<MedicinesPage />} />
        <Route path="/follow-ups" element={<FollowUpsPage />} />

        <Route path="/lab" element={<LabDashboardPage />} />
        <Route path="/lab/orders" element={<LabDashboardPage />} />
        <Route path="/lab/tests" element={<LabTestsPage />} />
        <Route path="/lab/new" element={<NewLabOrderPage />} />
        <Route path="/lab/:id" element={<LabOrderDetailPage />} />

        <Route path="/pharmacy" element={<PharmacyDashboardPage />} />
        <Route path="/pharmacy/inventory" element={<InventoryPage />} />
        <Route path="/pharmacy/inventory/new" element={<InventoryFormPage mode="add" />} />
        <Route path="/pharmacy/inventory/:id" element={<InventoryDetailPage />} />
        <Route path="/pharmacy/inventory/:id/edit" element={<InventoryFormPage mode="edit" />} />
        <Route path="/pharmacy/dispensing" element={<DispensingPage />} />
        <Route path="/pharmacy/alerts" element={<AlertsPage />} />

        {/* Legacy Phase-2 placeholder paths keep working */}
        <Route path="/laboratory" element={<LabDashboardPage />} />

        <Route path="/billing" element={<PlaceholderPage title="Billing" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
