import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { ArrowLeft, FlaskConical, Pill, Stethoscope, Users } from 'lucide-react'
import { AI_ANALYTICS_RANGES, type AIAnalyticsRange } from '@/data/ai'
import { getAnalytics, type BackendAnalytics } from '@/lib/api/ai'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { AIStatusBadge } from '@/components/ai/AIBadges'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend)

const TEAL = '#0d9488'
const TEAL_SOFT = 'rgba(13, 148, 136, 0.25)'
const SLATE = '#64748b'
const AMBER = '#f59e0b'
const RED = '#ef4444'

export function HealthAnalyticsPage() {
  const [range, setRange] = useState<AIAnalyticsRange | 'custom'>('7d')
  const [customFrom, setCustomFrom] = useState('2026-09-01')
  const [customTo, setCustomTo] = useState('2026-09-30')
  const [data, setData] = useState<BackendAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [nonce, setNonce] = useState(0)

  // Custom ranges map to the nearest supported window on the backend.
  const effective: AIAnalyticsRange =
    range === 'custom'
      ? Math.round(
          (new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000,
        ) > 31
        ? '3m'
        : '30d'
      : range

  useEffect(() => {
    let active = true
    setLoading(true)
    getAnalytics(effective)
      .then((analytics) => {
        if (!active) return
        setData(analytics)
        setLoadError(null)
        setErrorStatus(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setData(null)
        setLoadError(err instanceof Error ? err.message : 'Failed to load analytics.')
        setErrorStatus((err as { status?: number })?.status ?? null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [effective, nonce])

  const visits = data?.visits ?? { labels: [], visits: [], appointments: [] }
  const pharmacy = data?.pharmacyDemand ?? { labels: [], dispensed: [] }
  const completion = data?.completion ?? { completed: 0, noShow: 0, cancelled: 0, pending: 0 }

  const totalVisits = visits.visits.reduce((a, b) => a + b, 0)
  const totalAppts = visits.appointments.reduce((a, b) => a + b, 0)
  const completionBase = completion.completed + completion.noShow + completion.cancelled + completion.pending
  const completionRate = completionBase > 0 ? Math.round((completion.completed / completionBase) * 100) : 0
  const kpis = { totalVisits, totalAppts, completion: completionRate, avgWait: '—' }

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Health Analytics"
        description="Operational, clinical and resource trends · computed from live hospital data"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai">
              <ArrowLeft className="mr-1 h-4 w-4" /> AI Hub
            </Link>
          </Button>
        }
      />

      {loading ? (
        <ApiLoading label="Computing analytics…" />
      ) : errorStatus === 403 ? (
        <ApiForbiddenState message={loadError} />
      ) : loadError || !data ? (
        <ApiErrorState message={loadError} onRetry={() => setNonce((n) => n + 1)} />
      ) : (
        <>
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <Tabs value={range} onValueChange={(v) => setRange(v as AIAnalyticsRange | 'custom')}>
            <TabsList className="flex-wrap">
              {AI_ANALYTICS_RANGES.map((r) => (
                <TabsTrigger key={r.value} value={r.value}>
                  {r.label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="custom">Custom Range</TabsTrigger>
            </TabsList>
          </Tabs>
          {range === 'custom' && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label>From</Label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} aria-label="Custom range from" />
              </div>
              <div className="space-y-1">
                <Label>To</Label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} aria-label="Custom range to" />
              </div>
              <p className="w-full text-xs text-muted-foreground lg:w-auto">
                Custom range uses the nearest supported window ({customFrom} → {customTo}).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Patient Visits" value={kpis.totalVisits} hint="In selected period" />
        <StatCard icon={Stethoscope} label="Appointments" value={kpis.totalAppts} hint="Booked volume" />
        <StatCard icon={FlaskConical} label="Completion Rate" value={`${kpis.completion}%`} hint="Completed share" />
        <StatCard icon={Pill} label="Avg. Waiting Time" value={kpis.avgWait} hint="Trend indicator" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Patient Visits Over Time</CardTitle>
            <AIStatusBadge />
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <Line
                data={{
                  labels: visits.labels,
                  datasets: [
                    { label: 'Visits', data: visits.visits, borderColor: TEAL, backgroundColor: TEAL_SOFT, fill: true, tension: 0.35 },
                    { label: 'Appointments', data: visits.appointments, borderColor: SLATE, borderDash: [5, 4], tension: 0.35 },
                  ],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Department Workload</CardTitle>
            <AIStatusBadge />
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <Bar
                data={{
                  labels: data.departmentWorkload.labels,
                  datasets: [{ label: 'Cases', data: data.departmentWorkload.load, backgroundColor: TEAL, borderRadius: 6 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Appointment Completion</CardTitle>
            <AIStatusBadge />
          </CardHeader>
          <CardContent>
            <div className="mx-auto h-[260px] max-w-[300px]">
              <Doughnut
                data={{
                  labels: ['Completed', 'No-show', 'Cancelled', 'Pending'],
                  datasets: [{ data: [completion.completed, completion.noShow, completion.cancelled, completion.pending], backgroundColor: [TEAL, RED, AMBER, SLATE], borderWidth: 2 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Peak Hours</CardTitle>
            <AIStatusBadge />
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <Bar
                data={{
                  labels: data.peakHours.labels,
                  datasets: [{ label: 'Arrivals', data: data.peakHours.volume, backgroundColor: AMBER, borderRadius: 6 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Common Conditions</CardTitle>
            <AIStatusBadge />
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <Bar
                data={{
                  labels: data.conditionTrends.labels,
                  datasets: [{ label: 'Cases', data: data.conditionTrends.cases, backgroundColor: TEAL, borderRadius: 6 }],
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Pharmacy Demand</CardTitle>
            <AIStatusBadge />
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <Bar
                data={{
                  labels: pharmacy.labels,
                  datasets: [{ label: 'Units dispensed', data: pharmacy.dispensed, backgroundColor: TEAL, borderRadius: 6 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Abnormal Lab Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.labAbnormal.length === 0 && (
              <p className="text-sm text-muted-foreground">No abnormal indicators in this period.</p>
            )}
            {data.labAbnormal.map((l) => (
              <div key={l.indicator} className="flex items-center justify-between gap-2 text-sm">
                <span>{l.indicator}</span>
                <span className="font-semibold">{l.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doctor Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.doctorUtilization.length === 0 && (
              <p className="text-sm text-muted-foreground">No appointment volume in this period.</p>
            )}
            {data.doctorUtilization.map((d) => (
              <div key={d.doctor} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{d.doctor}</span>
                  <span className="font-semibold">{d.utilization}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={d.utilization} aria-valuemin={0} aria-valuemax={100} aria-label={`${d.doctor} utilization`}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${d.utilization}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <AIDisclaimer variant="analytics" />
        </>
      )}
    </div>
  )
}
