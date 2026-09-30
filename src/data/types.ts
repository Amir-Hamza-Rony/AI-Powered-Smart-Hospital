export type PatientStatus = 'Active' | 'Inactive' | 'Critical' | 'Recovered'
export type Gender = 'Male' | 'Female' | 'Other'
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export interface MedicalVisit {
  id: string
  date: string
  visitType: string
  doctor: string
  diagnosis: string
  treatment: string
  notes: string
}

export interface Prescription {
  id: string
  date: string
  doctor: string
  medicines: string
  dosage: string
  status: 'Active' | 'Completed'
}

export interface LabReport {
  id: string
  date: string
  test: string
  result: string
  status: 'Normal' | 'Abnormal' | 'Pending'
  doctor: string
}

export interface PatientDocument {
  id: string
  name: string
  type: 'Lab Report' | 'Prescription' | 'Imaging' | 'Discharge' | 'Other'
  date: string
  size: string
}

export interface Patient {
  id: string
  firstName: string
  lastName: string
  dob: string
  age: number
  gender: Gender
  bloodGroup: BloodGroup
  phone: string
  email: string
  nid: string
  address: string
  emergencyContact: string
  emergencyPhone: string
  allergies: string[]
  chronicConditions: string[]
  surgeries: string[]
  currentMedications: string[]
  familyHistory: string
  notes: string
  status: PatientStatus
  lastVisit: string
  totalVisits: number
  upcomingAppointments: number
  history: MedicalVisit[]
  prescriptions: Prescription[]
  labReports: LabReport[]
  documents: PatientDocument[]
}

export type DoctorAvailability = 'Available' | 'On Leave' | 'Off Duty'
export type DoctorStatus = 'Active' | 'Inactive'

export interface DaySchedule {
  day: string
  available: boolean
  slots: string[]
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  qualification: string
  experienceYears: number
  registrationNo: string
  phone: string
  email: string
  department: string
  room: string
  consultationFee: number
  availability: DoctorAvailability
  status: DoctorStatus
  patientCount: number
  rating: number
  schedule: DaySchedule[]
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
export type AppointmentType = 'In-person' | 'Follow-up' | 'Emergency' | 'Online'

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  specialty: string
  date: string
  time: string
  type: AppointmentType
  status: AppointmentStatus
  reason: string
  notes: string
  createdAt: string
}
