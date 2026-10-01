import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  MOCK_AUTOMATION_EVENTS,
  MOCK_LAB_ALERTS,
  MOCK_NOTIFICATIONS,
  MOCK_PURCHASE_REQUESTS,
  MOCK_QUEUE,
  MOCK_REMINDERS,
  MOCK_STOCK_ALERTS,
  MOCK_WORKFLOWS,
} from '@/data/automation'
import type {
  AppointmentReminder,
  AutomationEvent,
  AutomationEventStatus,
  AutomationWorkflow,
  HospitalNotification,
  LabCompletionAlert,
  PurchaseRequest,
  QueuePatient,
  QueueStatus,
  ReminderChannel,
  StockAlert,
  WorkflowAutomation,
  WorkflowId,
} from '@/data/types'

/**
 * Phase 6 frontend-only simulation store.
 * No backend, WebSocket, or real notification APIs — all state is local
 * and resets on reload. Existing HospitalStore phases are untouched.
 */
interface AutomationStoreValue {
  workflows: WorkflowAutomation[]
  reminders: AppointmentReminder[]
  labAlerts: LabCompletionAlert[]
  stockAlerts: StockAlert[]
  purchaseRequests: PurchaseRequest[]
  queue: QueuePatient[]
  events: AutomationEvent[]
  notifications: HospitalNotification[]
  unreadCount: number
  toggleWorkflow: (id: WorkflowId) => void
  sendReminder: (id: string) => void
  rescheduleReminder: (id: string) => void
  cancelReminder: (id: string) => void
  notifyDoctor: (id: string) => void
  notifyPatient: (id: string) => void
  markLabReviewed: (id: string) => void
  simulateLabCompletion: () => string | null
  createPurchaseRequest: (req: Omit<PurchaseRequest, 'id' | 'createdAt' | 'status'>) => void
  resolveStockAlert: (id: string) => void
  callPatient: (serial: string) => void
  startConsultation: (serial: string) => void
  completeConsultation: (serial: string) => void
  skipPatient: (serial: string) => void
  callNextPatient: () => void
  autoAdvanceQueue: () => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  deleteNotification: (id: string) => void
}

const AutomationStoreContext = createContext<AutomationStoreValue | null>(null)

const SIM_TIME = '2026-10-01 09:45'

