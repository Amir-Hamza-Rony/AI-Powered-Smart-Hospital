import { AlertTriangle, Clock3, XCircle } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { StockStatusBadge } from '@/components/phase3/StatusBadges'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function daysUntil(dateStr: string): number {
  const now = new Date('2026-10-01').getTime()
  return Math.ceil((new Date(dateStr).getTime() - now) / 86400000)
}

export function AlertsPage() {
  const { inventory } = useHospitalStore()
  const lowStock = inventory.filter((i) => i.stockStatus === 'Low Stock')
  const nearExpiry = inventory.filter((i) => i.stockStatus === 'Near Expiry')
  const outOfStock = inventory.filter((i) => i.stockStatus === 'Out of Stock')

  return (
    <div className="space-y-4">
      <PageHeader title="Stock Alerts" description="Low stock, near-expiry and out-of-stock · mock data" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-amber-500/40">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Low Stock ({lowStock.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 && <p className="text-sm text-muted-foreground">No low-stock items.</p>}
            {lowStock.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold">{i.medicine}</p>
                <p className="text-xs text-muted-foreground">Qty {i.quantity} · Reorder at {i.reorderLevel} · {i.batchNumber}</p>
                <div className="mt-1"><StockStatusBadge status={i.stockStatus} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-orange-500/40">
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock3 className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-base">Near Expiry ({nearExpiry.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nearExpiry.length === 0 && <p className="text-sm text-muted-foreground">No near-expiry batches.</p>}
            {nearExpiry.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold">{i.medicine}</p>
                <p className="text-xs text-muted-foreground">Batch {i.batchNumber} · Qty {i.quantity} · Exp {i.expiryDate}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline">{daysUntil(i.expiryDate)} days remaining</Badge>
                  <StockStatusBadge status={i.stockStatus} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-destructive/40">
          <CardHeader className="flex flex-row items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base">Out of Stock ({outOfStock.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {outOfStock.length === 0 && <p className="text-sm text-muted-foreground">Nothing out of stock.</p>}
            {outOfStock.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold">{i.medicine}</p>
                <p className="text-xs text-muted-foreground">{i.genericName} · {i.supplier}</p>
                <div className="mt-1"><StockStatusBadge status={i.stockStatus} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
