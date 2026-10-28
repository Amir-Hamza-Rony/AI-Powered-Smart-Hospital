/**
 * Automation API client (Phase 6 — AUTO-03).
 * Backs the automation pages with the persisted Django backend
 * (/api/automation/*). Transport is short-interval polling; the
 * frontend polls /api/automation/events/ every 30s via useAutomationPolling.
 * Email/SMS delivery is out of scope (AUTO-01): only In-App is wired;
 * the `channel` field records where SMS/Email would hook in later.
 */

import { apiFetch } from '@/lib/api/client'
import { toQuery, type Page } from '@/lib/api/common'
import type {
  AppointmentReminder,
  AutomationEvent,
  AutomationEventStatus,
  AutomationWorkflow,
  HospitalNotification,
  LabCompletionAlert,
  LabAlertStatus,
  PurchaseRequest,
  QueuePatient,
  QueuePriority,
  QueueStatus,
  ReminderChannel,
  ReminderHistoryEntry,
  ReminderStatus,
  StockAlert,
  StockAlertStatus,
  WorkflowAutomation,
  NotificationState,
} from '@/data/types'

/* ------------------------------------------------------------------ */
/* Raw backend shapes (snake_case)                                    */
/* ------------------------------------------------------------------ */

export interface BackendWorkflow {
  id: string
  name: string
  description: string
  status: 'Active' | 'Paused' | 'Live'
  enabled: boolean
  last_execution: string | null
  next_execution: string
  event_count: number
  href: string
  created_at: string
  updated_at: string
}

export interface BackendReminder {
  id: string
  appointment_id: string
  patient_id: string
  patient_name: string
  doctor_name: string
  specialty: string
  date: string
  time: string
  status: ReminderStatus
  no_show_risk: string
  channels: ReminderChannel[]
  last_reminder: string
  message_preview: string
  history: Array<{ at: string; channel: ReminderChannel; result: string }>
  created_at: string
  updated_at: string
}

export interface BackendLabAlert {
  id: string
  lab_order_id: string
  patient_name: string
  test: string
  ordered_by: string
  status: LabAlertStatus
  completed_at: string | null
  doctor_notification: string
  patient_notification: string
  result_status: string
  recipients: string[]
  channels: ReminderChannel[]
  history: string[]
  created_at: string
  updated_at: string
}

export interface BackendStockAlert {
  id: string
  medicine: string
  sku: string
  current_stock: number
  minimum_level: number
  status: StockAlertStatus
  expiry_date: string | null
  supplier: string
  last_updated: string | null
  resolved: boolean
  created_at: string
  updated_at: string
}

export interface BackendPurchaseRequest {
  id: string
  medicine: string
  sku: string
  current_stock: number
  required_quantity: number
  supplier: string
  priority: string
  notes: string
  status: string
  created_at: string
}

export interface BackendQueuePatient {
  id: string
  serial: string
  patient_name: string
  patient_id: string
  doctor_name: string
  department: string
  status: QueueStatus
  arrival_time: string
  waiting_minutes: number
  priority: string
  created_at: string
  updated_at: string
}

export interface BackendAutomationEvent {
  id: string
  workflow: AutomationWorkflow
  event_type: string
  description: string
  triggered_at: string
  status: AutomationEventStatus
  triggered_by: string
  created_at: string
}

