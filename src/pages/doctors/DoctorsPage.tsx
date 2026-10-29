import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { SPECIALTIES } from '@/data/doctors'
import type { Doctor } from '@/data/types'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { DoctorCard } from '@/components/doctors/DoctorCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { listDoctors, deleteDoctor, type DoctorFilters } from '@/lib/api/doctors'
import { toDoctor } from '@/lib/api/adapters'
import { useApiList } from '@/lib/api/hooks'
import { canManageDoctors } from '@/lib/api/hooks'
import { useAuth } from '@/context/AuthContext'

export function DoctorsPage() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const canManage = canManageDoctors(user?.role ?? null)
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState('all')
  const [availability, setAvailability] = useState('all')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const filters: DoctorFilters = {
    specialization: specialty !== 'all' ? specialty : undefined,
    availability: availability !== 'all' ? availability : undefined,
    search: query || undefined,
  }

  const list = useApiList<Doctor>(
    ({ page, page_size }) =>
      listDoctors({ ...filters, page, page_size }).then((page_) =>
        page_ ? { ...page_, results: page_.results.map(toDoctor) } : page_,
      ),
    [query, specialty, availability],
  )

  const handleDelete = async (id: string) => {
    if (!canManage) return
    try {
      await deleteDoctor(id)
      list.refresh()
      success('Doctor deleted', `${id} removed.`)
    } catch (err) {
      error('Delete failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  return (
    <div className="space-y-4">
      {list.errorStatus === 403 ? (
        <ApiForbiddenState message={null} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={() => list.refresh()} />
      ) : (
        <>
          <PageHeader
            title="Doctors"
            description={`${list.total} doctor${list.total === 1 ? '' : 's'} on roster`}
            actions={
              canManage ? (
                <Button asChild disabled={list.loading}>
                  <Link to="/doctors/new">
                    <Plus className="mr-1 h-4 w-4" /> Add Doctor
                  </Link>
                </Button>
              ) : null
            }
          />

          <Card>
            <CardContent className="grid gap-2 p-4 md:grid-cols-[1fr_200px_200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, specialty…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                  aria-label="Search doctors"
                  disabled={list.loading}
                />
              </div>
              <Select value={specialty} onValueChange={setSpecialty} disabled={list.loading}>
                <SelectTrigger aria-label="Specialty filter"><SelectValue placeholder="Specialty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All specialties</SelectItem>
                  {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={availability} onValueChange={setAvailability} disabled={list.loading}>
                <SelectTrigger aria-label="Availability filter"><SelectValue placeholder="Availability" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any availability</SelectItem>
                  {['Available', 'On Leave', 'Off Duty'].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {list.loading ? (
            <ApiLoading />
          ) : list.items.length === 0 ? (
            <EmptyState
              title="No doctors found"
              description="Try adjusting search or filters, or add a new doctor."
              action={
                canManage ? (
                  <Button asChild disabled={list.loading}>
                    <Link to="/doctors/new"><Plus className="mr-1 h-4 w-4" /> Add Doctor</Link>
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.items.map((d) => <DoctorCard key={d.id} doctor={d} onDelete={canManage ? setPendingDelete : undefined} />)}
            </div>
          )}

          <ConfirmDialog
            open={pendingDelete !== null}
            onOpenChange={(o) => !o && setPendingDelete(null)}
            title="Delete doctor?"
            description="This removes the doctor from the roster. This action cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={() => {
              if (pendingDelete) handleDelete(pendingDelete)
            }}
          />
        </>
      )}
    </div>
  )
}
