import { AlertTriangle, Droplet, Phone, QrCode } from 'lucide-react'
import type { Patient } from '@/data/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { initials } from '@/components/patients/PatientTable'

export function PatientQRCard({ patient }: { patient: Patient }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">QR Patient Card</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-gradient-to-br from-primary/15 via-card to-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials(patient.firstName, patient.lastName)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{patient.firstName} {patient.lastName}</p>
              <p className="text-xs text-muted-foreground">{patient.id} · {patient.age}y · {patient.gender}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            {/* Frontend-only QR placeholder */}
            <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-border bg-background" aria-label="QR code placeholder">
              <QrCode className="h-8 w-8 text-muted-foreground" />
              <span className="mt-1 text-[10px] text-muted-foreground">Frontend QR</span>
            </div>
            <div className="min-w-0 space-y-1.5 text-xs">
              <p className="flex items-center gap-1.5">
                <Droplet className="h-3.5 w-3.5 text-destructive" />
                Blood: <strong>{patient.bloodGroup}</strong>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{patient.emergencyContact} · {patient.emergencyPhone}</span>
              </p>
              {patient.allergies.length > 0 && (
                <p className="flex items-center gap-1.5 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="truncate">Allergy: {patient.allergies.join(', ')}</span>
                </p>
              )}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Scan at reception for instant check-in. Frontend-only mock.</p>
        </div>
      </CardContent>
    </Card>
  )
}
