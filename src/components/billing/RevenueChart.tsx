import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { REVENUE_BY_DAY, REVENUE_BY_MONTH, REVENUE_BY_WEEK, formatBDT } from '@/data/billing'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export function RevenueChart({
  range,
  onRangeChange,
  data,
}: {
  range: 'daily' | 'weekly' | 'monthly'
  onRangeChange: (r: 'daily' | 'weekly' | 'monthly') => void
  /** Live series; falls back to static mock series when omitted. */
  data?: Array<{ label: string; revenue: number }>
}) {
  const fallback = range === 'daily' ? REVENUE_BY_DAY : range === 'weekly' ? REVENUE_BY_WEEK : REVENUE_BY_MONTH
  const series = data ?? fallback
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Revenue Overview</CardTitle>
        <Tabs value={range} onValueChange={(v) => onRangeChange(v as 'daily' | 'weekly' | 'monthly')}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <Bar
            data={{
              labels: series.map((d) => d.label),
              datasets: [
                {
                  label: 'Revenue (৳)',
                  data: series.map((d) => d.revenue),
                  backgroundColor: '#0d9488',
                  borderRadius: 6,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: { label: (ctx) => ` ${formatBDT(Number(ctx.raw))}` },
                },
              },
              scales: {
                y: { ticks: { callback: (v) => `৳${Number(v) / 1000}k` } },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
