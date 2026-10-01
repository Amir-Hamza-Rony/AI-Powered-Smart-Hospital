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

/* ---------- Phase 3: Prescriptions ---------- */
export type PrescriptionStatus = 'Active' | 'Completed' | 'Cancelled'

export interface PrescriptionMedicine {
  name: string
  strength: string
  dosage: string
  frequency: string
  duration: string
  route: string
  instructions: string
}

export interface FullPrescription {
  id: string
  patientId: string
  patientName: string
  patientAge: number
  patientGender: Gender
  patientBloodGroup: BloodGroup
  patientPhone: string
  doctorId: string
  doctorName: string
  doctorSpecialty: string
  doctorRegistrationNo: string
  date: string
  chiefComplaint: string
  diagnosis: string
  symptoms: string
  clinicalNotes: string
  medicines: PrescriptionMedicine[]
  followUpRequired: boolean
  followUpDate: string
  followUpInstructions: string
  status: PrescriptionStatus
}

/* ---------- Phase 3: Medicine directory ---------- */
export interface Medicine {
  id: string
  name: string
  genericName: string
  strength: string
  dosageForm: string
  manufacturer: string
  category: string
  prescriptionRequired: boolean
  status: 'Available' | 'Discontinued' | 'Low Stock'
}

/* ---------- Phase 3: Follow-ups ---------- */
export type FollowUpStatus = 'Upcoming' | 'Due Today' | 'Completed' | 'Missed'

export interface FollowUp {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  originalVisit: string
  followUpDate: string
  reason: string
  status: FollowUpStatus
}

/* ---------- Phase 3: Laboratory ---------- */
export type LabOrderStatus = 'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Cancelled'
export type LabPriority = 'Normal' | 'Urgent' | 'Emergency'

export interface LabTestResult {
  testName: string
  sampleType: string
  referenceRange: string
  result: string
  unit: string
  status: 'Normal' | 'Abnormal' | 'Pending'
}

export interface LabOrder {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  tests: LabTestResult[]
  orderedDate: string
  priority: LabPriority
  status: LabOrderStatus
  instructions: string
  notes: string
}

export interface LabTest {
  id: string
  name: string
  category: string
  sampleType: string
  turnaroundTime: string
  price: number
  status: 'Active' | 'Inactive'
}

/* ---------- Phase 3: Pharmacy ---------- */
export type StockStatus = 'In Stock' | 'Low Stock' | 'Near Expiry' | 'Out of Stock'

export interface InventoryItem {
  id: string
  medicine: string
  genericName: string
  category: string
  strength: string
  dosageForm: string
  manufacturer: string
  supplier: string
  batchNumber: string
  quantity: number
  unitPrice: number
  purchasePrice: number
  expiryDate: string
  reorderLevel: number
  stockStatus: StockStatus
}

export type StockMovementType = 'Stock In' | 'Dispensed' | 'Adjustment' | 'Return'

export interface StockMovement {
  id: string
  inventoryId: string
  date: string
  type: StockMovementType
  quantity: number
  reference: string
  performedBy: string
}

export type DispensingStatus = 'Pending' | 'Partially Dispensed' | 'Dispensed' | 'Cancelled'

export interface DispensingRecord {
  id: string
  prescriptionId: string
  patientName: string
  doctorName: string
  medicine: string
  prescribedQuantity: number
  dispensedQuantity: number
  status: DispensingStatus
}

/* ---------- Phase 4: Billing & Financial Operations ---------- */
export type InvoiceStatus = 'Draft' | 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled'
export type InvoiceServiceType = 'Consultation' | 'Laboratory' | 'Pharmacy' | 'Procedure' | 'Package' | 'Other'
export type BillingCategory = 'Consultation' | 'Laboratory' | 'Medicine' | 'Procedure' | 'Other'
export type PaymentMethod = 'Cash' | 'Card' | 'Mobile Banking' | 'Bank Transfer' | 'Insurance'
export type PaymentStatus = 'Completed' | 'Pending' | 'Failed' | 'Refunded'
export type ClaimStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Partially Approved' | 'Rejected' | 'Paid'
export type LedgerType =
  | 'Consultation Revenue'
  | 'Laboratory Revenue'
  | 'Pharmacy Revenue'
  | 'Procedure Revenue'
  | 'Refund'
  | 'Insurance Payment'
  | 'Adjustment'

