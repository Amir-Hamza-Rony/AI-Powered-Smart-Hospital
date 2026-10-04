import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarClock,
  ClipboardCheck,
  HeartPulse,
  History,
  MessageSquareText,
  Pill,
  Sparkles,
  UserX,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { AIActivityStatusBadge, AIStatusBadge } from '@/components/ai/AIBadges'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { ApiLoading } from '@/components/shared/ApiState'
import { listAIInsights, listNoShowPredictions } from '@/lib/api/ai'
import type { BackendAIInsight } from '@/lib/api/ai'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AIModuleCard {
  title: string
  href: string
  icon: LucideIcon
  description: string
  status: string
}

const MODULES: AIModuleCard[] = [
  {
    title: 'Symptom Checker',
    href: '/ai/symptom-checker',
    icon: HeartPulse,
    description: 'Analyze patient symptoms, triage severity and suggest the right department.',
    status: 'Ready',
  },
  {
    title: 'Clinical Assistant',
    href: '/ai/clinical-assistant',
    icon: Bot,
    description: 'Ask questions about patient history, summarize visits and highlight findings.',
    status: 'Ready',
  },
  {
    title: 'Prescription Advisory',
    href: '/ai/prescription-advisory',
    icon: Pill,
    description: 'Review proposed prescriptions with advisory suggestions. Physician sign-off required.',
    status: 'Ready',
  },
  {
    title: 'No-Show Prediction',
    href: '/ai/no-show-prediction',
    icon: CalendarClock,
    description: 'Analyze appointment risk levels and prioritize reminders for likely no-shows.',
    status: 'Ready',
  },
  {
    title: 'Health Analytics',
    href: '/ai/health-analytics',
    icon: Activity,
    description: 'Operational trends, disease patterns and resource utilization from live data.',
    status: 'Ready',
  },
]

function insightStatus(status: string): 'Completed' | 'Reviewed' | 'Pending Review' {
  return status === 'Reviewed' ? 'Reviewed' : status === 'Completed' ? 'Completed' : 'Pending Review'
}

export function AIDashboardPage() {
  const [insights, setInsights] = useState<BackendAIInsight[]>([])
  const [highRisk, setHighRisk] = useState(0)
  const [predictedNoShows, setPredictedNoShows] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([listAIInsights({ page_size: 5 }), listNoShowPredictions()])
      .then(([insightsPage, predictions]) => {
        if (!active) return
        setInsights(insightsPage.results)
        setHighRisk(predictions.filter((p) => p.riskLevel === 'High').length)
        setPredictedNoShows(
          predictions.filter((p) => p.riskLevel === 'High' || p.riskLevel === 'Medium').length,
        )
      })
      .catch(() => {
        if (active) {
          setInsights([])
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const symptomChecks = insights.filter((i) => i.module === 'Symptom Checker').length
  const clinicalQueries = insights.filter((i) => i.module === 'Clinical Assistant').length
  const pendingReviews = insights.filter((i) => i.review_status === 'Pending Review').length

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Clinical & Operational Intelligence"
        description="Rule-based decision support over live hospital data · physician review required"
        actions={
          <Button variant="outline" asChild>
            <Link to="/ai/activity">
              <History className="mr-1 h-4 w-4" /> AI Activity
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={ClipboardCheck} label="Symptom Checks" value={loading ? '…' : symptomChecks} hint="Recent sessions" />
        <StatCard icon={AlertTriangle} label="High-Risk Cases" value={loading ? '…' : highRisk} hint="Needs urgent review" />
        <StatCard icon={MessageSquareText} label="AI Clinical Queries" value={loading ? '…' : clinicalQueries} hint="Recent sessions" />
        <StatCard icon={Pill} label="Pending Reviews" value={loading ? '…' : pendingReviews} hint="Awaiting sign-off" />
        <StatCard icon={UserX} label="Predicted No-Shows" value={loading ? '…' : predictedNoShows} hint="Upcoming appointments" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((m) => (
          <Card key={m.href} className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <m.icon className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <Badge variant="secondary">{m.status}</Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2">
              <h3 className="flex items-center gap-2 font-semibold">
                {m.title} <AIStatusBadge />
              </h3>
              <p className="flex-1 text-sm text-muted-foreground">{m.description}</p>
              <Button asChild className="mt-2 w-full sm:w-auto">
                <Link to={m.href}>Open {m.title}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card className="flex flex-col sm:col-span-2 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Recent AI Activity
            </CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link to="/ai/activity">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ApiLoading label="Loading activity…" />
            ) : insights.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No AI activity yet — run an assessment to populate this feed.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {insights.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.module} · {a.patient_name ?? '—'} · {a.created_at.slice(0, 16).replace('T', ' ')}
                      </p>
                    </div>
                    <AIActivityStatusBadge status={insightStatus(a.review_status)} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AIDisclaimer variant="general" />
    </div>
  )
}
