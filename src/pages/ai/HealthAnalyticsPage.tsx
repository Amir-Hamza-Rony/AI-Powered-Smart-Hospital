import { useMemo, useState } from 'react'
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
import {
  AI_ANALYTICS_RANGES,
  AI_COMPLETION,
  AI_CONDITION_TRENDS,
  AI_DEPARTMENT_WORKLOAD,
  AI_DOCTOR_UTILIZATION,
  AI_LAB_ABNORMAL,
  AI_PEAK_HOURS,
  AI_PHARMACY_DEMAND,
  AI_VISITS_SERIES,
  type AIAnalyticsRange,
} from '@/data/ai'
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

  const effective: AIAnalyticsRange = range === 'custom' ? '30d' : range
  const visits = AI_VISITS_SERIES[effective]
  const pharmacy = AI_PHARMACY_DEMAND[effective]

  const kpis = useMemo(() => {
    const totalVisits = visits.visits.reduce((a, b) => a + b, 0)
    const totalAppts = visits.appointments.reduce((a, b) => a + b, 0)
    const completion = Math.round((AI_COMPLETION.completed / (AI_COMPLETION.completed + AI_COMPLETION.noShow + AI_COMPLETION.cancelled + AI_COMPLETION.pending)) * 100)
    return { totalVisits, totalAppts, completion, avgWait: '18 min' }
  }, [visits])

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Health Analytics"
        description="Operational, clinical and resource trends · simulated mock data"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai">
              <ArrowLeft className="mr-1 h-4 w-4" /> AI Hub
            </Link>
          </Button>
        }
      />

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
                Custom range maps to the nearest mock series ({customFrom} → {customTo}).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Patient Visits" value={kpis.totalVisits} hint="In selected period (mock)" />
        <StatCard icon={Stethoscope} label="Appointments" value={kpis.totalAppts} hint="Booked volume (mock)" />
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
                  labels: AI_DEPARTMENT_WORKLOAD.labels,
                  datasets: [{ label: 'Cases', data: AI_DEPARTMENT_WORKLOAD.load, backgroundColor: TEAL, borderRadius: 6 }],
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
                  datasets: [{ data: [AI_COMPLETION.completed, AI_COMPLETION.noShow, AI_COMPLETION.cancelled, AI_COMPLETION.pending], backgroundColor: [TEAL, RED, AMBER, SLATE], borderWidth: 2 }],
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
                  labels: AI_PEAK_HOURS.labels,
                  datasets: [{ label: 'Arrivals', data: AI_PEAK_HOURS.volume, backgroundColor: AMBER, borderRadius: 6 }],
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
                  labels: AI_CONDITION_TRENDS.labels,
                  datasets: [{ label: 'Cases', data: AI_CONDITION_TRENDS.cases, backgroundColor: TEAL, borderRadius: 6 }],
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
            {AI_LAB_ABNORMAL.map((l) => (
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
            {AI_DOCTOR_UTILIZATION.map((d) => (
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
    </div>
  )
}
