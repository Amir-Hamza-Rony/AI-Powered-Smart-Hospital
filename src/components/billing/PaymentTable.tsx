import { Link } from 'react-router-dom'
import { Eye, MoreHorizontal, Printer } from 'lucide-react'
import type { Payment } from '@/data/types'
import { formatBDT } from '@/data/billing'
import { PaymentStatusBadge } from '@/components/billing/BillingStatusBadges'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function PaymentTable({ payments }: { payments: Payment[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Recorded By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="whitespace-nowrap font-medium">{p.id}</TableCell>
              <TableCell>
                <Link to={`/billing/invoices/${p.invoiceId}`} className="whitespace-nowrap font-medium text-primary hover:underline">
                  {p.invoiceId}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap">{p.patientName}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">{formatBDT(p.amount)}</TableCell>
              <TableCell className="whitespace-nowrap">{p.paymentMethod}</TableCell>
              <TableCell className="max-w-[160px] truncate whitespace-nowrap" title={p.reference}>
                {p.reference}
              </TableCell>
              <TableCell>
                <PaymentStatusBadge status={p.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{p.date}</TableCell>
              <TableCell className="whitespace-nowrap">{p.recordedBy}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${p.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/billing/invoices/${p.invoiceId}`}>
                        <Eye className="mr-2 h-4 w-4" /> View invoice
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Printer className="mr-2 h-4 w-4" /> Print receipt
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
