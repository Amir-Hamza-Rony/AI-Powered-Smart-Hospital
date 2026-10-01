import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { MOCK_STOCK_MOVEMENTS } from '@/data/phase3'
import { useHospitalStore } from '@/store/HospitalStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StockStatusBadge } from '@/components/phase3/StatusBadges'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function InventoryDetailPage() {
  const { id } = useParams()
  const { getInventoryItem } = useHospitalStore()
  const item = id ? getInventoryItem(id) : undefined

  if (!item) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild><Link to="/pharmacy/inventory"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
        <EmptyState title="Item not found" description={`No inventory item ${id ?? ''}.`} action={<Button asChild><Link to="/pharmacy/inventory">Back to inventory</Link></Button>} />
      </div>
    )
  }

  const movements = MOCK_STOCK_MOVEMENTS.filter((m) => m.inventoryId === item.id)

  return (
    <div className="space-y-4">
      <PageHeader
        title={item.medicine}
        description={`${item.id} · Batch ${item.batchNumber}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link to="/pharmacy/inventory"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
            <Button size="sm" asChild><Link to={`/pharmacy/inventory/${item.id}/edit`}><Pencil className="mr-1 h-4 w-4" /> Edit</Link></Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Medicine Information</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Generic:</strong> {item.genericName}</p>
            <p><strong>Category:</strong> {item.category}</p>
            <p><strong>Strength:</strong> {item.strength}</p>
            <p><strong>Form:</strong> {item.dosageForm}</p>
            <p><strong>Manufacturer:</strong> {item.manufacturer}</p>
            <p><strong>Supplier:</strong> {item.supplier}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Inventory Information</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Batch:</strong> {item.batchNumber}</p>
            <p><strong>Quantity:</strong> {item.quantity}</p>
            <p><strong>Unit price:</strong> ৳{item.unitPrice} · <strong>Purchase:</strong> ৳{item.purchasePrice}</p>
            <p><strong>Expiry:</strong> {item.expiryDate}</p>
            <p><strong>Reorder level:</strong> {item.reorderLevel}</p>
            <p><StockStatusBadge status={item.stockStatus} /></p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Stock Movement ({movements.length})</CardTitle></CardHeader>
        <CardContent className="p-2 sm:p-4">
          {movements.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No movements recorded for this batch.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Qty</TableHead><TableHead>Reference</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap">{m.date}</TableCell>
                      <TableCell><Badge variant="outline">{m.type}</Badge></TableCell>
                      <TableCell>{m.quantity}</TableCell>
                      <TableCell>{m.reference}</TableCell>
                      <TableCell>{m.performedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
