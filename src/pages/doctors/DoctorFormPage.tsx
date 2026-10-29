import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { BackendDoctor } from '@/lib/api/doctors'
import { getDoctor } from '@/lib/api/doctors'
import { toDoctor } from '@/lib/api/adapters'
import { useApiDetail } from '@/lib/api/hooks'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { DoctorForm } from '@/components/doctors/DoctorForm'
import { Button } from '@/components/ui/button'

export function DoctorFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { id } = useParams()
  const shouldFetch = mode === 'edit' && Boolean(id)

  const query = useApiDetail<BackendDoctor | null>(
    shouldFetch ? () => getDoctor(id!) : () => Promise.resolve(null),
    [shouldFetch, id],
  )

  if (query.errorStatus === 403) return <ApiForbiddenState message={null} />
  if (query.error) return <ApiErrorState message={query.error} onRetry={() => query.refresh()} />
  if (query.loading && shouldFetch) return <ApiLoading />

  if (mode === 'edit') {
    if (!query.data) {
      return (
        <EmptyState
          title="Doctor not found"
          description="Cannot edit a doctor that does not exist."
          action={<Button asChild><Link to="/doctors">Back to Doctors</Link></Button>}
        />
      )
    }
    const doctor = toDoctor(query.data)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link to={`/doctors/${doctor.id}`}><ArrowLeft className="mr-1 h-4 w-4" /> Back to profile</Link>
        </Button>
        <PageHeader title={`Edit ${doctor.name}`} description={`${doctor.id}`} />
        <DoctorForm mode="edit" doctor={doctor} onSave={() => query.refresh()} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link to="/doctors"><ArrowLeft className="mr-1 h-4 w-4" /> Back to doctors</Link>
      </Button>
      <PageHeader title="Add Doctor" description="Register a new doctor" />
      <DoctorForm mode="add" />
    </div>
  )
}
