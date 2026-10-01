import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { formatBDT } from '@/data/billing'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { StatCard } from '@/components/shared/StatCard'
import { LedgerTable } from '@/components/billing/LedgerTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Banknote, TrendingDown, TrendingUp, Wallet } from 'lucide-react'

const PAGE_SIZE = 10
const TYPES = ['Consultation Revenue', 'Laboratory Revenue', 'Pharmacy Revenue', 'Procedure Revenue', 'Refund', 'Insurance Payment', 'Adjustment'] as const

export function LedgerPage() {
  const { ledger } = useHospitalStore()
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ledger.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (from && t.date < from) return false
      if (to && t.date > to) return false
      if (!q) return true
      return (
        t.id.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.recordedBy.toLowerCase().includes(q)
      )
    })
  }, [ledger, query, type, from, to])

  const totalCredits = filtered.reduce((s, t) => s + t.credit, 0)
  const totalDebits = filtered.reduce((s, t) => s + t.debit, 0)
  const opening = 0
  const closing = totalCredits - totalDebits

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Financial Ledger"
        description="Audit-proof transaction record · frontend representation only"
        actions={
          <Button variant="outline" onClick={() => success('Export started', 'Ledger CSV export is frontend-only mock in Phase 4.')}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Opening Balance" value={formatBDT(opening)} hint="Period start" />
        <StatCard icon={TrendingUp} label="Total Credits" value={formatBDT(totalCredits)} hint="Revenue in" />
        <StatCard icon={TrendingDown} label="Total Debits" value={formatBDT(totalDebits)} hint="Refunds + adjustments" />
        <StatCard icon={Banknote} label="Closing Balance" value={formatBDT(closing)} hint="Credits − debits" />
      </div>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by ID, reference, description or recorder…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                reset()
              }}
              className="pl-9"
              aria-label="Search ledger"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v)
                reset()
              }}
            >
              <SelectTrigger aria-label="Transaction type filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                reset()
              }}
              aria-label="From date"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                reset()
              }}
              aria-label="To date"
            />
            <Button
              variant="outline"
              onClick={() => {
                setQuery('')
                setType('all')
                setFrom('')
                setTo('')
                reset()
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
      {pageItems.length === 0 ? (
        <EmptyState title="No ledger entries found" description="Try adjusting search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <LedgerTable transactions={pageItems} />
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
