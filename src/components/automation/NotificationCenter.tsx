import { Link } from 'react-router-dom'
import {
  CalendarClock,
  CheckCheck,
  FlaskConical,
  Inbox,
  MonitorCog,
  Package,
  Trash2,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { HospitalNotification, NotificationCategory } from '@/data/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const NOTIFICATION_CATEGORIES: Array<'All' | NotificationCategory> = [
  'All',
  'Appointments',
  'Laboratory',
  'Pharmacy',
  'Queue',
  'System',
]

const CATEGORY_ICONS: Record<NotificationCategory, LucideIcon> = {
  Appointments: CalendarClock,
  Laboratory: FlaskConical,
  Pharmacy: Package,
  Queue: Users,
  System: MonitorCog,
}

export function NotificationCenter({
  notifications,
  category,
  unreadOnly,
  onCategoryChange,
  onUnreadOnlyChange,
  onMarkRead,
  onMarkAllRead,
  onDelete,
}: {
  notifications: HospitalNotification[]
  category: 'All' | NotificationCategory
  unreadOnly: boolean
  onCategoryChange: (c: 'All' | NotificationCategory) => void
  onUnreadOnlyChange: (v: boolean) => void
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {NOTIFICATION_CATEGORIES.map((c) => {
          const count =
            c === 'All'
              ? notifications.length
              : notifications.filter((n) => n.category === c).length
          return (
            <Button
              key={c}
              size="sm"
              variant={category === c ? 'default' : 'outline'}
              onClick={() => onCategoryChange(c)}
            >
              {c}
              <Badge variant="secondary" className="ml-1.5">
                {count}
              </Badge>
            </Button>
          )
        })}
        <span className="ms-auto inline-flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => onUnreadOnlyChange(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Unread only
          </label>
          <Button size="sm" variant="outline" onClick={onMarkAllRead}>
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all as read
          </Button>
        </span>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm text-muted-foreground">You are all caught up for this filter.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const Icon = CATEGORY_ICONS[n.category]
            return (
              <li key={n.id}>
                <Card className={cn(!n.read && 'border-primary/40 bg-primary/5')}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{n.title}</p>
                        {!n.read && <Badge>Unread</Badge>}
                        <Badge variant="outline">{n.category}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {n.time} · {n.module} ·{' '}
                        <Link
                          to={n.href}
                          onClick={() => onMarkRead(n.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          Open related module
                        </Link>
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1">
                      {!n.read && (
                        <Button size="sm" variant="ghost" onClick={() => onMarkRead(n.id)} aria-label={`Mark ${n.id} as read`}>
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(n.id)}
                        aria-label={`Delete notification ${n.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
