import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { MOCK_MEDICINES, MEDICINE_CATEGORIES, DOSAGE_FORMS } from '@/data/phase3'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 10

export function MedicinesPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [form, setForm] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MOCK_MEDICINES.filter((m) => {
      if (category !== 'all' && m.category !== category) return false
      if (form !== 'all' && m.dosageForm !== form) return false
      if (status !== 'all' && m.status !== status) return false
      if (!q) return true
      return m.name.toLowerCase().includes(q) || m.genericName.toLowerCase().includes(q) || m.manufacturer.toLowerCase().includes(q)
    })
  }, [query, category, form, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const reset = () => setPage(1)

  return (
    <div className="space-y-4">
      <PageHeader title="Medicines" description={`${filtered.length} medicines in directory · fictional mock data`} />
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, generic or manufacturer…" value={query} onChange={(e) => { setQuery(e.target.value); reset() }} className="pl-9" aria-label="Search medicines" />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <Select value={category} onValueChange={(v) => { setCategory(v); reset() }}>
              <SelectTrigger aria-label="Category filter"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All categories</SelectItem>{MEDICINE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form} onValueChange={(v) => { setForm(v); reset() }}>
              <SelectTrigger aria-label="Form filter"><SelectValue placeholder="Form" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All forms</SelectItem>{DOSAGE_FORMS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); reset() }}>
              <SelectTrigger aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem>{['Available', 'Low Stock', 'Discontinued'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {pageItems.length === 0 ? (
        <EmptyState title="No medicines found" description="Try adjusting search or filters." />
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Generic</TableHead>
                    <TableHead>Strength</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Rx Req.</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}<span className="block text-[11px] font-normal text-muted-foreground">{m.id}</span></TableCell>
                      <TableCell>{m.genericName}</TableCell>
                      <TableCell className="whitespace-nowrap">{m.strength}</TableCell>
                      <TableCell><Badge variant="outline">{m.dosageForm}</Badge></TableCell>
                      <TableCell>{m.manufacturer}</TableCell>
                      <TableCell>{m.category}</TableCell>
                      <TableCell>{m.prescriptionRequired ? 'Yes' : 'No'}</TableCell>
                      <TableCell><Badge variant={m.status === 'Available' ? 'secondary' : m.status === 'Low Stock' ? 'default' : 'destructive'} className="whitespace-nowrap">{m.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
