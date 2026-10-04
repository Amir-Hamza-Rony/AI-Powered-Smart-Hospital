import type {
  AppointmentReminder,
  AutomationEvent,
  HospitalNotification,
  LabCompletionAlert,
  PurchaseRequest,
  QueuePatient,
  StockAlert,
  WorkflowAutomation,
} from '@/data/types'

/* ------------------------------------------------------------------ */
/* Workflows                                                           */
/* ------------------------------------------------------------------ */

export const MOCK_WORKFLOWS: WorkflowAutomation[] = [
  {
    id: 'appointment-reminder',
    name: 'Appointment Reminder',
    description: 'Automatically reminds patients about upcoming appointments.',
    status: 'Active',
    enabled: true,
    lastExecution: '2026-10-01 07:00',
    nextExecution: '2026-10-02 07:00',
    eventCount: 128,
    href: '/automation/reminders',
  },
  {
    id: 'lab-alert',
    name: 'Lab Completion Alert',
    description: 'Notifies doctors and patients when laboratory reports become ready.',
    status: 'Active',
    enabled: true,
    lastExecution: '2026-10-01 08:20',
    nextExecution: 'Every 15 min',
    eventCount: 86,
    href: '/automation/lab-alerts',
  },
  {
    id: 'stock-alert',
    name: 'Pharmacy Stock Alert',
    description: 'Alerts pharmacy staff when medicine stock falls below the configured limit.',
    status: 'Active',
    enabled: true,
    lastExecution: '2026-10-01 06:00',
    nextExecution: '2026-10-02 06:00',
    eventCount: 34,
    href: '/automation/stock-alerts',
  },
  {
    id: 'queue',
    name: 'Waiting Room Queue',
    description: 'Displays live patient queue and current serial number.',
    status: 'Live',
    enabled: true,
    lastExecution: '2026-10-01 09:42',
    nextExecution: 'Real-time',
    eventCount: 57,
    href: '/automation/queue',
  },
]

/* ------------------------------------------------------------------ */
/* Appointment reminders (consistent with MOCK_APPOINTMENTS)           */
/* ------------------------------------------------------------------ */

