import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, CheckCircle2, AlertTriangle, Clock3, XCircle, Plus, Search } from 'lucide-react'
import { useHospitalStore } from '@/store/HospitalStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { PharmacyInventoryTable } from '@/components/phase3/PharmacyInventoryTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function PharmacyDashboardPage() {
  const { inventory } = useHospitalStore()
  const [query, setQuery] = useState('')

  const total = inventory.length
  const inStock = inventory.filter((i) => i.stockStatus === 'In Stock').length
  const lowStock = inventory.filter((i) => i.stockStatus === 'Low Stock').length
  const nearExpiry = inventory.filter((i) => i.stockStatus === 'Near Expiry').length
  const outOfStock = inventory.filter((i) => i.stockStatus === 'Out of Stock').length

  const preview = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? inventory.filter((i) => i.medicine.toLowerCase().includes(q) || i.genericName.toLowerCase().includes(q)) : inventory
    return list.slice(0, 6)
  }, [inventory, query])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pharmacy Dashboard"
        description="Inventory overview · mock data"
        actions={
          <>
            <Button variant="outline" asChild><Link to="/pharmacy/alerts">View Alerts</Link></Button>
            <Button asChild><Link to="/pharmacy/inventory/new"><Plus className="mr-1 h-4 w-4" /> Add Medicine</Link></Button>
          </>
        }
      />
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
    </div>
  )
}
