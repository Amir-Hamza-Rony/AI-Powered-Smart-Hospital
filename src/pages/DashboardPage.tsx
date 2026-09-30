import { Link } from 'react-router-dom'
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Hourglass,
  LayoutTemplate,
  MoonStar,
  Sidebar,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { useRole } from '@/context/RoleContext'
import { useTheme } from '@/context/ThemeContext'
import { useHospitalStore } from '@/store/HospitalStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge'

ChartJS.register(ArcElement, Tooltip, Legend)

const SHELL_CHECKS = [
  { icon: LayoutTemplate, title: 'Responsive layout', desc: 'Sidebar collapses on desktop, drawer on mobile.' },
  { icon: Sidebar, title: 'Navigation', desc: 'Grouped nav with active states across routes.' },
  { icon: MoonStar, title: 'Theme switching', desc: 'Light / Dark / System persisted to localStorage.' },
  { icon: Users, title: 'Mock roles', desc: 'Switch between 6 roles; header + sidebar reflect it.' },
]

const TODAY = '2026-09-30'

export function DashboardPage() {
  const { roleMeta } = useRole()
  const { mode, resolved } = useTheme()
  const { patients, appointments } = useHospitalStore()

  const totalPatients = patients.length
  const newPatients = patients.filter((p) => p.totalVisits <= 1).length
  const activePatients = patients.filter((p) => p.status === 'Active').length

  const todaysAppointments = appointments.filter((a) => a.date === TODAY)
  const pending = appointments.filter((a) => a.status === 'Pending').length
  const completed = appointments.filter((a) => a.status === 'Completed').length
  const cancelled = appointments.filter((a) => a.status === 'Cancelled').length
  const confirmed = appointments.filter((a) => a.status === 'Confirmed').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hospital overview — viewing as <strong>{roleMeta.label}</strong> · theme{' '}
            <strong>
              {mode} ({resolved})
            </strong>
          </p>
        </div>
        <Badge>Phase 2 · Mock data</Badge>
      </div>

      {/* Patient statistics */}
      <section aria-label="Patient statistics">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Patients</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard icon={Users} label="Total Patients" value={totalPatients} hint={`${activePatients} active`} />
          <StatCard icon={UserPlus} label="New Patients" value={newPatients} hint="1 or fewer visits" />
          <StatCard icon={CheckCircle2} label="Active Patients" value={activePatients} hint="Currently under care" />
        </div>
      </section>

      {/* Appointment statistics */}
      <section aria-label="Appointment statistics">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Appointments</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={CalendarCheck} label="Today's Appointments" value={todaysAppointments.length} hint={TODAY} />
          <StatCard icon={Hourglass} label="Pending" value={pending} hint="Awaiting confirmation" />
          <StatCard icon={CheckCircle2} label="Completed" value={completed} hint="Finished visits" />
          <StatCard icon={XCircle} label="Cancelled" value={cancelled} hint="Terminal state" />
        </div>
      </section>

      {/* Appointment overview: chart + today's list */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Appointments by Status</CardTitle></CardHeader>
          <CardContent>
            <div className="mx-auto max-w-[240px]">
              <Doughnut
                data={{
                  labels: ['Confirmed', 'Pending', 'Completed', 'Cancelled'],
                  datasets: [
                    {
                      data: [confirmed, pending, completed, cancelled],
                      backgroundColor: ['#0d9488', '#f59e0b', '#64748b', '#ef4444'],
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Today's Schedule ({TODAY})
            </CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link to="/appointments">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todaysAppointments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No appointments scheduled for today.</p>
            ) : (
              <ul className="divide-y divide-border">
                {todaysAppointments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <Link to={`/appointments/${a.id}`} className="font-medium hover:text-primary hover:underline">
                        {a.time} — {a.patientName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{a.doctorName} · {a.type}</p>
                    </div>
                    <AppointmentStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Phase 1 shell checks (kept, condensed) */}
      <section aria-label="Application shell status">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Application Shell · Phase 1</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SHELL_CHECKS.map((c) => (
            <div key={c.title} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <c.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-2 text-sm font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ready
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
