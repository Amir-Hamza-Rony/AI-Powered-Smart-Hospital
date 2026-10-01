import type { LedgerTransaction } from '@/data/types'
import { formatBDT } from '@/data/billing'
import { LedgerTypeBadge } from '@/components/billing/BillingStatusBadges'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function LedgerTable({ transactions }: { transactions: LedgerTransaction[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Recorded By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="whitespace-nowrap font-medium">{t.id}</TableCell>
              <TableCell className="whitespace-nowrap">
                {t.date}
                <span className="block text-xs text-muted-foreground">{t.time}</span>
              </TableCell>
              <TableCell>
                <LedgerTypeBadge type={t.type} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{t.reference}</TableCell>
              <TableCell className="min-w-[200px]">{t.description}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{t.debit > 0 ? formatBDT(t.debit) : '—'}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{t.credit > 0 ? formatBDT(t.credit) : '—'}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">{formatBDT(t.balance)}</TableCell>
              <TableCell className="whitespace-nowrap">{t.recordedBy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
