import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { MOCK_PATIENTS } from '@/data/patients'
import { MOCK_DOCTORS } from '@/data/doctors'
import { MOCK_APPOINTMENTS } from '@/data/appointments'
import { MOCK_DISPENSING, MOCK_FOLLOWUPS, MOCK_INVENTORY, MOCK_LAB_ORDERS, MOCK_PRESCRIPTIONS } from '@/data/phase3'
import { MOCK_CLAIMS, MOCK_INVOICES, MOCK_LEDGER, MOCK_PAYMENTS } from '@/data/billing'
import type {
  Appointment,
  AppointmentStatus,
  ClaimStatus,
  DispensingRecord,
  DispensingStatus,
  Doctor,
  FollowUp,
  FollowUpStatus,
  FullPrescription,
  InsuranceClaim,
  InventoryItem,
  Invoice,
  InvoiceStatus,
  LabOrder,
  LabOrderStatus,
  LedgerTransaction,
  Patient,
  Payment,
  PrescriptionStatus,
} from '@/data/types'

interface HospitalStoreValue {
  patients: Patient[]
  doctors: Doctor[]
  appointments: Appointment[]
  prescriptions: FullPrescription[]
  followUps: FollowUp[]
  labOrders: LabOrder[]
  inventory: InventoryItem[]
  dispensing: DispensingRecord[]
  getPatient: (id: string) => Patient | undefined
  getDoctor: (id: string) => Doctor | undefined
  getAppointment: (id: string) => Appointment | undefined
  addPatient: (p: Patient) => void
  updatePatient: (id: string, patch: Partial<Patient>) => void
  deletePatient: (id: string) => void
  addDoctor: (d: Doctor) => void
  updateDoctor: (id: string, patch: Partial<Doctor>) => void
  deleteDoctor: (id: string) => void
  addAppointment: (a: Appointment) => void
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void
  deleteAppointment: (id: string) => void
  getPrescription: (id: string) => FullPrescription | undefined
  addPrescription: (p: FullPrescription) => void
  setPrescriptionStatus: (id: string, status: PrescriptionStatus) => void
  getLabOrder: (id: string) => LabOrder | undefined
  addLabOrder: (o: LabOrder) => void
  setLabOrderStatus: (id: string, status: LabOrderStatus) => void
  getInventoryItem: (id: string) => InventoryItem | undefined
  addInventoryItem: (i: InventoryItem) => void
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => void
  setFollowUpStatus: (id: string, status: FollowUpStatus) => void
  setDispensingStatus: (id: string, status: DispensingStatus, dispensedQty?: number) => void
  invoices: Invoice[]
  payments: Payment[]
  claims: InsuranceClaim[]
  ledger: LedgerTransaction[]
  getInvoice: (id: string) => Invoice | undefined
  addInvoice: (i: Invoice) => void
  updateInvoice: (id: string, patch: Partial<Invoice>) => void
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void
  addPayment: (p: Payment) => void
  setClaimStatus: (id: string, status: ClaimStatus) => void
  addClaim: (c: InsuranceClaim) => void
}

const HospitalStoreContext = createContext<HospitalStoreValue | null>(null)

export function HospitalStoreProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS)
  const [doctors, setDoctors] = useState<Doctor[]>(MOCK_DOCTORS)
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS)
  const [prescriptions, setPrescriptions] = useState<FullPrescription[]>(MOCK_PRESCRIPTIONS)
  const [followUps, setFollowUps] = useState<FollowUp[]>(MOCK_FOLLOWUPS)
  const [labOrders, setLabOrders] = useState<LabOrder[]>(MOCK_LAB_ORDERS)
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY)
  const [dispensing, setDispensing] = useState<DispensingRecord[]>(MOCK_DISPENSING)
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES)
  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS)
  const [claims, setClaims] = useState<InsuranceClaim[]>(MOCK_CLAIMS)
  const [ledger] = useState<LedgerTransaction[]>(MOCK_LEDGER)

  const value = useMemo<HospitalStoreValue>(
    () => ({
      patients,
      doctors,
      appointments,
      prescriptions,
      followUps,
      labOrders,
      inventory,
      dispensing,
      getPatient: (id) => patients.find((p) => p.id === id),
      getDoctor: (id) => doctors.find((d) => d.id === id),
      getAppointment: (id) => appointments.find((a) => a.id === id),
      addPatient: (p) => setPatients((prev) => [p, ...prev]),
      updatePatient: (id, patch) => setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      deletePatient: (id) => setPatients((prev) => prev.filter((p) => p.id !== id)),
      addDoctor: (d) => setDoctors((prev) => [d, ...prev]),
      updateDoctor: (id, patch) => setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d))),
      deleteDoctor: (id) => setDoctors((prev) => prev.filter((d) => d.id !== id)),
      addAppointment: (a) => setAppointments((prev) => [a, ...prev]),
      setAppointmentStatus: (id, status) =>
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a))),
      deleteAppointment: (id) => setAppointments((prev) => prev.filter((a) => a.id !== id)),
      getPrescription: (id) => prescriptions.find((p) => p.id === id),
      addPrescription: (p) => setPrescriptions((prev) => [p, ...prev]),
      setPrescriptionStatus: (id, status) =>
        setPrescriptions((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p))),
      getLabOrder: (id) => labOrders.find((o) => o.id === id),
      addLabOrder: (o) => setLabOrders((prev) => [o, ...prev]),
      setLabOrderStatus: (id, status) =>
        setLabOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o))),
      getInventoryItem: (id) => inventory.find((i) => i.id === id),
      addInventoryItem: (i) => setInventory((prev) => [i, ...prev]),
      updateInventoryItem: (id, patch) =>
        setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i))),
      setFollowUpStatus: (id, status) =>
        setFollowUps((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f))),
      setDispensingStatus: (id, status, dispensedQty) =>
        setDispensing((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status, dispensedQuantity: dispensedQty ?? d.dispensedQuantity } : d)),
        ),
      invoices,
      payments,
      claims,
      ledger,
      getInvoice: (id) => invoices.find((i) => i.id === id),
      addInvoice: (inv) => setInvoices((prev) => [inv, ...prev]),
      updateInvoice: (id, patch) =>
        setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i))),
      setInvoiceStatus: (id, status) =>
        setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i))),
      addPayment: (p) => {
        setPayments((prev) => [p, ...prev])
        setInvoices((prev) =>
          prev.map((inv) => {
            if (inv.id !== p.invoiceId || p.status !== 'Completed') return inv
            const paid = inv.paid + p.amount
            const due = Math.max(0, inv.total - paid)
            const status = due <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : inv.status
            return { ...inv, paid, due, status }
          }),
        )
      },
      setClaimStatus: (id, status) =>
        setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c))),
      addClaim: (c) => setClaims((prev) => [c, ...prev]),
    }),
    [patients, doctors, appointments, prescriptions, followUps, labOrders, inventory, dispensing, invoices, payments, claims, ledger],
  )

  return <HospitalStoreContext.Provider value={value}>{children}</HospitalStoreContext.Provider>
}

export function useHospitalStore() {
  const ctx = useContext(HospitalStoreContext)
  if (!ctx) throw new Error('useHospitalStore must be used within HospitalStoreProvider')
  return ctx
}

export function nextId(prefix: string, existing: string[]) {
  const nums = existing
    .map((id) => Number.parseInt(id.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `${prefix}-${max + 1}`
}
