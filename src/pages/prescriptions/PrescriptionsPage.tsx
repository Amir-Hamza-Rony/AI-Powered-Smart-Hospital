import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { PrescriptionTable } from '@/components/phase3/PrescriptionTable'
import type { FullPrescription } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8

export function PrescriptionsPage() {
  const { prescriptions, doctors } = useHospitalStore()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [doctor, setDoctor] = useState('all')
  const [patient, setPatient] = useState('all')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const patientOptions = useMemo(() => {
    const map = new Map<string, string>()
    prescriptions.forEach((p) => map.set(p.patientId, p.patientName))
    return [...map.entries()]
  }, [prescriptions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return prescriptions.filter((p) => {
      if (doctor !== 'all' && p.doctorId !== doctor) return false
      if (patient !== 'all' && p.patientId !== patient) return false
      if (date && p.date !== date) return false
      if (status !== 'all' && p.status !== status) return false
      if (!q) return true
      return (
        p.id.toLowerCase().includes(q) ||
        p.patientName.toLowerCase().includes(q) ||
        p.doctorName.toLowerCase().includes(q) ||
        p.medicines.some((m) => m.name.toLowerCase().includes(q))
      )
    })
  }, [prescriptions, query, doctor, patient, date, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)

  const handlePrint = (p: FullPrescription) => {
    success('Print preview ready', `${p.id} sent to print dialog (frontend-only).`)
    window.setTimeout(() => window.print(), 300)
  }
  const handleDownload = (p: FullPrescription) => success('Download started', `${p.id}.pdf will download (frontend-only mock).`)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Prescriptions"
        description={`${filtered.length} prescription${filtered.length === 1 ? '' : 's'} · mock data`}
        actions={<Button asChild><Link to="/prescriptions/new"><Plus className="mr-1 h-4 w-4" /> New Prescription</Link></Button>}
      />
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by ID, patient, doctor or medicine…" value={query} onChange={(e) => { setQuery(e.target.value); reset() }} className="pl-9" aria-label="Search prescriptions" />
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
                {patientOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
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
      {pageItems.length === 0 ? (
        <EmptyState title="No prescriptions found" description="Try adjusting filters — or create a new prescription." action={<Button asChild><Link to="/prescriptions/new"><Plus className="mr-1 h-4 w-4" /> New Prescription</Link></Button>} />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <PrescriptionTable prescriptions={pageItems} onPrint={handlePrint} onDownload={handleDownload} />
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
