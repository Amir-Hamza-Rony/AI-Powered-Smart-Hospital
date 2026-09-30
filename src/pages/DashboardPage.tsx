import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, LayoutTemplate, MoonStar, Sidebar, Users } from 'lucide-react'
import { useRole } from '@/context/RoleContext'
import { useTheme } from '@/context/ThemeContext'
import { Badge } from '@/components/ui/badge'

const CHECKS = [
  { icon: LayoutTemplate, title: 'Responsive layout', desc: 'Sidebar collapses on desktop, drawer on mobile.' },
  { icon: Sidebar, title: 'Navigation', desc: 'Grouped nav with active states across routes.' },
  { icon: MoonStar, title: 'Theme switching', desc: 'Light / Dark / System persisted to localStorage.' },
  { icon: Users, title: 'Mock roles', desc: 'Switch between 6 roles; header + sidebar reflect it.' },
]

export function DashboardPage() {
  const { roleMeta } = useRole()
  const { mode, resolved } = useTheme()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Phase 1 shell verification — viewing as <strong>{roleMeta.label}</strong> · theme{' '}
            <strong>
              {mode} ({resolved})
            </strong>
          </p>
        </div>
        <Badge>Phase 1 · App Shell</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CHECKS.map((c) => (
          <div key={c.title} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <c.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-2 text-sm font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ready
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Module pages (Patients, Appointments, Doctors, Pharmacy, Laboratory, Billing) are intentional placeholders in
        Phase 1. Open any of them from the sidebar to verify routing.{' '}
        <Link to="/patients" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Try Patients <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
