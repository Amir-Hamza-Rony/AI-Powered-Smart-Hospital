import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, CheckCircle2, AlertTriangle, Clock3, XCircle, Plus, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { PharmacyInventoryTable } from '@/components/phase3/PharmacyInventoryTable'
import { listBatches, listMedicines, type BackendMedicine } from '@/lib/api/pharmacy'
import { toInventoryItem } from '@/lib/api/adapters'
import { canManageInventory } from '@/lib/api/hooks'
import type { InventoryItem } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function PharmacyDashboardPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [medicines, setMedicines] = useState<BackendMedicine[]>([])
  const [preview, setPreview] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [nonce, setNonce] = useState(0)
  const manageable = canManageInventory(user?.role ?? null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      listMedicines({ page_size: 100 }),
      listBatches({ search: query.trim() || undefined, page_size: 6 }),
    ])
      .then(([medicinesPage, batchesPage]) => {
        if (!active) return
        setMedicines(medicinesPage.results)
        const byId = new Map(medicinesPage.results.map((m) => [m.id, m]))
        setPreview(batchesPage.results.map((b) => toInventoryItem(b, byId.get(b.medicine))))
        setLoadError(null)
        setErrorStatus(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load pharmacy data.')
        setErrorStatus((err as { status?: number })?.status ?? null)
        setMedicines([])
        setPreview([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [query, nonce])

  const total = medicines.length
  const inStock = medicines.filter((m) => m.stock_status === 'In Stock').length
  const lowStock = medicines.filter((m) => m.stock_status === 'Low Stock').length
  const nearExpiry = medicines.filter((m) => m.stock_status === 'Near Expiry').length
  const outOfStock = medicines.filter((m) => m.stock_status === 'Out of Stock').length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pharmacy Dashboard"
        description="Inventory overview"
        actions={
          <>
            <Button variant="outline" asChild><Link to="/pharmacy/alerts">View Alerts</Link></Button>
            {manageable && <Button asChild><Link to="/pharmacy/inventory/new"><Plus className="mr-1 h-4 w-4" /> Add Medicine</Link></Button>}
          </>
        }
      />
      {loading ? (
        <ApiLoading label="Loading pharmacy overview…" />
      ) : errorStatus === 403 ? (
        <ApiForbiddenState message={loadError} />
      ) : loadError ? (
        <ApiErrorState message={loadError} onRetry={() => setNonce((n) => n + 1)} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard icon={Package} label="Total Medicines" value={total} hint="SKUs tracked" />
            <StatCard icon={CheckCircle2} label="In Stock" value={inStock} hint="Healthy" />
            <StatCard icon={AlertTriangle} label="Low Stock" value={lowStock} hint="Reorder soon" />
            <StatCard icon={Clock3} label="Near Expiry" value={nearExpiry} hint="Check batches" />
            <StatCard icon={XCircle} label="Out of Stock" value={outOfStock} hint="Urgent" />
          </div>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Inventory Snapshot</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Quick search…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-52 pl-9" aria-label="Quick search inventory" />
                </div>
                <Button variant="outline" size="sm" asChild><Link to="/pharmacy/inventory">Full Inventory</Link></Button>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <PharmacyInventoryTable items={preview} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
