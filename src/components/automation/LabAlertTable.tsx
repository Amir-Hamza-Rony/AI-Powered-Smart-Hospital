import { Eye } from 'lucide-react'
import type { LabCompletionAlert } from '@/data/types'
import { LabAlertStatusBadge, NotificationStateBadge } from '@/components/automation/AutomationStatusBadge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function LabAlertTable({
  alerts,
  onView,
}: {
  alerts: LabCompletionAlert[]
  onView: (alert: LabCompletionAlert) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lab Order ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Test</TableHead>
            <TableHead>Ordered By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Completed At</TableHead>
            <TableHead>Doctor Notification</TableHead>
            <TableHead>Patient Notification</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="whitespace-nowrap font-medium">{a.labOrderId}</TableCell>
              <TableCell className="whitespace-nowrap">{a.patientName}</TableCell>
              <TableCell className="whitespace-nowrap">{a.test}</TableCell>
              <TableCell className="whitespace-nowrap">{a.orderedBy}</TableCell>
              <TableCell>
                <LabAlertStatusBadge status={a.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{a.completedAt}</TableCell>
              <TableCell>
                <NotificationStateBadge state={a.doctorNotification} />
              </TableCell>
              <TableCell>
                <NotificationStateBadge state={a.patientNotification} />
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => onView(a)} aria-label={`View lab alert ${a.id}`}>
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
