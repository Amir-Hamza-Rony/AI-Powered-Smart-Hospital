import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MEDICINE_CATEGORIES, DOSAGE_FORMS } from '@/data/phase3'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ApiLoading } from '@/components/shared/ApiState'
import {
  createBatch,
  createMedicine,
  getBatch,
  getMedicine,
  updateBatch,
  updateMedicine,
  type BackendMedicineBatch,
} from '@/lib/api/pharmacy'
import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function InventoryFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { success, error } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(mode === 'edit')
  const [notFound, setNotFound] = useState(false)
  const [medicineId, setMedicineId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [medicine, setMedicine] = useState('')
  const [genericName, setGenericName] = useState('')
  const [category, setCategory] = useState(MEDICINE_CATEGORIES[0])
  const [strength, setStrength] = useState('')
  const [dosageForm, setDosageForm] = useState(DOSAGE_FORMS[0])
  const [manufacturer, setManufacturer] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [unitPrice, setUnitPrice] = useState('0')
  const [purchasePrice, setPurchasePrice] = useState('0')
  const [expiryDate, setExpiryDate] = useState('2027-06-30')
  const [reorderLevel, setReorderLevel] = useState('100')

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    let active = true
    getBatch(id)
      .then(async (batch: BackendMedicineBatch) => {
        if (!active) return
        const med = await getMedicine(batch.medicine)
        if (!active) return
        setMedicineId(med.id)
        setMedicine(med.name)
        setGenericName(med.generic_name)
        setCategory(med.category || MEDICINE_CATEGORIES[0])
        setStrength(med.strength)
        setDosageForm(med.dosage_form || DOSAGE_FORMS[0])
        setManufacturer(med.manufacturer)
        setBatchNumber(batch.batch_number)
        setQuantity(String(batch.quantity))
        setUnitPrice(batch.selling_price)
        setPurchasePrice(batch.purchase_price)
        setExpiryDate(batch.expiry_date)
        setReorderLevel(String(med.reorder_level))
      })
      .catch(() => {
        if (active) setNotFound(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [mode, id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!medicine.trim() || !batchNumber.trim()) {
      error('Validation failed', 'Medicine name and batch number are required.')
      return
    }
    const qty = Number(quantity)
    const reorder = Number(reorderLevel)
    if (!Number.isInteger(qty) || qty < 0 || !Number.isInteger(reorder) || reorder < 0) {
      error('Validation failed', 'Quantity and reorder level must be non-negative whole numbers.')
      return
    }
    if (Number(unitPrice) < 0 || Number(purchasePrice) < 0) {
      error('Validation failed', 'Prices cannot be negative.')
      return
    }
    setSaving(true)
    try {
      if (mode === 'add') {
        const med = await createMedicine({
          name: medicine.trim(),
          generic_name: genericName,
          category,
          strength,
          dosage_form: dosageForm,
          manufacturer,
          unit_price: unitPrice || 0,
          reorder_level: reorder,
        })
        const batch = await createBatch({
          medicine: med.id,
          batch_number: batchNumber.trim(),
          quantity: qty,
          purchase_price: purchasePrice || 0,
          selling_price: unitPrice || 0,
          expiry_date: expiryDate,
        })
        success('Medicine added', `${med.name} · ${batch.batch_number} saved.`)
        navigate(`/pharmacy/inventory/${batch.id}`)
      } else if (id && medicineId) {
        await updateMedicine(medicineId, {
          name: medicine.trim(),
          generic_name: genericName,
          category,
          strength,
          dosage_form: dosageForm,
          manufacturer,
          unit_price: unitPrice || 0,
          reorder_level: reorder,
        })
        await updateBatch(id, {
          batch_number: batchNumber.trim(),
          quantity: qty,
          purchase_price: purchasePrice || 0,
          selling_price: unitPrice || 0,
          expiry_date: expiryDate,
        })
        success('Medicine updated', `${medicine} saved.`)
        navigate(`/pharmacy/inventory/${id}`)
      }
    } catch (err) {
      error('Save failed', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'edit' && notFound) {
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
        title={mode === 'add' ? 'Add Medicine to Inventory' : `Edit ${medicine || id || ''}`}
        description={mode === 'add' ? 'Creates a catalog medicine plus its first batch.' : 'Updates the medicine and its batch.'}
        actions={<Button variant="outline" size="sm" asChild><Link to="/pharmacy/inventory"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>}
      />
      {loading ? (
        <ApiLoading label="Loading inventory item…" />
      ) : (
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
              <div className="space-y-1.5"><Label>Batch number *</Label><Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="B-00000" /></div>
              <div className="space-y-1.5"><Label>Expiry date</Label><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Stock & Pricing</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" min={0} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Reorder level</Label><Input type="number" min={0} step={1} value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Unit price (৳)</Label><Input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Purchase price (৳)</Label><Input type="number" min={0} step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} /></div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild><Link to="/pharmacy/inventory">Cancel</Link></Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : mode === 'add' ? 'Add Medicine' : 'Save Changes'}</Button>
          </div>
        </form>
      )}
    </div>
  )
}
