import { useMemo, useState } from 'react'
import { CalendarClock, CalendarCheck, CheckCircle2, XCircle, Search } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { DataPagination } from '@/components/shared/DataPagination'
import { FollowUpStatusBadge } from '@/components/phase3/StatusBadges'
import type { FollowUp } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

const PAGE_SIZE = 8

export function FollowUpsPage() {
  const { followUps, setFollowUpStatus } = useHospitalStore()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const upcoming = followUps.filter((f) => f.status === 'Upcoming').length
  const dueToday = followUps.filter((f) => f.status === 'Due Today').length
  const completed = followUps.filter((f) => f.status === 'Completed').length
  const missed = followUps.filter((f) => f.status === 'Missed').length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return followUps.filter((f) => {
      if (status !== 'all' && f.status !== status) return false
      if (!q) return true
      return f.patientName.toLowerCase().includes(q) || f.doctorName.toLowerCase().includes(q) || f.id.toLowerCase().includes(q)
    })
  }, [followUps, query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const mark = (f: FollowUp, s: FollowUp['status']) => {
    setFollowUpStatus(f.id, s)
    success(`Follow-up ${s.toLowerCase()}`, `${f.id} updated in mock state.`)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Follow-ups" description="Follow-up appointments and tasks · mock data" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="Upcoming Follow-ups" value={upcoming} hint="Scheduled ahead" />
        <StatCard icon={CalendarCheck} label="Due Today" value={dueToday} hint="Needs attention" />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} hint="Done" />
        <StatCard icon={XCircle} label="Missed" value={missed} hint="Did not attend" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by ID, patient or doctor…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} className="pl-9" aria-label="Search follow-ups" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="sm:w-[200px]" aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {['Upcoming', 'Due Today', 'Completed', 'Missed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      {pageItems.length === 0 ? (
        <EmptyState title="No follow-ups found" description="Try adjusting search or status filter." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Original Visit</TableHead>
                    <TableHead>Follow-up Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="whitespace-nowrap font-medium">{f.patientName}<span className="block text-[11px] font-normal text-muted-foreground">{f.id}</span></TableCell>
                      <TableCell className="whitespace-nowrap">{f.doctorName}</TableCell>
                      <TableCell className="whitespace-nowrap">{f.originalVisit}</TableCell>
                      <TableCell className="whitespace-nowrap">{f.followUpDate}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={f.reason}>{f.reason}</TableCell>
                      <TableCell><FollowUpStatusBadge status={f.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${f.id}`}><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => mark(f, 'Completed')}>Mark completed</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => mark(f, 'Missed')}>Mark missed</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => mark(f, 'Upcoming')}>Move to upcoming</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
