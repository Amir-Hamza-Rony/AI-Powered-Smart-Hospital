import { Link } from 'react-router-dom'
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { Patient } from '@/data/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_VARIANT: Record<Patient['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Active: 'default',
  Recovered: 'secondary',
  Inactive: 'outline',
  Critical: 'destructive',
}

export function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function PatientTable({
  patients,
  onDelete,
}: {
  patients: Patient[]
  onDelete: (p: Patient) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Blood</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Last Visit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <span className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
                      {initials(p.firstName, p.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <Link to={`/patients/${p.id}`} className="font-medium hover:text-primary hover:underline">
                    {p.firstName} {p.lastName}
                  </Link>
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{p.id}</TableCell>
              <TableCell>{p.age}</TableCell>
              <TableCell>{p.gender}</TableCell>
              <TableCell>
                <Badge variant="outline">{p.bloodGroup}</Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">{p.phone}</TableCell>
              <TableCell className="whitespace-nowrap">{p.lastVisit}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${p.firstName} ${p.lastName}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/patients/${p.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/patients/${p.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => onDelete(p)}>
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
