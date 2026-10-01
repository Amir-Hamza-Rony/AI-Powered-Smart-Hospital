import type {
  DispensingRecord,
  FollowUp,
  FullPrescription,
  InventoryItem,
  LabOrder,
  LabTest,
  Medicine,
  StockMovement,
} from '@/data/types'

export const MEDICINE_CATEGORIES = [
  'Analgesic',
  'Antibiotic',
  'Antihypertensive',
  'Antidiabetic',
  'Antihistamine',
  'Gastrointestinal',
  'Cardiovascular',
  'Respiratory',
  'Vitamin / Supplement',
  'Topical',
]

export const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Sachet']

export const LAB_CATEGORIES = ['Hematology', 'Biochemistry', 'Microbiology', 'Immunology', 'Urinalysis', 'Imaging', 'Cardiology']

export const MOCK_MEDICINES: Medicine[] = [
  { id: 'MED-001', name: 'Paracetamol 500', genericName: 'Paracetamol', strength: '500 mg', dosageForm: 'Tablet', manufacturer: 'Square Pharma', category: 'Analgesic', prescriptionRequired: false, status: 'Available' },
  { id: 'MED-002', name: 'Amoxicillin 500', genericName: 'Amoxicillin', strength: '500 mg', dosageForm: 'Capsule', manufacturer: 'Beximco Pharma', category: 'Antibiotic', prescriptionRequired: true, status: 'Available' },
  { id: 'MED-003', name: 'Omeprazole 20', genericName: 'Omeprazole', strength: '20 mg', dosageForm: 'Capsule', manufacturer: 'Renata Pharma', category: 'Gastrointestinal', prescriptionRequired: false, status: 'Available' },
  { id: 'MED-004', name: 'Metformin 850', genericName: 'Metformin HCl', strength: '850 mg', dosageForm: 'Tablet', manufacturer: 'ACI Pharma', category: 'Antidiabetic', prescriptionRequired: true, status: 'Available' },
  { id: 'MED-005', name: 'Amlodipine 5', genericName: 'Amlodipine', strength: '5 mg', dosageForm: 'Tablet', manufacturer: 'Square Pharma', category: 'Antihypertensive', prescriptionRequired: true, status: 'Available' },
  { id: 'MED-006', name: 'Cetirizine 10', genericName: 'Cetirizine HCl', strength: '10 mg', dosageForm: 'Tablet', manufacturer: 'Incepta Pharma', category: 'Antihistamine', prescriptionRequired: false, status: 'Available' },
  { id: 'MED-007', name: 'Azithromycin 500', genericName: 'Azithromycin', strength: '500 mg', dosageForm: 'Tablet', manufacturer: 'Beximco Pharma', category: 'Antibiotic', prescriptionRequired: true, status: 'Low Stock' },
  { id: 'MED-008', name: 'Salbutamol Inhaler', genericName: 'Salbutamol', strength: '100 mcg/dose', dosageForm: 'Inhaler', manufacturer: 'GSK Local', category: 'Respiratory', prescriptionRequired: true, status: 'Available' },
  { id: 'MED-009', name: 'ORS Sachet', genericName: 'Oral Rehydration Salts', strength: '10.5 g', dosageForm: 'Sachet', manufacturer: 'SMC Pharma', category: 'Gastrointestinal', prescriptionRequired: false, status: 'Available' },
  { id: 'MED-010', name: 'Atorvastatin 20', genericName: 'Atorvastatin', strength: '20 mg', dosageForm: 'Tablet', manufacturer: 'Renata Pharma', category: 'Cardiovascular', prescriptionRequired: true, status: 'Available' },
  { id: 'MED-011', name: 'Ciprofloxacin 500', genericName: 'Ciprofloxacin', strength: '500 mg', dosageForm: 'Tablet', manufacturer: 'Square Pharma', category: 'Antibiotic', prescriptionRequired: true, status: 'Discontinued' },
  { id: 'MED-012', name: 'Vitamin D3 20000', genericName: 'Cholecalciferol', strength: '20000 IU', dosageForm: 'Capsule', manufacturer: 'Incepta Pharma', category: 'Vitamin / Supplement', prescriptionRequired: false, status: 'Available' },
  { id: 'MED-013', name: 'Hydrocortisone Cream', genericName: 'Hydrocortisone', strength: '1% w/w', dosageForm: 'Ointment', manufacturer: 'ACI Pharma', category: 'Topical', prescriptionRequired: false, status: 'Available' },
  { id: 'MED-014', name: 'Losartan 50', genericName: 'Losartan Potassium', strength: '50 mg', dosageForm: 'Tablet', manufacturer: 'Beximco Pharma', category: 'Antihypertensive', prescriptionRequired: true, status: 'Low Stock' },
  { id: 'MED-015', name: 'Montelukast 10', genericName: 'Montelukast Sodium', strength: '10 mg', dosageForm: 'Tablet', manufacturer: 'Square Pharma', category: 'Respiratory', prescriptionRequired: true, status: 'Available' },
  { id: 'MED-016', name: 'Insulin Glargine', genericName: 'Insulin Glargine', strength: '100 IU/ml', dosageForm: 'Injection', manufacturer: 'Renata Pharma', category: 'Antidiabetic', prescriptionRequired: true, status: 'Available' },
]

