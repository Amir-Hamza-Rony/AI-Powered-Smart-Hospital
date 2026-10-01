import { useMemo, useState } from 'react'
import { Search, Package, TriangleAlert, Hourglass, ShoppingCart } from 'lucide-react'
import { useAutomationStore } from '@/store/AutomationStore'
import { useToast } from '@/context/ToastContext'
import type { StockAlert, StockAlertStatus } from '@/data/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { StatCard } from '@/components/shared/StatCard'
import { StockAlertTable } from '@/components/automation/StockAlertTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const PAGE_SIZE = 8
const STATUSES: StockAlertStatus[] = ['Low', 'Critical', 'Near Expiry', 'Normal']

export function StockAlertsPage() {
  const { stockAlerts, purchaseRequests, createPurchaseRequest, resolveStockAlert } = useAutomationStore()
  const { success, error } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [prTarget, setPrTarget] = useState<StockAlert | null>(null)
  const [requiredQty, setRequiredQty] = useState('200')
  const [priority, setPriority] = useState<'High' | 'Normal' | 'Low'>('High')
  const [notes, setNotes] = useState('')

  const open = useMemo(() => stockAlerts.filter((s) => !s.resolved && s.status !== 'Normal'), [stockAlerts])
  const low = open.filter((s) => s.status === 'Low').length
  const critical = open.filter((s) => s.status === 'Critical').length
  const nearExpiry = open.filter((s) => s.status === 'Near Expiry').length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return stockAlerts.filter((s) => {
      if (status !== 'all' && (s.resolved ? 'Normal' : s.status) !== status) return false
      if (!q) return true
      return s.medicine.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q) || s.supplier.toLowerCase().includes(q)
    })
  }, [stockAlerts, query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)

  const openPrDialog = (alert: StockAlert) => {
    setPrTarget(alert)
    setRequiredQty(String(Math.max(alert.minimumLevel * 2 - alert.currentStock, 50)))
    setPriority(alert.status === 'Critical' ? 'High' : 'Normal')
    setNotes('')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pharmacy Stock Alerts"
        description="Threshold monitoring + purchase requests · simulated in local mock state"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Package} label="Low Stock Items" value={low} hint="Below minimum" />
        <StatCard icon={TriangleAlert} label="Critical Stock Items" value={critical} hint="Urgent reorder" />
        <StatCard icon={Hourglass} label="Near Expiry Items" value={nearExpiry} hint="Use or replace" />
        <StatCard icon={ShoppingCart} label="Purchase Requests" value={purchaseRequests.length} hint="Raised by staff" />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by medicine, SKU or supplier…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                reset()
              }}
              className="pl-9"
              aria-label="Search stock alerts"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              reset()
            }}
          >
            <SelectTrigger className="sm:w-52" aria-label="Stock status filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {pageItems.length === 0 ? (
        <EmptyState title="No stock alerts found" description="Try adjusting the search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <StockAlertTable alerts={pageItems} onPurchaseRequest={openPrDialog} />
            <DataPagination
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <p className="text-sm text-muted-foreground">
            Resolved an alert after restocking? Mark it resolved to clear it from the open queue.
          </p>
          <span className="ms-auto flex flex-wrap gap-2">
            {open.slice(0, 3).map((a) => (
              <Button
                key={a.id}
                size="sm"
                variant="outline"
                onClick={() => {
                  resolveStockAlert(a.id)
                  success('Alert resolved', `${a.medicine} marked resolved (mock).`)
                }}
              >
                Resolve {a.sku}
              </Button>
            ))}
          </span>
        </CardContent>
      </Card>

      <Dialog open={!!prTarget} onOpenChange={(o) => !o && setPrTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Purchase Request</DialogTitle>
          </DialogHeader>
          {prTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Medicine</p>
                  <p className="font-medium">{prTarget.medicine}</p>
                  <p className="text-xs text-muted-foreground">{prTarget.sku}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current stock</p>
                  <p className="font-medium">{prTarget.currentStock} units</p>
                  <p className="text-xs text-muted-foreground">Min: {prTarget.minimumLevel}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pr-qty">Required quantity</Label>
                  <Input
                    id="pr-qty"
                    type="number"
                    min={1}
                    value={requiredQty}
                    onChange={(e) => setRequiredQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as 'High' | 'Normal' | 'Low')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Input value={prTarget.supplier} disabled aria-label="Supplier" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-notes">Notes</Label>
                <Textarea
                  id="pr-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery instructions, batch requirements…"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!prTarget) return
                const qty = Number.parseInt(requiredQty, 10)
                if (!Number.isFinite(qty) || qty <= 0) {
                  error('Invalid quantity', 'Required quantity must be a positive number.')
                  return
                }
                createPurchaseRequest({
                  medicine: prTarget.medicine,
                  sku: prTarget.sku,
                  currentStock: prTarget.currentStock,
                  requiredQuantity: qty,
                  supplier: prTarget.supplier,
                  priority,
                  notes,
                })
                success('Purchase request created', `${prTarget.medicine} × ${qty} requested (mock).`)
                setPrTarget(null)
              }}
            >
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
