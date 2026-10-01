import { Link } from 'react-router-dom'
import { Eye, MoreHorizontal } from 'lucide-react'
import type { InventoryItem } from '@/data/types'
import { StockStatusBadge } from '@/components/phase3/StatusBadges'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function PharmacyInventoryTable({ items }: { items: InventoryItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>Generic</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Unit Price</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Stock Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((i) => (
            <TableRow key={i.id}>
              <TableCell>
                <Link to={`/pharmacy/inventory/${i.id}`} className="whitespace-nowrap font-medium text-primary hover:underline">{i.medicine}</Link>
                <span className="block text-[11px] text-muted-foreground">{i.strength} · {i.dosageForm}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap">{i.genericName}</TableCell>
              <TableCell className="whitespace-nowrap">{i.batchNumber}</TableCell>
              <TableCell>{i.quantity}</TableCell>
              <TableCell className="whitespace-nowrap">৳{i.unitPrice}</TableCell>
              <TableCell className="whitespace-nowrap">{i.expiryDate}</TableCell>
              <TableCell className="max-w-[160px] truncate">{i.supplier}</TableCell>
              <TableCell><StockStatusBadge status={i.stockStatus} /></TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${i.id}`}><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/pharmacy/inventory/${i.id}`}><Eye className="mr-2 h-4 w-4" /> View</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to={`/pharmacy/inventory/${i.id}/edit`}><Eye className="mr-2 h-4 w-4" /> Edit</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
