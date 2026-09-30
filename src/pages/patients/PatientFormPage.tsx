import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { PatientForm } from '@/components/patients/PatientForm'
import { Button } from '@/components/ui/button'

export function PatientFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { id } = useParams()
  const { getPatient } = useHospitalStore()

  if (mode === 'edit') {
    const patient = id ? getPatient(id) : undefined
    if (!patient) {
      return (
        <EmptyState
          title="Patient not found"
          description="Cannot edit a patient that does not exist in mock data."
          action={<Button asChild><Link to="/patients">Back to Patients</Link></Button>}
        />
      )
    }
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link to={`/patients/${patient.id}`}><ArrowLeft className="mr-1 h-4 w-4" /> Back to profile</Link>
        </Button>
        <PageHeader title={`Edit ${patient.firstName} ${patient.lastName}`} description={`${patient.id} · changes stay in local mock state`} />
        <PatientForm existing={patient} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link to="/patients"><ArrowLeft className="mr-1 h-4 w-4" /> Back to patients</Link>
      </Button>
      <PageHeader title="Add Patient" description="Register a new patient · frontend-only, no database submission" />
      <PatientForm />
    </div>
  )
}