export const MOCK_PRESCRIPTIONS: FullPrescription[] = [
  {
    id: 'RX-1001', patientId: 'P-001', patientName: 'Rahim Uddin', patientAge: 42, patientGender: 'Male', patientBloodGroup: 'B+', patientPhone: '+880 1711-000001',
    doctorId: 'D-001', doctorName: 'Dr. Ayesha Khan', doctorSpecialty: 'Cardiology', doctorRegistrationNo: 'BMDC-88231',
    date: '2026-09-28', chiefComplaint: 'Chest discomfort and shortness of breath on exertion', diagnosis: 'Stable angina, Hypertension Stage 1',
    symptoms: 'Chest tightness, fatigue, mild headache', clinicalNotes: 'BP 150/95. ECG shows non-specific changes. Advised low-salt diet, exercise, and follow-up with lipid profile.',
    medicines: [
      { name: 'Paracetamol', strength: '500 mg', dosage: '1 tablet', frequency: '3 times daily', duration: '5 days', route: 'Oral', instructions: 'After meal' },
      { name: 'Amlodipine', strength: '5 mg', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', route: 'Oral', instructions: 'Morning, before meal' },
      { name: 'Atorvastatin', strength: '20 mg', dosage: '1 tablet', frequency: 'Once daily at night', duration: '30 days', route: 'Oral', instructions: 'After dinner' },
    ],
    followUpRequired: true, followUpDate: '2026-10-12', followUpInstructions: 'Bring lipid profile and BP log.', status: 'Active',
  },
  {
    id: 'RX-1002', patientId: 'P-002', patientName: 'Fatima Begum', patientAge: 29, patientGender: 'Female', patientBloodGroup: 'O+', patientPhone: '+880 1711-000002',
    doctorId: 'D-002', doctorName: 'Dr. Tanvir Ahmed', doctorSpecialty: 'General Medicine', doctorRegistrationNo: 'BMDC-77410',
    date: '2026-09-25', chiefComplaint: 'Fever, sore throat and body ache for 3 days', diagnosis: 'Acute pharyngitis (viral)',
    symptoms: 'Fever 101°F, sore throat, myalgia', clinicalNotes: 'Throat congested, no exudates. Chest clear. Symptomatic management advised with hydration.',
    medicines: [
      { name: 'Paracetamol', strength: '500 mg', dosage: '1 tablet', frequency: '3 times daily', duration: '5 days', route: 'Oral', instructions: 'After meal, if fever' },
      { name: 'Cetirizine', strength: '10 mg', dosage: '1 tablet', frequency: 'Once daily', duration: '7 days', route: 'Oral', instructions: 'At night' },
    ],
    followUpRequired: true, followUpDate: '2026-10-01', followUpInstructions: 'Return if fever persists beyond 5 days.', status: 'Active',
  },
  {
    id: 'RX-1003', patientId: 'P-003', patientName: 'Karim Sheikh', patientAge: 55, patientGender: 'Male', patientBloodGroup: 'A+', patientPhone: '+880 1711-000003',
    doctorId: 'D-003', doctorName: 'Dr. Nusrat Jahan', doctorSpecialty: 'Endocrinology', doctorRegistrationNo: 'BMDC-90112',
    date: '2026-09-20', chiefComplaint: 'Increased thirst and frequent urination', diagnosis: 'Type 2 Diabetes Mellitus',
    symptoms: 'Polyuria, polydipsia, weight loss 2 kg', clinicalNotes: 'FBS 168 mg/dl. Started metformin, diabetic diet chart provided.',
    medicines: [
      { name: 'Metformin', strength: '850 mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '30 days', route: 'Oral', instructions: 'After meal' },
      { name: 'Vitamin D3', strength: '20000 IU', dosage: '1 capsule', frequency: 'Once weekly', duration: '8 weeks', route: 'Oral', instructions: 'After meal' },
    ],
    followUpRequired: true, followUpDate: '2026-09-29', followUpInstructions: 'Repeat FBS and HbA1c.', status: 'Completed',
  },
  {
    id: 'RX-1004', patientId: 'P-004', patientName: 'Shirin Akter', patientAge: 34, patientGender: 'Female', patientBloodGroup: 'AB+', patientPhone: '+880 1711-000004',
    doctorId: 'D-001', doctorName: 'Dr. Ayesha Khan', doctorSpecialty: 'Cardiology', doctorRegistrationNo: 'BMDC-88231',
    date: '2026-09-18', chiefComplaint: 'Seasonal sneezing and nasal congestion', diagnosis: 'Allergic rhinitis',
    symptoms: 'Sneezing, rhinorrhea, itchy eyes', clinicalNotes: 'No wheeze. Avoid dust exposure. Nasal spray technique demonstrated.',
    medicines: [
      { name: 'Cetirizine', strength: '10 mg', dosage: '1 tablet', frequency: 'Once daily', duration: '14 days', route: 'Oral', instructions: 'At night' },
      { name: 'Montelukast', strength: '10 mg', dosage: '1 tablet', frequency: 'Once daily', duration: '14 days', route: 'Oral', instructions: 'Evening' },
    ],
    followUpRequired: false, followUpDate: '', followUpInstructions: '', status: 'Completed',
  },
  {
    id: 'RX-1005', patientId: 'P-005', patientName: 'Hasan Ali', patientAge: 61, patientGender: 'Male', patientBloodGroup: 'O-', patientPhone: '+880 1711-000005',
    doctorId: 'D-004', doctorName: 'Dr. Farid Hasan', doctorSpecialty: 'Pulmonology', doctorRegistrationNo: 'BMDC-65501',
    date: '2026-09-27', chiefComplaint: 'Persistent cough with whistling sound', diagnosis: 'Bronchial asthma (exacerbation)',
    symptoms: 'Dry cough, wheeze, night symptoms', clinicalNotes: 'SpO2 96%. Prescribed inhaler, spacer technique explained.',
    medicines: [
      { name: 'Salbutamol', strength: '100 mcg/dose', dosage: '2 puffs', frequency: 'As needed (max 4x daily)', duration: '30 days', route: 'Inhalation', instructions: 'With spacer' },
      { name: 'Azithromycin', strength: '500 mg', dosage: '1 tablet', frequency: 'Once daily', duration: '3 days', route: 'Oral', instructions: 'After meal' },
    ],
    followUpRequired: true, followUpDate: '2026-10-05', followUpInstructions: 'Spirometry at follow-up.', status: 'Active',
  },
  {
    id: 'RX-1006', patientId: 'P-006', patientName: 'Mina Chowdhury', patientAge: 47, patientGender: 'Female', patientBloodGroup: 'B-', patientPhone: '+880 1711-000006',
    doctorId: 'D-002', doctorName: 'Dr. Tanvir Ahmed', doctorSpecialty: 'General Medicine', doctorRegistrationNo: 'BMDC-77410',
    date: '2026-09-15', chiefComplaint: 'Burning sensation in stomach after meals', diagnosis: 'GERD',
    symptoms: 'Heartburn, regurgitation', clinicalNotes: 'Advised small frequent meals, avoid spicy food, head-end elevation.',
    medicines: [
      { name: 'Omeprazole', strength: '20 mg', dosage: '1 capsule', frequency: 'Once daily', duration: '21 days', route: 'Oral', instructions: 'Before breakfast' },
    ],
    followUpRequired: false, followUpDate: '', followUpInstructions: '', status: 'Cancelled',
  },
  {
    id: 'RX-1007', patientId: 'P-007', patientName: 'Abdul Malek', patientAge: 38, patientGender: 'Male', patientBloodGroup: 'A-', patientPhone: '+880 1711-000007',
    doctorId: 'D-003', doctorName: 'Dr. Nusrat Jahan', doctorSpecialty: 'Endocrinology', doctorRegistrationNo: 'BMDC-90112',
    date: '2026-09-29', chiefComplaint: 'High blood pressure on home monitor', diagnosis: 'Essential hypertension',
    symptoms: 'Occasional headache, dizziness', clinicalNotes: 'Average home BP 148/92. Started losartan, salt restriction advised.',
    medicines: [
      { name: 'Losartan', strength: '50 mg', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', route: 'Oral', instructions: 'Morning' },
    ],
    followUpRequired: true, followUpDate: '2026-10-13', followUpInstructions: 'Bring 7-day BP diary.', status: 'Active',
  },
  {
    id: 'RX-1008', patientId: 'P-008', patientName: 'Nasrin Sultana', patientAge: 52, patientGender: 'Female', patientBloodGroup: 'O+', patientPhone: '+880 1711-000008',
    doctorId: 'D-004', doctorName: 'Dr. Farid Hasan', doctorSpecialty: 'Pulmonology', doctorRegistrationNo: 'BMDC-65501',
    date: '2026-09-22', chiefComplaint: 'Loose motion and dehydration', diagnosis: 'Acute gastroenteritis',
    symptoms: 'Watery stool 5x/day, cramps', clinicalNotes: 'Mild dehydration. ORS and zinc advised. Red-flag signs explained.',
    medicines: [
      { name: 'ORS', strength: '10.5 g', dosage: '1 sachet in 1L water', frequency: 'After each loose stool', duration: '3 days', route: 'Oral', instructions: 'Sip frequently' },
      { name: 'Paracetamol', strength: '500 mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '3 days', route: 'Oral', instructions: 'After meal if fever' },
    ],
    followUpRequired: false, followUpDate: '', followUpInstructions: '', status: 'Completed',
  },
]

export const MOCK_FOLLOWUPS: FollowUp[] = [
  { id: 'FU-001', patientId: 'P-002', patientName: 'Fatima Begum', doctorId: 'D-002', doctorName: 'Dr. Tanvir Ahmed', originalVisit: '2026-09-25', followUpDate: '2026-10-01', reason: 'Review persistent fever (RX-1002)', status: 'Due Today' },
  { id: 'FU-002', patientId: 'P-001', patientName: 'Rahim Uddin', doctorId: 'D-001', doctorName: 'Dr. Ayesha Khan', originalVisit: '2026-09-28', followUpDate: '2026-10-12', reason: 'BP review + lipid profile (RX-1001)', status: 'Upcoming' },
  { id: 'FU-003', patientId: 'P-005', patientName: 'Hasan Ali', doctorId: 'D-004', doctorName: 'Dr. Farid Hasan', originalVisit: '2026-09-27', followUpDate: '2026-10-05', reason: 'Asthma control + spirometry (RX-1005)', status: 'Upcoming' },
  { id: 'FU-004', patientId: 'P-003', patientName: 'Karim Sheikh', doctorId: 'D-003', doctorName: 'Dr. Nusrat Jahan', originalVisit: '2026-09-20', followUpDate: '2026-09-29', reason: 'Diabetes review with HbA1c (RX-1003)', status: 'Completed' },
  { id: 'FU-005', patientId: 'P-007', patientName: 'Abdul Malek', doctorId: 'D-003', doctorName: 'Dr. Nusrat Jahan', originalVisit: '2026-09-29', followUpDate: '2026-10-13', reason: 'BP diary review (RX-1007)', status: 'Upcoming' },
  { id: 'FU-006', patientId: 'P-009', patientName: 'Jamal Hossain', doctorId: 'D-002', doctorName: 'Dr. Tanvir Ahmed', originalVisit: '2026-09-10', followUpDate: '2026-09-24', reason: 'Wound check — patient did not attend', status: 'Missed' },
  { id: 'FU-007', patientId: 'P-010', patientName: 'Rina Das', doctorId: 'D-001', doctorName: 'Dr. Ayesha Khan', originalVisit: '2026-09-12', followUpDate: '2026-09-26', reason: 'ECG review — patient did not attend', status: 'Missed' },
]

export const MOCK_LAB_TESTS: LabTest[] = [
  { id: 'LT-001', name: 'Complete Blood Count (CBC)', category: 'Hematology', sampleType: 'Whole Blood (EDTA)', turnaroundTime: '4 hours', price: 450, status: 'Active' },
  { id: 'LT-002', name: 'Fasting Blood Sugar (FBS)', category: 'Biochemistry', sampleType: 'Serum (Fluoride)', turnaroundTime: '2 hours', price: 200, status: 'Active' },
  { id: 'LT-003', name: 'HbA1c', category: 'Biochemistry', sampleType: 'Whole Blood (EDTA)', turnaroundTime: '6 hours', price: 800, status: 'Active' },
  { id: 'LT-004', name: 'Lipid Profile', category: 'Biochemistry', sampleType: 'Serum (Fasting)', turnaroundTime: '6 hours', price: 1200, status: 'Active' },
  { id: 'LT-005', name: 'Urine Routine Examination', category: 'Urinalysis', sampleType: 'Urine', turnaroundTime: '3 hours', price: 300, status: 'Active' },
  { id: 'LT-006', name: 'Blood Culture', category: 'Microbiology', sampleType: 'Whole Blood (Culture bottle)', turnaroundTime: '72 hours', price: 1800, status: 'Active' },
  { id: 'LT-007', name: 'ECG (12-lead)', category: 'Cardiology', sampleType: 'N/A (Bedside)', turnaroundTime: '30 minutes', price: 500, status: 'Active' },
  { id: 'LT-008', name: 'Chest X-Ray (PA view)', category: 'Imaging', sampleType: 'N/A (Radiology)', turnaroundTime: '2 hours', price: 900, status: 'Active' },
  { id: 'LT-009', name: 'Thyroid Function (TSH, FT4)', category: 'Immunology', sampleType: 'Serum', turnaroundTime: '24 hours', price: 1500, status: 'Active' },
  { id: 'LT-010', name: 'Dengue NS1 Antigen', category: 'Immunology', sampleType: 'Serum', turnaroundTime: '3 hours', price: 1100, status: 'Inactive' },
]

export const MOCK_LAB_ORDERS: LabOrder[] = [
  {
    id: 'LAB-2001', patientId: 'P-001', patientName: 'Rahim Uddin', doctorId: 'D-001', doctorName: 'Dr. Ayesha Khan',
    tests: [
      { testName: 'Lipid Profile', sampleType: 'Serum (Fasting)', referenceRange: 'TC < 200 mg/dL', result: '', unit: 'mg/dL', status: 'Pending' },
      { testName: 'ECG (12-lead)', sampleType: 'N/A (Bedside)', referenceRange: 'Normal sinus rhythm', result: '', unit: '-', status: 'Pending' },
    ],
    orderedDate: '2026-09-30', priority: 'Urgent', status: 'Processing', instructions: 'Fasting 12 hours required', notes: 'Linked to RX-1001',
  },
  {
    id: 'LAB-2002', patientId: 'P-002', patientName: 'Fatima Begum', doctorId: 'D-002', doctorName: 'Dr. Tanvir Ahmed',
    tests: [{ testName: 'Complete Blood Count (CBC)', sampleType: 'Whole Blood (EDTA)', referenceRange: 'WBC 4–11 x10⁹/L', result: 'WBC 11.8, Neut 72%', unit: 'x10⁹/L', status: 'Abnormal' }],
    orderedDate: '2026-09-29', priority: 'Normal', status: 'Ready', instructions: '', notes: '',
  },
  {
    id: 'LAB-2003', patientId: 'P-003', patientName: 'Karim Sheikh', doctorId: 'D-003', doctorName: 'Dr. Nusrat Jahan',
    tests: [
      { testName: 'Fasting Blood Sugar (FBS)', sampleType: 'Serum (Fluoride)', referenceRange: '70–100 mg/dL', result: '168', unit: 'mg/dL', status: 'Abnormal' },
      { testName: 'HbA1c', sampleType: 'Whole Blood (EDTA)', referenceRange: '< 5.7%', result: '7.8%', unit: '%', status: 'Abnormal' },
    ],
    orderedDate: '2026-09-28', priority: 'Normal', status: 'Completed', instructions: '', notes: 'Reviewed in RX-1003',
  },
  {
    id: 'LAB-2004', patientId: 'P-005', patientName: 'Hasan Ali', doctorId: 'D-004', doctorName: 'Dr. Farid Hasan',
    tests: [{ testName: 'Chest X-Ray (PA view)', sampleType: 'N/A (Radiology)', referenceRange: 'No acute infiltrate', result: '', unit: '-', status: 'Pending' }],
    orderedDate: '2026-09-30', priority: 'Emergency', status: 'Pending', instructions: 'Wheelchair assistance needed', notes: '',
  },
  {
    id: 'LAB-2005', patientId: 'P-007', patientName: 'Abdul Malek', doctorId: 'D-003', doctorName: 'Dr. Nusrat Jahan',
    tests: [{ testName: 'Complete Blood Count (CBC)', sampleType: 'Whole Blood (EDTA)', referenceRange: 'Hb 13–17 g/dL', result: 'Hb 14.2', unit: 'g/dL', status: 'Normal' }],
    orderedDate: '2026-09-26', priority: 'Normal', status: 'Completed', instructions: '', notes: '',
  },
  {
    id: 'LAB-2006', patientId: 'P-010', patientName: 'Rina Das', doctorId: 'D-001', doctorName: 'Dr. Ayesha Khan',
    tests: [{ testName: 'ECG (12-lead)', sampleType: 'N/A (Bedside)', referenceRange: 'Normal sinus rhythm', result: 'Normal sinus rhythm', unit: '-', status: 'Normal' }],
    orderedDate: '2026-09-25', priority: 'Normal', status: 'Cancelled', instructions: '', notes: 'Patient rescheduled',
  },
  {
    id: 'LAB-2007', patientId: 'P-008', patientName: 'Nasrin Sultana', doctorId: 'D-004', doctorName: 'Dr. Farid Hasan',
    tests: [{ testName: 'Urine Routine Examination', sampleType: 'Urine', referenceRange: 'No protein/glucose', result: '', unit: '-', status: 'Pending' }],
    orderedDate: '2026-09-30', priority: 'Normal', status: 'Pending', instructions: 'Mid-stream sample', notes: '',
  },
]

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'INV-001', medicine: 'Paracetamol 500', genericName: 'Paracetamol', category: 'Analgesic', strength: '500 mg', dosageForm: 'Tablet', manufacturer: 'Square Pharma', supplier: 'MediServe Distributors', batchNumber: 'B-88412', quantity: 5200, unitPrice: 2.5, purchasePrice: 1.8, expiryDate: '2027-06-30', reorderLevel: 500, stockStatus: 'In Stock' },
  { id: 'INV-002', medicine: 'Amoxicillin 500', genericName: 'Amoxicillin', category: 'Antibiotic', strength: '500 mg', dosageForm: 'Capsule', manufacturer: 'Beximco Pharma', supplier: 'PharmaLink Ltd', batchNumber: 'B-77120', quantity: 340, unitPrice: 8, purchasePrice: 6, expiryDate: '2026-12-15', reorderLevel: 400, stockStatus: 'Low Stock' },
  { id: 'INV-003', medicine: 'Azithromycin 500', genericName: 'Azithromycin', category: 'Antibiotic', strength: '500 mg', dosageForm: 'Tablet', manufacturer: 'Beximco Pharma', supplier: 'PharmaLink Ltd', batchNumber: 'B-77002', quantity: 120, unitPrice: 35, purchasePrice: 28, expiryDate: '2027-01-20', reorderLevel: 300, stockStatus: 'Low Stock' },
  { id: 'INV-004', medicine: 'Insulin Glargine', genericName: 'Insulin Glargine', category: 'Antidiabetic', strength: '100 IU/ml', dosageForm: 'Injection', manufacturer: 'Renata Pharma', supplier: 'ColdChain Supplies', batchNumber: 'B-99011', quantity: 85, unitPrice: 950, purchasePrice: 820, expiryDate: '2026-11-10', reorderLevel: 50, stockStatus: 'Near Expiry' },
  { id: 'INV-005', medicine: 'Salbutamol Inhaler', genericName: 'Salbutamol', category: 'Respiratory', strength: '100 mcg/dose', dosageForm: 'Inhaler', manufacturer: 'GSK Local', supplier: 'MediServe Distributors', batchNumber: 'B-55310', quantity: 0, unitPrice: 380, purchasePrice: 320, expiryDate: '2027-03-31', reorderLevel: 40, stockStatus: 'Out of Stock' },
  { id: 'INV-006', medicine: 'Omeprazole 20', genericName: 'Omeprazole', category: 'Gastrointestinal', strength: '20 mg', dosageForm: 'Capsule', manufacturer: 'Renata Pharma', supplier: 'PharmaLink Ltd', batchNumber: 'B-66100', quantity: 2800, unitPrice: 5, purchasePrice: 3.5, expiryDate: '2027-09-30', reorderLevel: 400, stockStatus: 'In Stock' },
  { id: 'INV-007', medicine: 'Losartan 50', genericName: 'Losartan Potassium', category: 'Antihypertensive', strength: '50 mg', dosageForm: 'Tablet', manufacturer: 'Beximco Pharma', supplier: 'MediServe Distributors', batchNumber: 'B-66231', quantity: 180, unitPrice: 7, purchasePrice: 5, expiryDate: '2026-10-28', reorderLevel: 250, stockStatus: 'Near Expiry' },
  { id: 'INV-008', medicine: 'Ciprofloxacin 500', genericName: 'Ciprofloxacin', category: 'Antibiotic', strength: '500 mg', dosageForm: 'Tablet', manufacturer: 'Square Pharma', supplier: 'PharmaLink Ltd', batchNumber: 'B-61002', quantity: 0, unitPrice: 9, purchasePrice: 7, expiryDate: '2026-09-15', reorderLevel: 200, stockStatus: 'Out of Stock' },
  { id: 'INV-009', medicine: 'Metformin 850', genericName: 'Metformin HCl', category: 'Antidiabetic', strength: '850 mg', dosageForm: 'Tablet', manufacturer: 'ACI Pharma', supplier: 'MediServe Distributors', batchNumber: 'B-70045', quantity: 4100, unitPrice: 4, purchasePrice: 3, expiryDate: '2027-08-31', reorderLevel: 500, stockStatus: 'In Stock' },
  { id: 'INV-010', medicine: 'Cetirizine 10', genericName: 'Cetirizine HCl', category: 'Antihistamine', strength: '10 mg', dosageForm: 'Tablet', manufacturer: 'Incepta Pharma', supplier: 'PharmaLink Ltd', batchNumber: 'B-71090', quantity: 290, unitPrice: 3, purchasePrice: 2, expiryDate: '2027-02-28', reorderLevel: 300, stockStatus: 'Low Stock' },
]

export const MOCK_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'SM-001', inventoryId: 'INV-001', date: '2026-09-28', type: 'Dispensed', quantity: 60, reference: 'RX-1001', performedBy: 'Pharmacist S. Rahman' },
  { id: 'SM-002', inventoryId: 'INV-001', date: '2026-09-20', type: 'Stock In', quantity: 5000, reference: 'PO-4512', performedBy: 'Storekeeper K. Das' },
  { id: 'SM-003', inventoryId: 'INV-002', date: '2026-09-27', type: 'Dispensed', quantity: 30, reference: 'RX-1005', performedBy: 'Pharmacist S. Rahman' },
  { id: 'SM-004', inventoryId: 'INV-004', date: '2026-09-25', type: 'Adjustment', quantity: -5, reference: 'Cold-chain breakage', performedBy: 'Pharmacist T. Islam' },
  { id: 'SM-005', inventoryId: 'INV-007', date: '2026-09-29', type: 'Dispensed', quantity: 30, reference: 'RX-1007', performedBy: 'Pharmacist S. Rahman' },
  { id: 'SM-006', inventoryId: 'INV-006', date: '2026-09-15', type: 'Stock In', quantity: 3000, reference: 'PO-4490', performedBy: 'Storekeeper K. Das' },
  { id: 'SM-007', inventoryId: 'INV-005', date: '2026-09-26', type: 'Return', quantity: 10, reference: 'Supplier return — damaged', performedBy: 'Pharmacist T. Islam' },
]

