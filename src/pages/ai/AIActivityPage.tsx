import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import type { AIActivityStatus } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { AIActivityStatusBadge } from '@/components/ai/AIBadges'
import { listAIInsights } from '@/lib/api/ai'
import { useApiList } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 8
const MODULES = ['Symptom Checker', 'Clinical Assistant', 'Prescription Advisory', 'No-Show Prediction', 'Health Analytics']
const STATUSES: AIActivityStatus[] = ['Completed', 'Reviewed', 'Pending Review']

function toActivityStatus(status: string): AIActivityStatus {
  return status === 'Reviewed' ? 'Reviewed' : status === 'Completed' ? 'Completed' : 'Pending Review'
}

export function AIActivityPage() {
  const [query, setQuery] = useState('')
  const [module, setModule] = useState('all')
  const [status, setStatus] = useState('all')

  const list = useApiList(
    ({ page, page_size }) =>
      listAIInsights({
        module: module !== 'all' ? module : undefined,
        review_status: status !== 'all' ? status : undefined,
        search: query.trim() || undefined,
        page,
        page_size,
      }),
    [query, module, status],
    PAGE_SIZE,
  )

  const reset = () => list.setPage(1)

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Activity"
        description={`${list.total} AI-related event${list.total === 1 ? '' : 's'} · persisted review trail`}
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
              placeholder="Search by insight, patient or session…"
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

      {list.loading ? (
        <ApiLoading label="Loading AI activity…" />
      ) : list.errorStatus === 403 ? (
        <ApiForbiddenState message={list.error} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={list.refresh} />
      ) : list.items.length === 0 ? (
        <EmptyState title="No activity found" description="Run an AI assessment to populate this trail." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insight</TableHead>
                    <TableHead>AI Module</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="min-w-[200px] font-medium">{a.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.module}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.patient_name ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.requested_by_email ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{a.created_at.slice(0, 16).replace('T', ' ')}</TableCell>
                      <TableCell>
                        <AIActivityStatusBadge status={toActivityStatus(a.review_status)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={list.setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
