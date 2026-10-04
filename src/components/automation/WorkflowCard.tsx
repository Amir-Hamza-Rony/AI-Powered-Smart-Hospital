import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { WorkflowAutomation } from '@/data/types'
import { WorkflowStatusBadge } from '@/components/automation/AutomationStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function WorkflowToggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors',
        enabled ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export function WorkflowCard({
  workflow,
  onToggle,
}: {
  workflow: WorkflowAutomation
  onToggle: () => void
}) {
  return (
    <Card className={cn(!workflow.enabled && 'opacity-80')}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-base">{workflow.name}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{workflow.description}</p>
        </div>
        <WorkflowStatusBadge status={workflow.enabled ? workflow.status : 'Paused'} />
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Last execution</dt>
            <dd className="font-medium">{workflow.lastExecution}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Next scheduled</dt>
            <dd className="font-medium">{workflow.nextExecution}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Events</dt>
            <dd className="font-medium">{workflow.eventCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">State</dt>
            <dd className="font-medium">{workflow.enabled ? 'Enabled' : 'Disabled'}</dd>
          </div>
        </dl>
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <WorkflowToggle
              enabled={workflow.enabled}
              onChange={onToggle}
              label={`Enable ${workflow.name}`}
            />
            <span className="text-muted-foreground">{workflow.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
          <Button size="sm" variant="outline" asChild>
            <Link to={workflow.href}>
              View <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