export const MOCK_DISPENSING: DispensingRecord[] = [
  { id: 'DSP-001', prescriptionId: 'RX-1001', patientName: 'Rahim Uddin', doctorName: 'Dr. Ayesha Khan', medicine: 'Amlodipine 5 mg', prescribedQuantity: 30, dispensedQuantity: 30, status: 'Dispensed' },
  { id: 'DSP-002', prescriptionId: 'RX-1001', patientName: 'Rahim Uddin', doctorName: 'Dr. Ayesha Khan', medicine: 'Atorvastatin 20 mg', prescribedQuantity: 30, dispensedQuantity: 15, status: 'Partially Dispensed' },
  { id: 'DSP-003', prescriptionId: 'RX-1002', patientName: 'Fatima Begum', doctorName: 'Dr. Tanvir Ahmed', medicine: 'Paracetamol 500 mg', prescribedQuantity: 15, dispensedQuantity: 0, status: 'Pending' },
  { id: 'DSP-004', prescriptionId: 'RX-1005', patientName: 'Hasan Ali', doctorName: 'Dr. Farid Hasan', medicine: 'Azithromycin 500 mg', prescribedQuantity: 3, dispensedQuantity: 3, status: 'Dispensed' },
  { id: 'DSP-005', prescriptionId: 'RX-1007', patientName: 'Abdul Malek', doctorName: 'Dr. Nusrat Jahan', medicine: 'Losartan 50 mg', prescribedQuantity: 30, dispensedQuantity: 30, status: 'Dispensed' },
  { id: 'DSP-006', prescriptionId: 'RX-1006', patientName: 'Mina Chowdhury', doctorName: 'Dr. Tanvir Ahmed', medicine: 'Omeprazole 20 mg', prescribedQuantity: 21, dispensedQuantity: 0, status: 'Cancelled' },
  { id: 'DSP-007', prescriptionId: 'RX-1008', patientName: 'Nasrin Sultana', doctorName: 'Dr. Farid Hasan', medicine: 'ORS Sachet', prescribedQuantity: 6, dispensedQuantity: 0, status: 'Pending' },
]
