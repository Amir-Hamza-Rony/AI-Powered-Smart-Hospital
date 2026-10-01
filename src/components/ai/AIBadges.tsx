import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type {
  AIActivityStatus,
  AIAdvisorySeverity,
  AINoShowRisk,
  AIReminderPriority,
  AITriageLevel,
} from '@/data/types'

export function AIStatusBadge() {
  return (
    <Badge variant="secondary" className="whitespace-nowrap">
      <Sparkles className="mr-1 h-3 w-3" />
      AI Generated
    </Badge>
  )
}

export function AITriageBadge({ level }: { level: AITriageLevel }) {
  const variant =
    level === 'Emergency' ? 'destructive' : level === 'Urgent' ? 'destructive' : level === 'Moderate' ? 'default' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {level}
    </Badge>
  )
}

export function AIRiskBadge({ level }: { level: AINoShowRisk }) {
  const variant = level === 'High' ? 'destructive' : level === 'Medium' ? 'default' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {level} risk
    </Badge>
  )
}

export function AIPriorityBadge({ priority }: { priority: AIReminderPriority }) {
  const variant = priority === 'High' ? 'destructive' : priority === 'Normal' ? 'default' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {priority} priority
    </Badge>
  )
}

export function AIAdvisoryBadge({ severity }: { severity: AIAdvisorySeverity }) {
  const variant = severity === 'High Attention' ? 'destructive' : severity === 'Caution' ? 'default' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {severity}
    </Badge>
  )
}

export function AIActivityStatusBadge({ status }: { status: AIActivityStatus }) {
  const variant = status === 'Reviewed' ? 'secondary' : status === 'Completed' ? 'default' : 'outline'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {status}
    </Badge>
  )
}
