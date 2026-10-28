import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DoctorAvailability, DoctorStatus } from '@/data/types'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createDoctor, updateDoctor, type DoctorInput } from '@/lib/api/doctors'

export interface DoctorFormValues {
  name: string
  specialty: string
  qualification: string
  experienceYears: string
  registrationNo: string
  phone: string
  email: string
  department: string
  room: string
  consultationFee: string
  availability: DoctorAvailability
  status: DoctorStatus
}

const EMPTY: DoctorFormValues = {
  name: '', specialty: '', qualification: '', experienceYears: '', registrationNo: '',
  phone: '', email: '', department: '', room: '', consultationFee: '',
  availability: 'Available', status: 'Active',
}

function toValues(d?: DoctorFormValues | { name: string; specialty: string; qualification: string; experienceYears: number; registrationNo: string; phone: string; email: string; department: string; room: string; consultationFee: number; availability: DoctorAvailability; status: DoctorStatus }): DoctorFormValues {
  if (!d) return EMPTY
  return {
    name: d.name, specialty: d.specialty, qualification: d.qualification,
    experienceYears: typeof d.experienceYears === 'number' ? String(d.experienceYears) : d.experienceYears,
    registrationNo: d.registrationNo,
    phone: d.phone, email: d.email, department: d.department, room: d.room,
    consultationFee: typeof d.consultationFee === 'number' ? String(d.consultationFee) : d.consultationFee,
    availability: d.availability, status: d.status,
  }
}

function toDoctorInput(values: DoctorFormValues): DoctorInput {
  return {
    first_name: values.name.split(' ').slice(0, -1).join(' ') || values.name,
    last_name: values.name.split(' ').pop() || '',
    specialization: values.specialty,
    qualification: values.qualification,
    experience_years: Number(values.experienceYears) || 0,
    registration_no: values.registrationNo,
    phone: values.phone,
    email: values.email,
    department: values.department,
    room: values.room,
    consultation_fee: Number(values.consultationFee) || 0,
    availability: values.availability,
    status: values.status,
  }
}

export interface DoctorFormProps {
  mode: 'add' | 'edit'
  doctor?: { id: string; name: string; specialty: string; qualification: string; experienceYears: number; registrationNo: string; phone: string; email: string; department: string; room: string; consultationFee: number; availability: DoctorAvailability; status: DoctorStatus }
  onSave?: () => void
}

export function DoctorForm({ mode, doctor, onSave }: DoctorFormProps) {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const [values, setValues] = useState<DoctorFormValues>(() => toValues(doctor))
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const isEdit = mode === 'edit'

  const set = (k: keyof DoctorFormValues, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }))
    setErrors((prev) => ({ ...prev, [k]: undefined }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!values.name.trim()) e.name = 'Doctor name is required'
    if (!values.specialty.trim()) e.specialty = 'Specialty is required'
    if (!values.qualification.trim()) e.qualification = 'Qualification is required'
    if (!values.registrationNo.trim()) e.registrationNo = 'Registration number is required'
    if (!values.phone.trim()) e.phone = 'Phone is required'
    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) e.email = 'Enter a valid email'
    if (!values.consultationFee || Number(values.consultationFee) < 0) e.consultationFee = 'Enter a valid fee'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const input = toDoctorInput(values)
      if (isEdit && doctor) {
        await updateDoctor(doctor.id, input)
        success('Doctor updated', `${values.name} saved.`)
        onSave?.()
        navigate(`/doctors/${doctor.id}`)
      } else {
        await createDoctor(input)
        success('Doctor added', `${values.name} registered.`)
        onSave?.()
        navigate('/doctors')
      }
    } catch (err) {
      error('Save failed', err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (k: keyof DoctorFormValues, label: string, node: React.ReactNode) => (
    <div>
      <Label htmlFor={`df-${k}`}>{label}</Label>
      <div className="mt-1.5">{node}</div>
      {errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>}
    </div>
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Professional Information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {field('name', 'Doctor Name *', <Input id="df-name" value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="Dr. Jane Doe" />)}
            {field('specialty', 'Specialty *', <Input id="df-specialty" value={values.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Cardiology" />)}
            {field('qualification', 'Qualification *', <Input id="df-qualification" value={values.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="MBBS, MD" />)}
            {field('experienceYears', 'Experience (years)', <Input id="df-experienceYears" type="number" min={0} value={values.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} placeholder="5" />)}
            {field('registrationNo', 'Registration No. *', <Input id="df-registrationNo" value={values.registrationNo} onChange={(e) => set('registrationNo', e.target.value)} placeholder="BMDC-A-00000" />)}
            {field('consultationFee', 'Consultation Fee (৳)', <Input id="df-consultationFee" type="number" min={0} value={values.consultationFee} onChange={(e) => set('consultationFee', e.target.value)} placeholder="1000" />)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Contact & Duty</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {field('phone', 'Phone *', <Input id="df-phone" value={values.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+880 1XXX-XXXXXX" />)}
            {field('email', 'Email', <Input id="df-email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} placeholder="doctor@hospital.test" />)}
            {field('department', 'Department', <Input id="df-department" value={values.department} onChange={(e) => set('department', e.target.value)} placeholder="Cardiology" />)}
            {field('room', 'Room', <Input id="df-room" value={values.room} onChange={(e) => set('room', e.target.value)} placeholder="Room 301, Block A" />)}
            {field('availability', 'Availability', (
              <Select value={values.availability} onValueChange={(v) => set('availability', v)}>
                <SelectTrigger id="df-availability"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Available', 'On Leave', 'Off Duty'] as DoctorAvailability[]).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
            {field('status', 'Status', (
              <Select value={values.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger id="df-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Active', 'Inactive'] as DoctorStatus[]).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">Weekly schedule uses a default template for new doctors and can be refined in a later phase.</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={submitting} onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{isEdit ? 'Save Changes' : 'Add Doctor'}</Button>
        </div>
      </div>
    </form>
  )
}