export const MOCK_REMINDERS: AppointmentReminder[] = [
  {
    id: 'RMD-5001', appointmentId: 'APT-3001', patientId: 'PAT-2001', patientName: 'Rahim Uddin',
    doctorName: 'Dr. Sarah Rahman', specialty: 'Cardiology', date: '2026-09-30', time: '10:30 AM',
    status: 'Sent', noShowRisk: 'Low', channels: ['SMS', 'In-App'], lastReminder: '2026-09-29 18:00',
    messagePreview: 'Dear Rahim Uddin, reminder: Cardiology follow-up with Dr. Sarah Rahman on Sep 30, 10:30 AM. Reply YES to confirm.',
    history: [
      { at: '2026-09-29 18:00', channel: 'SMS', result: 'Sent' },
      { at: '2026-09-29 18:00', channel: 'In-App', result: 'Sent' },
    ],
  },
  {
    id: 'RMD-5002', appointmentId: 'APT-3002', patientId: 'PAT-2004', patientName: 'Fatema Begum',
    doctorName: 'Dr. Tanvir Ahmed', specialty: 'Orthopedics', date: '2026-09-30', time: '12:00 PM',
    status: 'Sent', noShowRisk: 'Medium', channels: ['SMS', 'Email'], lastReminder: '2026-09-29 18:05',
    messagePreview: 'Dear Fatema Begum, reminder: Orthopedics visit with Dr. Tanvir Ahmed on Sep 30, 12:00 PM. Wheelchair assistance confirmed.',
    history: [{ at: '2026-09-29 18:05', channel: 'SMS', result: 'Sent' }],
  },
  {
    id: 'RMD-5003', appointmentId: 'APT-3003', patientId: 'PAT-2006', patientName: 'Shirin Akter',
    doctorName: 'Dr. Farhana Islam', specialty: 'Gynecology', date: '2026-09-30', time: '09:00 AM',
    status: 'Sent', noShowRisk: 'Low', channels: ['SMS'], lastReminder: '2026-09-29 18:00',
    messagePreview: 'Dear Shirin Akter, reminder: ANC visit with Dr. Farhana Islam on Sep 30, 09:00 AM.',
    history: [{ at: '2026-09-29 18:00', channel: 'SMS', result: 'Sent' }],
  },
  {
    id: 'RMD-5004', appointmentId: 'APT-3004', patientId: 'PAT-2003', patientName: 'Hasan Mahmud',
    doctorName: 'Dr. Nusrat Jahan', specialty: 'Pediatrics', date: '2026-10-01', time: '05:00 PM',
    status: 'Scheduled', noShowRisk: 'Low', channels: ['SMS', 'Email', 'In-App'], lastReminder: '—',
    messagePreview: 'Dear guardian of Hasan Mahmud, reminder: Pediatrics follow-up with Dr. Nusrat Jahan on Oct 01, 05:00 PM.',
    history: [],
  },
  {
    id: 'RMD-5005', appointmentId: 'APT-3005', patientId: 'PAT-2009', patientName: 'Sakib Hasan',
    doctorName: 'Dr. Priya Saha', specialty: 'Ophthalmology', date: '2026-10-01', time: '11:00 AM',
    status: 'Pending', noShowRisk: 'Medium', channels: ['SMS', 'In-App'], lastReminder: '—',
    messagePreview: 'Dear Sakib Hasan, reminder: Ophthalmology visit with Dr. Priya Saha on Oct 01, 11:00 AM.',
    history: [],
  },
  {
    id: 'RMD-5006', appointmentId: 'APT-3006', patientId: 'PAT-2011', patientName: 'Fahim Rahman',
    doctorName: 'Dr. Tanvir Ahmed', specialty: 'Orthopedics', date: '2026-10-02', time: '10:00 AM',
    status: 'Scheduled', noShowRisk: 'Low', channels: ['SMS'], lastReminder: '—',
    messagePreview: 'Dear Fahim Rahman, reminder: Orthopedics review with Dr. Tanvir Ahmed on Oct 02, 10:00 AM. Bring ankle brace.',
    history: [],
  },
  {
    id: 'RMD-5007', appointmentId: 'APT-3007', patientId: 'PAT-2002', patientName: 'Ayesha Siddika',
    doctorName: 'Dr. Kamal Hossain', specialty: 'Neurology', date: '2026-10-03', time: '11:00 AM',
    status: 'Failed', noShowRisk: 'High', channels: ['SMS', 'Email'], lastReminder: '2026-09-30 09:00',
    messagePreview: 'Dear Ayesha Siddika, reminder: Neurology (online) with Dr. Kamal Hossain on Oct 03, 11:00 AM. Video link follows.',
    history: [{ at: '2026-09-30 09:00', channel: 'SMS', result: 'Failed' }],
  },
  {
    id: 'RMD-5008', appointmentId: 'APT-3010', patientId: 'PAT-2005', patientName: 'Imran Khan',
    doctorName: 'Dr. Mahmudul Karim', specialty: 'General Medicine', date: '2026-09-20', time: '09:00 AM',
    status: 'Cancelled', noShowRisk: 'Low', channels: ['SMS'], lastReminder: '2026-09-19 18:00',
    messagePreview: 'Reminder cancelled — appointment APT-3010 was cancelled by the patient.',
    history: [{ at: '2026-09-19 18:00', channel: 'SMS', result: 'Sent' }],
  },
  {
    id: 'RMD-5009', appointmentId: 'APT-3011', patientId: 'PAT-2012', patientName: 'Nabila Khan',
    doctorName: 'Dr. Mahmudul Karim', specialty: 'General Medicine', date: '2026-10-05', time: '08:00 AM',
    status: 'Scheduled', noShowRisk: 'Medium', channels: ['SMS', 'In-App'], lastReminder: '—',
    messagePreview: 'Dear Nabila Khan, reminder: General Medicine visit with Dr. Mahmudul Karim on Oct 05, 08:00 AM.',
    history: [],
  },
  {
    id: 'RMD-5010', appointmentId: 'APT-3014', patientId: 'PAT-2011', patientName: 'Fahim Rahman',
    doctorName: 'Dr. Tanvir Ahmed', specialty: 'Orthopedics', date: '2026-10-09', time: '12:00 PM',
    status: 'Pending', noShowRisk: 'Low', channels: ['SMS'], lastReminder: '—',
    messagePreview: 'Dear Fahim Rahman, reminder: Physiotherapy review with Dr. Tanvir Ahmed on Oct 09, 12:00 PM.',
    history: [],
  },
]

/* ------------------------------------------------------------------ */
/* Lab completion alerts (consistent with LAB-2001…LAB-2007)           */
/* ------------------------------------------------------------------ */