export function AutomationStoreProvider({ children }: { children: ReactNode }) {
  const [workflows, setWorkflows] = useState<WorkflowAutomation[]>(MOCK_WORKFLOWS)
  const [reminders, setReminders] = useState<AppointmentReminder[]>(MOCK_REMINDERS)
  const [labAlerts, setLabAlerts] = useState<LabCompletionAlert[]>(MOCK_LAB_ALERTS)
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>(MOCK_STOCK_ALERTS)
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(MOCK_PURCHASE_REQUESTS)
  const [queue, setQueue] = useState<QueuePatient[]>(MOCK_QUEUE)
  const [events, setEvents] = useState<AutomationEvent[]>(MOCK_AUTOMATION_EVENTS)
  const [notifications, setNotifications] = useState<HospitalNotification[]>(MOCK_NOTIFICATIONS)
  const seq = useRef(100)

  const logEvent = useCallback((workflow: AutomationWorkflow, eventType: string, description: string, status: AutomationEventStatus, triggeredBy: string) => {
    const n = seq.current + 1
    seq.current = n
    const event: AutomationEvent = {
      id: `EVT-${9100 + n}`,
      workflow,
      eventType,
      description,
      triggeredAt: SIM_TIME,
      status,
      triggeredBy,
    }
    setEvents((prev) => [event, ...prev])
    setWorkflows((prev) => prev.map((w) => {
      const match =
        (workflow === 'Appointment Reminders' && w.id === 'appointment-reminder') ||
        (workflow === 'Lab Alerts' && w.id === 'lab-alert') ||
        (workflow === 'Stock Alerts' && w.id === 'stock-alert') ||
        (workflow === 'Waiting Queue' && w.id === 'queue')
      return match ? { ...w, eventCount: w.eventCount + 1, lastExecution: SIM_TIME } : w
    }))
  }, [])

  const pushNotification = useCallback(
    (category: HospitalNotification['category'], title: string, description: string, module: string, href: string) => {
      const n = seq.current + 1
      seq.current = n
      const item: HospitalNotification = {
        id: `NTF-${1100 + n}`,
        category,
        title,
        description,
        time: SIM_TIME,
        read: false,
        module,
        href,
      }
      setNotifications((prev) => [item, ...prev])
    },
    [],
  )

  const toggleWorkflow = useCallback((id: WorkflowId) => {
    setWorkflows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w
        const enabled = !w.enabled
        return {
          ...w,
          enabled,
          status: w.id === 'queue' ? 'Live' : enabled ? 'Active' : 'Paused',
        }
      }),
    )
  }, [])

  const patchReminder = (id: string, patch: Partial<AppointmentReminder>) =>
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const sendReminder = useCallback(
    (id: string) => {
      const target = reminders.find((r) => r.id === id)
      if (!target) return
      const primary: ReminderChannel = target.channels[0] ?? 'SMS'
      patchReminder(id, {
        status: 'Sent',
        lastReminder: SIM_TIME,
        history: [...target.history, { at: SIM_TIME, channel: primary, result: 'Sent' }],
      })
      logEvent('Appointment Reminders', 'Appointment reminder sent', `${primary} reminder sent to ${target.patientName} for ${target.appointmentId}.`, 'Success', 'Front-desk User')
      pushNotification('Appointments', 'Appointment Reminder Sent', `${primary} reminder sent to ${target.patientName} for ${target.appointmentId}.`, 'Appointment Reminders', '/automation/reminders')
    },
    [reminders, logEvent, pushNotification],
  )

  const rescheduleReminder = useCallback(
    (id: string) => {
      patchReminder(id, { status: 'Scheduled', lastReminder: '—' })
      const target = reminders.find((r) => r.id === id)
      logEvent('Appointment Reminders', 'Appointment reminder sent', `Reminder for ${target?.appointmentId ?? id} rescheduled to the next batch.`, 'Pending', 'Front-desk User')
    },
    [reminders, logEvent],
  )

  const cancelReminder = useCallback(
    (id: string) => {
      patchReminder(id, { status: 'Cancelled' })
      const target = reminders.find((r) => r.id === id)
      logEvent('Appointment Reminders', 'Appointment reminder sent', `Reminder for ${target?.appointmentId ?? id} cancelled by staff.`, 'Warning', 'Front-desk User')
    },
    [reminders, logEvent],
  )

  const notifyDoctor = useCallback(
    (id: string) => {
      const target = labAlerts.find((l) => l.id === id)
      if (!target) return
      setLabAlerts((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                doctorNotification: 'Sent',
                status: l.patientNotification === 'Sent' ? 'Notification Sent' : l.status,
                history: [...l.history, `${SIM_TIME} — Doctor notified (In-App)`],
              }
            : l,
        ),
      )
      logEvent('Lab Alerts', 'Doctor notification sent', `${target.orderedBy} notified about ${target.labOrderId} (In-App).`, 'Success', 'Automation')
      pushNotification('Laboratory', 'Doctor Notified', `${target.orderedBy} was notified about ${target.labOrderId} (${target.test}).`, 'Lab Alerts', '/automation/lab-alerts')
    },
    [labAlerts, logEvent, pushNotification],
  )

  const notifyPatient = useCallback(
    (id: string) => {
      const target = labAlerts.find((l) => l.id === id)
      if (!target) return
      setLabAlerts((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                patientNotification: 'Sent',
                status: l.doctorNotification === 'Sent' ? 'Notification Sent' : l.status,
                history: [...l.history, `${SIM_TIME} — Patient notified (SMS)`],
              }
            : l,
        ),
      )
      logEvent('Lab Alerts', 'Patient notification sent', `${target.patientName} notified about ${target.labOrderId} (SMS).`, 'Success', 'Automation')
      pushNotification('Laboratory', 'Patient Notified', `${target.patientName} was notified that ${target.test} results are ready.`, 'Lab Alerts', '/automation/lab-alerts')
    },
    [labAlerts, logEvent, pushNotification],
  )

  const markLabReviewed = useCallback(
    (id: string) => {
      setLabAlerts((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'Reviewed', history: [...l.history, `${SIM_TIME} — Marked reviewed`] } : l)))
      const target = labAlerts.find((l) => l.id === id)
      logEvent('Lab Alerts', 'Lab report completed', `${target?.labOrderId ?? id} reviewed by ordering doctor.`, 'Success', 'Doctor')
    },
    [labAlerts, logEvent],
  )

  const simulateLabCompletion = useCallback((): string | null => {
    const next = labAlerts.find((l) => l.status === 'Processing')
    if (!next) return null
    setLabAlerts((prev) =>
      prev.map((l) =>
        l.id === next.id
          ? {
              ...l,
              status: 'Ready',
              completedAt: SIM_TIME,
              resultStatus: 'Normal',
              doctorNotification: 'Sent',
              patientNotification: 'Sent',
              history: [
                ...l.history,
                `${SIM_TIME} — Report marked ready by lab (simulated)`,
                `${SIM_TIME} — Doctor notified (In-App)`,
                `${SIM_TIME} — Patient notified (SMS)`,
              ],
            }
          : l,
      ),
    )
    logEvent('Lab Alerts', 'Lab report completed', `${next.test} report (${next.labOrderId}) marked ready (simulated).`, 'Success', 'Lab Technician')
    logEvent('Lab Alerts', 'Doctor notification sent', `${next.orderedBy} notified about ${next.labOrderId} (In-App).`, 'Success', 'Automation')
    logEvent('Lab Alerts', 'Patient notification sent', `${next.patientName} notified about ${next.labOrderId} (SMS).`, 'Success', 'Automation')
    pushNotification('Laboratory', 'Lab Report Ready', `${next.test} report (${next.labOrderId}) for ${next.patientName} is ready.`, 'Lab Alerts', '/automation/lab-alerts')
    return next.labOrderId
  }, [labAlerts, logEvent, pushNotification])

  const createPurchaseRequest = useCallback(
    (req: Omit<PurchaseRequest, 'id' | 'createdAt' | 'status'>) => {
      const n = seq.current + 1
      seq.current = n
      const pr: PurchaseRequest = { ...req, id: `PR-${8100 + n}`, createdAt: SIM_TIME, status: 'Requested' }
      setPurchaseRequests((prev) => [pr, ...prev])
      logEvent('Stock Alerts', 'Purchase request created', `${pr.id} created for ${pr.medicine} × ${pr.requiredQuantity}.`, 'Success', 'Pharmacist A. Rahman')
      pushNotification('Pharmacy', 'New Purchase Request Created', `${pr.id} raised for ${pr.medicine} × ${pr.requiredQuantity}.`, 'Stock Alerts', '/automation/stock-alerts')
    },
    [logEvent, pushNotification],
  )

  const resolveStockAlert = useCallback(
    (id: string) => {
      setStockAlerts((prev) => prev.map((s) => (s.id === id ? { ...s, resolved: true, status: 'Normal' } : s)))
      const target = stockAlerts.find((s) => s.id === id)
      logEvent('Stock Alerts', 'Medicine stock threshold reached', `${target?.medicine ?? id} alert resolved by pharmacy staff.`, 'Success', 'Pharmacist A. Rahman')
    },
    [stockAlerts, logEvent],
  )

  const setQueueStatus = (serial: string, status: QueueStatus) =>
    setQueue((prev) => prev.map((q) => (q.serial === serial ? { ...q, status } : q)))

  const callPatient = useCallback(
    (serial: string) => {
      setQueueStatus(serial, 'Called')
      const target = queue.find((q) => q.serial === serial)
      logEvent('Waiting Queue', 'Patient called', `Serial ${serial} (${target?.patientName ?? '—'}) called to ${target?.department ?? 'clinic'}.`, 'Success', 'Receptionist N. Akter')
      pushNotification('Queue', 'Patient Called', `Serial ${serial} (${target?.patientName ?? '—'}) was called.`, 'Waiting Queue', '/automation/queue')
    },
    [queue, logEvent, pushNotification],
  )

  const startConsultation = useCallback(
    (serial: string) => {
      setQueueStatus(serial, 'In Consultation')
      const target = queue.find((q) => q.serial === serial)
      logEvent('Waiting Queue', 'Queue updated', `Serial ${serial} moved to In Consultation (${target?.department ?? '—'}).`, 'Success', 'Receptionist N. Akter')
    },
    [queue, logEvent],
  )

  const completeConsultation = useCallback(
    (serial: string) => {
      setQueueStatus(serial, 'Completed')
      const target = queue.find((q) => q.serial === serial)
      logEvent('Waiting Queue', 'Queue updated', `Serial ${serial} (${target?.patientName ?? '—'}) completed consultation.`, 'Success', 'Doctor')
    },
    [queue, logEvent],
  )

  const skipPatient = useCallback(
    (serial: string) => {
      setQueueStatus(serial, 'Skipped')
      const target = queue.find((q) => q.serial === serial)
      logEvent('Waiting Queue', 'Queue updated', `Serial ${serial} (${target?.patientName ?? '—'}) skipped — moved to end of queue.`, 'Warning', 'Receptionist N. Akter')
    },
    [queue, logEvent],
  )

  const callNextPatient = useCallback(() => {
    const next = queue.find((q) => q.status === 'Waiting')
    if (!next) return
    setQueue((prev) =>
      prev.map((q) => {
        if (q.serial === next.serial) return { ...q, status: 'Called' }
        if (q.status === 'Called') return { ...q, status: 'In Consultation' }
        return q
      }),
    )
    logEvent('Waiting Queue', 'Patient called', `Serial ${next.serial} (${next.patientName}) called — next in queue.`, 'Success', 'Receptionist N. Akter')
    pushNotification('Queue', 'Patient Called', `Serial ${next.serial} (${next.patientName}) was called.`, 'Waiting Queue', '/automation/queue')
  }, [queue, logEvent, pushNotification])

  const autoAdvanceQueue = useCallback(() => {
    const waiting = queue.filter((q) => q.status === 'Waiting')
    const called = queue.find((q) => q.status === 'Called')
    if (called) {
      setQueue((prev) => prev.map((q) => (q.serial === called.serial ? { ...q, status: 'In Consultation' } : q)))
      logEvent('Waiting Queue', 'Queue updated', `Serial ${called.serial} moved to In Consultation (auto-update).`, 'Success', 'Queue Monitor')
      return
    }
    if (waiting.length > 0) {
      const next = waiting[0]
      setQueue((prev) => prev.map((q) => (q.serial === next.serial ? { ...q, status: 'Called' } : q)))
      logEvent('Waiting Queue', 'Patient called', `Serial ${next.serial} (${next.patientName}) called (auto-update).`, 'Success', 'Queue Monitor')
    }
  }, [queue, logEvent])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const value = useMemo<AutomationStoreValue>(
    () => ({
      workflows,
      reminders,
      labAlerts,
      stockAlerts,
      purchaseRequests,
      queue,
      events,
      notifications,
      unreadCount,
      toggleWorkflow,
      sendReminder,
      rescheduleReminder,
      cancelReminder,
      notifyDoctor,
      notifyPatient,
      markLabReviewed,
      simulateLabCompletion,
      createPurchaseRequest,
      resolveStockAlert,
      callPatient,
      startConsultation,
      completeConsultation,
      skipPatient,
      callNextPatient,
      autoAdvanceQueue,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
    }),
    [
      workflows, reminders, labAlerts, stockAlerts, purchaseRequests, queue, events,
      notifications, unreadCount, toggleWorkflow, sendReminder, rescheduleReminder,
      cancelReminder, notifyDoctor, notifyPatient, markLabReviewed, simulateLabCompletion,
      createPurchaseRequest, resolveStockAlert, callPatient, startConsultation,
      completeConsultation, skipPatient, callNextPatient, autoAdvanceQueue,
      markNotificationRead, markAllNotificationsRead, deleteNotification,
    ],
  )

  return <AutomationStoreContext.Provider value={value}>{children}</AutomationStoreContext.Provider>
}

export function useAutomationStore() {
  const ctx = useContext(AutomationStoreContext)
  if (!ctx) throw new Error('useAutomationStore must be used within AutomationStoreProvider')
  return ctx
}
