import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { PrescriptionTable } from '@/components/phase3/PrescriptionTable'
import { listPrescriptions } from '@/lib/api/prescriptions'
import { listDoctorsLookup, listPatientsLookup, type LookupDoctor, type LookupPatient } from '@/lib/api/lookups'
import { toFullPrescription } from '@/lib/api/adapters'
import { canWritePrescriptions, useApiList } from '@/lib/api/hooks'
import type { FullPrescription } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8

export function PrescriptionsPage() {
  const { user } = useAuth()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [doctor, setDoctor] = useState('all')
  const [patient, setPatient] = useState('all')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('all')
  const [patients, setPatients] = useState<LookupPatient[]>([])
  const [doctors, setDoctors] = useState<LookupDoctor[]>([])

  useEffect(() => {
    listPatientsLookup().then((page) => setPatients(page.results)).catch(() => setPatients([]))
    listDoctorsLookup().then((page) => setDoctors(page.results)).catch(() => setDoctors([]))
  }, [])

  const list = useApiList(
    ({ page, page_size }) =>
      listPrescriptions({
        search: query.trim() || undefined,
        doctor: doctor !== 'all' ? doctor : undefined,
        patient: patient !== 'all' ? patient : undefined,
        date: date || undefined,
        status: status !== 'all' ? status : undefined,
        page,
        page_size,
      }),
    [query, doctor, patient, date, status],
    PAGE_SIZE,
  )

  const reset = () => list.setPage(1)
  const prescriptions: FullPrescription[] = list.items.map((rx) => toFullPrescription(rx))
  const writable = canWritePrescriptions(user?.role ?? null)

  const handlePrint = (p: FullPrescription) => {
    success('Print preview ready', `${p.id} sent to print dialog.`)
    window.setTimeout(() => window.print(), 300)
  }
  const handleDownload = (p: FullPrescription) => success('Download started', `${p.id}.pdf will download.`)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Prescriptions"
        description={`${list.total} prescription${list.total === 1 ? '' : 's'}`}
        actions={writable ? <Button asChild><Link to="/prescriptions/new"><Plus className="mr-1 h-4 w-4" /> New Prescription</Link></Button> : undefined}
      />
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by patient, doctor or diagnosis…" value={query} onChange={(e) => { setQuery(e.target.value); reset() }} className="pl-9" aria-label="Search prescriptions" />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Select value={doctor} onValueChange={(v) => { setDoctor(v); reset() }}>
              <SelectTrigger aria-label="Doctor filter"><SelectValue placeholder="Doctor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All doctors</SelectItem>
                {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={patient} onValueChange={(v) => { setPatient(v); reset() }}>
              <SelectTrigger aria-label="Patient filter"><SelectValue placeholder="Patient" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All patients</SelectItem>
                {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); reset() }} aria-label="Date filter" />
            <Select value={status} onValueChange={(v) => { setStatus(v); reset() }}>
              <SelectTrigger aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {['Active', 'Completed', 'Cancelled'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {list.loading ? (
        <ApiLoading label="Loading prescriptions…" />
      ) : list.errorStatus === 403 ? (
        <ApiForbiddenState message={list.error} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={list.refresh} />
      ) : prescriptions.length === 0 ? (
        <EmptyState title="No prescriptions found" description="Try adjusting filters — or create a new prescription." action={writable ? <Button asChild><Link to="/prescriptions/new"><Plus className="mr-1 h-4 w-4" /> New Prescription</Link></Button> : undefined} />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <PrescriptionTable prescriptions={prescriptions} onPrint={handlePrint} onDownload={handleDownload} />
            <DataPagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={list.setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
