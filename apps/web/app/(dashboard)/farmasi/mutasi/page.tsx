'use client'

import { useState } from 'react'
import { useTransfers, useApproveTransfer, useCompleteTransfer, useRejectTransfer } from '@/hooks/use-inventory'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowRightLeft, Loader2, Search, CheckCircle, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { variant: 'outline', label: 'Menunggu' },
  approved: { variant: 'default', label: 'Disetujui' },
  completed: { variant: 'secondary', label: 'Selesai' },
  rejected: { variant: 'destructive', label: 'Ditolak' },
}

export default function MutasiBarangPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useTransfers({
    status: status || undefined,
    search: search || undefined,
    page,
    limit: 20,
  })

  const approveMut = useApproveTransfer()
  const completeMut = useCompleteTransfer()
  const rejectMut = useRejectTransfer()

  const transfers = data?.data || []
  const meta = data?.meta

  const handleApprove = async (id: string) => {
    try {
      await approveMut.mutateAsync(id)
      toast.success('Mutasi disetujui')
    } catch {
      toast.error('Gagal menyetujui mutasi')
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await completeMut.mutateAsync(id)
      toast.success('Mutasi selesai')
    } catch {
      toast.error('Gagal menyelesaikan mutasi')
    }
  }

  const handleReject = async (id: string) => {
    const alasan = prompt('Alasan penolakan:')
    if (!alasan) return
    try {
      await rejectMut.mutateAsync({ id, alasan })
      toast.success('Mutasi ditolak')
    } catch {
      toast.error('Gagal menolak mutasi')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6 text-teal-600" />
          Mutasi Barang
        </h1>
        <p className="text-muted-foreground">Kelola perpindahan obat/barang antar unit</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" /> Menunggu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {transfers.filter((t) => t.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Disetujui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {transfers.filter((t) => t.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Selesai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {transfers.filter((t) => t.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <XCircle className="h-4 w-4" /> Ditolak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {transfers.filter((t) => t.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Daftar Mutasi</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari obat/nomor..."
                  className="pl-8 w-56"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
              <Select
                className="w-36"
                value={status || 'all'}
                onChange={(e) => { setStatus(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
              >
                <option value="all">Semua</option>
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="completed">Selesai</option>
                <option value="rejected">Ditolak</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600 dark:text-teal-400" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada mutasi barang
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Mutasi</TableHead>
                  <TableHead>Obat/Barang</TableHead>
                  <TableHead>Dari</TableHead>
                  <TableHead>Ke</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t: Record<string, unknown>) => {
                  const st = STATUS_BADGE[(t.status as string)] || STATUS_BADGE.pending
                  return (
                    <TableRow key={t.id as string}>
                      <TableCell className="font-mono text-sm">
                        {t.nomor_mutasi as string}
                      </TableCell>
                      <TableCell className="font-medium">{t.drug_nama as string}</TableCell>
                      <TableCell>{t.from_location as string}</TableCell>
                      <TableCell>{t.to_location as string}</TableCell>
                      <TableCell className="text-right">
                        {t.jumlah as number} {t.satuan as string}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st?.variant ?? 'secondary'}>{st?.label ?? ''}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(t.created_at as string).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {t.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleApprove(t.id as string)}>
                                Setujui
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleReject(t.id as string)}>
                                Tolak
                              </Button>
                            </>
                          )}
                          {t.status === 'approved' && (
                            <Button size="sm" onClick={() => handleComplete(t.id as string)}>
                              Selesaikan
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Halaman {meta.page} dari {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
