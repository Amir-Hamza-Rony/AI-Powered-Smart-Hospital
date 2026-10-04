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
  FileText,
  FlaskConical,
  Package,
  BellRing,
  Banknote,
  Wallet,
  Receipt,
  Sparkles,
  UserX,
  AlertTriangle,
} from 'lucide-react'
import { useRole } from '@/context/RoleContext'
import { useTheme } from '@/context/ThemeContext'
import { useHospitalStore } from '@/store/HospitalStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge'
import { formatBDT } from '@/data/billing'
import { AI_DASHBOARD_STATS, MOCK_AI_ACTIVITY } from '@/data/ai'
import { useAutomationStore } from '@/store/AutomationStore'

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
  const { patients, appointments, prescriptions, followUps, labOrders, inventory, invoices, payments } = useHospitalStore()

  const totalPatients = patients.length
  const newPatients = patients.filter((p) => p.totalVisits <= 1).length
  const activePatients = patients.filter((p) => p.status === 'Active').length

  const todaysAppointments = appointments.filter((a) => a.date === TODAY)
  const pending = appointments.filter((a) => a.status === 'Pending').length
  const completed = appointments.filter((a) => a.status === 'Completed').length
  const cancelled = appointments.filter((a) => a.status === 'Cancelled').length
  const confirmed = appointments.filter((a) => a.status === 'Confirmed').length

  const activePrescriptions = prescriptions.filter((p) => p.status === 'Active').length
  const followUpsDue = followUps.filter((f) => f.status === 'Upcoming' || f.status === 'Due Today').length
  const pendingLabs = labOrders.filter((o) => o.status === 'Pending').length
  const readyLabs = labOrders.filter((o) => o.status === 'Ready').length
  const lowStock = inventory.filter((i) => i.stockStatus === 'Low Stock').length
  const nearExpiry = inventory.filter((i) => i.stockStatus === 'Near Expiry').length

  const todaysRevenue = payments.filter((p) => p.date === TODAY && p.status === 'Completed').reduce((s, p) => s + p.amount, 0)
  const pendingPayments = invoices.filter((i) => i.status === 'Pending').reduce((s, i) => s + i.due, 0)
  const outstandingDues = invoices.reduce((s, i) => s + i.due, 0)
  const recentTransactions = [...payments].slice(0, 4)

  const { reminders, labAlerts, stockAlerts, queue, events } = useAutomationStore()
  const upcomingReminders = reminders.filter((r) => r.status === 'Scheduled' || r.status === 'Pending').length
  const criticalStock = stockAlerts.filter((s) => !s.resolved && s.status === 'Critical').length
  const readyLabAlerts = labAlerts.filter((l) => l.status === 'Ready')
  const waitingQueue = queue.filter((q) => q.status === 'Waiting')
  const currentSerial = [...queue].reverse().find((q) => q.status === 'Called')?.serial ?? '—'
  const recentAutomationEvents = events.slice(0, 3)

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
        <Badge>Demo data</Badge>
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

      {/* Prescriptions · Lab · Pharmacy statistics (additive) */}
      <section aria-label="Prescriptions, lab and pharmacy statistics">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prescriptions · Lab · Pharmacy</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Link to="/prescriptions"><StatCard icon={FileText} label="Active Prescriptions" value={activePrescriptions} hint="Currently active" /></Link>
          <Link to="/follow-ups"><StatCard icon={CalendarClock} label="Follow-ups Due" value={followUpsDue} hint="Upcoming + due today" /></Link>
          <Link to="/lab"><StatCard icon={FlaskConical} label="Pending Lab Orders" value={pendingLabs} hint={`${readyLabs} ready`} /></Link>
          <Link to="/lab"><StatCard icon={FlaskConical} label="Ready Reports" value={readyLabs} hint="Awaiting delivery" /></Link>
          <Link to="/pharmacy/alerts"><StatCard icon={Package} label="Low Stock" value={lowStock} hint="Reorder soon" /></Link>
          <Link to="/pharmacy/alerts"><StatCard icon={BellRing} label="Near Expiry" value={nearExpiry} hint="Check batches" /></Link>
        </div>
      </section>

      {/* Billing / financial summary (Phase 4, additive) */}
      <section aria-label="Billing summary">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Billing & Finance</h2>
          <Link to="/billing" className="text-xs font-medium text-primary hover:underline">
            Open billing →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Link to="/billing"><StatCard icon={Banknote} label="Today's Revenue" value={formatBDT(todaysRevenue)} hint={TODAY} /></Link>
          <Link to="/billing/payments"><StatCard icon={Hourglass} label="Pending Payments" value={formatBDT(pendingPayments)} hint="Awaiting collection" /></Link>
          <Link to="/billing/dues"><StatCard icon={Wallet} label="Outstanding Dues" value={formatBDT(outstandingDues)} hint="Across open invoices" /></Link>
        </div>
        <Card className="mt-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" /> Recent Transactions
            </CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link to="/billing/payments">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentTransactions.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <Link to={`/billing/invoices/${t.invoiceId}`} className="font-medium hover:text-primary hover:underline">
                        {t.id} — {t.patientName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.invoiceId} · {t.paymentMethod} · {formatBDT(t.amount)}
                      </p>
                    </div>
                    <Badge>{t.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* AI Intelligence summary (Phase 5, additive, mock data) */}
      <section aria-label="AI insights summary">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">AI Insights</h2>
          <Link to="/ai" className="text-xs font-medium text-primary hover:underline">
            Open AI hub →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link to="/ai/symptom-checker"><StatCard icon={AlertTriangle} label="High-Risk Cases" value={AI_DASHBOARD_STATS.highRiskCases} hint="Mock triage flags" /></Link>
          <Link to="/ai/prescription-advisory"><StatCard icon={FileText} label="Prescription Reviews" value={AI_DASHBOARD_STATS.prescriptionReviews} hint="Pending sign-off" /></Link>
          <Link to="/ai/no-show-prediction"><StatCard icon={UserX} label="High-Risk Appointments" value={AI_DASHBOARD_STATS.predictedNoShows} hint="Likely no-shows" /></Link>
          <Link to="/ai/activity"><StatCard icon={Sparkles} label="AI Queries" value={AI_DASHBOARD_STATS.clinicalQueries} hint="This week (mock)" /></Link>
        </div>
        <Card className="mt-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" /> Recent AI Activity
            </CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link to="/ai/activity">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {MOCK_AI_ACTIVITY.slice(0, 3).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{a.action}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.module} · {a.user} · {a.timestamp}
                    </p>
                  </div>
                  <Badge>{a.status}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Automation & real-time operations summary (Phase 6, additive, mock simulation) */}
      <section aria-label="Automation summary">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Automation & Real-Time Operations</h2>
          <Link to="/automation" className="text-xs font-medium text-primary hover:underline">
            Open automation →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link to="/automation/reminders"><StatCard icon={CalendarClock} label="Upcoming Reminders" value={upcomingReminders} hint="Scheduled + pending" /></Link>
          <Link to="/automation/stock-alerts"><StatCard icon={Package} label="Critical Stock" value={criticalStock} hint="Needs reorder" /></Link>
          <Link to="/automation/lab-alerts"><StatCard icon={FlaskConical} label="Reports Ready" value={readyLabAlerts.length} hint="Awaiting review" /></Link>
          <Link to="/automation/queue"><StatCard icon={Users} label="Waiting in Queue" value={waitingQueue.length} hint={`Now serving ${currentSerial}`} /></Link>
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Lab Alerts</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link to="/automation/lab-alerts">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {readyLabAlerts.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No reports awaiting review.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {readyLabAlerts.slice(0, 3).map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {l.labOrderId} — {l.test}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {l.patientName} · {l.orderedBy}
                        </p>
                      </div>
                      <Badge>{l.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Automation Events</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link to="/automation/activity">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {recentAutomationEvents.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{e.eventType}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.workflow} · {e.triggeredAt}
                      </p>
                    </div>
                    <Badge>{e.status}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
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

      {/* Application shell status (kept, condensed) */}
      <section aria-label="Application shell status">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Application Shell</h2>
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
