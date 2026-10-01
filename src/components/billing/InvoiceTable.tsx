import { Link } from 'react-router-dom'
import { Eye, MoreHorizontal, Pencil, Printer, Download, HandCoins } from 'lucide-react'
import type { Invoice } from '@/data/types'
import { formatBDT } from '@/data/billing'
import { InvoiceStatusBadge } from '@/components/billing/BillingStatusBadges'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function InvoiceTable({
  invoices,
  onRecordPayment,
  onPrint,
  onDownload,
}: {
  invoices: Invoice[]
  onRecordPayment: (inv: Invoice) => void
  onPrint: (inv: Invoice) => void
  onDownload: (inv: Invoice) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Service Type</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell>
                <Link to={`/billing/invoices/${inv.id}`} className="whitespace-nowrap font-medium text-primary hover:underline">
                  {inv.id}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap">{inv.patientName}</TableCell>
              <TableCell className="whitespace-nowrap">{inv.serviceType}</TableCell>
              <TableCell className="whitespace-nowrap">{inv.issueDate}</TableCell>
              <TableCell className="whitespace-nowrap">{inv.dueDate}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">{formatBDT(inv.total)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatBDT(inv.paid)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatBDT(inv.due)}</TableCell>
              <TableCell>
                <InvoiceStatusBadge status={inv.status} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${inv.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/billing/invoices/${inv.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/billing/invoices/new?edit=${inv.id}`}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onRecordPayment(inv)}>
                      <HandCoins className="mr-2 h-4 w-4" /> Record payment
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onPrint(inv)}>
                      <Printer className="mr-2 h-4 w-4" /> Print
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onDownload(inv)}>
                      <Download className="mr-2 h-4 w-4" /> Download
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
