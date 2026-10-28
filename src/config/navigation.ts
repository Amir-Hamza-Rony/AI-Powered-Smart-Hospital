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
  CreditCard,
  Wallet,
  ShieldCheck,
  Sparkles,
  HeartPulse,
  Bot,
  Activity,
  History,
  Zap,
  Bell,
  type LucideIcon,
} from 'lucide-react'
import type { MockRole } from '@/context/RoleContext'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
  roles?: MockRole[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

const STAFF: MockRole[] = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist']
const CLINICAL: MockRole[] = ['admin', 'doctor', 'nurse', 'receptionist']
const RX_CLINICAL: MockRole[] = ['admin', 'doctor']
const ANALYTICS: MockRole[] = ['admin', 'doctor']
const REVIEW: MockRole[] = ['admin', 'doctor']
const ALL: MockRole[] = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'patient']
const ADMIN_ONLY: MockRole[] = ['admin']

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ALL }],
  },
  {
    label: 'Patient Management',
    items: [{ title: 'Patients', href: '/patients', icon: Users, roles: STAFF }],
  },
  {
    label: 'Doctor Management',
    items: [{ title: 'Doctors', href: '/doctors', icon: Stethoscope, roles: STAFF }],
  },
  {
    label: 'Appointments',
    items: [{ title: 'Appointments', href: '/appointments', icon: CalendarDays, roles: STAFF }],
  },
  {
    label: 'Prescription & Treatment',
    items: [
      { title: 'Prescriptions', href: '/prescriptions', icon: FileText, roles: STAFF },
      { title: 'Follow-ups', href: '/follow-ups', icon: CalendarClock, roles: STAFF },
      { title: 'Medicines', href: '/medicines', icon: BookOpen, roles: STAFF },
    ],
  },
  {
    label: 'Laboratory',
    items: [
      { title: 'Lab Dashboard', href: '/lab', icon: FlaskConical, roles: STAFF },
      { title: 'Lab Orders', href: '/lab/orders', icon: ClipboardList, roles: STAFF },
      { title: 'Lab Tests', href: '/lab/tests', icon: TestTube2, roles: STAFF },
    ],
  },
  {
    label: 'Pharmacy',
    items: [
      { title: 'Pharmacy Dashboard', href: '/pharmacy', icon: Pill, roles: STAFF },
      { title: 'Inventory', href: '/pharmacy/inventory', icon: Package, roles: STAFF },
      { title: 'Dispensing', href: '/pharmacy/dispensing', icon: Truck, roles: STAFF },
      { title: 'Alerts', href: '/pharmacy/alerts', icon: BellRing, roles: STAFF },
    ],
  },
  {
    label: 'Billing',
    items: [
      { title: 'Billing Dashboard', href: '/billing', icon: Receipt, roles: STAFF },
      { title: 'Invoices', href: '/billing/invoices', icon: FileText, roles: STAFF },
      { title: 'Payments', href: '/billing/payments', icon: CreditCard, roles: STAFF },
      { title: 'Outstanding Dues', href: '/billing/dues', icon: Wallet, roles: STAFF },
      { title: 'Insurance Claims', href: '/billing/claims', icon: ShieldCheck, roles: STAFF },
      { title: 'Financial Ledger', href: '/billing/ledger', icon: BookOpen, roles: STAFF },
    ],
  },
  {
    label: 'AI Intelligence',
    items: [
      { title: 'AI Dashboard', href: '/ai', icon: Sparkles, roles: CLINICAL },
      { title: 'Symptom Checker', href: '/ai/symptom-checker', icon: HeartPulse, roles: CLINICAL },
      { title: 'Clinical Assistant', href: '/ai/clinical-assistant', icon: Bot, roles: CLINICAL },
      { title: 'Prescription Advisory', href: '/ai/prescription-advisory', icon: Pill, roles: RX_CLINICAL },
      { title: 'No-Show Prediction', href: '/ai/no-show-prediction', icon: CalendarClock, roles: CLINICAL },
      { title: 'Health Analytics', href: '/ai/health-analytics', icon: Activity, roles: ANALYTICS },
      { title: 'AI Activity', href: '/ai/activity', icon: History, roles: REVIEW },
    ],
  },
  {
    label: 'Automation',
    items: [
      { title: 'Automation Dashboard', href: '/automation', icon: Zap, roles: STAFF },
      { title: 'Appointment Reminders', href: '/automation/reminders', icon: CalendarClock, roles: STAFF },
      { title: 'Lab Alerts', href: '/automation/lab-alerts', icon: FlaskConical, roles: STAFF },
      { title: 'Stock Alerts', href: '/automation/stock-alerts', icon: Package, roles: STAFF },
      { title: 'Live Queue', href: '/automation/queue', icon: Users, roles: STAFF },
      { title: 'Activity', href: '/automation/activity', icon: Activity, roles: STAFF },
    ],
  },
  {
    label: 'Notifications',
    items: [{ title: 'Notifications', href: '/notifications', icon: Bell, roles: ALL }],
  },
  {
    label: 'System',
    items: [{ title: 'Settings', href: '/settings', icon: Settings, roles: ADMIN_ONLY }],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)
