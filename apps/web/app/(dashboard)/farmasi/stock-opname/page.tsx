'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ClipboardCheck,
  Plus,
  ArrowRight,
  Calendar,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  useStockOpnames,
  useCreateStockOpname,
} from '@/hooks/use-warehouse'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'Berlangsung', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}

export default function StockOpnamePage() {
  const [status, setStatus] = useState('')
  const [tipe, setTipe] = useState('')
  const [createTipe, setCreateTipe] = useState<'farmasi' | 'gudang' | null>(null)

  const { data: res, isLoading } = useStockOpnames({
    status: status || undefined,
    tipe: tipe || undefined,
  })
  const opnames = res?.data ?? []
  const createMut = useCreateStockOpname()

  const handleCreate = async (t: 'farmasi' | 'gudang') => {
    try {
      const result = await createMut.mutateAsync({ tipe: t })
      toast.success(`Stock opname ${t} berhasil dibuat`)
      setCreateTipe(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat opname')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-teal-600" />
            Stock Opname
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Penghitungan fisik stok berkala
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleCreate('farmasi')} disabled={createMut.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            Opname Farmasi
          </Button>
          <Button onClick={() => handleCreate('gudang')} disabled={createMut.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            Opname Gudang
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={tipe} onChange={(e) => setTipe(e.target.value)} className="w-40">
          <option value="">Semua Tipe</option>
          <option value="farmasi">Farmasi</option>
          <option value="gudang">Gudang</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
          <option value="">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="in_progress">Berlangsung</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </Select>
      </div>

      {/* Opname List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : opnames.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada stock opname</p>
          <p className="text-xs mt-1">Buat stock opname baru untuk memulai penghitungan fisik</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {opnames.map((op) => {
            const badge = STATUS_BADGE[op.status] || STATUS_BADGE.draft
            return (
              <Card key={op.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{op.nomor_opname}</span>
                      <Badge variant="outline" className="text-xs">
                        {op.tipe === 'farmasi' ? 'Farmasi' : 'Gudang'}
                      </Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(op.tanggal).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </span>
                      {op.catatan && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {op.catatan}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/farmasi/stock-opname/${op.id}`}>
                    <Button variant="ghost" size="sm">
                      Detail
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
