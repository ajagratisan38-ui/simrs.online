'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Package,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  useStockOpname,
  useInputOpnameCount,
  useCompleteStockOpname,
  useCancelStockOpname,
} from '@/hooks/use-warehouse'
import { cn } from '@/lib/utils'

export default function OpnameDetailPage() {
  const { opnameId } = useParams<{ opnameId: string }>()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<string | null>(null)
  const [countVal, setCountVal] = useState('')
  const [countNote, setCountNote] = useState('')

  const { data: res, isLoading } = useStockOpname(opnameId)
  const opname = res?.data
  const inputMut = useInputOpnameCount()
  const completeMut = useCompleteStockOpname()
  const cancelMut = useCancelStockOpname()

  if (isLoading) return (
    <div className="space-y-4 pt-4">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-40 bg-muted animate-pulse rounded" />
    </div>
  )
  if (!opname) return (
    <div className="py-12 text-center text-muted-foreground">
      Opname tidak ditemukan
    </div>
  )

  const allItems = opname.items ?? []
  const filtered = search
    ? allItems.filter((i) => i.item_nama.toLowerCase().includes(search.toLowerCase()))
    : allItems
  const counted = allItems.filter((i) => i.stok_fisik !== null).length
  const total = allItems.length
  const withDiff = allItems.filter((i) => i.selisih !== null && i.selisih !== 0)
  const isActive = opname.status === 'draft' || opname.status === 'in_progress'

  const handleInput = async (itemId: string) => {
    const val = Number(countVal)
    if (isNaN(val) || val < 0) return toast.error('Stok fisik harus ≥ 0')
    try {
      await inputMut.mutateAsync({
        opnameId, itemId, stokFisik: val, catatan: countNote || undefined,
      })
      toast.success('Stok fisik tersimpan')
      setEditItem(null); setCountVal(''); setCountNote('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal')
    }
  }

  const handleComplete = async () => {
    if (counted < total) {
      if (!confirm(`Baru ${counted}/${total} barang dihitung. Lanjutkan finalisasi?`)) return
    }
    try {
      await completeMut.mutateAsync(opnameId)
      toast.success('Stock opname selesai. Stok telah disesuaikan.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal')
    }
  }

  const handleCancel = async () => {
    if (!confirm('Batalkan stock opname ini?')) return
    try {
      await cancelMut.mutateAsync(opnameId)
      toast.success('Stock opname dibatalkan')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/farmasi/stock-opname')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal-600" />
            {opname.nomor_opname}
          </h1>
          <div className="text-sm text-muted-foreground mt-0.5">
            Tipe: {opname.tipe === 'farmasi' ? 'Farmasi' : 'Gudang'} &middot;{' '}
            {new Date(opname.tanggal).toLocaleDateString('id-ID', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </div>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={cancelMut.isPending}>
              <XCircle className="h-4 w-4 mr-1" />
              Batalkan
            </Button>
            <Button onClick={handleComplete} disabled={completeMut.isPending} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-1" />
              Selesaikan
            </Button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{counted}/{total}</div>
            <div className="text-xs text-muted-foreground">Barang Dihitung</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{withDiff.length}</div>
            <div className="text-xs text-muted-foreground">Ada Selisih</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Badge className={cn(
              'text-sm',
              opname.status === 'completed' ? 'bg-green-100 text-green-700' :
              opname.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700',
            )}>
              {opname.status === 'draft' ? 'Draft' :
               opname.status === 'in_progress' ? 'Berlangsung' :
               opname.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Status</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari barang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3">Nama Barang</th>
              <th className="py-2 pr-3 text-right">Stok Sistem</th>
              <th className="py-2 pr-3 text-right">Stok Fisik</th>
              <th className="py-2 pr-3 text-right">Selisih</th>
              <th className="py-2 pr-3">Catatan</th>
              {isActive && <th className="py-2 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2.5 pr-3">
                  <div className="font-medium">{item.item_nama}</div>
                  {item.satuan && (
                    <div className="text-xs text-muted-foreground">{item.satuan}</div>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono">{item.stok_sistem}</td>
                <td className="py-2.5 pr-3 text-right font-mono">
                  {item.stok_fisik !== null ? item.stok_fisik : (
                    <span className="text-muted-foreground italic">—</span>
                  )}
                </td>
                <td className={cn(
                  'py-2.5 pr-3 text-right font-mono font-medium',
                  item.selisih && item.selisih < 0 && 'text-red-600',
                  item.selisih && item.selisih > 0 && 'text-green-600',
                )}>
                  {item.selisih !== null ? (
                    item.selisih > 0 ? `+${item.selisih}` : String(item.selisih)
                  ) : '—'}
                </td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                  {item.catatan || '—'}
                </td>
                {isActive && (
                  <td className="py-2.5 text-right">
                    {editItem === item.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Input
                          type="number" min={0}
                          value={countVal}
                          onChange={(e) => setCountVal(e.target.value)}
                          placeholder="Jumlah"
                          className="w-20 text-xs"
                          autoFocus
                        />
                        <Input
                          value={countNote}
                          onChange={(e) => setCountNote(e.target.value)}
                          placeholder="Catatan"
                          className="w-28 text-xs"
                        />
                        <Button size="sm" className="text-xs" onClick={() => handleInput(item.item_id)} disabled={inputMut.isPending}>
                          OK
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditItem(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm" variant="outline"
                        onClick={() => {
                          setEditItem(item.id)
                          setCountVal(item.stok_fisik !== null ? String(item.stok_fisik) : '')
                          setCountNote(item.catatan ?? '')
                        }}
                        className="text-xs"
                      >
                        Hitung
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isActive ? 6 : 5} className="py-8 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Tidak ada barang
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
