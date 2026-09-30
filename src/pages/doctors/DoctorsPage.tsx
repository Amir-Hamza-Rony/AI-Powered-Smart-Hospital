import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { SPECIALTIES } from '@/data/doctors'
import type { Doctor } from '@/data/types'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DoctorCard } from '@/components/doctors/DoctorCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function DoctorsPage() {
  const { doctors, deleteDoctor } = useHospitalStore()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState('all')
  const [availability, setAvailability] = useState('all')
  const [pendingDelete, setPendingDelete] = useState<Doctor | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return doctors.filter((d) => {
      if (specialty !== 'all' && d.specialty !== specialty) return false
      if (availability !== 'all' && d.availability !== availability) return false
      if (!q) return true
      return (
        d.name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q)
      )
    })
  }, [doctors, query, specialty, availability])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Doctors"
        description={`${filtered.length} doctor${filtered.length === 1 ? '' : 's'} on roster · mock data`}
        actions={
          <Button asChild>
            <Link to="/doctors/new"><Plus className="mr-1 h-4 w-4" /> Add Doctor</Link>
          </Button>
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
            />
          </div>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger aria-label="Specialty filter"><SelectValue placeholder="Specialty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All specialties</SelectItem>
              {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger aria-label="Availability filter"><SelectValue placeholder="Availability" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any availability</SelectItem>
              {['Available', 'On Leave', 'Off Duty'].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No doctors found"
          description="Try adjusting search or filters, or add a new doctor."
          action={<Button asChild><Link to="/doctors/new"><Plus className="mr-1 h-4 w-4" /> Add Doctor</Link></Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => <DoctorCard key={d.id} doctor={d} onDelete={setPendingDelete} />)}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name ?? ''}?`}
        description="This removes the doctor from the local mock roster only."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) {
            deleteDoctor(pendingDelete.id)
            success('Doctor deleted', `${pendingDelete.id} removed from mock state.`)
          }
        }}
      />
    </div>
  )
}
