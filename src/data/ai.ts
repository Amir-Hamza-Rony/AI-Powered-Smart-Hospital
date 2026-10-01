import type {
  AIActivityLog,
  AIAdvisoryFinding,
  AIAdvisorySeverity,
  AINoShowPrediction,
  AIPrescriptionAdvisory,
  AIProposedMedicine,
  AISymptomEntry,
  AITriageResult,
  AIVitals,
  Patient,
} from '@/data/types'

/* ------------------------------------------------------------------ */
/* Symptom catalog                                                     */
/* ------------------------------------------------------------------ */

export const AI_SYMPTOM_CATALOG: { name: string; category: string }[] = [
  { name: 'Fever', category: 'General' },
  { name: 'Headache', category: 'Neurological' },
  { name: 'Chest pain', category: 'Cardiac' },
  { name: 'Cough', category: 'Respiratory' },
  { name: 'Shortness of breath', category: 'Respiratory' },
  { name: 'Abdominal pain', category: 'Gastrointestinal' },
  { name: 'Nausea / vomiting', category: 'Gastrointestinal' },
  { name: 'Dizziness', category: 'Neurological' },
  { name: 'Sore throat', category: 'Respiratory' },
  { name: 'Joint pain', category: 'Musculoskeletal' },
  { name: 'Skin rash', category: 'Dermatological' },
  { name: 'Fatigue', category: 'General' },
  { name: 'Palpitations', category: 'Cardiac' },
  { name: 'Wheezing', category: 'Respiratory' },
  { name: 'Back pain', category: 'Musculoskeletal' },
  { name: 'Diarrhea', category: 'Gastrointestinal' },
]

export const AI_TRIAGE_DEPARTMENTS = [
  'Emergency',
  'General Medicine',
  'Cardiology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Dermatology',
  'Pulmonology',
] as const

/**
 * Deterministic mock triage engine — simulates an AI result for the
 * frontend prototype. NOT a medical device. Never treat output as diagnosis.
 */
export function analyzeSymptomsMock(symptoms: AISymptomEntry[], vitals: AIVitals): AITriageResult {
  const names = symptoms.map((s) => s.name.toLowerCase())
  const has = (...keys: string[]) => keys.some((k) => names.some((n) => n.includes(k)))
  const severeCount = symptoms.filter((s) => s.severity === 'Severe').length
  const spo2 = Number.parseInt(vitals.oxygenSaturation, 10)
  const hr = Number.parseInt(vitals.heartRate, 10)
  const lowSpo2 = Number.isFinite(spo2) && spo2 < 94
  const tachy = Number.isFinite(hr) && hr > 110

  if ((has('chest pain') && (has('shortness of breath') || has('palpitations'))) || lowSpo2 || (has('chest pain') && severeCount >= 1)) {
    return {
      level: 'Emergency',
      department: 'Emergency',
      considerations: [
        'Possible cardiac or acute respiratory consideration flagged from reported chest symptoms.',
        'Low oxygen saturation or severe chest discomfort reported — treat as time-sensitive until examined.',
      ],
      riskIndicators: [
        'Severe chest-region symptom reported',
        lowSpo2 ? `SpO₂ ${vitals.oxygenSaturation}% below 94% threshold` : 'Co-occurring cardiac-type symptoms',
        tachy ? `Elevated heart rate (${vitals.heartRate} bpm)` : 'Multiple concurrent symptoms',
      ],
      nextAction: 'Escort the patient to Emergency immediately and alert the on-duty physician. Do not leave the patient unattended.',
      confidence: 92,
    }
  }

  if (has('shortness of breath') || has('wheezing') || has('palpitations') || severeCount >= 2 || tachy) {
    const cardiac = has('palpitations')
    return {
      level: 'Urgent',
      department: cardiac ? 'Cardiology' : 'Pulmonology',
      considerations: [
        'Respiratory or cardiac-pattern symptoms suggest same-day clinical evaluation.',
        'Review history of asthma, COPD, hypertension or ischemic heart disease before the visit.',
      ],
      riskIndicators: [
        severeCount >= 2 ? 'Two or more severe-grade symptoms' : 'Respiratory-pattern symptom reported',
        tachy ? `Elevated heart rate (${vitals.heartRate} bpm)` : 'Symptom duration exceeds 48 hours',
      ],
      nextAction: 'Book a same-day appointment and send high-priority reminders. Reassess if symptoms worsen.',
      confidence: 84,
    }
  }

  if (has('fever') || has('abdominal pain') || has('dizziness') || has('headache') || symptoms.length >= 3) {
    const neuro = has('headache') || has('dizziness')
    return {
      level: 'Moderate',
      department: neuro ? 'Neurology' : 'General Medicine',
      considerations: [
        'Pattern is consistent with a routine outpatient workup — infection, migraine or GI causes to be differentiated in person.',
        'Check temperature trend, hydration status and recent medication adherence at the visit.',
      ],
      riskIndicators: [
        has('fever') && vitals.temperature ? `Recorded temperature ${vitals.temperature}°F` : 'Multiple mild-to-moderate symptoms',
        'No red-flag vital readings in the submitted values',
      ],
      nextAction: 'Schedule a routine appointment within 2–3 days and share home-care guidance in the meantime.',
      confidence: 78,
    }
  }

  return {
    level: 'Low',
    department: 'General Medicine',
    considerations: [
      'Mild, isolated symptoms that commonly resolve with rest, fluids and observation.',
      'No concerning vital readings or high-risk combinations detected in the submitted information.',
    ],
    riskIndicators: ['Single mild symptom', 'Vitals within the submitted normal range'],
    nextAction: 'Advise home observation for 48 hours; book a routine visit if symptoms persist or new symptoms appear.',
    confidence: 71,
  }
}

