import { useMemo, useState } from 'react'
import { Search, Wallet, AlertTriangle, CalendarClock, Users } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { MOCK_DUES, formatBDT } from '@/data/billing'
import type { DueRecord } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { StatCard } from '@/components/shared/StatCard'
import { DuesTable } from '@/components/billing/DuesTable'
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8
const TODAY = '2026-10-01'

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

export function DuesPage() {
  const { invoices } = useHospitalStore()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [payInvoice, setPayInvoice] = useState<string | undefined>(undefined)
  const [payOpen, setPayOpen] = useState(false)

  const dues: DueRecord[] = useMemo(() => {
    const live = invoices
      .filter((i) => i.due > 0 && i.status !== 'Cancelled' && i.status !== 'Draft')
      .map((i) => {
        const daysOverdue = Math.max(0, daysBetween(i.dueDate, TODAY))
        const dueStatus: DueRecord['status'] =
          daysOverdue > 0 ? 'Overdue' : i.paid > 0 ? 'Partially Paid' : 'Due Soon'
        return {
          id: `DUE-${i.id}`,
          patientId: i.patientId,
          patientName: i.patientName,
          patientPhone: i.patientPhone,
          invoiceId: i.id,
          invoiceDate: i.issueDate,
          dueDate: i.dueDate,
          totalAmount: i.total,
          paid: i.paid,
          outstanding: i.due,
          daysOverdue,
          status: dueStatus,
        } satisfies DueRecord
      })
    if (live.length > 0) return live
    return MOCK_DUES
  }, [invoices])

  const totalOutstanding = dues.reduce((s, d) => s + d.outstanding, 0)
  const overdueAmount = dues.filter((d) => d.status === 'Overdue').reduce((s, d) => s + d.outstanding, 0)
  const dueThisWeek = dues
    .filter((d) => {
      const diff = daysBetween(TODAY, d.dueDate)
      return diff >= 0 && diff <= 7
    })
    .reduce((s, d) => s + d.outstanding, 0)
  const patientsWithDues = new Set(dues.map((d) => d.patientId)).size

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return dues.filter((d) => {
      if (status !== 'all' && d.status !== status) return false
      if (!q) return true
      return (
        d.patientName.toLowerCase().includes(q) ||
        d.patientId.toLowerCase().includes(q) ||
        d.invoiceId.toLowerCase().includes(q)
      )
    })
  }, [dues, query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <PageHeader title="Outstanding Dues" description={`${dues.length} open due record${dues.length === 1 ? '' : 's'} · mock data`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Total Outstanding" value={formatBDT(totalOutstanding)} hint="All open invoices" />
        <StatCard icon={AlertTriangle} label="Overdue Amount" value={formatBDT(overdueAmount)} hint="Past due date" />
        <StatCard icon={CalendarClock} label="Due This Week" value={formatBDT(dueThisWeek)} hint="Next 7 days" />
        <StatCard icon={Users} label="Patients With Dues" value={patientsWithDues} hint="Unique patients" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by patient, patient ID or invoice…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              className="pl-9"
              aria-label="Search dues"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-[220px]" aria-label="Due status filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {['Due Soon', 'Overdue', 'Partially Paid'].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      {pageItems.length === 0 ? (
        <EmptyState title="No dues found" description="All clear — or try adjusting filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <DuesTable
              dues={pageItems}
              onRecordPayment={(d) => {
                setPayInvoice(d.invoiceId)
                setPayOpen(true)
              }}
              onRemind={(d) => success('Reminder queued', `Payment reminder for ${d.invoiceId} will be sent to ${d.patientPhone} (mock UI).`)}
            />
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => success('Bulk reminders queued', `${filtered.length} reminders queued (frontend-only mock).`)}
        >
          Send reminders to all
        </Button>
      </div>
      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} defaultInvoiceId={payInvoice} />
    </div>
  )
}
