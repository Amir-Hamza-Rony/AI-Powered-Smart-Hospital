import { Link } from 'react-router-dom'
import { CalendarPlus, Eye, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react'
import type { Doctor } from '@/data/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function doctorInitials(name: string) {
  return name.replace(/^Dr\.\s*/, '').split(' ').map((w) => w.charAt(0)).slice(0, 2).join('').toUpperCase()
}

export function DoctorCard({ doctor, onDelete }: { doctor: Doctor; onDelete: (d: Doctor) => void }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {doctorInitials(doctor.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link to={`/doctors/${doctor.id}`} className="truncate font-semibold hover:text-primary hover:underline">
              {doctor.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{doctor.id} · {doctor.qualification}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Badge variant="secondary">{doctor.specialty}</Badge>
              <Badge variant={doctor.availability === 'Available' ? 'default' : 'outline'}>{doctor.availability}</Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${doctor.name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to={`/doctors/${doctor.id}`}><Eye className="mr-2 h-4 w-4" /> View Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to={`/doctors/${doctor.id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to={`/appointments/new?doctor=${doctor.id}`}><CalendarPlus className="mr-2 h-4 w-4" /> Schedule</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => onDelete(doctor)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <p>Experience: <strong className="text-foreground">{doctor.experienceYears} yrs</strong></p>
          <p className="flex items-center gap-1">Rating: <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> <strong className="text-foreground">{doctor.rating}</strong></p>
          <p>Fee: <strong className="text-foreground">৳{doctor.consultationFee}</strong></p>
          <p>Patients: <strong className="text-foreground">{doctor.patientCount}</strong></p>
        </div>
        <p className="truncate text-xs text-muted-foreground">{doctor.room} · {doctor.phone}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild className="flex-1">
            <Link to={`/doctors/${doctor.id}`}>View Profile</Link>
          </Button>
          <Button size="sm" asChild className="flex-1">
            <Link to={`/appointments/new?doctor=${doctor.id}`}>Schedule</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
