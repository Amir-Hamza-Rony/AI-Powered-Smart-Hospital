import { useState } from 'react'
import { Search } from 'lucide-react'
import { formatBDT } from '@/data/billing'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { LedgerTable } from '@/components/billing/LedgerTable'
import { StatCard } from '@/components/shared/StatCard'
import { listLedger } from '@/lib/api/billing'
import { toLedgerTransaction } from '@/lib/api/adapters'
import { useApiList } from '@/lib/api/hooks'
import type { LedgerTransaction } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Banknote, TrendingDown, TrendingUp, Wallet, Download } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

const PAGE_SIZE = 10
const TYPES = ['Consultation Revenue', 'Laboratory Revenue', 'Pharmacy Revenue', 'Procedure Revenue', 'Refund', 'Insurance Payment', 'Adjustment'] as const

export function LedgerPage() {
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const list = useApiList(
    ({ page, page_size }) =>
      listLedger({
        search: query.trim() || undefined,
        type: type !== 'all' ? type : undefined,
        date_from: from || undefined,
        date_to: to || undefined,
        page,
        page_size,
      }),
    [query, type, from, to],
    PAGE_SIZE,
  )

  const reset = () => list.setPage(1)

  // Running balance over the loaded window (backend rows are immutable).
  let running = 0
  const transactions: LedgerTransaction[] = [...list.items]
    .reverse()
    .map((entry) => {
      const amount = Number(entry.amount)
      running += entry.type === 'Refund' || entry.type === 'Adjustment' ? -amount : amount
      return { entry, balance: running }
    })
    .reverse()
    .map(({ entry, balance }) => toLedgerTransaction(entry, balance))

  const totalCredits = transactions.reduce((s, t) => s + t.credit, 0)
  const totalDebits = transactions.reduce((s, t) => s + t.debit, 0)
  const opening = 0
  const closing = totalCredits - totalDebits

  return (
    <div className="space-y-4">
      <PageHeader
        title="Financial Ledger"
        description="Immutable transaction record from live billing data"
        actions={
          <Button variant="outline" onClick={() => success('Export started', 'Ledger CSV export of the current view.')}>
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
              placeholder="Search by ID, reference, description or invoice…"
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
      {list.loading ? (
        <ApiLoading label="Loading ledger…" />
      ) : list.errorStatus === 403 ? (
        <ApiForbiddenState message={list.error} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={list.refresh} />
      ) : transactions.length === 0 ? (
        <EmptyState title="No ledger entries found" description="Try adjusting search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <LedgerTable transactions={transactions} />
            <DataPagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={list.setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
