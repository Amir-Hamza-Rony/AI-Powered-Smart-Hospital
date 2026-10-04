import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { PharmacyInventoryTable } from '@/components/phase3/PharmacyInventoryTable'
import { listBatches, listMedicines, type BackendMedicine } from '@/lib/api/pharmacy'
import { toInventoryItem } from '@/lib/api/adapters'
import { canManageInventory } from '@/lib/api/hooks'
import type { InventoryItem } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8
// Batch rows carry no server-side stock-status filter, so inventory loads a
// bounded window (server search applies) and filters/paginates locally.
const WINDOW_SIZE = 100

export function InventoryPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<InventoryItem[]>([])
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
      listBatches({ search: query.trim() || undefined, page_size: WINDOW_SIZE }),
    ])
      .then(([medicinesPage, batchesPage]) => {
        if (!active) return
        const byId = new Map<string, BackendMedicine>(
          medicinesPage.results.map((m) => [m.id, m]),
        )
        let rows = batchesPage.results.map((b) => toInventoryItem(b, byId.get(b.medicine)))
        if (status !== 'all') rows = rows.filter((i) => i.stockStatus === status)
        setItems(rows)
        setLoadError(null)
        setErrorStatus(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load inventory.')
        setErrorStatus((err as { status?: number })?.status ?? null)
        setItems([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [query, status, nonce])

  const reset = () => setPage(1)
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        description={`${items.length} item${items.length === 1 ? '' : 's'}`}
        actions={manageable ? <Button asChild><Link to="/pharmacy/inventory/new"><Plus className="mr-1 h-4 w-4" /> Add Medicine</Link></Button> : undefined}
      />
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search medicine or batch…" value={query} onChange={(e) => { setQuery(e.target.value); reset() }} className="pl-9" aria-label="Search inventory" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); reset() }}>
            <SelectTrigger className="sm:w-[220px]" aria-label="Stock status filter"><SelectValue placeholder="Stock status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {['In Stock', 'Low Stock', 'Near Expiry', 'Out of Stock'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      {loading ? (
        <ApiLoading label="Loading inventory…" />
      ) : errorStatus === 403 ? (
        <ApiForbiddenState message={loadError} />
      ) : loadError ? (
        <ApiErrorState message={loadError} onRetry={() => setNonce((n) => n + 1)} />
      ) : pageItems.length === 0 ? (
        <EmptyState title="No inventory items found" description="Try adjusting search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <PharmacyInventoryTable items={pageItems} />
            <DataPagination page={safePage} totalPages={totalPages} total={items.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
