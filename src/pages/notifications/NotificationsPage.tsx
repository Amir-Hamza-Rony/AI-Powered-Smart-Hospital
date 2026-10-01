import { useMemo, useState } from 'react'
import { BellRing } from 'lucide-react'
import { useAutomationStore } from '@/store/AutomationStore'
import { useToast } from '@/context/ToastContext'
import type { NotificationCategory } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { NotificationCenter } from '@/components/automation/NotificationCenter'

export function NotificationsPage() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, deleteNotification } =
    useAutomationStore()
  const { success } = useToast()
  const [category, setCategory] = useState<'All' | NotificationCategory>('All')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const visible = useMemo(
    () =>
      notifications.filter((n) => {
        if (category !== 'All' && n.category !== category) return false
        if (unreadOnly && n.read) return false
        return true
      }),
    [notifications, category, unreadOnly],
  )

  const byCategory = (c: NotificationCategory) => notifications.filter((n) => n.category === c).length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notification Center"
        description={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'} · mock delivery, no external APIs`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={BellRing} label="Unread" value={unreadCount} hint="Needs attention" />
        <StatCard icon={BellRing} label="Appointments" value={byCategory('Appointments')} hint="Reminders + failures" />
        <StatCard icon={BellRing} label="Laboratory" value={byCategory('Laboratory')} hint="Reports + notices" />
        <StatCard icon={BellRing} label="Pharmacy" value={byCategory('Pharmacy')} hint="Stock + requests" />
        <StatCard icon={BellRing} label="Queue" value={byCategory('Queue')} hint="Calls + updates" />
        <StatCard icon={BellRing} label="System" value={byCategory('System')} hint="Scheduler + health" />
      </div>

      <NotificationCenter
        notifications={visible}
        category={category}
        unreadOnly={unreadOnly}
        onCategoryChange={setCategory}
        onUnreadOnlyChange={setUnreadOnly}
        onMarkRead={(id) => markNotificationRead(id)}
        onMarkAllRead={() => {
          markAllNotificationsRead()
          success('All caught up', 'Every notification marked as read (mock).')
        }}
        onDelete={(id) => {
          deleteNotification(id)
          success('Notification deleted', 'Removed from the mock inbox.')
        }}
      />
    </div>
  )
}
