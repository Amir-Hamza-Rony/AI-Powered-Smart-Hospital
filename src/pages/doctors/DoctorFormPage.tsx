import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DoctorForm } from '@/components/doctors/DoctorForm'
import { Button } from '@/components/ui/button'

export function DoctorFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { id } = useParams()
  const { getDoctor } = useHospitalStore()

  if (mode === 'edit') {
    const doctor = id ? getDoctor(id) : undefined
    if (!doctor) {
      return (
        <EmptyState
          title="Doctor not found"
          description="Cannot edit a doctor that does not exist in mock data."
          action={<Button asChild><Link to="/doctors">Back to Doctors</Link></Button>}
        />
      )
    }
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link to={`/doctors/${doctor.id}`}><ArrowLeft className="mr-1 h-4 w-4" /> Back to profile</Link>
        </Button>
        <PageHeader title={`Edit ${doctor.name}`} description={`${doctor.id} · changes stay in local mock state`} />
        <DoctorForm existing={doctor} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link to="/doctors"><ArrowLeft className="mr-1 h-4 w-4" /> Back to doctors</Link>
      </Button>
      <PageHeader title="Add Doctor" description="Register a new doctor · frontend-only, no database submission" />
      <DoctorForm />
    </div>
  )
}
