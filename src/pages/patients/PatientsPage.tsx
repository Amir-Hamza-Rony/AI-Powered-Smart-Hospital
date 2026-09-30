import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { BLOOD_GROUPS } from '@/data/patients'
import type { Patient } from '@/data/types'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataPagination } from '@/components/shared/DataPagination'
import { PatientTable } from '@/components/patients/PatientTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8

export function PatientsPage() {
  const { patients, deletePatient } = useHospitalStore()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [gender, setGender] = useState('all')
  const [blood, setBlood] = useState('all')
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<Patient | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return patients.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (gender !== 'all' && p.gender !== gender) return false
      if (blood !== 'all' && p.bloodGroup !== blood) return false
      if (!q) return true
      return (
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        p.email.toLowerCase().includes(q)
      )
    })
  }, [patients, query, status, gender, blood])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const resetPage = () => setPage(1)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Patients"
        description={`${filtered.length} patient${filtered.length === 1 ? '' : 's'} registered · mock data`}
        actions={
          <Button asChild>
            <Link to="/patients/new">
              <Plus className="mr-1 h-4 w-4" /> Add Patient
            </Link>
          </Button>
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
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" /> Filter
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
            <Select value={status} onValueChange={(v) => { setStatus(v); resetPage() }}>
              <SelectTrigger aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {['Active', 'Inactive', 'Critical', 'Recovered'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={gender} onValueChange={(v) => { setGender(v); resetPage() }}>
              <SelectTrigger aria-label="Gender filter"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genders</SelectItem>
                {['Male', 'Female', 'Other'].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={blood} onValueChange={(v) => { setBlood(v); resetPage() }}>
              <SelectTrigger aria-label="Blood group filter"><SelectValue placeholder="Blood group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All blood groups</SelectItem>
                {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {pageItems.length === 0 ? (
        <EmptyState
          title="No patients found"
          description="Try adjusting your search or filters, or register a new patient."
          action={<Button asChild><Link to="/patients/new"><Plus className="mr-1 h-4 w-4" /> Add Patient</Link></Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <PatientTable patients={pageItems} onDelete={setPendingDelete} />
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.firstName} ${pendingDelete?.lastName ?? ''}?`}
        description="This removes the patient from the local mock list only. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) {
            deletePatient(pendingDelete.id)
            success('Patient deleted', `${pendingDelete.id} removed from mock state.`)
          }
        }}
      />
    </div>
  )
}
