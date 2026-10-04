import { apiFetch } from '@/lib/api/client'
import { toQuery, type Page } from '@/lib/api/common'

/** Raw backend shapes (snake_case) for /api/ai/. */

export interface BackendTriageResult {
  level: 'Emergency' | 'Urgent' | 'Moderate' | 'Low'
  department: string
  considerations: string[]
  riskIndicators: string[]
  nextAction: string
  confidence: number
  disclaimer: string
  session: string
  insight: string
}

export interface BackendClinicalAnswer {
  summary?: string
  answer?: string
  session: string
  insight: string
}

export interface BackendAdvisoryFinding {
  category: string
  severity: 'Informational' | 'Caution' | 'High Attention'
  message: string
}

export interface BackendAdvisory {
  findings: BackendAdvisoryFinding[]
  overallSeverity: 'Informational' | 'Caution' | 'High Attention'
  summary: string
  disclaimer: string
  session: string
  insight: string
}

export interface BackendNoShowPrediction {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  specialty: string
  date: string
  time: string
  previousAttendance: string
  riskLevel: 'High' | 'Medium' | 'Low'
  riskScore: number
  reminderPriority: 'High' | 'Normal' | 'Low'
  factors: string[]
}

export interface BackendAnalytics {
  range: { start: string; end: string }
  visits: { labels: string[]; visits: number[]; appointments: number[] }
  departmentWorkload: { labels: string[]; load: number[] }
  completion: { completed: number; noShow: number; cancelled: number; pending: number }
  peakHours: { labels: string[]; volume: number[] }
  conditionTrends: { labels: string[]; cases: number[] }
  pharmacyDemand: { labels: string[]; dispensed: number[] }
  labAbnormal: Array<{ indicator: string; count: number }>
  doctorUtilization: Array<{ doctor: string; utilization: number }>
  disclaimer: string
}

export interface BackendAISession {
  id: string
  module: string
  patient: string | null
  patient_name: string | null
  requested_by: string | null
  requested_by_email: string | null
  input_data: Record<string, unknown>
  provider: string
  created_at: string
}

export interface BackendAIInsight {
  id: string
  session: string
  module: string
  patient: string | null
  patient_name: string | null
  kind: string
  title: string
  content: Record<string, unknown>
  confidence: number | null
  requires_review: boolean
  review_status: 'Pending Review' | 'Reviewed' | 'Completed'
  reviewed_by: string | null
  requested_by_email: string | null
  reviewed_at: string | null
  review_note: string
  created_at: string
}

export interface SymptomInput {
  name: string
  category?: string
  severity?: 'Mild' | 'Moderate' | 'Severe'
  duration?: string
  notes?: string
}

export interface SymptomCheckInput {
  patient?: string | null
  age?: number
  gender?: string
  conditions?: string[]
  allergies?: string[]
  symptoms: SymptomInput[]
  vitals?: Record<string, string>
}

export interface AdvisoryMedicineInput {
  medicine: string
  dose?: string
  frequency?: string
  duration?: string
  route?: string
}

export interface AdvisoryInput {
  patient?: string | null
  diagnosis?: string
  current_meds?: string[]
  proposed: AdvisoryMedicineInput[]
}

export function checkSymptoms(input: SymptomCheckInput) {
  return apiFetch<BackendTriageResult>('/ai/symptom-check/', { method: 'POST', body: input })
}

export function clinicalSummary(patient: string) {
  return apiFetch<BackendClinicalAnswer>('/ai/clinical-summary/', {
    method: 'POST',
    body: { patient },
  })
}

export function clinicalAsk(patient: string, question: string) {
  return apiFetch<BackendClinicalAnswer>('/ai/clinical-ask/', {
    method: 'POST',
    body: { patient, question },
  })
}

export function prescriptionAdvisory(input: AdvisoryInput) {
  return apiFetch<BackendAdvisory>('/ai/prescription-advisory/', {
    method: 'POST',
    body: input,
  })
}

export function listNoShowPredictions(params: { risk?: string; search?: string } = {}) {
  return apiFetch<BackendNoShowPrediction[]>(`/ai/noshow-predictions/${toQuery({ ...params })}`)
}

export function getAnalytics(range: string) {
  return apiFetch<BackendAnalytics>(`/ai/analytics/${toQuery({ range })}`)
}

export function listAISessions(params: { module?: string; patient?: string; search?: string; page?: number; page_size?: number } = {}) {
  return apiFetch<Page<BackendAISession>>(`/ai/sessions/${toQuery({ ...params })}`)
}

export function listAIInsights(params: { module?: string; review_status?: string; search?: string; page?: number; page_size?: number } = {}) {
  return apiFetch<Page<BackendAIInsight>>(`/ai/insights/${toQuery({ ...params })}`)
}

export function reviewInsight(id: string, note?: string) {
  return apiFetch<BackendAIInsight>(`/ai/insights/${id}/review/`, {
    method: 'POST',
    body: note ? { note } : {},
  })
}
