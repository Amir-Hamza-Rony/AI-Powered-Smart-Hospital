import { Link } from 'react-router-dom'
import { CalendarClock, Eye, MoreHorizontal, Trash2 } from 'lucide-react'
import type { Appointment } from '@/data/types'
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function AppointmentTable({
  appointments,
  onAction,
  onDelete,
}: {
  appointments: Appointment[]
  onAction: (a: Appointment, action: 'confirm' | 'complete' | 'cancel') => void
  onDelete: (a: Appointment) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <Link to={`/appointments/${a.id}`} className="whitespace-nowrap font-medium text-primary hover:underline">
                  {a.id}
                </Link>
              </TableCell>
              <TableCell>
                <Link to={`/patients/${a.patientId}`} className="hover:text-primary hover:underline">{a.patientName}</Link>
              </TableCell>
              <TableCell>
                <span className="block">{a.doctorName}</span>
                <span className="block text-[11px] text-muted-foreground">{a.specialty}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap">{a.date}</TableCell>
              <TableCell className="whitespace-nowrap">{a.time}</TableCell>
              <TableCell><Badge variant="outline" className="whitespace-nowrap">{a.type}</Badge></TableCell>
              <TableCell><AppointmentStatusBadge status={a.status} /></TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${a.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/appointments/${a.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link>
                    </DropdownMenuItem>
                    {a.status === 'Pending' && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => onAction(a, 'confirm')}>
                        <CalendarClock className="mr-2 h-4 w-4" /> Confirm
                      </DropdownMenuItem>
                    )}
                    {(a.status === 'Pending' || a.status === 'Confirmed') && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => onAction(a, 'complete')}>
                        <CalendarClock className="mr-2 h-4 w-4" /> Mark as completed
                      </DropdownMenuItem>
                    )}
                    {(a.status === 'Pending' || a.status === 'Confirmed') && (
                      <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => onAction(a, 'cancel')}>
                        <CalendarClock className="mr-2 h-4 w-4" /> Cancel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => onDelete(a)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
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
