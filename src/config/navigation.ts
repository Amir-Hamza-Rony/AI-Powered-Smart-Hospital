import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  Pill,
  FlaskConical,
  Receipt,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
  roles?: string[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Care',
    items: [
      { title: 'Patients', href: '/patients', icon: Users, badge: 'Phase 2' },
      { title: 'Appointments', href: '/appointments', icon: CalendarDays, badge: 'Phase 2' },
      { title: 'Doctors', href: '/doctors', icon: Stethoscope, badge: 'Phase 2' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Pharmacy', href: '/pharmacy', icon: Pill, badge: 'Phase 2' },
      { title: 'Laboratory', href: '/laboratory', icon: FlaskConical, badge: 'Phase 2' },
      { title: 'Billing', href: '/billing', icon: Receipt, badge: 'Phase 2' },
    ],
  },
  {
    label: 'System',
    items: [{ title: 'Settings', href: '/settings', icon: Settings }],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)
