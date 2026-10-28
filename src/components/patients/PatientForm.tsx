import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BloodGroup, Gender, Patient, PatientStatus } from '@/data/types'
import { BLOOD_GROUPS } from '@/data/patients'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createPatient, updatePatient, type PatientInput } from '@/lib/api/patients'

export interface PatientFormValues {
  firstName: string
  lastName: string
  dob: string
  gender: Gender
  bloodGroup: BloodGroup
  phone: string
  email: string
  nid: string
  address: string
  emergencyContact: string
  emergencyPhone: string
  allergies: string
  chronicConditions: string
  notes: string
  status: PatientStatus
}

const EMPTY: PatientFormValues = {
  firstName: '', lastName: '', dob: '', gender: 'Male', bloodGroup: 'O+',
  phone: '', email: '', nid: '', address: '', emergencyContact: '', emergencyPhone: '',
  allergies: '', chronicConditions: '', notes: '', status: 'Active',
}

function toValues(p?: Patient): PatientFormValues {
  if (!p) return EMPTY
  return {
    firstName: p.firstName, lastName: p.lastName, dob: p.dob, gender: p.gender, bloodGroup: p.bloodGroup,
    phone: p.phone, email: p.email, nid: p.nid, address: p.address,
    emergencyContact: p.emergencyContact, emergencyPhone: p.emergencyPhone,
    allergies: p.allergies.join(', '), chronicConditions: p.chronicConditions.join(', '),
    notes: p.notes, status: p.status,
  }
}

function splitList(v: string) {
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

function toPatientInput(values: PatientFormValues): PatientInput {
  return {
    first_name: values.firstName,
    last_name: values.lastName,
    date_of_birth: values.dob,
    gender: values.gender,
    blood_group: values.bloodGroup,
    phone: values.phone,
    email: values.email,
    nid: values.nid || undefined,
    address: values.address,
    emergency_contact: values.emergencyContact || undefined,
    emergency_phone: values.emergencyPhone || undefined,
    allergies: splitList(values.allergies),
    chronic_conditions: splitList(values.chronicConditions),
    medical_history: undefined,
    notes: values.notes || undefined,
    status: values.status,
  }
}

export interface PatientFormProps {
  mode: 'add' | 'edit'
  patient?: Patient
  onSave?: () => void
}

export function PatientForm({ mode, patient, onSave }: PatientFormProps) {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const [values, setValues] = useState<PatientFormValues>(() => toValues(patient))
  const [errors, setErrors] = useState<Partial<Record<keyof PatientFormValues, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const isEdit = mode === 'edit'

  const set = (k: keyof PatientFormValues, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }))
    setErrors((prev) => ({ ...prev, [k]: undefined }))
  }

  const validate = () => {
    const e: typeof errors = {}
    if (!values.firstName.trim()) e.firstName = 'First name is required'
    if (!values.lastName.trim()) e.lastName = 'Last name is required'
    if (!values.dob) e.dob = 'Date of birth is required'
    if (!values.phone.trim()) e.phone = 'Phone is required'
    else if (values.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a valid phone number'
    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) e.email = 'Enter a valid email address'
    if (!values.emergencyPhone.trim()) e.emergencyPhone = 'Emergency phone is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const input = toPatientInput(values)
      if (isEdit && patient) {
        await updatePatient(patient.id, input)
        success('Patient updated', `${values.firstName} ${values.lastName} saved.`)
        onSave?.()
        navigate(`/patients/${patient.id}`)
      } else {
        await createPatient(input)
        success('Patient added', `${values.firstName} ${values.lastName} registered.`)
        onSave?.()
        navigate('/patients')
      }
    } catch (err) {
      error('Save failed', err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (k: keyof PatientFormValues, label: string, node: React.ReactNode, span = false) => (
    <div className={span ? 'sm:col-span-2' : ''}>
      <Label htmlFor={`pf-${k}`}>{label}</Label>
      <div className="mt-1.5">{node}</div>
      {errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>}
    </div>
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {field('firstName', 'First Name *', <Input id="pf-firstName" value={values.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="e.g. Rahim" />)}
            {field('lastName', 'Last Name *', <Input id="pf-lastName" value={values.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="e.g. Uddin" />)}
            {field('dob', 'Date of Birth *', <Input id="pf-dob" type="date" value={values.dob} onChange={(e) => set('dob', e.target.value)} />)}
            {field('gender', 'Gender', (
              <Select value={values.gender} onValueChange={(v) => set('gender', v)}>
                <SelectTrigger id="pf-gender"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Male', 'Female', 'Other'] as Gender[]).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
            {field('bloodGroup', 'Blood Group', (
              <Select value={values.bloodGroup} onValueChange={(v) => set('bloodGroup', v)}>
                <SelectTrigger id="pf-bloodGroup"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
            {field('nid', 'NID', <Input id="pf-nid" value={values.nid} onChange={(e) => set('nid', e.target.value)} placeholder="National ID number" />)}
            {field('status', 'Status', (
              <Select value={values.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger id="pf-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Active', 'Inactive', 'Critical', 'Recovered'] as PatientStatus[]).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {field('phone', 'Phone *', <Input id="pf-phone" value={values.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+880 1XXX-XXXXXX" />)}
            {field('email', 'Email', <Input id="pf-email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} placeholder="name@mail.com" />)}
            {field('address', 'Address', <Input id="pf-address" value={values.address} onChange={(e) => set('address', e.target.value)} placeholder="House, Road, Area, City" />, true)}
            {field('emergencyContact', 'Emergency Contact', <Input id="pf-emergencyContact" value={values.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} placeholder="Name (Relation)" />)}
            {field('emergencyPhone', 'Emergency Contact Phone *', <Input id="pf-emergencyPhone" value={values.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} placeholder="+880 1XXX-XXXXXX" />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Medical Information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {field('allergies', 'Allergies (comma separated)', <Input id="pf-allergies" value={values.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="Penicillin, Dust" />)}
            {field('chronicConditions', 'Chronic Conditions (comma separated)', <Input id="pf-chronicConditions" value={values.chronicConditions} onChange={(e) => set('chronicConditions', e.target.value)} placeholder="Hypertension, Diabetes" />)}
            {field('notes', 'Medical Notes', <Textarea id="pf-notes" value={values.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Important clinical notes…" />, true)}
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={submitting} onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{isEdit ? 'Save Changes' : 'Add Patient'}</Button>
        </div>
      </div>
    </form>
  )
}
