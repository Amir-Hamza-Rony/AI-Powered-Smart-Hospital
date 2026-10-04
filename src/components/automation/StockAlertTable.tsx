import { Link } from 'react-router-dom'
import { Eye, ShoppingCart } from 'lucide-react'
import type { StockAlert } from '@/data/types'
import { StockAlertStatusBadge } from '@/components/automation/AutomationStatusBadge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export function StockAlertTable({
  alerts,
  onPurchaseRequest,
}: {
  alerts: StockAlert[]
  onPurchaseRequest: (alert: StockAlert) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Current Stock</TableHead>
            <TableHead className="text-right">Minimum Level</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((a) => (
            <TableRow key={a.id} className={cn(a.status === 'Critical' && !a.resolved && 'bg-destructive/5')}>
              <TableCell className="font-medium whitespace-nowrap">{a.medicine}</TableCell>
              <TableCell className="whitespace-nowrap">{a.sku}</TableCell>
              <TableCell className={cn('text-right font-medium whitespace-nowrap', a.status === 'Critical' && !a.resolved && 'text-destructive')}>
                {a.currentStock}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">{a.minimumLevel}</TableCell>
              <TableCell>
                <StockAlertStatusBadge status={a.resolved ? 'Normal' : a.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{a.expiryDate}</TableCell>
              <TableCell className="whitespace-nowrap">{a.supplier}</TableCell>
              <TableCell className="whitespace-nowrap">{a.lastUpdated}</TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPurchaseRequest(a)}
                    disabled={a.resolved}
                    aria-label={`Create purchase request for ${a.medicine}`}
                    title="Create Purchase Request"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" asChild aria-label={`View medicine ${a.sku}`}>
                    <Link to={`/pharmacy/inventory/${a.sku}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
