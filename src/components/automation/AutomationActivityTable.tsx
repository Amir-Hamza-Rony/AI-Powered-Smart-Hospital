import { Eye } from 'lucide-react'
import type { AutomationEvent } from '@/data/types'
import { AutomationEventStatusBadge } from '@/components/automation/AutomationStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function AutomationActivityTable({
  events,
  onView,
}: {
  events: AutomationEvent[]
  onView: (event: AutomationEvent) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event ID</TableHead>
            <TableHead>Workflow</TableHead>
            <TableHead>Event Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Triggered At</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Triggered By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium whitespace-nowrap">{e.id}</TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge variant="outline" className="whitespace-nowrap">
                  {e.workflow}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">{e.eventType}</TableCell>
              <TableCell className="max-w-xs">{e.description}</TableCell>
              <TableCell className="whitespace-nowrap">{e.triggeredAt}</TableCell>
              <TableCell>
                <AutomationEventStatusBadge status={e.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{e.triggeredBy}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => onView(e)} aria-label={`View event ${e.id}`}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
