import { Link } from 'react-router-dom'
import { Eye, MoreHorizontal, Pencil, Send, Trash2, Check, Clock } from 'lucide-react'
import type { InsuranceClaim } from '@/data/types'
import { formatBDT } from '@/data/billing'
import { ClaimStatusBadge } from '@/components/billing/BillingStatusBadges'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function ClaimsTable({
  claims,
  onView,
  onSubmit,
  onReview,
  onDecide,
  onPay,
  onDelete,
  canManage = false,
}: {
  claims: InsuranceClaim[]
  onView?: (c: InsuranceClaim) => void
  onSubmit?: (id: string) => void
  onReview?: (id: string) => void
  onDecide?: (c: InsuranceClaim) => void
  onPay?: (id: string) => void
  onDelete?: (id: string) => void
  canManage?: boolean
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
          {claims.map((c) => {
            const isDraft = c.status === 'Draft'
            const isSubmitted = c.status === 'Submitted'
            const isUnderReview = c.status === 'Under Review'
            const isPayable = c.status === 'Approved' || c.status === 'Partially Approved'
            return (
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
                      <DropdownMenuItem className="cursor-pointer" onClick={() => onView?.(c)}>
                        <Eye className="mr-2 h-4 w-4" /> Details
                      </DropdownMenuItem>
                      {isDraft && canManage && onSubmit && (
                        <DropdownMenuItem className="cursor-pointer" onClick={() => onSubmit(c.id)}>
                          <Send className="mr-2 h-4 w-4" /> Submit claim
                        </DropdownMenuItem>
                      )}
                      {isDraft && canManage && onDelete && (
                        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => onDelete(c.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      )}
                      {isSubmitted && canManage && onReview && (
                        <DropdownMenuItem className="cursor-pointer" onClick={() => onReview(c.id)}>
                          <Clock className="mr-2 h-4 w-4" /> Send to review
                        </DropdownMenuItem>
                      )}
                      {isUnderReview && canManage && onDecide && (
                        <DropdownMenuItem className="cursor-pointer" onClick={() => onDecide(c)}>
                          <Pencil className="mr-2 h-4 w-4" /> Decide
                        </DropdownMenuItem>
                      )}
                      {isPayable && canManage && onPay && (
                        <DropdownMenuItem className="cursor-pointer" onClick={() => onPay(c.id)}>
                          <Check className="mr-2 h-4 w-4" /> Mark paid
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
