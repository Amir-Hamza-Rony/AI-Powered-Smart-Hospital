import { useEffect, useState } from 'react'
import { AlertTriangle, Clock3, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { StockStatusBadge } from '@/components/phase3/StatusBadges'
import { listBatches, listMedicines, type BackendMedicine, type BackendMedicineBatch } from '@/lib/api/pharmacy'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export function AlertsPage() {
  const [batches, setBatches] = useState<BackendMedicineBatch[]>([])
  const [medicines, setMedicines] = useState<BackendMedicine[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([listBatches({ page_size: 100 }), listMedicines({ page_size: 100 })])
      .then(([batchesPage, medicinesPage]) => {
        if (!active) return
        setBatches(batchesPage.results)
        setMedicines(medicinesPage.results)
        setLoadError(null)
        setErrorStatus(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load alerts.')
        setErrorStatus((err as { status?: number })?.status ?? null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [nonce])

  const medicineById = new Map(medicines.map((m) => [m.id, m]))
  const lowStock = medicines.filter((m) => m.stock_status === 'Low Stock')
  const nearExpiry = batches.filter((b) => b.is_near_expiry && !b.is_expired && b.quantity > 0)
  const outOfStock = medicines.filter((m) => m.stock_status === 'Out of Stock')

  return (
    <div className="space-y-4">
      <PageHeader title="Stock Alerts" description="Low stock, near-expiry and out-of-stock from live inventory." />
      {loading ? (
        <ApiLoading label="Loading stock alerts…" />
      ) : errorStatus === 403 ? (
        <ApiForbiddenState message={loadError} />
      ) : loadError ? (
        <ApiErrorState message={loadError} onRetry={() => setNonce((n) => n + 1)} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-amber-500/40">
            <CardHeader className="flex flex-row items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Low Stock ({lowStock.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStock.length === 0 && <p className="text-sm text-muted-foreground">No low-stock items.</p>}
              {lowStock.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">Available {m.available_stock} · Reorder at {m.reorder_level}</p>
                  <div className="mt-1"><StockStatusBadge status={m.stock_status} /></div>
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
              {nearExpiry.map((b) => (
                <div key={b.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-semibold">{b.medicine_name}</p>
                  <p className="text-xs text-muted-foreground">Batch {b.batch_number} · Qty {b.quantity} · Exp {b.expiry_date}</p>
                  <div className="mt-1"><StockStatusBadge status={medicineById.get(b.medicine)?.stock_status ?? 'Near Expiry'} /></div>
                  <p className="mt-1 text-xs text-muted-foreground">{daysUntil(b.expiry_date)} days remaining</p>
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
              {outOfStock.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.generic_name} · {m.manufacturer}</p>
                  <div className="mt-1"><StockStatusBadge status={m.stock_status} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