/* ------------------------------------------------------------------ */
/* Clinical assistant (mock Q&A over the selected patient record)       */
/* ------------------------------------------------------------------ */

export const AI_SUGGESTED_QUESTIONS = [
  "Summarize the patient's last 3 visits.",
  'What are the recent abnormal lab results?',
  "Show the patient's active medications.",
  'What conditions should the doctor review?',
]

function patientName(p: Patient): string {
  return `${p.firstName} ${p.lastName}`
}

export function getClinicalSummaryMock(p: Patient): string {
  const visits = p.history.slice(0, 3)
  const visitText =
    visits.length > 0
      ? visits.map((v, i) => `${i + 1}. ${v.date} — ${v.visitType} with ${v.doctor}: ${v.diagnosis}. Treatment: ${v.treatment}.`).join('\n')
      : 'No recorded visits in the mock record.'
  const abnormal = p.labReports.filter((l) => l.status === 'Abnormal')
  const labText =
    abnormal.length > 0
      ? abnormal.map((l) => `${l.test} on ${l.date}: ${l.result} (flagged ${l.status})`).join('; ')
      : 'No abnormal lab results on file.'
  const meds = p.currentMedications.length > 0 ? p.currentMedications.join('; ') : 'No active medications recorded.'
  return [
    `${patientName(p)}, ${p.age}y ${p.gender}, blood group ${p.bloodGroup}. Status: ${p.status}.`,
    `Chronic conditions: ${p.chronicConditions.length > 0 ? p.chronicConditions.join(', ') : 'none recorded'}. Allergies: ${p.allergies.length > 0 ? p.allergies.join(', ') : 'none recorded'}.`,
    `Recent visits:\n${visitText}`,
    `Abnormal labs: ${labText}.`,
    `Active medications: ${meds}.`,
  ].join('\n\n')
}

