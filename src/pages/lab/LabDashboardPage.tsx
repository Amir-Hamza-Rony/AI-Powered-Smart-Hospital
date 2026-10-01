import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Hourglass, Loader2, CheckCircle2, FileCheck, Plus, Search } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { DataPagination } from '@/components/shared/DataPagination'
import { LabOrderTable } from '@/components/phase3/LabOrderTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8

export function LabDashboardPage() {
  const { labOrders } = useHospitalStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [page, setPage] = useState(1)

  const total = labOrders.length
  const pending = labOrders.filter((o) => o.status === 'Pending').length
  const processing = labOrders.filter((o) => o.status === 'Processing').length
  const ready = labOrders.filter((o) => o.status === 'Ready').length
  const completed = labOrders.filter((o) => o.status === 'Completed').length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return labOrders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false
      if (priority !== 'all' && o.priority !== priority) return false
      if (!q) return true
      return o.id.toLowerCase().includes(q) || o.patientName.toLowerCase().includes(q) || o.tests.some((t) => t.testName.toLowerCase().includes(q))
    })
  }, [labOrders, query, status, priority])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lab Dashboard"
        description="Laboratory orders overview · mock data"
        actions={<Button asChild><Link to="/lab/new"><Plus className="mr-1 h-4 w-4" /> New Lab Order</Link></Button>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={ClipboardList} label="Total Orders" value={total} hint="All time (mock)" />
        <StatCard icon={Hourglass} label="Pending" value={pending} hint="Awaiting collection" />
        <StatCard icon={Loader2} label="Processing" value={processing} hint="In laboratory" />
        <StatCard icon={FileCheck} label="Ready" value={ready} hint="Reports ready" />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} hint="Delivered" />
      </div>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by order ID, patient or test…" value={query} onChange={(e) => { setQuery(e.target.value); reset() }} className="pl-9" aria-label="Search lab orders" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={status} onValueChange={(v) => { setStatus(v); reset() }}>
              <SelectTrigger aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {['Pending', 'Processing', 'Ready', 'Completed', 'Cancelled'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => { setPriority(v); reset() }}>
              <SelectTrigger aria-label="Priority filter"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {['Normal', 'Urgent', 'Emergency'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {pageItems.length === 0 ? (
        <EmptyState title="No lab orders found" description="Try adjusting filters — or create a new order." action={<Button asChild><Link to="/lab/new"><Plus className="mr-1 h-4 w-4" /> New Lab Order</Link></Button>} />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <LabOrderTable orders={pageItems} />
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
