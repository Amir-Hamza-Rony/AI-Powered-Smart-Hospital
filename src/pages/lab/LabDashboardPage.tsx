import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Hourglass, Loader2, CheckCircle2, FileCheck, Plus, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { LabOrderTable } from '@/components/phase3/LabOrderTable'
import { listLabOrders } from '@/lib/api/laboratory'
import { toLabOrder } from '@/lib/api/adapters'
import { isStaffRole, useApiList } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8

export function LabDashboardPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')

  const list = useApiList(
    ({ page, page_size }) =>
      listLabOrders({
        search: query.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        priority: priority !== 'all' ? priority : undefined,
        page,
        page_size,
      }),
    [query, status, priority],
    PAGE_SIZE,
  )

  // Exact status counts via lightweight count queries (page_size=1).
  const [counts, setCounts] = useState({ total: 0, Pending: 0, Processing: 0, Ready: 0, Completed: 0 })
  useEffect(() => {
    let active = true
    const statuses = ['Pending', 'Processing', 'Ready', 'Completed'] as const
    Promise.all([
      listLabOrders({ page: 1, page_size: 1 }).then((page) => page.count),
      ...statuses.map((s) => listLabOrders({ status: s, page: 1, page_size: 1 }).then((page) => page.count)),
    ])
      .then(([total, pending, processing, ready, completed]) => {
        if (active) setCounts({ total, Pending: pending, Processing: processing, Ready: ready, Completed: completed })
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [list.total])

  const orders = list.items.map(toLabOrder)
  const reset = () => list.setPage(1)
  const writable = isStaffRole(user?.role ?? null)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lab Dashboard"
        description="Laboratory orders overview"
        actions={writable ? <Button asChild><Link to="/lab/new"><Plus className="mr-1 h-4 w-4" /> New Lab Order</Link></Button> : undefined}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={ClipboardList} label="Total Orders" value={counts.total} hint="All time" />
        <StatCard icon={Hourglass} label="Pending" value={counts.Pending} hint="Awaiting collection" />
        <StatCard icon={Loader2} label="Processing" value={counts.Processing} hint="In laboratory" />
        <StatCard icon={FileCheck} label="Ready" value={counts.Ready} hint="Reports ready" />
        <StatCard icon={CheckCircle2} label="Completed" value={counts.Completed} hint="Delivered" />
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
      {list.loading ? (
        <ApiLoading label="Loading lab orders…" />
      ) : list.errorStatus === 403 ? (
        <ApiForbiddenState message={list.error} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={list.refresh} />
      ) : orders.length === 0 ? (
        <EmptyState title="No lab orders found" description="Try adjusting filters — or create a new order." action={writable ? <Button asChild><Link to="/lab/new"><Plus className="mr-1 h-4 w-4" /> New Lab Order</Link></Button> : undefined} />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <LabOrderTable orders={orders} />
            <DataPagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={list.setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