export const MOCK_LAB_ALERTS: LabCompletionAlert[] = [
  {
    id: 'LBA-6001', labOrderId: 'LAB-2001', patientName: 'Rahim Uddin', test: 'Lipid Profile',
    orderedBy: 'Dr. Ayesha Khan', status: 'Processing', completedAt: '—',
    doctorNotification: 'Pending', patientNotification: 'Pending', resultStatus: 'Pending',
    recipients: ['Dr. Ayesha Khan', 'Rahim Uddin'], channels: ['In-App', 'SMS'],
    history: ['2026-10-01 08:02 — Sample received at lab'],
  },
  {
    id: 'LBA-6002', labOrderId: 'LAB-2002', patientName: 'Fatima Begum', test: 'CBC',
    orderedBy: 'Dr. Tanvir Ahmed', status: 'Ready', completedAt: '2026-10-01 08:20',
    doctorNotification: 'Pending', patientNotification: 'Pending', resultStatus: 'Normal',
    recipients: ['Dr. Tanvir Ahmed', 'Fatima Begum'], channels: ['In-App', 'SMS'],
    history: ['2026-10-01 08:20 — Report marked ready by lab'],
  },
  {
    id: 'LBA-6003', labOrderId: 'LAB-2003', patientName: 'Karim Sheikh', test: 'HbA1c',
    orderedBy: 'Dr. Nusrat Jahan', status: 'Reviewed', completedAt: '2026-09-30 16:40',
    doctorNotification: 'Sent', patientNotification: 'Sent', resultStatus: 'Abnormal',
    recipients: ['Dr. Nusrat Jahan', 'Karim Sheikh'], channels: ['In-App', 'SMS'],
    history: [
      '2026-09-30 16:40 — Report marked ready by lab',
      '2026-09-30 16:45 — Doctor notified (In-App)',
      '2026-09-30 16:46 — Patient notified (SMS)',
      '2026-09-30 18:10 — Reviewed by Dr. Nusrat Jahan',
    ],
  },
  {
    id: 'LBA-6004', labOrderId: 'LAB-2004', patientName: 'Hasan Ali', test: 'Chest X-ray',
    orderedBy: 'Dr. Farid Hasan', status: 'Processing', completedAt: '—',
    doctorNotification: 'Pending', patientNotification: 'Pending', resultStatus: 'Pending',
    recipients: ['Dr. Farid Hasan', 'Hasan Ali'], channels: ['In-App', 'SMS'],
    history: ['2026-10-01 07:55 — Imaging queued'],
  },
  {
    id: 'LBA-6005', labOrderId: 'LAB-2005', patientName: 'Abdul Malek', test: 'ECG',
    orderedBy: 'Dr. Nusrat Jahan', status: 'Notification Sent', completedAt: '2026-10-01 07:30',
    doctorNotification: 'Sent', patientNotification: 'Sent', resultStatus: 'Normal',
    recipients: ['Dr. Nusrat Jahan', 'Abdul Malek'], channels: ['In-App', 'SMS'],
    history: [
      '2026-10-01 07:30 — Report marked ready by lab',
      '2026-10-01 07:32 — Doctor notified (In-App)',
      '2026-10-01 07:33 — Patient notified (SMS)',
    ],
  },
  {
    id: 'LBA-6006', labOrderId: 'LAB-2006', patientName: 'Rina Das', test: 'TSH',
    orderedBy: 'Dr. Ayesha Khan', status: 'Ready', completedAt: '2026-10-01 08:05',
    doctorNotification: 'Pending', patientNotification: 'Pending', resultStatus: 'Normal',
    recipients: ['Dr. Ayesha Khan', 'Rina Das'], channels: ['In-App', 'Email'],
    history: ['2026-10-01 08:05 — Report marked ready by lab'],
  },
  {
    id: 'LBA-6007', labOrderId: 'LAB-2007', patientName: 'Nasrin Sultana', test: 'Urine R/E',
    orderedBy: 'Dr. Farid Hasan', status: 'Processing', completedAt: '—',
    doctorNotification: 'Pending', patientNotification: 'Pending', resultStatus: 'Pending',
    recipients: ['Dr. Farid Hasan', 'Nasrin Sultana'], channels: ['In-App', 'SMS'],
    history: ['2026-10-01 08:10 — Sample received at lab'],
  },
]

