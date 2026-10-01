import { useMemo, useState } from 'react'
import { Pencil, Plus, Search } from 'lucide-react'
import { MOCK_LAB_TESTS, LAB_CATEGORIES } from '@/data/phase3'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function LabTestsPage() {
  const { success } = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MOCK_LAB_TESTS.filter((t) => {
      if (category !== 'all' && t.category !== category) return false
      if (status !== 'all' && t.status !== status) return false
      if (!q) return true
      return t.name.toLowerCase().includes(q)
    })
  }, [query, category, status])

  const openAdd = () => { setEditing(null); setName(''); setDialogOpen(true) }
  const openEdit = (id: string, current: string) => { setEditing(id); setName(current); setDialogOpen(true) }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lab Tests"
        description={`${filtered.length} tests · fictional mock data`}
        actions={<Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" /> Add Test</Button>}
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
      {filtered.length === 0 ? (
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}<span className="block text-[11px] font-normal text-muted-foreground">{t.id}</span></TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell>{t.sampleType}</TableCell>
                      <TableCell className="whitespace-nowrap">{t.turnaroundTime}</TableCell>
                      <TableCell className="whitespace-nowrap">৳{t.price}</TableCell>
                      <TableCell><Badge variant={t.status === 'Active' ? 'secondary' : 'outline'}>{t.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(t.id, t.name)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                      </TableCell>
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
          <DialogHeader><DialogTitle>{editing ? `Edit test ${editing}` : 'Add test (mock)'}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Test name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Serum Electrolytes" />
            <p className="text-xs text-muted-foreground">Frontend-only: saving shows a toast, data stays local.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setDialogOpen(false); success(editing ? 'Test updated' : 'Test added', `${name || 'Untitled test'} saved (mock).`) }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
