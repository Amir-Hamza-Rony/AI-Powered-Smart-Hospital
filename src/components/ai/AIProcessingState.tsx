import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { AIStatusBadge } from '@/components/ai/AIBadges'

export function AIProcessingState({
  headline = 'Analyzing symptoms and clinical indicators...',
  steps = ['Reading patient context', 'Matching clinical patterns', 'Estimating triage level', 'Preparing recommendations'],
  durationMs = 2400,
  onDone,
}: {
  headline?: string
  steps?: string[]
  durationMs?: number
  onDone?: () => void
}) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const stepMs = Math.max(300, Math.floor(durationMs / steps.length))
    const tick = window.setInterval(() => setActive((a) => Math.min(a + 1, steps.length - 1)), stepMs)
    const done = window.setTimeout(() => onDone?.(), durationMs)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(done)
    }
  }, [durationMs, steps.length, onDone])

  const progress = Math.round(((active + 1) / steps.length) * 100)

  return (
    <Card aria-live="polite">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-2">
          <AIStatusBadge />
          <span className="text-xs text-muted-foreground">Mock AI · frontend only</span>
        </div>
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium">{headline}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <ul className="space-y-1.5 text-sm">
          {steps.map((s, i) => (
            <li key={s} className={i <= active ? 'text-foreground' : 'text-muted-foreground'}>
              <span className="mr-2">{i < active ? '✓' : i === active ? '…' : '○'}</span>
              {s}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
