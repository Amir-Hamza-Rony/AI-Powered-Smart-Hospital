import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import {
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  FilePlus2,
  HandCoins,
  Hourglass,
  Receipt,
  Wallet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { formatBDT } from '@/data/billing'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { RevenueChart } from '@/components/billing/RevenueChart'
import { PaymentTable } from '@/components/billing/PaymentTable'
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

ChartJS.register(ArcElement, Tooltip, Legend)

export function BillingDashboardPage() {
  const { invoices, payments } = useHospitalStore()
  const { success } = useToast()
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [payOpen, setPayOpen] = useState(false)

  const totalRevenue = useMemo(() => invoices.reduce((s, i) => s + i.paid, 0), [invoices])
  const todayRevenue = useMemo(
    () => payments.filter((p) => p.date === '2026-09-30' && p.status === 'Completed').reduce((s, p) => s + p.amount, 0),
    [payments],
  )
  const pendingPayments = useMemo(() => invoices.filter((i) => i.status === 'Pending').reduce((s, i) => s + i.due, 0), [invoices])
  const outstanding = useMemo(() => invoices.reduce((s, i) => s + i.due, 0), [invoices])
  const paidCount = invoices.filter((i) => i.status === 'Paid').length
  const unpaidCount = invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled').length

  const paid = invoices.filter((i) => i.status === 'Paid').length
  const pending = invoices.filter((i) => i.status === 'Pending').length
  const partial = invoices.filter((i) => i.status === 'Partially Paid').length
  const overdue = invoices.filter((i) => i.status === 'Overdue').length

  const recent = [...payments].slice(0, 5)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing Dashboard"
        description="Revenue, payments & dues overview · mock data"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/billing/ledger">View Ledger</Link>
            </Button>
            <Button variant="outline" onClick={() => setPayOpen(true)}>
              <HandCoins className="mr-1 h-4 w-4" /> Record Payment
            </Button>
            <Button asChild>
              <Link to="/billing/invoices/new">
                <FilePlus2 className="mr-1 h-4 w-4" /> Create Invoice
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={BadgeDollarSign} label="Total Revenue" value={formatBDT(totalRevenue)} hint={`${paidCount} paid invoices`} />
        <StatCard icon={Banknote} label="Today's Revenue" value={formatBDT(todayRevenue)} hint="2026-09-30 · completed" />
        <StatCard icon={Hourglass} label="Pending Payments" value={formatBDT(pendingPayments)} hint="Awaiting collection" />
        <StatCard icon={Wallet} label="Outstanding Dues" value={formatBDT(outstanding)} hint="Across open invoices" />
        <StatCard icon={CheckCircle2} label="Paid Invoices" value={paidCount} hint="Fully settled" />
        <StatCard icon={AlertTriangle} label="Unpaid Invoices" value={unpaidCount} hint="Open + overdue" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <RevenueChart range={range} onRangeChange={setRange} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto max-w-[240px]">
              <Doughnut
                data={{
                  labels: ['Paid', 'Pending', 'Partially Paid', 'Overdue'],
                  datasets: [
                    {
                      data: [paid, pending, partial, overdue],
                      backgroundColor: ['#0d9488', '#f59e0b', '#0ea5e9', '#ef4444'],
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-md bg-muted p-2"><p className="font-bold">{paid}</p><p className="text-muted-foreground">Paid</p></div>
              <div className="rounded-md bg-muted p-2"><p className="font-bold">{pending}</p><p className="text-muted-foreground">Pending</p></div>
              <div className="rounded-md bg-muted p-2"><p className="font-bold">{partial}</p><p className="text-muted-foreground">Partial</p></div>
              <div className="rounded-md bg-muted p-2"><p className="font-bold">{overdue}</p><p className="text-muted-foreground">Overdue</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" /> Recent Transactions
          </CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link to="/billing/payments">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <PaymentTable payments={recent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/billing/invoices/new">
              <FilePlus2 className="mr-1 h-4 w-4" /> Create Invoice
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setPayOpen(true)}>
            <HandCoins className="mr-1 h-4 w-4" /> Record Payment
          </Button>
          <Button variant="outline" asChild>
            <Link to="/billing/dues">
              <CalendarClock className="mr-1 h-4 w-4" /> View Outstanding Dues
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/billing/ledger">View Financial Ledger</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => success('Reminder queue opened', 'Payment reminders are frontend-only in Phase 4.')}
          >
            Send reminders
          </Button>
        </CardContent>
      </Card>

      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} />
    </div>
  )
}
