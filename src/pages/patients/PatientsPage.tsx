import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { BLOOD_GROUPS } from '@/data/patients'
import type { Patient } from '@/data/types'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { PatientTable } from '@/components/patients/PatientTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { listPatients, deletePatient, type PatientFilters } from '@/lib/api/patients'
import { toPatient } from '@/lib/api/adapters'
import { useApiList } from '@/lib/api/hooks'
import { canManagePatients } from '@/lib/api/hooks'
import { useAuth } from '@/context/AuthContext'

const PAGE_SIZE = 8

export function PatientsPage() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const canManage = canManagePatients(user?.role ?? null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [gender, setGender] = useState('all')
  const [blood, setBlood] = useState('all')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const filters: PatientFilters = {
    gender: gender !== 'all' ? gender : undefined,
    status: status !== 'all' ? status : undefined,
    blood_group: blood !== 'all' ? blood : undefined,
    search: query || undefined,
  }

  const list = useApiList<Patient>(
    ({ page, page_size }) =>
      listPatients({ ...filters, page, page_size }).then((page_) =>
        page_ ? { ...page_, results: page_.results.map(toPatient) } : page_,
      ),
    [query, status, gender, blood],
    PAGE_SIZE,
  )

  const resetPage = () => list.setPage(1)

  const handleDelete = async (id: string) => {
    if (!canManage) return
    try {
      await deletePatient(id)
      list.refresh()
      success('Patient deleted', `${id} removed.`)
    } catch (err) {
      error('Delete failed', err instanceof Error ? err.message : 'Request failed.')
    }
  }

  return (
    <div className="space-y-4">
      {list.errorStatus === 403 ? (
        <ApiForbiddenState message={null} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={resetPage} />
      ) : (
        <>
          <PageHeader
            title="Patients"
            description={`${list.total} patient${list.total === 1 ? '' : 's'} registered`}
            actions={
              canManage ? (
                <Button asChild disabled={list.loading}>
                  <Link to="/patients/new">
                    <Plus className="mr-1 h-4 w-4" /> Add Patient
                  </Link>
                </Button>
              ) : null
            }
          />

          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID, phone or email…"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); resetPage() }}
                    className="pl-9"
                    aria-label="Search patients"
                    disabled={list.loading}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <SlidersHorizontal className="h-4 w-4" /> Filter
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
                <Select value={status} onValueChange={(v) => { setStatus(v); resetPage() }} disabled={list.loading}>
                  <SelectTrigger aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {['Active', 'Inactive', 'Critical', 'Recovered'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={gender} onValueChange={(v) => { setGender(v); resetPage() }} disabled={list.loading}>
                  <SelectTrigger aria-label="Gender filter"><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genders</SelectItem>
                    {['Male', 'Female', 'Other'].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={blood} onValueChange={(v) => { setBlood(v); resetPage() }} disabled={list.loading}>
                  <SelectTrigger aria-label="Blood group filter"><SelectValue placeholder="Blood group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All blood groups</SelectItem>
                    {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {list.loading ? (
            <ApiLoading />
          ) : list.items.length === 0 ? (
            <EmptyState
              title="No patients found"
              description="Try adjusting your search or filters, or register a new patient."
              action={
                canManage ? (
                  <Button asChild disabled={list.loading}>
                    <Link to="/patients/new"><Plus className="mr-1 h-4 w-4" /> Add Patient</Link>
                  </Button>
                ) : null
              }
            />
          ) : (
            <Card>
              <CardContent className="p-2 sm:p-4">
                <PatientTable
                  patients={list.items}
                  onDelete={canManage ? setPendingDelete : undefined}
                  canManage={canManage}
                />
                <DataPagination
                  page={list.page}
                  totalPages={list.totalPages}
                  total={list.total}
                  pageSize={PAGE_SIZE}
                  onPageChange={list.setPage}
                />
              </CardContent>
            </Card>
          )}

          <ConfirmDialog
            open={pendingDelete !== null}
            onOpenChange={(o) => !o && setPendingDelete(null)}
            title="Delete patient?"
            description="This removes the patient from the registry. This action cannot be undone."
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