export interface BackendNotification {
  id: string
  category: string
  title: string
  description: string
  time: string
  read: boolean
  module: string
  href: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/* Adapters: backend snake_case → frontend camelCase                  */
/* ------------------------------------------------------------------ */

export function toWorkflow(w: BackendWorkflow): WorkflowAutomation {
  return {
    id: w.id as WorkflowAutomation['id'],
    name: w.name,
    description: w.description,
    status: w.status as WorkflowAutomation['status'],
    enabled: w.enabled,
    lastExecution: w.last_execution ?? '',
    nextExecution: w.next_execution,
    eventCount: w.event_count,
    href: w.href,
  }
}

export function toReminder(r: BackendReminder): AppointmentReminder {
  return {
    id: r.id,
    appointmentId: r.appointment_id,
    patientId: r.patient_id,
    patientName: r.patient_name,
    doctorName: r.doctor_name,
    specialty: r.specialty,
    date: r.date,
    time: r.time,
    status: r.status,
    noShowRisk: r.no_show_risk as AppointmentReminder['noShowRisk'],
    channels: r.channels,
    lastReminder: r.last_reminder,
    messagePreview: r.message_preview,
    history: r.history.map((h) => ({ at: h.at, channel: h.channel, result: h.result as ReminderHistoryEntry['result'] })),
  }
}

export function toLabAlert(a: BackendLabAlert): LabCompletionAlert {
  return {
    id: a.id,
    labOrderId: a.lab_order_id,
    patientName: a.patient_name,
    test: a.test,
    orderedBy: a.ordered_by,
    status: a.status as LabCompletionAlert['status'],
    completedAt: a.completed_at ?? '',
    doctorNotification: a.doctor_notification as NotificationState,
    patientNotification: a.patient_notification as NotificationState,
    resultStatus: a.result_status as LabCompletionAlert['resultStatus'],
    recipients: a.recipients,
    channels: a.channels,
    history: a.history,
  }
}

export function toStockAlert(s: BackendStockAlert): StockAlert {
  return {
    id: s.id,
    medicine: s.medicine,
    sku: s.sku,
    currentStock: s.current_stock,
    minimumLevel: s.minimum_level,
    status: s.status,
    expiryDate: s.expiry_date ?? '',
    supplier: s.supplier,
    lastUpdated: s.last_updated ?? '',
    resolved: s.resolved,
  }
}

export function toPurchaseRequest(p: BackendPurchaseRequest): PurchaseRequest {
  return {
    id: p.id,
    medicine: p.medicine,
    sku: p.sku,
    currentStock: p.current_stock,
    requiredQuantity: p.required_quantity,
    supplier: p.supplier,
    priority: p.priority as PurchaseRequest['priority'],
    notes: p.notes,
    createdAt: p.created_at,
    status: p.status as PurchaseRequest['status'],
  }
}

export function toQueuePatient(q: BackendQueuePatient): QueuePatient {
  return {
    serial: q.serial,
    patientName: q.patient_name,
    patientId: q.patient_id,
    doctorName: q.doctor_name,
    department: q.department,
    status: q.status as QueuePatient['status'],
    arrivalTime: q.arrival_time,
    waitingMinutes: q.waiting_minutes,
    priority: q.priority as QueuePriority,
  }
}

export function toAutomationEvent(e: BackendAutomationEvent): AutomationEvent {
  return {
    id: e.id,
    workflow: e.workflow,
    eventType: e.event_type,
    description: e.description,
    triggeredAt: e.triggered_at,
    status: e.status,
    triggeredBy: e.triggered_by,
  }
}

export function toNotification(n: BackendNotification): HospitalNotification {
  return {
    id: n.id,
    category: n.category as HospitalNotification['category'],
    title: n.title,
    description: n.description,
    time: n.time,
    read: n.read,
    module: n.module,
    href: n.href,
  }
}

/* ------------------------------------------------------------------ */
/* API functions                                                      */
/* ------------------------------------------------------------------ */

export interface WorkflowFilters {
  page?: number
  page_size?: number
}

export function listWorkflows(filters: WorkflowFilters = {}) {
  return apiFetch<Page<BackendWorkflow>>(`/workflows/${toQuery(filters as Record<string, string | number | boolean | undefined>)}`)
}

export function toggleWorkflow(id: string) {
  return apiFetch<BackendWorkflow>(`/workflows/${id}/toggle/`, { method: 'POST' })
}

export function listReminders(filters: { page?: number; page_size?: number } = {}) {
  return apiFetch<Page<BackendReminder>>(`/reminders/${toQuery(filters as Record<string, string | number | boolean | undefined>)}`)
}

export function sendReminder(id: string) {
  return apiFetch<BackendReminder>(`/reminders/${id}/send/`, { method: 'POST' })
}

export function rescheduleReminder(id: string) {
  return apiFetch<BackendReminder>(`/reminders/${id}/reschedule/`, { method: 'POST' })
}

export function cancelReminder(id: string) {
  return apiFetch<BackendReminder>(`/reminders/${id}/cancel/`, { method: 'POST' })
}

export function listLabAlerts(filters: { page?: number; page_size?: number } = {}) {
  return apiFetch<Page<BackendLabAlert>>(`/lab-alerts/${toQuery(filters as Record<string, string | number | boolean | undefined>)}`)
}

export function notifyDoctor(id: string) {
  return apiFetch<BackendLabAlert>(`/lab-alerts/${id}/notify_doctor/`, { method: 'POST' })
}

export function notifyPatient(id: string) {
  return apiFetch<BackendLabAlert>(`/lab-alerts/${id}/notify_patient/`, { method: 'POST' })
}

export function markLabReviewed(id: string) {
  return apiFetch<BackendLabAlert>(`/lab-alerts/${id}/mark_reviewed/`, { method: 'POST' })
}

export function simulateLabCompletion() {
  return apiFetch<BackendLabAlert>(`/lab-alerts/simulate_completion/`, { method: 'POST' })
}

export function listStockAlerts(filters: { page?: number; page_size?: number } = {}) {
  return apiFetch<Page<BackendStockAlert>>(`/stock-alerts/${toQuery(filters as Record<string, string | number | boolean | undefined>)}`)
}

export function resolveStockAlert(id: string) {
  return apiFetch<BackendStockAlert>(`/stock-alerts/${id}/resolve/`, { method: 'POST' })
}

export interface PurchaseRequestInput {
  medicine: string
  sku: string
  current_stock: number
  required_quantity: number
  supplier: string
  priority: string
  notes: string
}

export function createPurchaseRequest(input: PurchaseRequestInput) {
  return apiFetch<BackendPurchaseRequest>(`/purchase-requests/`, { method: 'POST', body: input })
}

export function listPurchaseRequests(filters: { page?: number; page_size?: number } = {}) {
  return apiFetch<Page<BackendPurchaseRequest>>(`/purchase-requests/${toQuery(filters as Record<string, string | number | boolean | undefined>)}`)
}

export function listQueuePatients(filters: { page?: number; page_size?: number } = {}) {
  return apiFetch<Page<BackendQueuePatient>>(`/queue/${toQuery(filters as Record<string, string | number | boolean | undefined>)}`)
}

export function callPatient(serial: string) {
  return apiFetch<BackendQueuePatient>(`/queue/${serial}/call/`, { method: 'POST' })
}

export function startConsultation(serial: string) {
  return apiFetch<BackendQueuePatient>(`/queue/${serial}/start_consultation/`, { method: 'POST' })
}

export function completeConsultation(serial: string) {
  return apiFetch<BackendQueuePatient>(`/queue/${serial}/complete_consultation/`, { method: 'POST' })
}

export function skipPatient(serial: string) {
  return apiFetch<BackendQueuePatient>(`/queue/${serial}/skip/`, { method: 'POST' })
}

export function callNextPatient() {
  return apiFetch<BackendQueuePatient>(`/queue/call_next/`, { method: 'POST' })
}

export function autoAdvanceQueue() {
  return apiFetch<BackendQueuePatient | null>(`/queue/auto_advance/`, { method: 'POST' })
}

export function listEvents(filters: {
  page?: number; page_size?: number; workflow?: string; status?: string;
  event_type?: string; date?: string; search?: string
} = {}) {
  return apiFetch<Page<BackendAutomationEvent>>(`/events/${toQuery(filters as Record<string, string | number | boolean | undefined>)}`)
}

export function listNotifications(filters: {
  page?: number; page_size?: number; category?: string; read?: boolean
} = {}) {
  return apiFetch<Page<BackendNotification>>(`/notifications/${toQuery(filters as Record<string, string | number | boolean | undefined>)}`)
}

export function markNotificationRead(id: string) {
  return apiFetch<BackendNotification>(`/notifications/${id}/mark_read/`, { method: 'POST' })
}

export function markAllNotificationsRead() {
  return apiFetch<never>(`/notifications/mark_all_read/`, { method: 'POST' })
}

export function deleteNotification(id: string) {
  return apiFetch<never>(`/notifications/${id}/delete_notification/`, { method: 'DELETE' })
}
