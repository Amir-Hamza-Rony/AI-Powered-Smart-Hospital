import { Badge } from '@/components/ui/badge'
import type {
  AutomationEventStatus,
  LabAlertStatus,
  NotificationState,
  QueuePriority,
  QueueStatus,
  ReminderStatus,
  StockAlertStatus,
  WorkflowStatus,
} from '@/data/types'

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const variant = status === 'Active' ? 'default' : status === 'Live' ? 'secondary' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  const variant =
    status === 'Sent'
      ? 'secondary'
      : status === 'Scheduled'
        ? 'default'
        : status === 'Pending'
          ? 'outline'
          : status === 'Failed'
            ? 'destructive'
            : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}

export function NoShowRiskBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const variant = level === 'High' ? 'destructive' : level === 'Medium' ? 'default' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {level} risk
    </Badge>
  )
}

export function LabAlertStatusBadge({ status }: { status: LabAlertStatus }) {
  const variant =
    status === 'Reviewed'
      ? 'secondary'
      : status === 'Notification Sent'
        ? 'default'
        : status === 'Ready'
          ? 'default'
          : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}

export function NotificationStateBadge({ state }: { state: NotificationState }) {
  const variant = state === 'Sent' ? 'secondary' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {state}
    </Badge>
  )
}

export function StockAlertStatusBadge({ status }: { status: StockAlertStatus }) {
  const variant =
    status === 'Critical' ? 'destructive' : status === 'Low' ? 'default' : status === 'Near Expiry' ? 'outline' : 'secondary'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}

export function QueueStatusBadge({ status }: { status: QueueStatus }) {
  const variant =
    status === 'In Consultation'
      ? 'default'
      : status === 'Called'
        ? 'secondary'
        : status === 'Completed'
          ? 'secondary'
          : status === 'Skipped'
            ? 'destructive'
            : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}

export function QueuePriorityBadge({ priority }: { priority: QueuePriority }) {
  const variant = priority === 'Emergency' ? 'destructive' : priority === 'Priority' ? 'default' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {priority}
    </Badge>
  )
}

export function AutomationEventStatusBadge({ status }: { status: AutomationEventStatus }) {
  const variant =
    status === 'Success' ? 'secondary' : status === 'Pending' ? 'outline' : status === 'Failed' ? 'destructive' : 'default'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}
