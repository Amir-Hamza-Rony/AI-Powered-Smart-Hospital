import { CheckCircle2, XCircle, Activity } from 'lucide-react'
import type { PrescriptionStatus, FollowUpStatus, LabOrderStatus, LabPriority, StockStatus, DispensingStatus } from '@/data/types'
import { Badge } from '@/components/ui/badge'

export function PrescriptionStatusBadge({ status }: { status: PrescriptionStatus }) {
  const variant = status === 'Active' ? 'default' : status === 'Completed' ? 'secondary' : 'destructive'
  const Icon = status === 'Active' ? Activity : status === 'Completed' ? CheckCircle2 : XCircle
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      <Icon className="mr-1 h-3 w-3" />{status}
    </Badge>
  )
}

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  const variant = status === 'Upcoming' ? 'default' : status === 'Due Today' ? 'destructive' : status === 'Completed' ? 'secondary' : 'outline'
  return <Badge variant={variant} className="whitespace-nowrap">{status}</Badge>
}

export function LabStatusBadge({ status }: { status: LabOrderStatus }) {
  const variant =
    status === 'Pending' ? 'outline' : status === 'Processing' ? 'default' : status === 'Ready' ? 'secondary' : status === 'Completed' ? 'secondary' : 'destructive'
  return <Badge variant={variant} className="whitespace-nowrap">{status}</Badge>
}

export function LabPriorityBadge({ priority }: { priority: LabPriority }) {
  const variant = priority === 'Emergency' ? 'destructive' : priority === 'Urgent' ? 'default' : 'outline'
  return <Badge variant={variant} className="whitespace-nowrap">{priority}</Badge>
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const variant = status === 'In Stock' ? 'secondary' : status === 'Low Stock' ? 'default' : status === 'Near Expiry' ? 'outline' : 'destructive'
  return <Badge variant={variant} className="whitespace-nowrap">{status}</Badge>
}

export function DispensingStatusBadge({ status }: { status: DispensingStatus }) {
  const variant = status === 'Pending' ? 'outline' : status === 'Partially Dispensed' ? 'default' : status === 'Dispensed' ? 'secondary' : 'destructive'
  return <Badge variant={variant} className="whitespace-nowrap">{status}</Badge>
}
