import { useState } from 'react'
import { Search } from 'lucide-react'
import { MEDICINE_CATEGORIES, DOSAGE_FORMS } from '@/data/phase3'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataPagination } from '@/components/shared/DataPagination'
import { ApiErrorState, ApiForbiddenState, ApiLoading } from '@/components/shared/ApiState'
import { listMedicines } from '@/lib/api/pharmacy'
import { toMedicine } from '@/lib/api/adapters'
import { useApiList } from '@/lib/api/hooks'
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

  // Backend supports category + active/low-stock filters; dosage form is
  // applied to the loaded page since the API has no form filter.
  const list = useApiList(
    ({ page, page_size }) =>
      listMedicines({
        search: query.trim() || undefined,
        category: category !== 'all' ? category : undefined,
        is_active: status === 'Discontinued' ? false : status === 'Available' || status === 'Low Stock' ? true : undefined,
        low_stock: status === 'Low Stock' ? true : undefined,
        page,
        page_size,
      }),
    [query, category, status],
    PAGE_SIZE,
  )

  const reset = () => list.setPage(1)
  const medicines = list.items.map(toMedicine).filter((m) => {
    if (form !== 'all' && m.dosageForm !== form) return false
    if (status === 'Available' && m.status !== 'Available') return false
    return true
  })

  return (
    <div className="space-y-4">
      <PageHeader title="Medicines" description={`${list.total} medicines in directory`} />
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
      {list.loading ? (
        <ApiLoading label="Loading medicines…" />
      ) : list.errorStatus === 403 ? (
        <ApiForbiddenState message={list.error} />
      ) : list.error ? (
        <ApiErrorState message={list.error} onRetry={list.refresh} />
      ) : medicines.length === 0 ? (
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
                  {medicines.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}<span className="block text-[11px] font-normal text-muted-foreground">{m.id.slice(0, 8)}</span></TableCell>
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
            <DataPagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={PAGE_SIZE} onPageChange={list.setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
