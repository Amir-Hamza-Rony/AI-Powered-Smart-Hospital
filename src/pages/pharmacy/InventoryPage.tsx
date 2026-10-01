import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { PharmacyInventoryTable } from '@/components/phase3/PharmacyInventoryTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAGE_SIZE = 8

export function InventoryPage() {
  const { inventory } = useHospitalStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inventory.filter((i) => {
      if (status !== 'all' && i.stockStatus !== status) return false
      if (!q) return true
      return i.medicine.toLowerCase().includes(q) || i.genericName.toLowerCase().includes(q) || i.batchNumber.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q)
    })
  }, [inventory, query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        description={`${filtered.length} item${filtered.length === 1 ? '' : 's'} · mock data`}
        actions={<Button asChild><Link to="/pharmacy/inventory/new"><Plus className="mr-1 h-4 w-4" /> Add Medicine</Link></Button>}
      />
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search medicine, batch or supplier…" value={query} onChange={(e) => { setQuery(e.target.value); reset() }} className="pl-9" aria-label="Search inventory" />
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
      {pageItems.length === 0 ? (
        <EmptyState title="No inventory items found" description="Try adjusting search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <PharmacyInventoryTable items={pageItems} />
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