export function answerClinicalQuestionMock(p: Patient, question: string): string {
  const q = question.toLowerCase()
  const name = patientName(p)

  if (q.includes('visit') || q.includes('summar')) {
    const visits = p.history.slice(0, 3)
    if (visits.length === 0) return `${name} has no recorded visits in the mock record. Consider a baseline workup at the next appointment.`
    return [
      `Last ${visits.length} visit(s) for ${name}:`,
      ...visits.map((v, i) => `${i + 1}. ${v.date} — ${v.visitType} with ${v.doctor}. Diagnosis: ${v.diagnosis}. Treatment: ${v.treatment}. Notes: ${v.notes}`),
      'Verify against the full visit history before making clinical decisions.',
    ].join('\n')
  }

  if (q.includes('lab') || q.includes('abnormal') || q.includes('test') || q.includes('result')) {
    const abnormal = p.labReports.filter((l) => l.status === 'Abnormal')
    if (abnormal.length === 0) return `${name} has no abnormal lab results on file. Most recent reports are within recorded limits — confirm in the Laboratory module.`
    return [
      `Abnormal lab indicators for ${name}:`,
      ...abnormal.map((l) => `• ${l.test} (${l.date}, ordered by ${l.doctor}): ${l.result} — flagged ${l.status}.`),
      'Correlate with symptoms and repeat testing as clinically indicated.',
    ].join('\n')
  }

  if (q.includes('medication') || q.includes('medicine') || q.includes('drug') || q.includes('active')) {
    if (p.currentMedications.length === 0) return `${name} has no active medications recorded. Reconcile the medication list with the patient at the next visit.`
    return [
      `Active medications for ${name}:`,
      ...p.currentMedications.map((m, i) => `${i + 1}. ${m}`),
      `Known allergies: ${p.allergies.length > 0 ? p.allergies.join(', ') : 'none recorded'} — cross-check before adding new agents.`,
    ].join('\n')
  }

  if (q.includes('condition') || q.includes('review') || q.includes('risk') || q.includes('diagnos')) {
    const chronic = p.chronicConditions.length > 0 ? p.chronicConditions.join(', ') : 'no chronic conditions on file'
    return [
      `Suggested review list for ${name} (decision support only):`,
      `• Chronic conditions on file: ${chronic}.`,
      `• Allergies: ${p.allergies.length > 0 ? p.allergies.join(', ') : 'none recorded'}.`,
      `• Last visit: ${p.lastVisit} (${p.totalVisits} total visits, ${p.upcomingAppointments} upcoming).`,
      p.familyHistory ? `• Family history: ${p.familyHistory}` : '• No family history recorded.',
      'Prioritize uncontrolled chronic disease markers and outstanding follow-ups; confirm with the live record.',
    ].join('\n')
  }

  if (q.includes('allerg')) {
    return p.allergies.length > 0
      ? `${name} has recorded allergies: ${p.allergies.join(', ')}. Verify reaction history before prescribing.`
      : `${name} has no allergies recorded. Confirm verbally with the patient before prescribing.`
  }

  if (q.includes('vital') || q.includes('bp') || q.includes('blood pressure')) {
    return `${name}: last visit ${p.lastVisit}. Vitals are captured at check-in and shown on the patient detail page — review the latest BP, pulse and SpO₂ there before deciding.`
  }

  return [
    `Mock insight for ${name}: ${p.age}y ${p.gender}, status ${p.status}; ${p.totalVisits} total visits, last seen ${p.lastVisit}.`,
    `Chronic: ${p.chronicConditions.length > 0 ? p.chronicConditions.join(', ') : 'none'}; allergies: ${p.allergies.length > 0 ? p.allergies.join(', ') : 'none'}.`,
    'Try a suggested question such as visit summary, abnormal labs, active medications, or conditions to review.',
  ].join('\n')
}

/* ------------------------------------------------------------------ */
/* Prescription advisory (mock rules)                                  */
/* ------------------------------------------------------------------ */

