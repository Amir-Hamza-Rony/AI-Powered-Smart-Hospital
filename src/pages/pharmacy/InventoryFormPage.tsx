import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MEDICINE_CATEGORIES, DOSAGE_FORMS } from '@/data/phase3'
import { useHospitalStore, nextId } from '@/store/HospitalStore'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import type { InventoryItem, StockStatus } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function stockFor(qty: number, reorder: number): StockStatus {
  if (qty <= 0) return 'Out of Stock'
  if (qty <= reorder) return 'Low Stock'
  return 'In Stock'
}

export function InventoryFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { inventory, getInventoryItem, addInventoryItem, updateInventoryItem } = useHospitalStore()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const existing = mode === 'edit' && id ? getInventoryItem(id) : undefined

  const [medicine, setMedicine] = useState(existing?.medicine ?? '')
  const [genericName, setGenericName] = useState(existing?.genericName ?? '')
  const [category, setCategory] = useState(existing?.category ?? MEDICINE_CATEGORIES[0])
  const [strength, setStrength] = useState(existing?.strength ?? '')
  const [dosageForm, setDosageForm] = useState(existing?.dosageForm ?? DOSAGE_FORMS[0])
  const [manufacturer, setManufacturer] = useState(existing?.manufacturer ?? '')
  const [supplier, setSupplier] = useState(existing?.supplier ?? '')
  const [batchNumber, setBatchNumber] = useState(existing?.batchNumber ?? '')
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? 0))
  const [unitPrice, setUnitPrice] = useState(String(existing?.unitPrice ?? 0))
  const [purchasePrice, setPurchasePrice] = useState(String(existing?.purchasePrice ?? 0))
  const [expiryDate, setExpiryDate] = useState(existing?.expiryDate ?? '2027-06-30')
  const [reorderLevel, setReorderLevel] = useState(String(existing?.reorderLevel ?? 100))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!medicine.trim() || !batchNumber.trim()) {
      error('Validation failed', 'Medicine name and batch number are required.')
      return
    }
    const qty = Number(quantity)
    const reorder = Number(reorderLevel)
    if (Number.isNaN(qty) || qty < 0 || Number.isNaN(reorder) || reorder < 0) {
      error('Validation failed', 'Quantity and reorder level must be non-negative numbers.')
      return
    }
    if (mode === 'add') {
      const item: InventoryItem = {
        id: nextId('INV', inventory.map((i) => i.id)),
        medicine, genericName, category, strength, dosageForm, manufacturer, supplier, batchNumber,
        quantity: qty, unitPrice: Number(unitPrice) || 0, purchasePrice: Number(purchasePrice) || 0,
        expiryDate, reorderLevel: reorder, stockStatus: stockFor(qty, reorder),
      }
      addInventoryItem(item)
      success('Medicine added', `${item.id} saved to mock state.`)
      navigate(`/pharmacy/inventory/${item.id}`)
    } else if (existing) {
      updateInventoryItem(existing.id, {
        medicine, genericName, category, strength, dosageForm, manufacturer, supplier, batchNumber,
        quantity: qty, unitPrice: Number(unitPrice) || 0, purchasePrice: Number(purchasePrice) || 0,
        expiryDate, reorderLevel: reorder, stockStatus: stockFor(qty, reorder),
      })
      success('Medicine updated', `${existing.id} saved to mock state.`)
      navigate(`/pharmacy/inventory/${existing.id}`)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={mode === 'add' ? 'Add Medicine to Inventory' : `Edit ${existing?.medicine ?? id ?? ''}`}
        description="Frontend-only form with validation UI."
        actions={<Button variant="outline" size="sm" asChild><Link to="/pharmacy/inventory"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>}
      />
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Medicine Details</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5"><Label>Medicine *</Label><Input value={medicine} onChange={(e) => setMedicine(e.target.value)} placeholder="Paracetamol 500" /></div>
            <div className="space-y-1.5"><Label>Generic name</Label><Input value={genericName} onChange={(e) => setGenericName(e.target.value)} placeholder="Paracetamol" /></div>
            <div className="space-y-1.5"><Label>Category</Label>
              <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MEDICINE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Strength</Label><Input value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="500 mg" /></div>
            <div className="space-y-1.5"><Label>Dosage form</Label>
              <Select value={dosageForm} onValueChange={setDosageForm}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DOSAGE_FORMS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Manufacturer</Label><Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Square Pharma" /></div>
            <div className="space-y-1.5"><Label>Supplier</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="MediServe Distributors" /></div>
            <div className="space-y-1.5"><Label>Batch number *</Label><Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="B-00000" /></div>
            <div className="space-y-1.5"><Label>Expiry date</Label><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Stock & Pricing</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Reorder level</Label><Input type="number" min={0} value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Unit price (৳)</Label><Input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Purchase price (৳)</Label><Input type="number" min={0} step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} /></div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild><Link to="/pharmacy/inventory">Cancel</Link></Button>
          <Button type="submit">{mode === 'add' ? 'Add Medicine' : 'Save Changes'}</Button>
        </div>
      </form>
    </div>
  )
}
