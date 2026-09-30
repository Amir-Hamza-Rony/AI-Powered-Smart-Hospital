import { Clock, CheckCircle2, XCircle, Hourglass } from 'lucide-react'
import type { AppointmentStatus } from '@/data/types'
import { Badge } from '@/components/ui/badge'

const CONFIG: Record<AppointmentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  Pending: { variant: 'outline', icon: Hourglass },
  Confirmed: { variant: 'default', icon: Clock },
  Completed: { variant: 'secondary', icon: CheckCircle2 },
  Cancelled: { variant: 'destructive', icon: XCircle },
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const { variant, icon: Icon } = CONFIG[status]
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      <Icon className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  )
}