/* ------------------------------------------------------------------ */
/* Pharmacy stock alerts (consistent with INV-001…INV-010)             */
/* ------------------------------------------------------------------ */

export const MOCK_STOCK_ALERTS: StockAlert[] = [
  { id: 'STA-7001', medicine: 'Salbutamol Inhaler', sku: 'INV-005', currentStock: 0, minimumLevel: 40, status: 'Critical', expiryDate: '2027-03-31', supplier: 'MediServe Distributors', lastUpdated: '2026-10-01 07:12', resolved: false },
  { id: 'STA-7002', medicine: 'Ciprofloxacin 500', sku: 'INV-008', currentStock: 0, minimumLevel: 200, status: 'Critical', expiryDate: '2026-09-15', supplier: 'PharmaLink Ltd', lastUpdated: '2026-10-01 07:12', resolved: false },
  { id: 'STA-7003', medicine: 'Azithromycin 500', sku: 'INV-003', currentStock: 120, minimumLevel: 300, status: 'Low', expiryDate: '2027-01-20', supplier: 'PharmaLink Ltd', lastUpdated: '2026-09-30 17:40', resolved: false },
  { id: 'STA-7004', medicine: 'Amoxicillin 500', sku: 'INV-002', currentStock: 340, minimumLevel: 400, status: 'Low', expiryDate: '2026-12-15', supplier: 'PharmaLink Ltd', lastUpdated: '2026-09-30 17:40', resolved: false },
  { id: 'STA-7005', medicine: 'Losartan 50', sku: 'INV-007', currentStock: 180, minimumLevel: 250, status: 'Near Expiry', expiryDate: '2026-10-28', supplier: 'MediServe Distributors', lastUpdated: '2026-09-30 09:15', resolved: false },
  { id: 'STA-7006', medicine: 'Insulin Glargine', sku: 'INV-004', currentStock: 85, minimumLevel: 50, status: 'Near Expiry', expiryDate: '2026-11-10', supplier: 'ColdChain Supplies', lastUpdated: '2026-09-30 09:15', resolved: false },
  { id: 'STA-7007', medicine: 'Cetirizine 10', sku: 'INV-010', currentStock: 290, minimumLevel: 300, status: 'Low', expiryDate: '2027-02-28', supplier: 'PharmaLink Ltd', lastUpdated: '2026-09-29 14:22', resolved: false },
  { id: 'STA-7008', medicine: 'Paracetamol 500', sku: 'INV-001', currentStock: 5200, minimumLevel: 500, status: 'Normal', expiryDate: '2027-06-30', supplier: 'MediServe Distributors', lastUpdated: '2026-09-28 11:05', resolved: true },
]

export const MOCK_PURCHASE_REQUESTS: PurchaseRequest[] = [
  { id: 'PR-8001', medicine: 'Salbutamol Inhaler', sku: 'INV-005', currentStock: 0, requiredQuantity: 200, supplier: 'MediServe Distributors', priority: 'High', notes: 'Zero stock — OPD demand high.', createdAt: '2026-10-01 07:30', status: 'Requested' },
  { id: 'PR-8002', medicine: 'Ciprofloxacin 500', sku: 'INV-008', currentStock: 0, requiredQuantity: 500, supplier: 'PharmaLink Ltd', priority: 'High', notes: 'Expired batch quarantined; fresh stock needed.', createdAt: '2026-10-01 07:45', status: 'Requested' },
]

/* ------------------------------------------------------------------ */
/* Waiting room live queue                                            */
/* ------------------------------------------------------------------ */

