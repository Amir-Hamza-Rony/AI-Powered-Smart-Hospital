import type {
  FullPrescription,
  PrescriptionMedicine,
  LabOrder,
  LabTest,
  LabTestResult,
  Medicine,
  InventoryItem,
  DispensingRecord,
  StockStatus,
} from '@/data/types'
import type { BackendPrescription, BackendPrescriptionItem } from '@/lib/api/prescriptions'
import type { BackendLabOrder, BackendLabOrderItem, BackendLabTest } from '@/lib/api/laboratory'
import type {
  BackendDispensingRecord,
  BackendMedicine,
  BackendMedicineBatch,
} from '@/lib/api/pharmacy'

/**
 * Centralized backend (snake_case) → frontend (camelCase) mappers for Phase 9.
 * Components must use these instead of spreading conversion logic inline.
 */

function ageOn(dateStr: string, dob?: string): number {
  if (!dob) return 0
  const then = new Date(dob).getTime()
  const now = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return 0
  return Math.max(0, Math.floor((now - then) / 31557600000))
}

export function toPrescriptionMedicine(item: BackendPrescriptionItem): PrescriptionMedicine {
  return {
    name: item.medicine_name,
    strength: item.strength,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    route: item.route,
    instructions: item.instructions,
  }
}

export function toFullPrescription(
  rx: BackendPrescription,
  patient?: { date_of_birth?: string; gender?: string; blood_group?: string; phone?: string; age?: number },
  doctor?: { specialization?: string; registration_no?: string },
): FullPrescription {
  return {
    id: rx.id,
    patientId: rx.patient,
    patientName: rx.patient_name,
    patientAge: patient?.age ?? ageOn(rx.date, patient?.date_of_birth),
    patientGender: (patient?.gender as FullPrescription['patientGender']) ?? 'Male',
    patientBloodGroup: (patient?.blood_group as FullPrescription['patientBloodGroup']) ?? 'O+',
    patientPhone: patient?.phone ?? '',
    doctorId: rx.doctor,
    doctorName: rx.doctor_name,
    doctorSpecialty: doctor?.specialization ?? '',
    doctorRegistrationNo: doctor?.registration_no ?? '',
    date: rx.date,
    chiefComplaint: rx.chief_complaint,
    diagnosis: rx.diagnosis,
    symptoms: rx.symptoms,
    clinicalNotes: rx.clinical_notes,
    medicines: rx.items.map(toPrescriptionMedicine),
    followUpRequired: rx.follow_up_required,
    followUpDate: rx.follow_up_date ?? '',
    followUpInstructions: rx.follow_up_instructions,
    status: rx.status,
  }
}

export function toLabTestResult(item: BackendLabOrderItem): LabTestResult {
  return {
    testName: item.test_name,
    sampleType: item.unit ? `${item.unit}` : '',
    referenceRange: item.reference_range,
    result: item.result,
    unit: item.unit,
    status: item.status,
  }
}

export function toLabOrder(order: BackendLabOrder): LabOrder {
  return {
    id: order.id,
    patientId: order.patient,
    patientName: order.patient_name,
    doctorId: order.doctor,
    doctorName: order.doctor_name,
    tests: order.items.map(toLabTestResult),
    orderedDate: order.order_date,
    priority: order.priority,
    status: order.status,
    instructions: order.instructions,
    notes: order.notes,
  }
}

export function toLabTest(test: BackendLabTest): LabTest {
  return {
    id: test.id,
    name: test.name,
    category: test.category,
    sampleType: test.sample_type,
    turnaroundTime: test.turnaround_time,
    price: Number(test.price),
    status: test.status,
  }
}

export function toMedicineStatus(medicine: BackendMedicine): Medicine['status'] {
  if (!medicine.is_active) return 'Discontinued'
  if (medicine.is_low_stock) return 'Low Stock'
  return 'Available'
}

export function toMedicine(medicine: BackendMedicine): Medicine {
  return {
    id: medicine.id,
    name: medicine.name,
    genericName: medicine.generic_name,
    strength: medicine.strength,
    dosageForm: medicine.dosage_form,
    manufacturer: medicine.manufacturer,
    category: medicine.category,
    prescriptionRequired: medicine.prescription_required,
    status: toMedicineStatus(medicine),
  }
}

/**
 * Backend inventory is split (Medicine + batches); the UI table is
 * batch-centric, so one InventoryItem is produced per batch.
 */
export function toInventoryItem(
  batch: BackendMedicineBatch,
  medicine?: BackendMedicine,
): InventoryItem {
  const stockStatus = (medicine?.stock_status ?? 'In Stock') as StockStatus
  return {
    id: batch.id,
    medicine: batch.medicine_name,
    genericName: medicine?.generic_name ?? '',
    category: medicine?.category ?? '',
    strength: medicine?.strength ?? '',
    dosageForm: medicine?.dosage_form ?? '',
    manufacturer: medicine?.manufacturer ?? '',
    supplier: medicine?.manufacturer ?? '',
    batchNumber: batch.batch_number,
    quantity: batch.quantity,
    unitPrice: Number(batch.selling_price),
    purchasePrice: Number(batch.purchase_price),
    expiryDate: batch.expiry_date,
    reorderLevel: medicine?.reorder_level ?? 0,
    stockStatus,
  }
}

/**
 * Backend dispensing records hold many items; the UI queue shows one row per
 * record, aggregated across its items.
 */
export function toDispensingRecord(record: BackendDispensingRecord): DispensingRecord {
  const prescribed = record.items.reduce((sum, item) => sum + item.quantity, 0)
  const dispensed = record.items.reduce((sum, item) => sum + item.dispensed_quantity, 0)
  const first = record.items[0]
  return {
    id: record.id,
    prescriptionId: record.prescription,
    patientName: record.patient_name,
    doctorName: '',
    medicine: first
      ? `${first.medicine_name}${record.items.length > 1 ? ` +${record.items.length - 1} more` : ''}`
      : '—',
    prescribedQuantity: prescribed,
    dispensedQuantity: dispensed,
    status: record.status,
  }
}
