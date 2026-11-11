'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  History,
  X,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  useDrugs,
  useDrugDetail,
  useCreateDrug,
  useUpdateDrug,
  useDeleteDrug,
  useAddStock,
} from '@/hooks/use-pharmacy'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { DrugData, DrugDetailData, DrugStockData } from '@/lib/api/pharmacy'

const KATEGORI_OPTIONS = [
  { value: '', label: 'Semua Kategori' },
  { value: 'obat', label: 'Obat' },
  { value: 'alkes', label: 'Alkes' },
  { value: 'bmhp', label: 'BMHP' },
  { value: 'nutrisi', label: 'Nutrisi' },
]

const STOK_FILTER = [
  { value: '', label: 'Semua Status Stok' },
  { value: 'low', label: 'Stok Rendah' },
  { value: 'ok', label: 'Stok Aman' },
]

function stockBadgeVariant(
  stok: number,
  minimum: number,
): 'success' | 'warning' | 'destructive' {
  if (stok < minimum) return 'destructive'
  if (stok < minimum * 2) return 'warning'
  return 'success'
}

function stockLabel(stok: number, minimum: number): string {
  if (stok < minimum) return 'Rendah'
  if (stok < minimum * 2) return 'Menipis'
  return 'Aman'
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(n: number | string) {
  const num = Math.round(Number(n) || 0)
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${formatted}`
}

export default function StokPage() {
  const [search, setSearch] = useState('')
  const [kategori, setKategori] = useState('')
  const [stokFilter, setStokFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expandedDrugId, setExpandedDrugId] = useState<string | null>(null)
  const [addStockDrug, setAddStockDrug] = useState<DrugData | null>(null)
  const [editDrug, setEditDrug] = useState<DrugData | null>(null)
  const [deleteDrugTarget, setDeleteDrugTarget] = useState<DrugData | null>(null)
  const [newDrugOpen, setNewDrugOpen] = useState(false)

  const {
    data: drugsData,
    isLoading,
    refetch,
  } = useDrugs({
    search: search || undefined,
    kategori: kategori || undefined,
    page,
    limit: 20,
  })

  const drugs = drugsData?.data ?? []
  const meta = drugsData?.meta

  // Filter by stock status on client side
  const filteredDrugs = stokFilter
    ? drugs.filter((d: DrugData) => {
        if (stokFilter === 'low') return d.total_stok < d.stok_minimum
        if (stokFilter === 'ok') return d.total_stok >= d.stok_minimum
        return true
      })
    : drugs

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/farmasi"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6" />
              Stok Obat
            </h1>
            <p className="text-muted-foreground">
              Kelola data obat dan stok
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setNewDrugOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah Obat Baru
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari obat (kode, nama)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={kategori}
          onChange={(e) => {
            setKategori(e.target.value)
            setPage(1)
          }}
          className="w-44"
        >
          {KATEGORI_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          value={stokFilter}
          onChange={(e) => setStokFilter(e.target.value)}
          className="w-44"
        >
          {STOK_FILTER.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : filteredDrugs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Tidak ada obat ditemukan
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium w-8" />
                <th className="text-left p-3 font-medium">Kode</th>
                <th className="text-left p-3 font-medium">Nama Obat</th>
                <th className="text-left p-3 font-medium">Kategori</th>
                <th className="text-right p-3 font-medium">Stok</th>
                <th className="text-left p-3 font-medium">Satuan</th>
                <th className="text-right p-3 font-medium">Harga Beli</th>
                <th className="text-right p-3 font-medium">Harga Jual</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDrugs.map((drug: DrugData) => (
                <DrugRow
                  key={drug.id}
                  drug={drug}
                  expanded={expandedDrugId === drug.id}
                  onToggle={() =>
                    setExpandedDrugId(
                      expandedDrugId === drug.id ? null : drug.id,
                    )
                  }
                  onAddStock={() => setAddStockDrug(drug)}
                  onEdit={() => setEditDrug(drug)}
                  onDelete={() => setDeleteDrugTarget(drug)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Halaman {meta.page} dari {meta.totalPages} ({meta.total} obat)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Add Stock Dialog */}
      {addStockDrug && (
        <AddStockDialog
          drug={addStockDrug}
          onClose={() => setAddStockDrug(null)}
        />
      )}

      {/* Edit Drug Dialog */}
      {editDrug && (
        <EditDrugDialog
          drug={editDrug}
          onClose={() => setEditDrug(null)}
        />
      )}

      {/* Delete Drug Confirm Dialog */}
      {deleteDrugTarget && (
        <DeleteDrugDialog
          drug={deleteDrugTarget}
          onClose={() => setDeleteDrugTarget(null)}
        />
      )}

      {/* New Drug Dialog */}
      <NewDrugDialog open={newDrugOpen} onClose={() => setNewDrugOpen(false)} />
    </div>
  )
}

// ===========================================================
// Drug Row with expandable batch detail
// ===========================================================

function DrugRow({
  drug,
  expanded,
  onToggle,
  onAddStock,
  onEdit,
  onDelete,
}: {
  drug: DrugData
  expanded: boolean
  onToggle: () => void
  onAddStock: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const variant = stockBadgeVariant(drug.total_stok, drug.stok_minimum)
  const label = stockLabel(drug.total_stok, drug.stok_minimum)

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <td className="p-3">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
        <td className="p-3 font-mono text-xs">{drug.kode}</td>
        <td className="p-3">
          <p className="font-medium">{drug.nama}</p>
          {drug.nama_generik && (
            <p className="text-xs text-muted-foreground">{drug.nama_generik}</p>
          )}
        </td>
        <td className="p-3">
          <Badge variant="outline" className="capitalize">
            {drug.kategori}
          </Badge>
        </td>
        <td className="p-3 text-right font-medium">{drug.total_stok}</td>
        <td className="p-3 text-muted-foreground">{drug.satuan_kecil}</td>
        <td className="p-3 text-right text-muted-foreground">{formatCurrency(drug.harga_beli)}</td>
        <td className="p-3 text-right">{formatCurrency(drug.harga_jual)}</td>
        <td className="p-3 text-center">
          <Badge variant={variant}>{label}</Badge>
        </td>
        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            <Button variant="outline" size="sm" onClick={onAddStock}>
              <Plus className="h-3 w-3 mr-1" />
              Stok
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit} title="Edit obat">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              title="Hapus obat"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>

      {expanded && <DrugBatchDetail drugId={drug.id} />}
    </>
  )
}

// ===========================================================
// Expanded batch detail
// ===========================================================

function DrugBatchDetail({ drugId }: { drugId: string }) {
  const { data, isLoading } = useDrugDetail(drugId)
  const detail = data?.data as DrugDetailData | undefined

  if (isLoading) {
    return (
      <tr>
        <td colSpan={10} className="p-4">
          <Skeleton className="h-24 w-full" />
        </td>
      </tr>
    )
  }

  if (!detail?.stocks?.length) {
    return (
      <tr>
        <td colSpan={10} className="p-4 text-center text-sm text-muted-foreground">
          Belum ada stok batch
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={10} className="p-0">
        <div className="bg-muted/20 border-t px-8 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Detail Batch
            </p>
            <Link
              href={`/farmasi/stok?detail=${drugId}`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <History className="h-3 w-3" />
              Riwayat Transaksi
            </Link>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left pb-1 font-medium">Batch</th>
                <th className="text-left pb-1 font-medium">Supplier</th>
                <th className="text-right pb-1 font-medium">Awal</th>
                <th className="text-right pb-1 font-medium">Sisa</th>
                <th className="text-right pb-1 font-medium">Harga Beli</th>
                <th className="text-left pb-1 font-medium">Masuk</th>
                <th className="text-left pb-1 font-medium">Kadaluarsa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed">
              {detail.stocks.map((s: DrugStockData) => {
                const isExpired =
                  s.tanggal_kadaluarsa &&
                  new Date(s.tanggal_kadaluarsa) < new Date()
                return (
                  <tr
                    key={s.id}
                    className={cn(isExpired && 'text-red-500 line-through')}
                  >
                    <td className="py-1.5 font-mono">
                      {s.batch_number || '-'}
                    </td>
                    <td className="py-1.5">{s.supplier || '-'}</td>
                    <td className="py-1.5 text-right">{s.stok_awal}</td>
                    <td className="py-1.5 text-right font-medium">
                      {s.stok_sisa}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatCurrency(s.harga_beli_per_unit)}
                    </td>
                    <td className="py-1.5">{formatDate(s.tanggal_masuk)}</td>
                    <td className="py-1.5">
                      {s.tanggal_kadaluarsa ? (
                        <span className={cn(isExpired && 'font-medium')}>
                          {formatDate(s.tanggal_kadaluarsa)}
                          {isExpired && ' (EXPIRED)'}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}

// ===========================================================
// Add Stock Dialog
// ===========================================================

function AddStockDialog({
  drug,
  onClose,
}: {
  drug: DrugData
  onClose: () => void
}) {
  const addStock = useAddStock()
  const [form, setForm] = useState({
    batch_number: '',
    tanggal_kadaluarsa: '',
    jumlah: '',
    harga_beli_per_unit: '',
    supplier: '',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    const jumlah = Number(form.jumlah)
    if (jumlah < 1) return

    await addStock.mutateAsync({
      drugId: drug.id,
      data: {
        batch_number: form.batch_number || undefined,
        tanggal_kadaluarsa: form.tanggal_kadaluarsa || undefined,
        jumlah,
        harga_beli_per_unit: Number(form.harga_beli_per_unit) || 0,
        supplier: form.supplier || undefined,
      },
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>Tambah Stok — {drug.nama}</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label>Batch Number</Label>
            <Input
              placeholder="BATCH-2026-001"
              value={form.batch_number}
              onChange={(e) => updateField('batch_number', e.target.value)}
            />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <Label>Supplier</Label>
            <Input
              placeholder="PT Pharma Indonesia"
              value={form.supplier}
              onChange={(e) => updateField('supplier', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Jumlah <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={1}
              placeholder="0"
              value={form.jumlah}
              onChange={(e) => updateField('jumlah', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Dalam {drug.satuan_kecil}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Harga Beli / Unit</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.harga_beli_per_unit}
              onChange={(e) =>
                updateField('harga_beli_per_unit', e.target.value)
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Tanggal Kadaluarsa</Label>
            <DateInput
              value={form.tanggal_kadaluarsa}
              onChange={(val) => updateField('tanggal_kadaluarsa', val)}
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!form.jumlah || Number(form.jumlah) < 1 || addStock.isPending}
        >
          {addStock.isPending ? 'Menyimpan...' : 'Tambah Stok'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ===========================================================
// New Drug Dialog
// ===========================================================

function NewDrugDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const createDrug = useCreateDrug()
  const [form, setForm] = useState({
    kode: '',
    nama: '',
    nama_generik: '',
    kategori: 'obat',
    satuan_kecil: 'tablet',
    satuan_besar: '',
    konversi: '1',
    harga_beli: '0',
    harga_jual: '0',
    stok_minimum: '10',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.kode || !form.nama) return

    await createDrug.mutateAsync({
      kode: form.kode,
      nama: form.nama,
      nama_generik: form.nama_generik || undefined,
      kategori: form.kategori,
      satuan_kecil: form.satuan_kecil,
      satuan_besar: form.satuan_besar || undefined,
      konversi: Number(form.konversi) || 1,
      harga_beli: Number(form.harga_beli) || 0,
      harga_jual: Number(form.harga_jual) || 0,
      stok_minimum: Number(form.stok_minimum) || 10,
    })
    onClose()
    setForm({
      kode: '',
      nama: '',
      nama_generik: '',
      kategori: 'obat',
      satuan_kecil: 'tablet',
      satuan_besar: '',
      konversi: '1',
      harga_beli: '0',
      harga_jual: '0',
      stok_minimum: '10',
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader>
        <DialogTitle>Tambah Obat Baru</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogContent>
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>
              Kode <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="OBT-001"
              value={form.kode}
              onChange={(e) => updateField('kode', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select
              value={form.kategori}
              onChange={(e) => updateField('kategori', e.target.value)}
            >
              <option value="obat">Obat</option>
              <option value="alkes">Alkes</option>
              <option value="bmhp">BMHP</option>
              <option value="nutrisi">Nutrisi</option>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>
              Nama Obat <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Paracetamol 500mg"
              value={form.nama}
              onChange={(e) => updateField('nama', e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Nama Generik</Label>
            <Input
              placeholder="Paracetamol"
              value={form.nama_generik}
              onChange={(e) => updateField('nama_generik', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Satuan Kecil</Label>
            <Input
              placeholder="tablet"
              value={form.satuan_kecil}
              onChange={(e) => updateField('satuan_kecil', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Satuan Besar</Label>
            <Input
              placeholder="box"
              value={form.satuan_besar}
              onChange={(e) => updateField('satuan_besar', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Konversi</Label>
            <Input
              type="number"
              min={1}
              value={form.konversi}
              onChange={(e) => updateField('konversi', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              1 {form.satuan_besar || 'box'} = {form.konversi}{' '}
              {form.satuan_kecil || 'tablet'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Stok Minimum</Label>
            <Input
              type="number"
              min={0}
              value={form.stok_minimum}
              onChange={(e) => updateField('stok_minimum', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Harga Beli</Label>
            <Input
              type="number"
              min={0}
              value={form.harga_beli}
              onChange={(e) => updateField('harga_beli', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Harga Jual</Label>
            <Input
              type="number"
              min={0}
              value={form.harga_jual}
              onChange={(e) => updateField('harga_jual', e.target.value)}
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !form.kode || !form.nama || createDrug.isPending
          }
        >
          {createDrug.isPending ? 'Menyimpan...' : 'Simpan Obat'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ===========================================================
// Edit Drug Dialog
// ===========================================================

function EditDrugDialog({
  drug,
  onClose,
}: {
  drug: DrugData
  onClose: () => void
}) {
  const updateDrug = useUpdateDrug()
  const [form, setForm] = useState({
    kode: drug.kode,
    nama: drug.nama,
    nama_generik: drug.nama_generik || '',
    kategori: drug.kategori,
    satuan_kecil: drug.satuan_kecil || 'tablet',
    satuan_besar: drug.satuan_besar || '',
    konversi: String(drug.konversi || 1),
    harga_beli: String(Math.round(Number(drug.harga_beli) || 0)),
    harga_jual: String(Math.round(Number(drug.harga_jual) || 0)),
    stok_minimum: String(drug.stok_minimum || 10),
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.kode || !form.nama) return

    try {
      await updateDrug.mutateAsync({
        id: drug.id,
        data: {
          kode: form.kode,
          nama: form.nama,
          nama_generik: form.nama_generik || undefined,
          kategori: form.kategori,
          satuan_kecil: form.satuan_kecil,
          satuan_besar: form.satuan_besar || undefined,
          konversi: Number(form.konversi) || 1,
          harga_beli: Number(form.harga_beli) || 0,
          harga_jual: Number(form.harga_jual) || 0,
          stok_minimum: Number(form.stok_minimum) || 10,
        },
      })
      toast.success('Data obat berhasil diperbarui')
      onClose()
    } catch {
      toast.error('Gagal memperbarui data obat')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>Edit Obat — {drug.nama}</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogContent>
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>
              Kode <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.kode}
              onChange={(e) => updateField('kode', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select
              value={form.kategori}
              onChange={(e) => updateField('kategori', e.target.value)}
            >
              <option value="obat">Obat</option>
              <option value="alkes">Alkes</option>
              <option value="bmhp">BMHP</option>
              <option value="nutrisi">Nutrisi</option>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>
              Nama Obat <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.nama}
              onChange={(e) => updateField('nama', e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Nama Generik</Label>
            <Input
              value={form.nama_generik}
              onChange={(e) => updateField('nama_generik', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Satuan Kecil</Label>
            <Input
              value={form.satuan_kecil}
              onChange={(e) => updateField('satuan_kecil', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Satuan Besar</Label>
            <Input
              value={form.satuan_besar}
              onChange={(e) => updateField('satuan_besar', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Konversi</Label>
            <Input
              type="number"
              min={1}
              value={form.konversi}
              onChange={(e) => updateField('konversi', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              1 {form.satuan_besar || 'box'} = {form.konversi}{' '}
              {form.satuan_kecil || 'tablet'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Stok Minimum</Label>
            <Input
              type="number"
              min={0}
              value={form.stok_minimum}
              onChange={(e) => updateField('stok_minimum', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Harga Beli</Label>
            <Input
              type="number"
              min={0}
              value={form.harga_beli}
              onChange={(e) => updateField('harga_beli', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Harga Jual</Label>
            <Input
              type="number"
              min={0}
              value={form.harga_jual}
              onChange={(e) => updateField('harga_jual', e.target.value)}
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!form.kode || !form.nama || updateDrug.isPending}
        >
          {updateDrug.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ===========================================================
// Delete Drug Confirm Dialog
// ===========================================================

function DeleteDrugDialog({
  drug,
  onClose,
}: {
  drug: DrugData
  onClose: () => void
}) {
  const deleteDrug = useDeleteDrug()

  async function handleDelete() {
    try {
      await deleteDrug.mutateAsync(drug.id)
      toast.success(`Obat "${drug.nama}" berhasil dihapus`)
      onClose()
    } catch {
      toast.error('Gagal menghapus obat')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>Hapus Obat</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogContent>
        <p className="text-sm">
          Apakah Anda yakin ingin menghapus obat{' '}
          <strong>{drug.nama}</strong> ({drug.kode})?
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Data obat akan dinonaktifkan dan tidak akan muncul di pencarian.
          Data stok dan riwayat transaksi tetap tersimpan.
        </p>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleteDrug.isPending}
        >
          {deleteDrug.isPending ? 'Menghapus...' : 'Ya, Hapus'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