export const MOCK_QUEUE: QueuePatient[] = [
  { serial: 'A-021', patientName: 'Jamal Hossain', patientId: 'PAT-2013', doctorName: 'Dr. Mahmudul Karim', department: 'General Medicine', status: 'Completed', arrivalTime: '08:05 AM', waitingMinutes: 0, priority: 'Normal' },
  { serial: 'A-022', patientName: 'Shirin Akter', patientId: 'PAT-2006', doctorName: 'Dr. Farhana Islam', department: 'Gynecology', status: 'Completed', arrivalTime: '08:20 AM', waitingMinutes: 0, priority: 'Normal' },
  { serial: 'A-023', patientName: 'Rahim Uddin', patientId: 'PAT-2001', doctorName: 'Dr. Sarah Rahman', department: 'Cardiology', status: 'In Consultation', arrivalTime: '08:35 AM', waitingMinutes: 12, priority: 'Priority' },
  { serial: 'A-024', patientName: 'Fatema Begum', patientId: 'PAT-2004', doctorName: 'Dr. Tanvir Ahmed', department: 'Orthopedics', status: 'Called', arrivalTime: '08:50 AM', waitingMinutes: 25, priority: 'Normal' },
  { serial: 'A-025', patientName: 'Hasan Mahmud', patientId: 'PAT-2003', doctorName: 'Dr. Nusrat Jahan', department: 'Pediatrics', status: 'Waiting', arrivalTime: '09:05 AM', waitingMinutes: 37, priority: 'Normal' },
  { serial: 'A-026', patientName: 'Ayesha Siddika', patientId: 'PAT-2002', doctorName: 'Dr. Kamal Hossain', department: 'Neurology', status: 'Waiting', arrivalTime: '09:12 AM', waitingMinutes: 30, priority: 'Normal' },
  { serial: 'A-027', patientName: 'Karim Sheikh', patientId: 'PAT-2007', doctorName: 'Dr. Nusrat Jahan', department: 'Endocrinology', status: 'Waiting', arrivalTime: '09:20 AM', waitingMinutes: 22, priority: 'Emergency' },
  { serial: 'A-028', patientName: 'Nabila Khan', patientId: 'PAT-2012', doctorName: 'Dr. Mahmudul Karim', department: 'General Medicine', status: 'Waiting', arrivalTime: '09:28 AM', waitingMinutes: 14, priority: 'Normal' },
]

/* ------------------------------------------------------------------ */
/* Automation events                                                  */
/* ------------------------------------------------------------------ */

export const MOCK_AUTOMATION_EVENTS: AutomationEvent[] = [
  { id: 'EVT-9001', workflow: 'Appointment Reminders', eventType: 'Appointment reminder sent', description: 'SMS + In-App reminder sent to Rahim Uddin for APT-3001.', triggeredAt: '2026-09-29 18:00', status: 'Success', triggeredBy: 'Scheduler' },
  { id: 'EVT-9002', workflow: 'Appointment Reminders', eventType: 'Appointment reminder sent', description: 'SMS reminder sent to Fatema Begum for APT-3002.', triggeredAt: '2026-09-29 18:05', status: 'Success', triggeredBy: 'Scheduler' },
  { id: 'EVT-9003', workflow: 'Lab Alerts', eventType: 'Lab report completed', description: 'HbA1c report (LAB-2003) marked ready by lab.', triggeredAt: '2026-09-30 16:40', status: 'Success', triggeredBy: 'Lab Technician' },
  { id: 'EVT-9004', workflow: 'Lab Alerts', eventType: 'Doctor notification sent', description: 'Dr. Nusrat Jahan notified about LAB-2003 (In-App).', triggeredAt: '2026-09-30 16:45', status: 'Success', triggeredBy: 'Automation' },
  { id: 'EVT-9005', workflow: 'Lab Alerts', eventType: 'Patient notification sent', description: 'Karim Sheikh notified about LAB-2003 (SMS).', triggeredAt: '2026-09-30 16:46', status: 'Success', triggeredBy: 'Automation' },
  { id: 'EVT-9006', workflow: 'Appointment Reminders', eventType: 'Appointment reminder sent', description: 'SMS reminder to Ayesha Siddika for APT-3007 failed (gateway timeout).', triggeredAt: '2026-09-30 09:00', status: 'Failed', triggeredBy: 'Scheduler' },
  { id: 'EVT-9007', workflow: 'Stock Alerts', eventType: 'Medicine stock threshold reached', description: 'Salbutamol Inhaler (INV-005) hit zero stock.', triggeredAt: '2026-10-01 07:12', status: 'Warning', triggeredBy: 'Inventory Monitor' },
  { id: 'EVT-9008', workflow: 'Stock Alerts', eventType: 'Purchase request created', description: 'PR-8001 created for Salbutamol Inhaler × 200.', triggeredAt: '2026-10-01 07:30', status: 'Success', triggeredBy: 'Pharmacist A. Rahman' },
  { id: 'EVT-9009', workflow: 'Waiting Queue', eventType: 'Patient called', description: 'Serial A-024 (Fatema Begum) called to Orthopedics Room 3.', triggeredAt: '2026-10-01 09:35', status: 'Success', triggeredBy: 'Receptionist N. Akter' },
  { id: 'EVT-9010', workflow: 'Waiting Queue', eventType: 'Queue updated', description: 'Serial A-023 moved to In Consultation (Cardiology).', triggeredAt: '2026-10-01 09:30', status: 'Success', triggeredBy: 'Receptionist N. Akter' },
  { id: 'EVT-9011', workflow: 'Lab Alerts', eventType: 'Lab report completed', description: 'ECG report (LAB-2005) marked ready by lab.', triggeredAt: '2026-10-01 07:30', status: 'Success', triggeredBy: 'Lab Technician' },
  { id: 'EVT-9012', workflow: 'Appointment Reminders', eventType: 'Appointment reminder sent', description: 'Reminder batch for Oct 01 appointments queued (3 pending).', triggeredAt: '2026-10-01 06:00', status: 'Pending', triggeredBy: 'Scheduler' },
]

