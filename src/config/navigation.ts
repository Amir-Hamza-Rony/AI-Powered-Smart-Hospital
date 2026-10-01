import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  Pill,
  FlaskConical,
  Receipt,
  Settings,
  FileText,
  CalendarClock,
  BookOpen,
  ClipboardList,
  TestTube2,
  Package,
  Truck,
  BellRing,
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
    label: 'Patient Management',
    items: [{ title: 'Patients', href: '/patients', icon: Users }],
  },
  {
    label: 'Doctor Management',
    items: [{ title: 'Doctors', href: '/doctors', icon: Stethoscope }],
  },
  {
    label: 'Appointments',
    items: [{ title: 'Appointments', href: '/appointments', icon: CalendarDays }],
  },
  {
    label: 'Prescription & Treatment',
    items: [
      { title: 'Prescriptions', href: '/prescriptions', icon: FileText },
      { title: 'Follow-ups', href: '/follow-ups', icon: CalendarClock },
      { title: 'Medicines', href: '/medicines', icon: BookOpen },
    ],
  },
  {
    label: 'Laboratory',
    items: [
      { title: 'Lab Dashboard', href: '/lab', icon: FlaskConical },
      { title: 'Lab Orders', href: '/lab/orders', icon: ClipboardList },
      { title: 'Lab Tests', href: '/lab/tests', icon: TestTube2 },
    ],
  },
  {
    label: 'Pharmacy',
    items: [
      { title: 'Pharmacy Dashboard', href: '/pharmacy', icon: Pill },
      { title: 'Inventory', href: '/pharmacy/inventory', icon: Package },
      { title: 'Dispensing', href: '/pharmacy/dispensing', icon: Truck },
      { title: 'Alerts', href: '/pharmacy/alerts', icon: BellRing },
    ],
  },
  {
    label: 'Operations',
    items: [{ title: 'Billing', href: '/billing', icon: Receipt, badge: 'Soon' }],
  },
  {
    label: 'System',
    items: [{ title: 'Settings', href: '/settings', icon: Settings }],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)
