import type { AutomationEvent } from '@/data/types'
import { AutomationEventStatusBadge } from '@/components/automation/AutomationStatusBadge'
import { Card, CardContent } from '@/components/ui/card'

export function EventTimeline({ events }: { events: AutomationEvent[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <ol className="relative space-y-4 border-l border-border pl-5">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span
                aria-hidden
                className={
                  'absolute top-1 -left-5 h-2.5 w-2.5 rounded-full border-2 border-background ' +
                  (e.status === 'Success'
                    ? 'bg-primary'
                    : e.status === 'Failed'
                      ? 'bg-destructive'
                      : e.status === 'Warning'
                        ? 'bg-amber-500'
                        : 'bg-muted-foreground')
                }
              />
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{e.eventType}</p>
                <AutomationEventStatusBadge status={e.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{e.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {e.id} · {e.workflow} · {e.triggeredAt} · {e.triggeredBy}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
