import { Link } from 'react-router-dom'
import {
  Activity,
  BellRing,
  CalendarClock,
  CheckCircle2,
  FlaskConical,
  Package,
  TriangleAlert,
  Users,
  XCircle,
} from 'lucide-react'
import { useAutomationStore } from '@/store/AutomationStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { WorkflowCard } from '@/components/automation/WorkflowCard'
import { AutomationEventStatusBadge } from '@/components/automation/AutomationStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AutomationDashboardPage() {
  const { workflows, reminders, labAlerts, stockAlerts, events, toggleWorkflow } = useAutomationStore()
  const { success } = useToast()

  const activeWorkflows = workflows.filter((w) => w.enabled).length
  const scheduledReminders = reminders.filter((r) => r.status === 'Scheduled' || r.status === 'Pending').length
  const pendingAlerts =
    labAlerts.filter((l) => l.status === 'Ready').length +
    stockAlerts.filter((s) => !s.resolved && s.status !== 'Normal').length
  const failedEvents = events.filter((e) => e.status === 'Failed').length
  const completedAutomations = events.filter((e) => e.status === 'Success').length
  const recentEvents = events.slice(0, 5)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Workflow Automation"
        description="Centralized overview of automated hospital workflows · frontend demo simulation"
        actions={
          <Button variant="outline" asChild>
            <Link to="/automation/activity">View Activity Log</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={Activity} label="Active Workflows" value={activeWorkflows} hint={`${workflows.length} configured`} />
        <StatCard icon={CalendarClock} label="Scheduled Reminders" value={scheduledReminders} hint="Queued for patients" />
        <StatCard icon={BellRing} label="Pending Alerts" value={pendingAlerts} hint="Lab + stock" />
        <StatCard icon={FlaskConical} label="Events Today" value={events.length} hint="Automation trail" />
        <StatCard icon={XCircle} label="Failed Events" value={failedEvents} hint="Needs attention" />
        <StatCard icon={CheckCircle2} label="Completed Automations" value={completedAutomations} hint="Successful runs" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {workflows.map((w) => (
          <WorkflowCard
            key={w.id}
            workflow={w}
            onToggle={() => {
              toggleWorkflow(w.id)
              success(w.enabled ? 'Workflow disabled' : 'Workflow enabled', `${w.name} updated (mock state).`)
            }}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Recent Automation Events
          </CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link to="/automation/activity">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {recentEvents.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{e.eventType}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.workflow} · {e.triggeredAt}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{e.workflow}</Badge>
                  <AutomationEventStatusBadge status={e.status} />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Queue-driven calls
            </span>
            <span className="inline-flex items-center gap-1">
              <Package className="h-3.5 w-3.5" /> Stock monitoring
            </span>
            <span className="inline-flex items-center gap-1">
              <TriangleAlert className="h-3.5 w-3.5" /> Demo Simulation — backend real-time integration will be implemented in a later phase.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
