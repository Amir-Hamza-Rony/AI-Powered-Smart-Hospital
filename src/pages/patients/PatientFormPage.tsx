import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { BackendPatient } from '@/lib/api/patients'
import { getPatient } from '@/lib/api/patients'
import { toPatient } from '@/lib/api/adapters'
import { useApiDetail } from '@/lib/api/hooks'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PatientForm } from '@/components/patients/PatientForm'
import { Button } from '@/components/ui/button'

export function PatientFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { id } = useParams()
  const shouldFetch = mode === 'edit' && Boolean(id)

  const query = useApiDetail<BackendPatient | null>(
    shouldFetch ? () => getPatient(id!) : () => Promise.resolve(null),
    [shouldFetch, id],
  )

  if (query.errorStatus === 403) return <ApiForbiddenState message={null} />
  if (query.error) return <ApiErrorState message={query.error} onRetry={() => query.refresh()} />
  if (query.loading && shouldFetch) return <ApiLoading />

  if (mode === 'edit') {
    if (!query.data) {
      return (
        <EmptyState
          title="Patient not found"
          description="Cannot edit a patient that does not exist."
          action={<Button asChild><Link to="/patients">Back to Patients</Link></Button>}
        />
      )
    }
    const patient = toPatient(query.data)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link to={`/patients/${patient.id}`}><ArrowLeft className="mr-1 h-4 w-4" /> Back to profile</Link>
        </Button>
        <PageHeader title={`Edit ${patient.firstName} ${patient.lastName}`} description={`${patient.id}`} />
        <PatientForm mode="edit" patient={patient} onSave={() => query.refresh()} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link to="/patients"><ArrowLeft className="mr-1 h-4 w-4" /> Back to patients</Link>
      </Button>
      <PageHeader title="Add Patient" description="Register a new patient" />
      <PatientForm mode="add" />
    </div>
  )
}
