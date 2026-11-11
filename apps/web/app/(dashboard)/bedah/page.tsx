'use client'

import { useState } from 'react'
import { useSurgeries } from '@/hooks/use-surgery'
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
import { Scissors, Loader2, Calendar, Clock, AlertTriangle } from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  dijadwalkan: { variant: 'outline', label: 'Dijadwalkan' },
  persiapan: { variant: 'secondary', label: 'Persiapan' },
  berjalan: { variant: 'default', label: 'Berjalan' },
  selesai: { variant: 'secondary', label: 'Selesai' },
  batal: { variant: 'destructive', label: 'Batal' },
}

const JENIS_BADGE: Record<string, { variant: 'default' | 'destructive' | 'outline'; label: string }> = {
  elektif: { variant: 'outline', label: 'Elektif' },
  cito: { variant: 'default', label: 'Cito' },
  emergency: { variant: 'destructive', label: 'Emergency' },
}

export default function BedahPage() {
  const [status, setStatus] = useState('')
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10))
  const [page, setPage] = useState(1)

  const { data, isLoading } = useSurgeries({
    status: status || undefined,
    tanggal: tanggal || undefined,
    page,
    limit: 20,
  })

  const surgeries = data?.data || []
  const meta = data?.meta

  const typedSurgeries = surgeries as Array<Record<string, unknown>>
  const berjalan = typedSurgeries.filter((s) => s.status === 'berjalan').length
  const dijadwalkan = typedSurgeries.filter((s) => s.status === 'dijadwalkan').length
  const emergency = typedSurgeries.filter((s) => s.jenis_operasi === 'emergency').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scissors className="h-6 w-6 text-red-600" />
          Bedah / Operasi
        </h1>
        <p className="text-muted-foreground">Jadwal dan manajemen operasi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" /> Dijadwalkan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{dijadwalkan}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" /> Sedang Berjalan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{berjalan}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> Emergency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{emergency}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta?.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Jadwal Operasi</CardTitle>
            <div className="flex gap-2">
              <DateInput
                value={tanggal}
                onChange={(v) => { setTanggal(v); setPage(1) }}
                className="w-44"
              />
              <Select
                className="w-40"
                value={status || 'all'}
                onChange={(e) => { setStatus(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
              >
                <option value="all">Semua</option>
                <option value="dijadwalkan">Dijadwalkan</option>
                <option value="persiapan">Persiapan</option>
                <option value="berjalan">Berjalan</option>
                <option value="selesai">Selesai</option>
                <option value="batal">Batal</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600 dark:text-teal-400" />
            </div>
          ) : surgeries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada jadwal operasi
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. OP</TableHead>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Ruang</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Anestesi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedSurgeries.map((s) => {
                  const sc = STATUS_CONFIG[String(s.status)] ?? { variant: 'outline' as const, label: String(s.status) }
                  const jc = JENIS_BADGE[String(s.jenis_operasi)] ?? { variant: 'outline' as const, label: String(s.jenis_operasi) }
                  return (
                    <TableRow key={s.id as string}>
                      <TableCell className="font-mono text-sm">
                        {s.nomor_operasi as string}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.patient_nama as string}</div>
                        <div className="text-xs text-muted-foreground">{s.no_rekam_medis as string}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={jc.variant}>{jc.label}</Badge>
                      </TableCell>
                      <TableCell>{s.ruang_operasi as string}</TableCell>
                      <TableCell>{s.jam_mulai as string}</TableCell>
                      <TableCell>{s.estimasi_durasi_menit as number} menit</TableCell>
                      <TableCell className="capitalize">{s.jenis_anestesi as string}</TableCell>
                      <TableCell>
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/bedah/${s.id}`}>
                          <Button variant="outline" size="sm">Detail</Button>
                        </Link>
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
