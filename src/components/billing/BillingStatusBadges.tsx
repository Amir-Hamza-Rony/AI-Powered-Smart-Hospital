import { Badge } from '@/components/ui/badge'
import type { ClaimStatus, InvoiceStatus, LedgerType, PaymentStatus } from '@/data/types'

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const variant =
    status === 'Paid'
      ? 'secondary'
      : status === 'Pending'
        ? 'outline'
        : status === 'Partially Paid'
          ? 'default'
          : status === 'Overdue'
            ? 'destructive'
            : status === 'Draft'
              ? 'outline'
              : 'destructive'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant =
    status === 'Completed' ? 'secondary' : status === 'Pending' ? 'default' : status === 'Failed' ? 'destructive' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const variant =
    status === 'Paid' || status === 'Approved'
      ? 'secondary'
      : status === 'Rejected'
        ? 'destructive'
        : status === 'Submitted' || status === 'Under Review' || status === 'Partially Approved'
          ? 'default'
          : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}

export function DueStatusBadge({ status }: { status: 'Due Soon' | 'Overdue' | 'Partially Paid' }) {
  const variant = status === 'Overdue' ? 'destructive' : status === 'Partially Paid' ? 'default' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}

export function LedgerTypeBadge({ type }: { type: LedgerType }) {
  const variant =
    type === 'Refund' ? 'destructive' : type === 'Adjustment' ? 'outline' : type === 'Insurance Payment' ? 'default' : 'secondary'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {type}
    </Badge>
  )
}
