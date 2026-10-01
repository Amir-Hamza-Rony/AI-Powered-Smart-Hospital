import { Link } from 'react-router-dom'
import { Eye, MoreHorizontal, Pencil, Send } from 'lucide-react'
import type { InsuranceClaim } from '@/data/types'
import { formatBDT } from '@/data/billing'
import { ClaimStatusBadge } from '@/components/billing/BillingStatusBadges'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function ClaimsTable({
  claims,
  onView,
  onUpdateStatus,
  onSubmit,
}: {
  claims: InsuranceClaim[]
  onView: (c: InsuranceClaim) => void
  onUpdateStatus: (c: InsuranceClaim) => void
  onSubmit: (c: InsuranceClaim) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Claim ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead className="text-right">Claim Amount</TableHead>
            <TableHead className="text-right">Approved</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Processed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="whitespace-nowrap font-medium">{c.id}</TableCell>
              <TableCell className="whitespace-nowrap">{c.patientName}</TableCell>
              <TableCell className="whitespace-nowrap">{c.provider}</TableCell>
              <TableCell>
                <Link to={`/billing/invoices/${c.invoiceId}`} className="whitespace-nowrap font-medium text-primary hover:underline">
                  {c.invoiceId}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">{formatBDT(c.claimAmount)}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{formatBDT(c.approvedAmount)}</TableCell>
              <TableCell className="whitespace-nowrap">{c.submittedDate || '—'}</TableCell>
              <TableCell className="whitespace-nowrap">{c.processedDate || '—'}</TableCell>
              <TableCell>
                <ClaimStatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${c.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onView(c)}>
                      <Eye className="mr-2 h-4 w-4" /> Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onUpdateStatus(c)}>
                      <Pencil className="mr-2 h-4 w-4" /> Update status
                    </DropdownMenuItem>
                    {(c.status === 'Draft') && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => onSubmit(c)}>
                        <Send className="mr-2 h-4 w-4" /> Submit claim
                      </DropdownMenuItem>
                    )}
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
