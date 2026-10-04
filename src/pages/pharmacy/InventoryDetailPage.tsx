import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ApiErrorState, ApiLoading } from '@/components/shared/ApiState'
import { StockStatusBadge } from '@/components/phase3/StatusBadges'
import { getBatch, getMedicine, type BackendMedicine, type BackendMedicineBatch } from '@/lib/api/pharmacy'
import { canManageInventory } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function InventoryDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [batch, setBatch] = useState<BackendMedicineBatch | null>(null)
  const [medicine, setMedicine] = useState<BackendMedicine | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const manageable = canManageInventory(user?.role ?? null)

  useEffect(() => {
    if (!id) return
    let active = true
    getBatch(id)
      .then(async (loaded) => {
        if (!active) return
        const med = await getMedicine(loaded.medicine)
        if (!active) return
        setBatch(loaded)
        setMedicine(med)
      })
      .catch((err: unknown) => {
        if (!active) return
        if ((err as { status?: number })?.status === 404) setNotFound(true)
        else setLoadError(err instanceof Error ? err.message : 'Failed to load item.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild><Link to="/pharmacy/inventory"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        <ApiLoading label="Loading inventory item…" />
      </div>
    )
  }

  if (notFound || !batch) {
    if (loadError) {
      return (
        <div className="space-y-4">
          <Button variant="outline" size="sm" asChild><Link to="/pharmacy/inventory"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
          <ApiErrorState message={loadError} onRetry={() => window.location.reload()} />
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild><Link to="/pharmacy/inventory"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        <EmptyState title="Item not found" description={`No inventory item ${id ?? ''}.`} action={<Button asChild><Link to="/pharmacy/inventory">Back to inventory</Link></Button>} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={batch.medicine_name}
        description={`${batch.id} · Batch ${batch.batch_number}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/pharmacy/inventory"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
            {manageable && <Button size="sm" asChild><Link to={`/pharmacy/inventory/${batch.id}/edit`}><Pencil className="mr-1 h-4 w-4" /> Edit</Link></Button>}
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Medicine Information</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Generic:</strong> {medicine?.generic_name || '—'}</p>
            <p><strong>Category:</strong> {medicine?.category || '—'}</p>
            <p><strong>Strength:</strong> {medicine?.strength || '—'}</p>
            <p><strong>Form:</strong> {medicine?.dosage_form || '—'}</p>
            <p><strong>Manufacturer:</strong> {medicine?.manufacturer || '—'}</p>
            <p><strong>Reorder level:</strong> {medicine?.reorder_level ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Inventory Information</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Batch:</strong> {batch.batch_number}</p>
            <p><strong>Quantity:</strong> {batch.quantity}</p>
            <p><strong>Unit price:</strong> ৳{batch.selling_price} · <strong>Purchase:</strong> ৳{batch.purchase_price}</p>
            <p><strong>Expiry:</strong> {batch.expiry_date}{batch.is_expired ? ' (expired)' : ''}</p>
            <p><strong>Medicine stock:</strong> {medicine?.available_stock ?? '—'} available · {medicine?.expired_stock ?? '—'} expired</p>
            <p>{medicine && <StockStatusBadge status={medicine.stock_status} />}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Stock Movement</CardTitle></CardHeader>
        <CardContent className="p-2 sm:p-4">
          <p className="p-4 text-center text-sm text-muted-foreground">Per-batch movement history is not tracked by the backend in this phase — stock changes through dispensing.</p>
        </CardContent>
      </Card>
    </div>
  )
}
