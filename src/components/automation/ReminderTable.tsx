import { Eye } from 'lucide-react'
import type { AppointmentReminder } from '@/data/types'
import { NoShowRiskBadge, ReminderStatusBadge } from '@/components/automation/AutomationStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function ReminderTable({
  reminders,
  onView,
}: {
  reminders: AppointmentReminder[]
  onView: (reminder: AppointmentReminder) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Appointment ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Reminder Status</TableHead>
            <TableHead>No-Show Risk</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Last Reminder</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reminders.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap font-medium">{r.appointmentId}</TableCell>
              <TableCell className="whitespace-nowrap">{r.patientName}</TableCell>
              <TableCell className="whitespace-nowrap">{r.doctorName}</TableCell>
              <TableCell className="whitespace-nowrap">{r.date}</TableCell>
              <TableCell className="whitespace-nowrap">{r.time}</TableCell>
              <TableCell>
                <ReminderStatusBadge status={r.status} />
              </TableCell>
              <TableCell>
                <NoShowRiskBadge level={r.noShowRisk} />
              </TableCell>
              <TableCell>
                <span className="flex flex-wrap gap-1">
                  {r.channels.map((c) => (
                    <Badge key={c} variant="outline" className="whitespace-nowrap">
                      {c}
                    </Badge>
                  ))}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap">{r.lastReminder}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => onView(r)} aria-label={`View reminder ${r.id}`}>
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