export interface InvoiceItem {
  id: string
  name: string
  category: BillingCategory
  quantity: number
  unitPrice: number
  discount: number
  tax: number
  total: number
}

export interface Invoice {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  serviceType: InvoiceServiceType
  issueDate: string
  dueDate: string
  paymentTerms: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  paid: number
  due: number
  status: InvoiceStatus
  paymentMethod?: PaymentMethod
  referenceNumber?: string
  notes?: string
  createdBy: string
}

export interface Payment {
  id: string
  invoiceId: string
  patientId: string
  patientName: string
  amount: number
  paymentMethod: PaymentMethod
  reference: string
  status: PaymentStatus
  date: string
  recordedBy: string
  notes?: string
}

export interface DueRecord {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  invoiceId: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  paid: number
  outstanding: number
  daysOverdue: number
  status: 'Due Soon' | 'Overdue' | 'Partially Paid'
}

export interface InsuranceClaim {
  id: string
  patientId: string
  patientName: string
  provider: string
  policyNumber: string
  invoiceId: string
  claimAmount: number
  approvedAmount: number
  submittedDate: string
  processedDate: string
  status: ClaimStatus
  notes?: string
}

export interface LedgerTransaction {
  id: string
  date: string
  time: string
  type: LedgerType
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
  recordedBy: string
}

/* ---------- Phase 5: AI Clinical & Operational Intelligence (mock only) ---------- */
export type AITriageLevel = 'Emergency' | 'Urgent' | 'Moderate' | 'Low'
export type AISymptomSeverity = 'Mild' | 'Moderate' | 'Severe'

export interface AISymptomEntry {
  name: string
  category: string
  severity: AISymptomSeverity
  duration: string
  notes: string
}

export interface AIVitals {
  temperature: string
  bloodPressure: string
  heartRate: string
  oxygenSaturation: string
  recentMedications: string
  additionalNotes: string
}

export interface AITriageResult {
  level: AITriageLevel
  department: string
  considerations: string[]
  riskIndicators: string[]
  nextAction: string
  confidence: number
}

export interface AISymptomAssessment {
  id: string
  patientId: string
  patientName: string
  age: number
  gender: Gender
  conditions: string[]
  allergies: string[]
  symptoms: AISymptomEntry[]
  vitals: AIVitals
  result: AITriageResult
  createdAt: string
  status: 'Completed' | 'Reviewed' | 'Pending Review'
}

export interface AIClinicalMessage {
  id: string
  role: 'doctor' | 'ai'
  text: string
  timestamp: string
}

export type AIAdvisorySeverity = 'Informational' | 'Caution' | 'High Attention'

export interface AIAdvisoryFinding {
  category: string
  severity: AIAdvisorySeverity
  message: string
}

export interface AIProposedMedicine {
  medicine: string
  dose: string
  frequency: string
  duration: string
  route: string
}

export interface AIPrescriptionAdvisory {
  findings: AIAdvisoryFinding[]
  overallSeverity: AIAdvisorySeverity
  summary: string
  generatedAt: string
}

export type AINoShowRisk = 'High' | 'Medium' | 'Low'
export type AIReminderPriority = 'High' | 'Normal' | 'Low'

export interface AINoShowPrediction {
  appointmentId: string
  patientId: string
  patientName: string
  doctorName: string
  specialty: string
  date: string
  time: string
  previousAttendance: string
  riskLevel: AINoShowRisk
  riskScore: number
  reminderPriority: AIReminderPriority
  factors: string[]
}

export type AIActivityStatus = 'Completed' | 'Reviewed' | 'Pending Review'
export type AIModule = 'Symptom Checker' | 'Clinical Assistant' | 'Prescription Advisory' | 'No-Show Prediction' | 'Health Analytics'

export interface AIActivityLog {
  id: string
  user: string
  role: string
  module: AIModule
  patient: string
  action: string
  timestamp: string
  status: AIActivityStatus
}
