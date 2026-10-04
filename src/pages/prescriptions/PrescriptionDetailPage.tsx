import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Download, Printer, Share2, XCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ApiErrorState, ApiLoading } from '@/components/shared/ApiState'
import { PrescriptionStatusBadge } from '@/components/phase3/StatusBadges'
import { cancelPrescription, completePrescription, getPrescription } from '@/lib/api/prescriptions'
import { toFullPrescription } from '@/lib/api/adapters'
import { canWritePrescriptions, useApiDetail } from '@/lib/api/hooks'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function PrescriptionDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { success, error } = useToast()
  const detail = useApiDetail(() => getPrescription(id ?? ''), [id])
  const writable = canWritePrescriptions(user?.role ?? null)

  const rx = detail.data ? toFullPrescription(detail.data) : null

  const runAction = async (kind: 'complete' | 'cancel') => {
    if (!rx) return
    try {
      if (kind === 'complete') await completePrescription(rx.id)
      else await cancelPrescription(rx.id)
      success(kind === 'complete' ? 'Prescription completed' : 'Prescription cancelled', rx.id)
      detail.refresh()
    } catch (err) {
      error(
        kind === 'complete' ? 'Cannot complete prescription' : 'Cannot cancel prescription',
        err instanceof ApiError ? err.message : 'Request failed.',
      )
    }
  }

  if (detail.loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild><Link to="/prescriptions"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        <ApiLoading label="Loading prescription…" />
      </div>
    )
  }

  if (detail.error || !rx) {
    const notFound = detail.errorStatus === 404
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild><Link to="/prescriptions"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        {detail.error && !notFound ? (
          <ApiErrorState message={detail.error} onRetry={detail.refresh} />
        ) : (
          <EmptyState title="Prescription not found" description={`No prescription with ID ${id ?? ''}.`} action={<Button asChild><Link to="/prescriptions">Back to list</Link></Button>} />
        )}
      </div>
    )
  }

  const ageLine = rx.patientAge > 0 ? `Age ${rx.patientAge} · ` : ''

  return (
    <div className="space-y-4">
      <PageHeader
        title={rx.id}
        description={`${rx.date} · ${rx.status}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/prescriptions"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
            {writable && rx.status === 'Active' && (
              <>
                <Button variant="outline" size="sm" onClick={() => runAction('complete')}><CheckCircle2 className="mr-1 h-4 w-4" /> Complete</Button>
                <Button variant="outline" size="sm" onClick={() => runAction('cancel')}><XCircle className="mr-1 h-4 w-4" /> Cancel</Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => { success('Print preview ready', `${rx.id} sent to print.`); window.setTimeout(() => window.print(), 300) }}><Printer className="mr-1 h-4 w-4" /> Print Prescription</Button>
            <Button size="sm" onClick={() => success('Download started', `${rx.id}.pdf`)}><Download className="mr-1 h-4 w-4" /> Download PDF</Button>
            <Button variant="outline" size="sm" onClick={() => success('Share link copied', 'Share link ready.')}><Share2 className="mr-1 h-4 w-4" /> Share</Button>
          </>
        }
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Smart Hospital · Outpatient Prescription</CardTitle>
            <p className="text-xs text-muted-foreground">Prescription {rx.id} · Date {rx.date} · <PrescriptionStatusBadge status={rx.status} /></p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Doctor</h3>
            <p className="mt-1 text-sm font-semibold">{rx.doctorName}</p>
            <p className="text-xs text-muted-foreground">{rx.doctorSpecialty}{rx.doctorRegistrationNo ? ` · Reg. ${rx.doctorRegistrationNo}` : ''}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient</h3>
            <p className="mt-1 text-sm font-semibold">{rx.patientName} <span className="font-normal text-muted-foreground">({rx.patientId})</span></p>
            <p className="text-xs text-muted-foreground">{ageLine}{rx.patientGender} · {rx.patientBloodGroup}{rx.patientPhone ? ` · ${rx.patientPhone}` : ''}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Clinical Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Chief complaint:</strong> {rx.chiefComplaint || '—'}</p>
            <p><strong>Diagnosis:</strong> {rx.diagnosis}</p>
            <p><strong>Symptoms:</strong> {rx.symptoms || '—'}</p>
            <p><strong>Clinical notes:</strong> {rx.clinicalNotes || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Follow-up</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Required:</strong> {rx.followUpRequired ? 'Yes' : 'No'}</p>
            {rx.followUpRequired && (
              <>
                <p><strong>Date:</strong> {rx.followUpDate || '—'}</p>
                <p><strong>Instructions:</strong> {rx.followUpInstructions || '—'}</p>
              </>
            )}
            <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              <p>Doctor: {rx.doctorName}{rx.doctorRegistrationNo ? ` · Reg. ${rx.doctorRegistrationNo}` : ''}</p>
              <p className="mt-2 italic">Signature: ____________________</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Medicines ({rx.medicines.length})</CardTitle></CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Instructions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rx.medicines.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.strength}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.dosage}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.frequency}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.duration}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.route}</TableCell>
                    <TableCell>{m.instructions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
