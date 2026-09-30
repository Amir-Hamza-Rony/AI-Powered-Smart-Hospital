import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { NotFoundPage, PlaceholderPage } from '@/pages/PlaceholderPage'

/**
 * Phase 1 routing structure.
 * Only Dashboard + Settings shell are real; clinical modules
 * point to PlaceholderPage until Phase 2.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patients" element={<PlaceholderPage title="Patients" />} />
        <Route path="/appointments" element={<PlaceholderPage title="Appointments" />} />
        <Route path="/doctors" element={<PlaceholderPage title="Doctors" />} />
        <Route path="/pharmacy" element={<PlaceholderPage title="Pharmacy" />} />
        <Route path="/laboratory" element={<PlaceholderPage title="Laboratory" />} />
        <Route path="/billing" element={<PlaceholderPage title="Billing" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