/* ------------------------------------------------------------------ */
/* Notifications                                                      */
/* ------------------------------------------------------------------ */

export const MOCK_NOTIFICATIONS: HospitalNotification[] = [
  { id: 'NTF-1001', category: 'Appointments', title: 'Appointment Reminder Sent', description: 'SMS + In-App reminder sent to Rahim Uddin for APT-3001 (Sep 30, 10:30 AM).', time: '2026-09-29 18:00', read: true, module: 'Appointment Reminders', href: '/automation/reminders' },
  { id: 'NTF-1002', category: 'Appointments', title: 'Reminder Failed', description: 'SMS to Ayesha Siddika for APT-3007 failed — retry from the reminders page.', time: '2026-09-30 09:00', read: false, module: 'Appointment Reminders', href: '/automation/reminders' },
  { id: 'NTF-1003', category: 'Laboratory', title: 'Lab Report Ready', description: 'CBC report (LAB-2002) for Fatima Begum is ready for review.', time: '2026-10-01 08:20', read: false, module: 'Lab Alerts', href: '/automation/lab-alerts' },
  { id: 'NTF-1004', category: 'Laboratory', title: 'Lab Report Ready', description: 'TSH report (LAB-2006) for Rina Das is ready for review.', time: '2026-10-01 08:05', read: false, module: 'Lab Alerts', href: '/automation/lab-alerts' },
  { id: 'NTF-1005', category: 'Laboratory', title: 'Doctor Notified', description: 'Dr. Nusrat Jahan was notified about the HbA1c report (LAB-2003).', time: '2026-09-30 16:45', read: true, module: 'Lab Alerts', href: '/automation/lab-alerts' },
  { id: 'NTF-1006', category: 'Pharmacy', title: 'Critical Stock Alert', description: 'Salbutamol Inhaler (INV-005) is out of stock (0 units).', time: '2026-10-01 07:12', read: false, module: 'Stock Alerts', href: '/automation/stock-alerts' },
  { id: 'NTF-1007', category: 'Pharmacy', title: 'Critical Stock Alert', description: 'Ciprofloxacin 500 (INV-008) is out of stock and past expiry.', time: '2026-10-01 07:12', read: false, module: 'Stock Alerts', href: '/automation/stock-alerts' },
  { id: 'NTF-1008', category: 'Pharmacy', title: 'New Purchase Request Created', description: 'PR-8001 raised for Salbutamol Inhaler × 200 units.', time: '2026-10-01 07:30', read: true, module: 'Stock Alerts', href: '/automation/stock-alerts' },
  { id: 'NTF-1009', category: 'Queue', title: 'Patient Called', description: 'Serial A-024 (Fatema Begum) called to Orthopedics Room 3.', time: '2026-10-01 09:35', read: false, module: 'Waiting Queue', href: '/automation/queue' },
  { id: 'NTF-1010', category: 'Queue', title: 'Queue Updated', description: 'Serial A-023 moved to In Consultation (Cardiology).', time: '2026-10-01 09:30', read: true, module: 'Waiting Queue', href: '/automation/queue' },
  { id: 'NTF-1011', category: 'System', title: 'Nightly Scheduler Completed', description: 'Reminder batch for Oct 01 appointments queued (3 pending).', time: '2026-10-01 06:00', read: true, module: 'Automation', href: '/automation/activity' },
  { id: 'NTF-1012', category: 'System', title: 'Workflow Paused', description: 'No workflows are paused. All 4 automation workflows are healthy.', time: '2026-09-30 22:00', read: true, module: 'Automation', href: '/automation' },
]
