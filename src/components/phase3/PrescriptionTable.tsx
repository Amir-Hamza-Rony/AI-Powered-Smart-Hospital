import { Link } from 'react-router-dom'
import { Eye, MoreHorizontal, Pencil, Printer, Download } from 'lucide-react'
import type { FullPrescription } from '@/data/types'
import { PrescriptionStatusBadge } from '@/components/phase3/StatusBadges'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function PrescriptionTable({
  prescriptions,
  onPrint,
  onDownload,
}: {
  prescriptions: FullPrescription[]
  onPrint: (p: FullPrescription) => void
  onDownload: (p: FullPrescription) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prescription ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Medicines</TableHead>
            <TableHead>Follow-up</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prescriptions.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link to={`/prescriptions/${p.id}`} className="whitespace-nowrap font-medium text-primary hover:underline">{p.id}</Link>
              </TableCell>
              <TableCell className="whitespace-nowrap">{p.patientName}</TableCell>
              <TableCell className="whitespace-nowrap">{p.doctorName}</TableCell>
              <TableCell className="whitespace-nowrap">{p.date}</TableCell>
              <TableCell className="max-w-[220px] truncate" title={p.medicines.map((m) => m.name).join(', ')}>
                {p.medicines.map((m) => m.name).join(', ')}
              </TableCell>
              <TableCell className="whitespace-nowrap">{p.followUpRequired ? p.followUpDate : '—'}</TableCell>
              <TableCell><PrescriptionStatusBadge status={p.status} /></TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${p.id}`}><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/prescriptions/${p.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onPrint(p)}>
                      <Printer className="mr-2 h-4 w-4" /> Print
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => onDownload(p)}>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/prescriptions/${p.id}`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link>
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
