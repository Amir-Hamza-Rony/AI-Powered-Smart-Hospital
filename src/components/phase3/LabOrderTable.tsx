import { Link } from 'react-router-dom'
import { Eye, MoreHorizontal } from 'lucide-react'
import type { LabOrder } from '@/data/types'
import { LabPriorityBadge, LabStatusBadge } from '@/components/phase3/StatusBadges'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function LabOrderTable({ orders }: { orders: LabOrder[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Test</TableHead>
            <TableHead>Ordered</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <Link to={`/lab/${o.id}`} className="whitespace-nowrap font-medium text-primary hover:underline">{o.id}</Link>
              </TableCell>
              <TableCell className="whitespace-nowrap">{o.patientName}</TableCell>
              <TableCell className="whitespace-nowrap">{o.doctorName}</TableCell>
              <TableCell className="max-w-[200px] truncate" title={o.tests.map((t) => t.testName).join(', ')}>
                {o.tests.map((t) => t.testName).join(', ')}
              </TableCell>
              <TableCell className="whitespace-nowrap">{o.orderedDate}</TableCell>
              <TableCell><LabPriorityBadge priority={o.priority} /></TableCell>
              <TableCell><LabStatusBadge status={o.status} /></TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${o.id}`}><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/lab/${o.id}`}><Eye className="mr-2 h-4 w-4" /> View details</Link>
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
