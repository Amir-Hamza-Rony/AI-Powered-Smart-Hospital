/**
 * Phase 6 — Automation store, now backed by the persisted Django backend
 * (/api/automation/*). Interface is unchanged from the mock version, so
 * the five automation pages work without modification.
 *
 * Transport: short-interval polling (AUTO-01). Events (audit trail) are
 * polled every 30s; all other collections are fetched on mount and
 * re-fetched after each mutating action. Email/SMS is out of scope —
 * only In-App is wired; the `channel` field marks where SMS/Email hook in.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AppointmentReminder,
  AutomationEvent,
  HospitalNotification,
  LabCompletionAlert,
  PurchaseRequest,
  QueuePatient,
  StockAlert,
  WorkflowAutomation,
  WorkflowId,
} from '@/data/types'
import {
  autoAdvanceQueue,
  callNextPatient,
  callPatient,
  completeConsultation,
  createPurchaseRequest,
  cancelReminder,
  deleteNotification,
  listEvents,
  listLabAlerts,
  listNotifications,
  listPurchaseRequests,
  listQueuePatients,
  listReminders,
  listStockAlerts,
  listWorkflows,
  markAllNotificationsRead,
  markLabReviewed,
  markNotificationRead,
  notifyDoctor,
  notifyPatient,
  rescheduleReminder,
  resolveStockAlert,
  sendReminder,
  simulateLabCompletion,
  skipPatient,
  startConsultation,
  toggleWorkflow,
  toAutomationEvent,
  toLabAlert,
  toNotification,
  toPurchaseRequest,
  toQueuePatient,
  toReminder,
  toStockAlert,
  toWorkflow,
} from '@/lib/api/automation'

const AutomationStoreContext = createContext<AutomationStoreValue | null>(null)

const POLL_MS = 30_000
const PAGE_SIZE = 100

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
  loading: boolean
  toggleWorkflow: (id: WorkflowId) => void
  sendReminder: (id: string) => void
  rescheduleReminder: (id: string) => void
  cancelReminder: (id: string) => void
  notifyDoctor: (id: string) => void
  notifyPatient: (id: string) => void
  markLabReviewed: (id: string) => void
  simulateLabCompletion: () => Promise<string | null>
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

export function AutomationStoreProvider({ children }: { children: ReactNode }) {
  const [workflows, setWorkflows] = useState<WorkflowAutomation[]>([])
  const [reminders, setReminders] = useState<AppointmentReminder[]>([])
  const [labAlerts, setLabAlerts] = useState<LabCompletionAlert[]>([])
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])
  const [queue, setQueue] = useState<QueuePatient[]>([])
  const [events, setEvents] = useState<AutomationEvent[]>([])
  const [notifications, setNotifications] = useState<HospitalNotification[]>([])
  const [loading, setLoading] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ---------------- collection fetchers ---------------- */

  const fetchWorkflows = useCallback(async () => {
    const page = await listWorkflows({ page_size: PAGE_SIZE })
    setWorkflows(page.results.map(toWorkflow))
  }, [])

  const fetchReminders = useCallback(async () => {
    const page = await listReminders({ page_size: PAGE_SIZE })
    setReminders(page.results.map(toReminder))
  }, [])

  const fetchLabAlerts = useCallback(async () => {
    const page = await listLabAlerts({ page_size: PAGE_SIZE })
    setLabAlerts(page.results.map(toLabAlert))
  }, [])

  const fetchStockAlerts = useCallback(async () => {
    const page = await listStockAlerts({ page_size: PAGE_SIZE })
    setStockAlerts(page.results.map(toStockAlert))
  }, [])

  const fetchPurchaseRequests = useCallback(async () => {
    const page = await listPurchaseRequests({ page_size: PAGE_SIZE })
    setPurchaseRequests(page.results.map(toPurchaseRequest))
  }, [])

  const fetchQueuePatients = useCallback(async () => {
    const page = await listQueuePatients({ page_size: PAGE_SIZE })
    setQueue(page.results.map(toQueuePatient))
  }, [])

  const fetchEvents = useCallback(async () => {
    const page = await listEvents({ page_size: PAGE_SIZE })
    const fetched = page.results.map(toAutomationEvent)
    setEvents((prev) => {
      const ids = new Set(prev.map((e) => e.id))
      const merged = [...fetched, ...prev.filter((e) => !ids.has(e.id))]
      return merged.slice(0, 200)
    })
  }, [])

  const fetchNotifications = useCallback(async () => {
    const page = await listNotifications({ page_size: PAGE_SIZE })
    setNotifications(page.results.map(toNotification))
  }, [])

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchWorkflows(), fetchReminders(), fetchLabAlerts(), fetchStockAlerts(),
      fetchPurchaseRequests(), fetchQueuePatients(), fetchEvents(), fetchNotifications(),
    ])
    setLoading(false)
  }, [
    fetchWorkflows, fetchReminders, fetchLabAlerts, fetchStockAlerts,
    fetchPurchaseRequests, fetchQueuePatients, fetchEvents, fetchNotifications,
  ])

  /* ---------------- initial load + polling ---------------- */

  useEffect(() => {
    let active = true
    fetchAll().catch(() => {
      if (active) setLoading(false)
    })
    pollRef.current = setInterval(() => {
      void fetchEvents()
    }, POLL_MS)
    return () => {
      active = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchAll, fetchEvents])

  /* ---------------- mutators ---------------- */

  const handleToggleWorkflow = useCallback(async (id: WorkflowId) => {
    try {
      const updated = await toggleWorkflow(id)
      setWorkflows((prev) => prev.map((w) => (w.id === id ? toWorkflow(updated) : w)))
    } catch (err) {
      console.error('toggleWorkflow failed', err)
    }
  }, [toggleWorkflow])

  const handleSendReminder = useCallback(async (id: string) => {
    try {
      const updated = await sendReminder(id)
      setReminders((prev) => prev.map((r) => (r.id === id ? toReminder(updated) : r)))
    } catch (err) {
      console.error('sendReminder failed', err)
    }
  }, [sendReminder])

  const handleRescheduleReminder = useCallback(async (id: string) => {
    try {
      const updated = await rescheduleReminder(id)
      setReminders((prev) => prev.map((r) => (r.id === id ? toReminder(updated) : r)))
    } catch (err) {
      console.error('rescheduleReminder failed', err)
    }
  }, [rescheduleReminder])

  const handleCancelReminder = useCallback(async (id: string) => {
    try {
      const updated = await cancelReminder(id)
      setReminders((prev) => prev.map((r) => (r.id === id ? toReminder(updated) : r)))
    } catch (err) {
      console.error('cancelReminder failed', err)
    }
  }, [cancelReminder])

  const handleNotifyDoctor = useCallback(async (id: string) => {
    try {
      const updated = await notifyDoctor(id)
      setLabAlerts((prev) => prev.map((a) => (a.id === id ? toLabAlert(updated) : a)))
    } catch (err) {
      console.error('notifyDoctor failed', err)
    }
  }, [notifyDoctor])

  const handleNotifyPatient = useCallback(async (id: string) => {
    try {
      const updated = await notifyPatient(id)
      setLabAlerts((prev) => prev.map((a) => (a.id === id ? toLabAlert(updated) : a)))
    } catch (err) {
      console.error('notifyPatient failed', err)
    }
  }, [notifyPatient])

  const handleMarkLabReviewed = useCallback(async (id: string) => {
    try {
      const updated = await markLabReviewed(id)
      setLabAlerts((prev) => prev.map((a) => (a.id === id ? toLabAlert(updated) : a)))
    } catch (err) {
      console.error('markLabReviewed failed', err)
    }
  }, [markLabReviewed])

  const handleSimulateLabCompletion = useCallback(async (): Promise<string | null> => {
    try {
      const updated = await simulateLabCompletion()
      setLabAlerts((prev) =>
        prev.map((a) => (a.labOrderId === updated.lab_order_id ? toLabAlert(updated) : a)),
      )
      return updated.lab_order_id
    } catch (err) {
      console.error('simulateLabCompletion failed', err)
      return null
    }
  }, [simulateLabCompletion])

  const handleCreatePurchaseRequest = useCallback(async (req: Omit<PurchaseRequest, 'id' | 'createdAt' | 'status'>) => {
    try {
      const created = await createPurchaseRequest({
        medicine: req.medicine, sku: req.sku, current_stock: req.currentStock,
        required_quantity: req.requiredQuantity, supplier: req.supplier,
        priority: req.priority, notes: req.notes,
      })
      setPurchaseRequests((prev) => [toPurchaseRequest(created), ...prev])
    } catch (err) {
      console.error('createPurchaseRequest failed', err)
    }
  }, [createPurchaseRequest])

  const handleResolveStockAlert = useCallback(async (id: string) => {
    try {
      const updated = await resolveStockAlert(id)
      setStockAlerts((prev) => prev.map((s) => (s.id === id ? toStockAlert(updated) : s)))
    } catch (err) {
      console.error('resolveStockAlert failed', err)
    }
  }, [resolveStockAlert])

  const handleCallPatient = useCallback(async (serial: string) => {
    try {
      const updated = await callPatient(serial)
      setQueue((prev) => prev.map((q) => (q.serial === serial ? toQueuePatient(updated) : q)))
    } catch (err) {
      console.error('callPatient failed', err)
    }
  }, [callPatient])

  const handleStartConsultation = useCallback(async (serial: string) => {
    try {
      const updated = await startConsultation(serial)
      setQueue((prev) => prev.map((q) => (q.serial === serial ? toQueuePatient(updated) : q)))
    } catch (err) {
      console.error('startConsultation failed', err)
    }
  }, [startConsultation])

  const handleCompleteConsultation = useCallback(async (serial: string) => {
    try {
      const updated = await completeConsultation(serial)
      setQueue((prev) => prev.map((q) => (q.serial === serial ? toQueuePatient(updated) : q)))
    } catch (err) {
      console.error('completeConsultation failed', err)
    }
  }, [completeConsultation])

  const handleSkipPatient = useCallback(async (serial: string) => {
    try {
      const updated = await skipPatient(serial)
      setQueue((prev) => prev.map((q) => (q.serial === serial ? toQueuePatient(updated) : q)))
    } catch (err) {
      console.error('skipPatient failed', err)
    }
  }, [skipPatient])

  const handleCallNextPatient = useCallback(async () => {
    try {
      const updated = await callNextPatient()
      if (!updated) return
      setQueue((prev) => prev.map((q) =>
        q.serial === updated.serial ? toQueuePatient(updated) : q,
      ))
    } catch (err) {
      console.error('callNextPatient failed', err)
    }
  }, [callNextPatient])

  const handleAutoAdvanceQueue = useCallback(async () => {
    try {
      const updated = await autoAdvanceQueue()
      if (!updated) return
      setQueue((prev) => prev.map((q) =>
        q.serial === updated.serial ? toQueuePatient(updated) : q,
      ))
    } catch (err) {
      console.error('autoAdvanceQueue failed', err)
    }
  }, [autoAdvanceQueue])

  const handleMarkNotificationRead = useCallback(async (id: string) => {
    try {
      const updated = await markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? toNotification(updated) : n)))
    } catch (err) {
      console.error('markNotificationRead failed', err)
    }
  }, [markNotificationRead])

  const handleMarkAllNotificationsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error('markAllNotificationsRead failed', err)
    }
  }, [markAllNotificationsRead])

  const handleDeleteNotification = useCallback(async (id: string) => {
    try {
      await deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      console.error('deleteNotification failed', err)
    }
  }, [deleteNotification])

  const unreadCount = notifications.filter((n) => !n.read).length

  const value = useMemo<AutomationStoreValue>(
    () => ({
      workflows, reminders, labAlerts, stockAlerts, purchaseRequests, queue,
      events, notifications, unreadCount, loading,
      toggleWorkflow: handleToggleWorkflow,
      sendReminder: handleSendReminder,
      rescheduleReminder: handleRescheduleReminder,
      cancelReminder: handleCancelReminder,
      notifyDoctor: handleNotifyDoctor,
      notifyPatient: handleNotifyPatient,
      markLabReviewed: handleMarkLabReviewed,
      simulateLabCompletion: handleSimulateLabCompletion,
      createPurchaseRequest: handleCreatePurchaseRequest,
      resolveStockAlert: handleResolveStockAlert,
      callPatient: handleCallPatient,
      startConsultation: handleStartConsultation,
      completeConsultation: handleCompleteConsultation,
      skipPatient: handleSkipPatient,
      callNextPatient: handleCallNextPatient,
      autoAdvanceQueue: handleAutoAdvanceQueue,
      markNotificationRead: handleMarkNotificationRead,
      markAllNotificationsRead: handleMarkAllNotificationsRead,
      deleteNotification: handleDeleteNotification,
    }),
    [workflows, reminders, labAlerts, stockAlerts, purchaseRequests, queue,
      events, notifications, unreadCount, loading,
      handleToggleWorkflow, handleSendReminder, handleRescheduleReminder,
      handleCancelReminder, handleNotifyDoctor, handleNotifyPatient,
      handleMarkLabReviewed, handleSimulateLabCompletion,
      handleCreatePurchaseRequest, handleResolveStockAlert, handleCallPatient,
      handleStartConsultation, handleCompleteConsultation, handleSkipPatient,
      handleCallNextPatient, handleAutoAdvanceQueue, handleMarkNotificationRead,
      handleMarkAllNotificationsRead, handleDeleteNotification],
  )

  return <AutomationStoreContext.Provider value={value}>{children}</AutomationStoreContext.Provider>
}

export function useAutomationStore() {
  const ctx = useContext(AutomationStoreContext)
  if (!ctx) throw new Error('useAutomationStore must be used within AutomationStoreProvider')
  return ctx
}
