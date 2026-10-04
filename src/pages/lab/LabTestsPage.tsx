import { useEffect, useState } from 'react'
import { Pencil, Plus, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { createLabTest, listLabTests, updateLabTest, type BackendLabTest } from '@/lib/api/laboratory'
import { canManageLabTests } from '@/lib/api/hooks'
import { ApiError } from '@/lib/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const LAB_CATEGORIES = ['Hematology', 'Biochemistry', 'Microbiology', 'Immunology', 'Urinalysis', 'Imaging', 'Cardiology']

export function LabTestsPage() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [tests, setTests] = useState<BackendLabTest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BackendLabTest | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [dialogCategory, setDialogCategory] = useState(LAB_CATEGORIES[0])
  const [price, setPrice] = useState('0')
  const [sampleType, setSampleType] = useState('')
  const [saving, setSaving] = useState(false)
  const manageable = canManageLabTests(user?.role ?? null)

  const load = () => {
    setLoading(true)
    setLoadError(null)
    setErrorStatus(null)
    listLabTests({
      search: query.trim() || undefined,
      category: category !== 'all' ? category : undefined,
      status: status !== 'all' ? status : undefined,
      page_size: 100,
    })
      .then((page) => setTests(page.results))
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          setLoadError(err.message)
          setErrorStatus(err.status)
        } else {
          setLoadError('Failed to load lab tests.')
        }
        setTests([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [query, category, status])

  const openAdd = () => {
    setEditing(null)
    setName('')
    setCode('')
    setDialogCategory(LAB_CATEGORIES[0])
    setPrice('0')
    setSampleType('')
    setDialogOpen(true)
  }

  const openEdit = (test: BackendLabTest) => {
    setEditing(test)
    setName(test.name)
    setCode(test.code)
    setDialogCategory(test.category || LAB_CATEGORIES[0])
    setPrice(test.price)
    setSampleType(test.sample_type)
    setDialogOpen(true)
  }

  const save = async () => {
    if (!name.trim() || !code.trim()) {
      error('Validation failed', 'Test name and code are required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        code: code.trim(),
        category: dialogCategory,
        price,
        sample_type: sampleType,
      }
      if (editing) {
        await updateLabTest(editing.id, payload)
        success('Test updated', `${code} saved.`)
      } else {
        await createLabTest(payload)
        success('Test added', `${code} created.`)
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      error('Save failed', err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lab Tests"
        description={`${tests.length} tests in catalog`}
        actions={manageable ? <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" /> Add Test</Button> : undefined}
      />
      <Card>
        <CardContent className="grid gap-2 p-4 sm:grid-cols-[1fr_200px_180px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search tests…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" aria-label="Search lab tests" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Category filter"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All categories</SelectItem>{LAB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
          </Select>
        </CardContent>
      </Card>
      {loading ? (
        <ApiLoading label="Loading lab tests…" />
      ) : errorStatus === 403 ? (
        <ApiForbiddenState message={loadError} />
      ) : loadError ? (
        <ApiErrorState message={loadError} onRetry={load} />
      ) : tests.length === 0 ? (
        <EmptyState title="No tests found" description="Try adjusting search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sample</TableHead>
                    <TableHead>Turnaround</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    {manageable && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}<span className="block text-[11px] font-normal text-muted-foreground">{t.code}</span></TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell>{t.sample_type}</TableCell>
                      <TableCell className="whitespace-nowrap">{t.turnaround_time}</TableCell>
                      <TableCell className="whitespace-nowrap">৳{t.price}</TableCell>
                      <TableCell><Badge variant={t.status === 'Active' ? 'secondary' : 'outline'}>{t.status}</Badge></TableCell>
                      {manageable && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? `Edit test ${editing.code}` : 'Add test'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Test name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Serum Electrolytes" /></div>
            <div className="space-y-1.5"><Label>Code *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. LT-011" disabled={editing !== null} /></div>
            <div className="space-y-1.5"><Label>Category</Label>
              <Select value={dialogCategory} onValueChange={setDialogCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LAB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Price (৳)</Label><Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Sample type</Label><Input value={sampleType} onChange={(e) => setSampleType(e.target.value)} placeholder="e.g. Blood" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
