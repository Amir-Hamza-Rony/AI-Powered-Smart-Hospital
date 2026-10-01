import { Link } from 'react-router-dom'
import { Eye, HandCoins, BellRing } from 'lucide-react'
import type { DueRecord } from '@/data/types'
import { formatBDT } from '@/data/billing'
import { DueStatusBadge } from '@/components/billing/BillingStatusBadges'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function DuesTable({
  dues,
  onRecordPayment,
  onRemind,
}: {
  dues: DueRecord[]
  onRecordPayment: (d: DueRecord) => void
  onRemind: (d: DueRecord) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead className="text-right">Days Overdue</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dues.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                <span className="block whitespace-nowrap font-medium">{d.patientName}</span>
                <span className="block text-xs text-muted-foreground">{d.patientId}</span>
              </TableCell>
              <TableCell>
                <Link to={`/billing/invoices/${d.invoiceId}`} className="whitespace-nowrap font-medium text-primary hover:underline">
                  {d.invoiceId}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap">{d.invoiceDate}</TableCell>
              <TableCell className="whitespace-nowrap">{d.dueDate}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatBDT(d.totalAmount)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatBDT(d.paid)}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">{formatBDT(d.outstanding)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{d.daysOverdue > 0 ? `${d.daysOverdue}d` : '—'}</TableCell>
              <TableCell>
                <DueStatusBadge status={d.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" asChild aria-label={`View ${d.invoiceId}`}>
                    <Link to={`/billing/invoices/${d.invoiceId}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onRecordPayment(d)} aria-label={`Record payment for ${d.invoiceId}`}>
                    <HandCoins className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onRemind(d)} aria-label={`Send reminder to ${d.patientName}`}>
                    <BellRing className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
