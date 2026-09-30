import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { AppointmentForm } from '@/components/appointments/AppointmentForm'
import { Button } from '@/components/ui/button'

export function NewAppointmentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link to="/appointments"><ArrowLeft className="mr-1 h-4 w-4" /> Back to appointments</Link>
      </Button>
      <PageHeader title="New Appointment" description="Book a visit · frontend-only, updates the local mock list" />
      <AppointmentForm />
    </div>
  )
}
