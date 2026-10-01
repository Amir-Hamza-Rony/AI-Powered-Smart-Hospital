import type {
  DueRecord,
  InsuranceClaim,
  Invoice,
  LedgerTransaction,
  Payment,
} from '@/data/types'

export const BILLING_CATEGORIES = ['Consultation', 'Laboratory', 'Medicine', 'Procedure', 'Other'] as const

export const PAYMENT_METHODS = ['Cash', 'Card', 'Mobile Banking', 'Bank Transfer', 'Insurance'] as const

export const INVOICE_STATUSES = ['Draft', 'Pending', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'] as const

export const SERVICE_TYPES = ['Consultation', 'Laboratory', 'Pharmacy', 'Procedure', 'Package', 'Other'] as const

export const INSURANCE_PROVIDERS = [
  'GreenLife Insurance',
  'Delta Health Assurance',
  'Pragati MediCover',
  'City General Insurance',
  'Sadharan Health Protect',
]

export const PAYMENT_TERMS = ['Due on receipt', 'Net 7', 'Net 15', 'Net 30'] as const

export const HOSPITAL_INFO = {
  name: 'Smart Hospital',
  tagline: 'AI-Powered Healthcare',
  address: 'House 12, Road 5, Dhanmondi, Dhaka 1205',
  phone: '+880 2-9612345',
  email: 'billing@smarthospital.test',
  bin: 'BIN-004412789',
}

export function formatBDT(n: number): string {
  return `৳${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-3001', patientId: 'PAT-2001', patientName: 'Rahim Uddin', patientPhone: '+880 1712-335501',
    serviceType: 'Consultation', issueDate: '2026-09-24', dueDate: '2026-10-01', paymentTerms: 'Net 7',
    items: [
      { id: 'IT-01', name: 'Cardiology Consultation — Dr. Sarah Rahman', category: 'Consultation', quantity: 1, unitPrice: 1200, discount: 0, tax: 0, total: 1200 },
      { id: 'IT-02', name: 'ECG (12-lead)', category: 'Laboratory', quantity: 1, unitPrice: 500, discount: 0, tax: 0, total: 500 },
      { id: 'IT-03', name: 'Lipid Profile', category: 'Laboratory', quantity: 1, unitPrice: 1200, discount: 100, tax: 0, total: 1100 },
    ],
    subtotal: 2900, discount: 100, tax: 0, total: 2800, paid: 2800, due: 0,
    status: 'Paid', paymentMethod: 'Card', referenceNumber: 'TXN-CARD-88120', createdBy: 'Reception — N. Akter',
  },
  {
    id: 'INV-3002', patientId: 'PAT-2004', patientName: 'Fatema Begum', patientPhone: '+880 1719-008822',
    serviceType: 'Procedure', issueDate: '2026-09-28', dueDate: '2026-10-05', paymentTerms: 'Net 7',
    items: [
      { id: 'IT-01', name: 'Orthopedic Consultation — Dr. Tanvir Ahmed', category: 'Consultation', quantity: 1, unitPrice: 1000, discount: 0, tax: 0, total: 1000 },
      { id: 'IT-02', name: 'Knee Aspiration (Procedure)', category: 'Procedure', quantity: 1, unitPrice: 3500, discount: 0, tax: 175, total: 3675 },
      { id: 'IT-03', name: 'X-ray Knee (R)', category: 'Laboratory', quantity: 1, unitPrice: 900, discount: 0, tax: 0, total: 900 },
      { id: 'IT-04', name: 'Etoricoxib 90mg (7 tabs)', category: 'Medicine', quantity: 7, unitPrice: 28, discount: 0, tax: 0, total: 196 },
    ],
    subtotal: 5596, discount: 0, tax: 175, total: 5771, paid: 2000, due: 3771,
    status: 'Partially Paid', paymentMethod: 'Cash', referenceNumber: 'TXN-CASH-77120', createdBy: 'Reception — N. Akter',
  },
  {
    id: 'INV-3003', patientId: 'PAT-2003', patientName: 'Hasan Mahmud', patientPhone: '+880 1922-664108',
    serviceType: 'Pharmacy', issueDate: '2026-09-18', dueDate: '2026-09-25', paymentTerms: 'Due on receipt',
    items: [
      { id: 'IT-01', name: 'Pediatric Follow-up — Dr. Nusrat Jahan', category: 'Consultation', quantity: 1, unitPrice: 800, discount: 0, tax: 0, total: 800 },
      { id: 'IT-02', name: 'Salbutamol Inhaler 100mcg', category: 'Medicine', quantity: 1, unitPrice: 380, discount: 0, tax: 0, total: 380 },
    ],
    subtotal: 1180, discount: 0, tax: 0, total: 1180, paid: 1180, due: 0,
    status: 'Paid', paymentMethod: 'Mobile Banking', referenceNumber: 'BKASH-TRX9K2M4', createdBy: 'Pharmacy — S. Rahman',
  },
  {
    id: 'INV-3004', patientId: 'PAT-2007', patientName: 'Abdul Karim', patientPhone: '+880 1911-556700',
    serviceType: 'Laboratory', issueDate: '2026-09-12', dueDate: '2026-09-19', paymentTerms: 'Net 7',
    items: [
      { id: 'IT-01', name: 'Cardiology Review — Dr. Sarah Rahman', category: 'Consultation', quantity: 1, unitPrice: 1200, discount: 200, tax: 0, total: 1000 },
      { id: 'IT-02', name: 'Echocardiogram', category: 'Laboratory', quantity: 1, unitPrice: 2500, discount: 0, tax: 0, total: 2500 },
      { id: 'IT-03', name: 'CBC', category: 'Laboratory', quantity: 1, unitPrice: 450, discount: 0, tax: 0, total: 450 },
    ],
    subtotal: 4150, discount: 200, tax: 0, total: 3950, paid: 0, due: 3950,
    status: 'Overdue', createdBy: 'Reception — N. Akter',
  },
  {
    id: 'INV-3005', patientId: 'PAT-2002', patientName: 'Ayesha Siddika', patientPhone: '+880 1833-771204',
    serviceType: 'Consultation', issueDate: '2026-09-27', dueDate: '2026-10-04', paymentTerms: 'Net 7',
    items: [
      { id: 'IT-01', name: 'Neurology Consultation — Dr. Kamal Hossain', category: 'Consultation', quantity: 1, unitPrice: 1000, discount: 0, tax: 0, total: 1000 },
    ],
    subtotal: 1000, discount: 0, tax: 0, total: 1000, paid: 0, due: 1000,
    status: 'Pending', createdBy: 'Reception — N. Akter',
  },
  {
    id: 'INV-3006', patientId: 'PAT-2006', patientName: 'Shirin Akter', patientPhone: '+880 1744-903122',
    serviceType: 'Laboratory', issueDate: '2026-09-26', dueDate: '2026-10-03', paymentTerms: 'Net 7',
    items: [
      { id: 'IT-01', name: 'ANC Visit — Dr. Farhana Islam', category: 'Consultation', quantity: 1, unitPrice: 800, discount: 0, tax: 0, total: 800 },
      { id: 'IT-02', name: 'Hemoglobin + Urine Routine', category: 'Laboratory', quantity: 1, unitPrice: 550, discount: 50, tax: 0, total: 500 },
      { id: 'IT-03', name: 'Iron + Folic Acid (30 tabs)', category: 'Medicine', quantity: 30, unitPrice: 4, discount: 0, tax: 0, total: 120 },
    ],
    subtotal: 1470, discount: 50, tax: 0, total: 1420, paid: 1420, due: 0,
    status: 'Paid', paymentMethod: 'Cash', referenceNumber: 'TXN-CASH-77098', createdBy: 'Reception — N. Akter',
  },
  {
    id: 'INV-3007', patientId: 'PAT-2011', patientName: 'Fahim Rahman', patientPhone: '+880 1555-667788',
    serviceType: 'Procedure', issueDate: '2026-09-29', dueDate: '2026-10-06', paymentTerms: 'Net 7',
    items: [
      { id: 'IT-01', name: 'Emergency Visit — Dr. Tanvir Ahmed', category: 'Consultation', quantity: 1, unitPrice: 1500, discount: 0, tax: 0, total: 1500 },
      { id: 'IT-02', name: 'X-ray Ankle (R)', category: 'Laboratory', quantity: 1, unitPrice: 900, discount: 0, tax: 0, total: 900 },
      { id: 'IT-03', name: 'Ankle Brace + Physio Session', category: 'Procedure', quantity: 1, unitPrice: 1800, discount: 0, tax: 90, total: 1890 },
    ],
    subtotal: 4200, discount: 0, tax: 90, total: 4290, paid: 1000, due: 3290,
    status: 'Partially Paid', paymentMethod: 'Card', referenceNumber: 'TXN-CARD-88177', createdBy: 'Emergency — R. Hossain',
  },
  {
    id: 'INV-3008', patientId: 'PAT-2010', patientName: 'Rina Das', patientPhone: '+880 1722-778899',
    serviceType: 'Consultation', issueDate: '2026-09-30', dueDate: '2026-10-07', paymentTerms: 'Net 7',
    items: [
      { id: 'IT-01', name: 'Medicine Review — Dr. Mahmudul Karim', category: 'Consultation', quantity: 1, unitPrice: 800, discount: 0, tax: 0, total: 800 },
      { id: 'IT-02', name: 'TSH', category: 'Laboratory', quantity: 1, unitPrice: 900, discount: 0, tax: 0, total: 900 },
    ],
    subtotal: 1700, discount: 0, tax: 0, total: 1700, paid: 0, due: 1700,
    status: 'Pending', createdBy: 'Reception — N. Akter',
  },
  {
    id: 'INV-3009', patientId: 'PAT-2009', patientName: 'Sakib Hasan', patientPhone: '+880 1800-445566',
    serviceType: 'Consultation', issueDate: '2026-09-21', dueDate: '2026-09-28', paymentTerms: 'Net 7',
    items: [
      { id: 'IT-01', name: 'Ophthalmology Consultation — Dr. Priya Saha', category: 'Consultation', quantity: 1, unitPrice: 900, discount: 0, tax: 0, total: 900 },
      { id: 'IT-02', name: 'Refraction + Vision Test', category: 'Procedure', quantity: 1, unitPrice: 400, discount: 0, tax: 0, total: 400 },
    ],
    subtotal: 1300, discount: 0, tax: 0, total: 1300, paid: 0, due: 1300,
    status: 'Overdue', createdBy: 'Reception — N. Akter',
  },
  {
    id: 'INV-3010', patientId: 'PAT-2005', patientName: 'Imran Khan', patientPhone: '+880 1655-112390',
    serviceType: 'Laboratory', issueDate: '2026-08-15', dueDate: '2026-08-22', paymentTerms: 'Net 7',
    items: [
      { id: 'IT-01', name: 'Recovery Review — Dr. Mahmudul Karim', category: 'Consultation', quantity: 1, unitPrice: 800, discount: 800, tax: 0, total: 0 },
      { id: 'IT-02', name: 'CBC', category: 'Laboratory', quantity: 1, unitPrice: 450, discount: 0, tax: 0, total: 450 },
    ],
    subtotal: 1250, discount: 800, tax: 0, total: 450, paid: 0, due: 0,
    status: 'Cancelled', createdBy: 'Reception — N. Akter', notes: 'Cancelled — duplicate entry, merged with prior visit.',
  },
  {
    id: 'INV-3011', patientId: 'PAT-2012', patientName: 'Nabila Khan', patientPhone: '+880 1999-001122',
    serviceType: 'Consultation', issueDate: '2026-09-30', dueDate: '2026-10-07', paymentTerms: 'Due on receipt',
    items: [
      { id: 'IT-01', name: 'General Checkup — Dr. Mahmudul Karim', category: 'Consultation', quantity: 1, unitPrice: 800, discount: 0, tax: 0, total: 800 },
    ],
    subtotal: 800, discount: 0, tax: 0, total: 800, paid: 0, due: 800,
    status: 'Draft', createdBy: 'Reception — N. Akter',
  },
  {
    id: 'INV-3012', patientId: 'PAT-2008', patientName: 'Mim Chowdhury', patientPhone: '+880 1633-228811',
    serviceType: 'Pharmacy', issueDate: '2026-09-20', dueDate: '2026-09-27', paymentTerms: 'Net 7',
    items: [
      { id: 'IT-01', name: 'Dermatology Tele-review — Dr. Arif Chowdhury', category: 'Consultation', quantity: 1, unitPrice: 700, discount: 0, tax: 0, total: 700 },
      { id: 'IT-02', name: 'Hydrocortisone Cream 1%', category: 'Medicine', quantity: 1, unitPrice: 180, discount: 0, tax: 0, total: 180 },
    ],
    subtotal: 880, discount: 0, tax: 0, total: 880, paid: 880, due: 0,
    status: 'Paid', paymentMethod: 'Bank Transfer', referenceNumber: 'FT-20260920-441', createdBy: 'Pharmacy — T. Islam',
  },
]

export const MOCK_PAYMENTS: Payment[] = [
  { id: 'PAY-5001', invoiceId: 'INV-3001', patientId: 'PAT-2001', patientName: 'Rahim Uddin', amount: 2800, paymentMethod: 'Card', reference: 'TXN-CARD-88120', status: 'Completed', date: '2026-09-24', recordedBy: 'Cashier — L. Begum' },
  { id: 'PAY-5002', invoiceId: 'INV-3003', patientId: 'PAT-2003', patientName: 'Hasan Mahmud', amount: 1180, paymentMethod: 'Mobile Banking', reference: 'BKASH-TRX9K2M4', status: 'Completed', date: '2026-09-18', recordedBy: 'Cashier — L. Begum' },
  { id: 'PAY-5003', invoiceId: 'INV-3002', patientId: 'PAT-2004', patientName: 'Fatema Begum', amount: 2000, paymentMethod: 'Cash', reference: 'TXN-CASH-77120', status: 'Completed', date: '2026-09-28', recordedBy: 'Cashier — R. Karim' },
  { id: 'PAY-5004', invoiceId: 'INV-3006', patientId: 'PAT-2006', patientName: 'Shirin Akter', amount: 1420, paymentMethod: 'Cash', reference: 'TXN-CASH-77098', status: 'Completed', date: '2026-09-26', recordedBy: 'Cashier — L. Begum' },
  { id: 'PAY-5005', invoiceId: 'INV-3007', patientId: 'PAT-2011', patientName: 'Fahim Rahman', amount: 1000, paymentMethod: 'Card', reference: 'TXN-CARD-88177', status: 'Completed', date: '2026-09-29', recordedBy: 'Cashier — R. Karim' },
  { id: 'PAY-5006', invoiceId: 'INV-3012', patientId: 'PAT-2008', patientName: 'Mim Chowdhury', amount: 880, paymentMethod: 'Bank Transfer', reference: 'FT-20260920-441', status: 'Completed', date: '2026-09-20', recordedBy: 'Cashier — L. Begum' },
  { id: 'PAY-5007', invoiceId: 'INV-3008', patientId: 'PAT-2010', patientName: 'Rina Das', amount: 1700, paymentMethod: 'Mobile Banking', reference: 'NAGAD-TRX77Q1', status: 'Pending', date: '2026-09-30', recordedBy: 'Cashier — R. Karim', notes: 'Awaiting mobile-banking confirmation.' },
  { id: 'PAY-5008', invoiceId: 'INV-3005', patientId: 'PAT-2002', patientName: 'Ayesha Siddika', amount: 1000, paymentMethod: 'Card', reference: 'TXN-CARD-88201', status: 'Failed', date: '2026-09-29', recordedBy: 'Cashier — L. Begum', notes: 'Card declined — retry requested.' },
  { id: 'PAY-5009', invoiceId: 'INV-3001', patientId: 'PAT-2001', patientName: 'Rahim Uddin', amount: 300, paymentMethod: 'Cash', reference: 'TXN-CASH-76900', status: 'Refunded', date: '2026-09-25', recordedBy: 'Accounts — D. Saha', notes: 'Duplicate lab charge refunded.' },
  { id: 'PAY-5010', invoiceId: 'INV-3002', patientId: 'PAT-2004', patientName: 'Fatema Begum', amount: 1500, paymentMethod: 'Insurance', reference: 'CLM-GL-2201-PART', status: 'Pending', date: '2026-09-30', recordedBy: 'Accounts — D. Saha', notes: 'Insurance pre-authorization pending.' },
]

export const MOCK_DUES: DueRecord[] = [
  { id: 'DUE-01', patientId: 'PAT-2007', patientName: 'Abdul Karim', patientPhone: '+880 1911-556700', invoiceId: 'INV-3004', invoiceDate: '2026-09-12', dueDate: '2026-09-19', totalAmount: 3950, paid: 0, outstanding: 3950, daysOverdue: 12, status: 'Overdue' },
  { id: 'DUE-02', patientId: 'PAT-2004', patientName: 'Fatema Begum', patientPhone: '+880 1719-008822', invoiceId: 'INV-3002', invoiceDate: '2026-09-28', dueDate: '2026-10-05', totalAmount: 5771, paid: 2000, outstanding: 3771, daysOverdue: 0, status: 'Partially Paid' },
  { id: 'DUE-03', patientId: 'PAT-2011', patientName: 'Fahim Rahman', patientPhone: '+880 1555-667788', invoiceId: 'INV-3007', invoiceDate: '2026-09-29', dueDate: '2026-10-06', totalAmount: 4290, paid: 1000, outstanding: 3290, daysOverdue: 0, status: 'Partially Paid' },
  { id: 'DUE-04', patientId: 'PAT-2010', patientName: 'Rina Das', patientPhone: '+880 1722-778899', invoiceId: 'INV-3008', invoiceDate: '2026-09-30', dueDate: '2026-10-07', totalAmount: 1700, paid: 0, outstanding: 1700, daysOverdue: 0, status: 'Due Soon' },
  { id: 'DUE-05', patientId: 'PAT-2009', patientName: 'Sakib Hasan', patientPhone: '+880 1800-445566', invoiceId: 'INV-3009', invoiceDate: '2026-09-21', dueDate: '2026-09-28', totalAmount: 1300, paid: 0, outstanding: 1300, daysOverdue: 3, status: 'Overdue' },
  { id: 'DUE-06', patientId: 'PAT-2002', patientName: 'Ayesha Siddika', patientPhone: '+880 1833-771204', invoiceId: 'INV-3005', invoiceDate: '2026-09-27', dueDate: '2026-10-04', totalAmount: 1000, paid: 0, outstanding: 1000, daysOverdue: 0, status: 'Due Soon' },
]

export const MOCK_CLAIMS: InsuranceClaim[] = [
  { id: 'CLM-2201', patientId: 'PAT-2004', patientName: 'Fatema Begum', provider: 'GreenLife Insurance', policyNumber: 'GL-H-8812001', invoiceId: 'INV-3002', claimAmount: 3771, approvedAmount: 1500, submittedDate: '2026-09-29', processedDate: '', status: 'Under Review', notes: 'Pre-authorization for procedure portion.' },
  { id: 'CLM-2202', patientId: 'PAT-2007', patientName: 'Abdul Karim', provider: 'Delta Health Assurance', policyNumber: 'DH-5520140', invoiceId: 'INV-3004', claimAmount: 3950, approvedAmount: 3950, submittedDate: '2026-09-15', processedDate: '2026-09-22', status: 'Approved', notes: 'Cashless approved; disbursement pending.' },
  { id: 'CLM-2203', patientId: 'PAT-2001', patientName: 'Rahim Uddin', provider: 'Pragati MediCover', policyNumber: 'PM-3099881', invoiceId: 'INV-3001', claimAmount: 2800, approvedAmount: 2800, submittedDate: '2026-09-24', processedDate: '2026-09-26', status: 'Paid', notes: 'Reimbursed to patient account.' },
  { id: 'CLM-2204', patientId: 'PAT-2005', patientName: 'Imran Khan', provider: 'City General Insurance', policyNumber: 'CG-7712009', invoiceId: 'INV-3010', claimAmount: 450, approvedAmount: 0, submittedDate: '2026-08-16', processedDate: '2026-08-20', status: 'Rejected', notes: 'Invoice cancelled — duplicate entry.' },
  { id: 'CLM-2205', patientId: 'PAT-2011', patientName: 'Fahim Rahman', provider: 'Sadharan Health Protect', policyNumber: 'SH-4402117', invoiceId: 'INV-3007', claimAmount: 3290, approvedAmount: 2000, submittedDate: '2026-09-30', processedDate: '2026-09-30', status: 'Partially Approved', notes: 'Emergency consult approved; brace under review.' },
  { id: 'CLM-2206', patientId: 'PAT-2002', patientName: 'Ayesha Siddika', provider: 'GreenLife Insurance', policyNumber: 'GL-H-8823410', invoiceId: 'INV-3005', claimAmount: 1000, approvedAmount: 0, submittedDate: '2026-09-30', processedDate: '', status: 'Submitted', notes: 'Submitted — awaiting insurer acknowledgment.' },
  { id: 'CLM-2207', patientId: 'PAT-2012', patientName: 'Nabila Khan', provider: 'Delta Health Assurance', policyNumber: 'DH-5520991', invoiceId: 'INV-3011', claimAmount: 800, approvedAmount: 0, submittedDate: '', processedDate: '', status: 'Draft', notes: 'Draft — supporting documents pending.' },
]

export const MOCK_LEDGER: LedgerTransaction[] = [
  { id: 'LED-9001', date: '2026-09-18', time: '10:15', type: 'Consultation Revenue', reference: 'INV-3003', description: 'Pediatric follow-up — Hasan Mahmud', debit: 0, credit: 800, balance: 800, recordedBy: 'Cashier — L. Begum' },
  { id: 'LED-9002', date: '2026-09-18', time: '10:16', type: 'Pharmacy Revenue', reference: 'INV-3003', description: 'Salbutamol inhaler dispensed', debit: 0, credit: 380, balance: 1180, recordedBy: 'Cashier — L. Begum' },
  { id: 'LED-9003', date: '2026-09-20', time: '11:02', type: 'Pharmacy Revenue', reference: 'INV-3012', description: 'Dermatology review + cream — Mim Chowdhury', debit: 0, credit: 880, balance: 2060, recordedBy: 'Cashier — L. Begum' },
  { id: 'LED-9004', date: '2026-09-24', time: '09:40', type: 'Consultation Revenue', reference: 'INV-3001', description: 'Cardiology consultation — Rahim Uddin', debit: 0, credit: 1200, balance: 3260, recordedBy: 'Cashier — L. Begum' },
  { id: 'LED-9005', date: '2026-09-24', time: '09:41', type: 'Laboratory Revenue', reference: 'INV-3001', description: 'ECG + Lipid profile — Rahim Uddin', debit: 0, credit: 1600, balance: 4860, recordedBy: 'Cashier — L. Begum' },
  { id: 'LED-9006', date: '2026-09-25', time: '14:20', type: 'Refund', reference: 'PAY-5009', description: 'Refund duplicate lab charge — INV-3001', debit: 300, credit: 0, balance: 4560, recordedBy: 'Accounts — D. Saha' },
  { id: 'LED-9007', date: '2026-09-26', time: '12:05', type: 'Consultation Revenue', reference: 'INV-3006', description: 'ANC visit — Shirin Akter', debit: 0, credit: 800, balance: 5360, recordedBy: 'Cashier — L. Begum' },
  { id: 'LED-9008', date: '2026-09-26', time: '12:06', type: 'Laboratory Revenue', reference: 'INV-3006', description: 'Hb + Urine routine — Shirin Akter', debit: 0, credit: 500, balance: 5860, recordedBy: 'Cashier — L. Begum' },
  { id: 'LED-9009', date: '2026-09-26', time: '12:07', type: 'Pharmacy Revenue', reference: 'INV-3006', description: 'Iron + Folic acid — Shirin Akter', debit: 0, credit: 120, balance: 5980, recordedBy: 'Cashier — L. Begum' },
  { id: 'LED-9010', date: '2026-09-26', time: '15:44', type: 'Insurance Payment', reference: 'CLM-2203', description: 'Pragati MediCover reimbursement — INV-3001', debit: 0, credit: 2800, balance: 8780, recordedBy: 'Accounts — D. Saha' },
  { id: 'LED-9011', date: '2026-09-28', time: '16:30', type: 'Consultation Revenue', reference: 'INV-3002', description: 'Orthopedic consultation — Fatema Begum', debit: 0, credit: 1000, balance: 9780, recordedBy: 'Cashier — R. Karim' },
  { id: 'LED-9012', date: '2026-09-29', time: '10:12', type: 'Consultation Revenue', reference: 'INV-3007', description: 'Emergency visit — Fahim Rahman', debit: 0, credit: 1500, balance: 11280, recordedBy: 'Cashier — R. Karim' },
  { id: 'LED-9013', date: '2026-09-29', time: '18:02', type: 'Adjustment', reference: 'ADJ-110', description: 'Senior-citizen discount — INV-3004 (Abdul Karim)', debit: 200, credit: 0, balance: 11080, recordedBy: 'Accounts — D. Saha' },
]

export const REVENUE_BY_DAY = [
  { label: 'Sep 24', revenue: 2800 },
  { label: 'Sep 25', revenue: 0 },
  { label: 'Sep 26', revenue: 1420 },
  { label: 'Sep 27', revenue: 0 },
  { label: 'Sep 28', revenue: 2000 },
  { label: 'Sep 29', revenue: 1000 },
  { label: 'Sep 30', revenue: 1700 },
]

export const REVENUE_BY_WEEK = [
  { label: 'Wk 1 (Sep 1–7)', revenue: 8450 },
  { label: 'Wk 2 (Sep 8–14)', revenue: 6320 },
  { label: 'Wk 3 (Sep 15–21)', revenue: 9180 },
  { label: 'Wk 4 (Sep 22–30)', revenue: 9920 },
]

export const REVENUE_BY_MONTH = [
  { label: 'Apr', revenue: 18200 },
  { label: 'May', revenue: 21450 },
  { label: 'Jun', revenue: 19800 },
  { label: 'Jul', revenue: 22600 },
  { label: 'Aug', revenue: 24150 },
  { label: 'Sep', revenue: 33870 },
]