const AI_INTERACTION_PAIRS: { a: string; b: string; message: string }[] = [
  { a: 'amlodipine', b: 'atorvastatin', message: 'Amlodipine + Atorvastatin: generally co-prescribed; monitor for muscle symptoms at higher statin doses.' },
  { a: 'losartan', b: 'spironolactone', message: 'Losartan + potassium-sparing agents: hyperkalemia consideration — check potassium and renal function.' },
  { a: 'warfarin', b: 'aspirin', message: 'Warfarin + Aspirin: bleeding-risk combination — confirm indication and INR monitoring plan.' },
  { a: 'metformin', b: 'contrast', message: 'Metformin + iodinated contrast procedures: standard hold/review protocol applies around imaging.' },
  { a: 'salbutamol', b: 'propranolol', message: 'Salbutamol + non-selective beta-blockers: opposing airway effects — prefer cardioselective alternatives.' },
]

export function analyzePrescriptionMock(
  patient: Patient,
  diagnosis: string,
  currentMeds: string[],
  proposed: AIProposedMedicine[],
): AIPrescriptionAdvisory {
  const findings: AIAdvisoryFinding[] = []
  const norm = (s: string) => s.toLowerCase().trim()
  const proposedNames = proposed.map((m) => norm(m.medicine)).filter(Boolean)

  // Duplicate therapy check
  const seen = new Set<string>()
  proposedNames.forEach((n) => {
    const key = n.split(' ')[0]
    if (seen.has(key)) {
      findings.push({
        category: 'Duplicate medication',
        severity: 'High Attention',
        message: `Possible duplicate therapy detected for "${n}". Confirm whether two entries refer to the same agent before signing.`,
      })
    }
    seen.add(key)
  })

  // Overlap with current medications
  proposedNames.forEach((n) => {
    if (currentMeds.some((c) => norm(c).includes(n.split(' ')[0]) && n.length > 3)) {
      findings.push({
        category: 'Duplicate medication',
        severity: 'Caution',
        message: `"${n}" appears to overlap with a current medication. Verify continuation vs. replacement intent.`,
      })
    }
  })

  // Interaction pairs
  AI_INTERACTION_PAIRS.forEach(({ a, b, message }) => {
    const all = [...proposedNames, ...currentMeds.map(norm)]
    if (all.some((m) => m.includes(a)) && all.some((m) => m.includes(b))) {
      findings.push({ category: 'Potential interaction', severity: 'High Attention', message })
    }
  })

  // Allergy cross-check
  patient.allergies.forEach((allergy) => {
    const key = norm(allergy).split(' ')[0]
    if (key.length > 3 && proposedNames.some((n) => n.includes(key))) {
      findings.push({
        category: 'Allergy warning',
        severity: 'High Attention',
        message: `Proposed agent may relate to recorded allergy "${allergy}". Confirm reaction history before prescribing.`,
      })
    }
  })

  // Dose / frequency / duration heuristics
  proposed.forEach((m) => {
    if (!m.dose.trim()) {
      findings.push({ category: 'Dose review', severity: 'Caution', message: `"${m.medicine || 'Unnamed item'}": dose is missing. Specify strength and amount per administration.` })
    }
    if (!m.frequency.trim()) {
      findings.push({ category: 'Frequency review', severity: 'Caution', message: `"${m.medicine || 'Unnamed item'}": frequency is missing. Specify administrations per day.` })
    }
    if (!m.duration.trim()) {
      findings.push({ category: 'Duration review', severity: 'Informational', message: `"${m.medicine || 'Unnamed item'}": duration is missing. Bound the course length for review.` })
    }
  })

  if (diagnosis.trim().length < 3) {
    findings.push({
      category: 'Dose review',
      severity: 'Informational',
      message: 'Clinical indication is brief. A clear diagnosis helps validate dose, duration and formulary choice.',
    })
  }

  if (findings.length === 0) {
    findings.push({
      category: 'Medication review',
      severity: 'Informational',
      message: 'No duplicates, interactions or allergy overlaps flagged in this mock review. Physician sign-off is still required.',
    })
  }

  const overall: AIAdvisorySeverity = findings.some((f) => f.severity === 'High Attention')
    ? 'High Attention'
    : findings.some((f) => f.severity === 'Caution')
      ? 'Caution'
      : 'Informational'

  return {
    findings,
    overallSeverity: overall,
    summary: `${findings.length} advisory point(s) for ${patient.firstName} ${patient.lastName} — overall: ${overall}. Decision support only; physician review required.`,
    generatedAt: new Date().toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/* No-show predictions (mock scores for existing appointments)         */
/* ------------------------------------------------------------------ */

export const MOCK_NOSHOW_PREDICTIONS: AINoShowPrediction[] = [
  { appointmentId: 'APT-3004', patientId: 'PAT-2003', patientName: 'Hasan Mahmud', doctorName: 'Dr. Nusrat Jahan', specialty: 'Pediatrics', date: '2026-10-01', time: '05:00 PM', previousAttendance: '3/4 kept', riskLevel: 'Low', riskScore: 18, reminderPriority: 'Low', factors: ['Good attendance pattern (3 of last 4 kept)', 'Short lead time (booked 13 days ago)', 'Follow-up visit with established doctor'] },
  { appointmentId: 'APT-3005', patientId: 'PAT-2009', patientName: 'Sakib Hasan', doctorName: 'Dr. Priya Saha', specialty: 'Ophthalmology', date: '2026-10-01', time: '11:00 AM', previousAttendance: '2/4 kept', riskLevel: 'Medium', riskScore: 54, reminderPriority: 'Normal', factors: ['Two missed appointments in history', 'Online booking with no advance confirmation', 'Midday slot with moderate load'] },
  { appointmentId: 'APT-3006', patientId: 'PAT-2011', patientName: 'Fahim Rahman', doctorName: 'Dr. Tanvir Ahmed', specialty: 'Orthopedics', date: '2026-10-02', time: '10:00 AM', previousAttendance: '4/4 kept', riskLevel: 'Low', riskScore: 12, reminderPriority: 'Low', factors: ['Perfect recent attendance', 'Post-emergency follow-up (high intent)', 'Morning slot close to residence indicator'] },
  { appointmentId: 'APT-3007', patientId: 'PAT-2002', patientName: 'Ayesha Siddika', doctorName: 'Dr. Kamal Hossain', specialty: 'Neurology', date: '2026-10-03', time: '11:00 AM', previousAttendance: '1/3 kept', riskLevel: 'High', riskScore: 82, reminderPriority: 'High', factors: ['Two previously missed appointments', 'Long lead time (booked 6+ days out)', 'Online visit — historically lower show rate'] },
  { appointmentId: 'APT-3011', patientId: 'PAT-2012', patientName: 'Nabila Khan', doctorName: 'Dr. Mahmudul Karim', specialty: 'General Medicine', date: '2026-10-05', time: '08:00 AM', previousAttendance: 'New patient', riskLevel: 'Medium', riskScore: 47, reminderPriority: 'Normal', factors: ['New patient — no attendance history', 'Early-morning slot', 'Baseline screening (routine intent)'] },
  { appointmentId: 'APT-3014', patientId: 'PAT-2011', patientName: 'Fahim Rahman', doctorName: 'Dr. Tanvir Ahmed', specialty: 'Orthopedics', date: '2026-10-09', time: '12:00 PM', previousAttendance: '4/4 kept', riskLevel: 'Low', riskScore: 22, reminderPriority: 'Low', factors: ['Strong attendance pattern', 'Established care episode', 'Reminder already confirmed by SMS indicator'] },
  { appointmentId: 'APT-3013', patientId: 'PAT-2001', patientName: 'Rahim Uddin', doctorName: 'Dr. Sarah Rahman', specialty: 'Cardiology', date: '2026-11-10', time: '04:00 PM', previousAttendance: '5/6 kept', riskLevel: 'Medium', riskScore: 41, reminderPriority: 'Normal', factors: ['Far-future booking (lead time over 30 days)', 'Chronic-care recall — usually kept', 'Evening slot with transport indicator'] },
  { appointmentId: 'APT-3001', patientId: 'PAT-2001', patientName: 'Rahim Uddin', doctorName: 'Dr. Sarah Rahman', specialty: 'Cardiology', date: '2026-09-30', time: '10:30 AM', previousAttendance: '5/6 kept', riskLevel: 'Low', riskScore: 15, reminderPriority: 'Low', factors: ['Same-week booking', 'Chronic-care follow-up', 'Confirmed by phone indicator'] },
]

/* ------------------------------------------------------------------ */
/* Health analytics (mock series)                                     */
/* ------------------------------------------------------------------ */

export type AIAnalyticsRange = 'today' | '7d' | '30d' | '3m'

export const AI_ANALYTICS_RANGES: { value: AIAnalyticsRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '3m', label: '3 Months' },
]

export const AI_VISITS_SERIES: Record<AIAnalyticsRange, { labels: string[]; visits: number[]; appointments: number[] }> = {
  today: { labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'], visits: [6, 14, 11, 9, 12, 5], appointments: [8, 16, 14, 12, 15, 7] },
  '7d': { labels: ['Sep 24', 'Sep 25', 'Sep 26', 'Sep 27', 'Sep 28', 'Sep 29', 'Sep 30'], visits: [42, 38, 45, 21, 18, 47, 44], appointments: [50, 46, 52, 28, 24, 55, 51] },
  '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], visits: [238, 251, 229, 264], appointments: [280, 292, 271, 305] },
  '3m': { labels: ['Jul', 'Aug', 'Sep'], visits: [912, 968, 982], appointments: [1050, 1105, 1148] },
}

export const AI_DEPARTMENT_WORKLOAD = {
  labels: ['General Med', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Neurology', 'Gynecology'],
  load: [34, 22, 18, 15, 12, 9],
}

export const AI_COMPLETION = { completed: 68, noShow: 12, cancelled: 9, pending: 11 }

export const AI_PEAK_HOURS = {
  labels: ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '2 PM', '4 PM', '6 PM'],
  volume: [18, 26, 34, 31, 24, 22, 28, 14],
}

export const AI_CONDITION_TRENDS = {
  labels: ['Hypertension', 'Diabetes', 'Asthma', 'Migraine', 'GERD', 'Allergic rhinitis'],
  cases: [46, 38, 24, 17, 15, 13],
}

export const AI_PHARMACY_DEMAND: Record<AIAnalyticsRange, { labels: string[]; dispensed: number[] }> = {
  today: { labels: ['8 AM', '11 AM', '2 PM', '5 PM'], dispensed: [22, 41, 35, 28] },
  '7d': { labels: ['Sep 24', 'Sep 26', 'Sep 28', 'Sep 30'], dispensed: [120, 135, 98, 142] },
  '30d': { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], dispensed: [480, 512, 495, 540] },
  '3m': { labels: ['Jul', 'Aug', 'Sep'], dispensed: [1820, 1945, 2027] },
}

export const AI_LAB_ABNORMAL = [
  { indicator: 'HbA1c > 7%', count: 18 },
  { indicator: 'LDL > 130 mg/dL', count: 24 },
  { indicator: 'Low hemoglobin', count: 15 },
  { indicator: 'Elevated TSH', count: 9 },
  { indicator: 'Proteinuria', count: 6 },
]

export const AI_DOCTOR_UTILIZATION = [
  { doctor: 'Dr. Sarah Rahman', utilization: 86 },
  { doctor: 'Dr. Mahmudul Karim', utilization: 78 },
  { doctor: 'Dr. Tanvir Ahmed', utilization: 74 },
  { doctor: 'Dr. Nusrat Jahan', utilization: 69 },
  { doctor: 'Dr. Kamal Hossain', utilization: 61 },
]

/* ------------------------------------------------------------------ */
/* AI activity log (mock)                                              */
/* ------------------------------------------------------------------ */

export const MOCK_AI_ACTIVITY: AIActivityLog[] = [
  { id: 'AIA-9001', user: 'Dr. Sarah Rahman', role: 'Doctor', module: 'Clinical Assistant', patient: 'Rahim Uddin', action: 'Clinical summary requested', timestamp: '2026-09-30 10:42', status: 'Reviewed' },
  { id: 'AIA-9002', user: 'Triage Nurse L. Akter', role: 'Nurse', module: 'Symptom Checker', patient: 'Walk-in #W-118', action: 'Symptom assessment generated', timestamp: '2026-09-30 10:15', status: 'Completed' },
  { id: 'AIA-9003', user: 'Dr. Tanvir Ahmed', role: 'Doctor', module: 'Prescription Advisory', patient: 'Fatema Begum', action: 'Prescription advisory generated', timestamp: '2026-09-30 09:58', status: 'Pending Review' },
  { id: 'AIA-9004', user: 'Front-desk R. Karim', role: 'Receptionist', module: 'No-Show Prediction', patient: 'All upcoming', action: 'No-show prediction viewed', timestamp: '2026-09-30 09:20', status: 'Completed' },
  { id: 'AIA-9005', user: 'Dr. Nusrat Jahan', role: 'Doctor', module: 'Clinical Assistant', patient: 'Hasan Mahmud', action: 'Visit history summarized', timestamp: '2026-09-29 16:44', status: 'Reviewed' },
  { id: 'AIA-9006', user: 'Admin D. Saha', role: 'Admin', module: 'Health Analytics', patient: '—', action: 'Analytics report viewed', timestamp: '2026-09-29 15:02', status: 'Completed' },
  { id: 'AIA-9007', user: 'Dr. Kamal Hossain', role: 'Doctor', module: 'Prescription Advisory', patient: 'Ayesha Siddika', action: 'Prescription signed off', timestamp: '2026-09-29 12:31', status: 'Reviewed' },
  { id: 'AIA-9008', user: 'Triage Nurse L. Akter', role: 'Nurse', module: 'Symptom Checker', patient: 'Walk-in #W-112', action: 'Symptom assessment generated', timestamp: '2026-09-29 11:07', status: 'Completed' },
  { id: 'AIA-9009', user: 'Front-desk R. Karim', role: 'Receptionist', module: 'No-Show Prediction', patient: 'Ayesha Siddika', action: 'Reminder priority updated', timestamp: '2026-09-29 09:45', status: 'Completed' },
  { id: 'AIA-9010', user: 'Dr. Farhana Islam', role: 'Doctor', module: 'Clinical Assistant', patient: 'Shirin Akter', action: 'Abnormal labs queried', timestamp: '2026-09-28 14:19', status: 'Reviewed' },
  { id: 'AIA-9011', user: 'Dr. Mahmudul Karim', role: 'Doctor', module: 'Prescription Advisory', patient: 'Imran Khan', action: 'Prescription advisory generated', timestamp: '2026-09-28 10:52', status: 'Pending Review' },
  { id: 'AIA-9012', user: 'Admin D. Saha', role: 'Admin', module: 'Health Analytics', patient: '—', action: 'Department workload viewed', timestamp: '2026-09-27 17:26', status: 'Completed' },
]

/* ------------------------------------------------------------------ */
/* Dashboard rollups (mock)                                            */
/* ------------------------------------------------------------------ */

export const AI_DASHBOARD_STATS = {
  symptomChecksToday: 14,
  highRiskCases: 3,
  clinicalQueries: 27,
  prescriptionReviews: 9,
  predictedNoShows: 5,
}
