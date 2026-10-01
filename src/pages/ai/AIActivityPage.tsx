import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { MOCK_AI_ACTIVITY } from '@/data/ai'
import type { AIActivityStatus, AIModule } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { AIActivityStatusBadge } from '@/components/ai/AIBadges'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 8
const MODULES: AIModule[] = ['Symptom Checker', 'Clinical Assistant', 'Prescription Advisory', 'No-Show Prediction', 'Health Analytics']
const STATUSES: AIActivityStatus[] = ['Completed', 'Reviewed', 'Pending Review']

export function AIActivityPage() {
  const [query, setQuery] = useState('')
  const [module, setModule] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MOCK_AI_ACTIVITY.filter((a) => {
      if (module !== 'all' && a.module !== module) return false
      if (status !== 'all' && a.status !== status) return false
      if (!q) return true
      return (
        a.id.toLowerCase().includes(q) ||
        a.user.toLowerCase().includes(q) ||
        a.patient.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q)
      )
    })
  }, [query, module, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Activity"
        description={`${filtered.length} AI-related event${filtered.length === 1 ? '' : 's'} · mock audit trail`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai">
              <ArrowLeft className="mr-1 h-4 w-4" /> AI Hub
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by activity ID, user, patient or action…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                reset()
              }}
              className="pl-9"
              aria-label="Search AI activity"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={module}
              onValueChange={(v) => {
                setModule(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="AI module filter">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Status filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {pageItems.length === 0 ? (
        <EmptyState title="No activity found" description="Try adjusting the search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>AI Module</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap font-medium">{a.id}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.user}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.role}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.module}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.patient}</TableCell>
                      <TableCell className="min-w-[200px]">{a.action}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.timestamp}</TableCell>
                      <TableCell>
                        <AIActivityStatusBadge status={a.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
