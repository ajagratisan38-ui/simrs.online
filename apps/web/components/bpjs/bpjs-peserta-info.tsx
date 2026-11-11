'use client'

import {
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { BpjsPeserta } from '@/lib/api/bpjs'

interface BpjsPesertaInfoProps {
  peserta: BpjsPeserta | undefined
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  expectedKelas?: number
}

export function BpjsPesertaInfo({
  peserta,
  isLoading,
  isError,
  errorMessage,
  expectedKelas,
}: BpjsPesertaInfoProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
            Mengecek data BPJS...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {errorMessage || 'Gagal mengambil data peserta BPJS'}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!peserta) return null

  const isAktif = peserta.aktif
  const kelasName = peserta.jnsKelas?.nama || '-'
  const kelasKode = peserta.jnsKelas?.kode || ''
  const kelasMismatch = expectedKelas && kelasKode !== String(expectedKelas)

  return (
    <Card className={isAktif ? 'border-green-200' : 'border-red-200'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Info Peserta BPJS
          </CardTitle>
          <Badge variant={isAktif ? 'success' : 'destructive'} className="gap-1">
            {isAktif ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {isAktif ? 'Aktif' : 'Tidak Aktif'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <InfoRow label="Nama" value={peserta.nama} />
        <InfoRow label="No. Kartu" value={peserta.noKartu} mono />
        <InfoRow label="NIK" value={peserta.nik || peserta.noKTP || '-'} mono />
        <InfoRow label="Jenis Peserta" value={peserta.jnsPeserta?.nama || '-'} />
        <InfoRow label="Kelas Rawat" value={kelasName} />
        <InfoRow
          label="Faskes Tingkat 1"
          value={peserta.kdProviderPst?.nmProvider || '-'}
          icon={<Building2 className="h-3 w-3 text-muted-foreground" />}
        />
        <InfoRow label="No. HP" value={peserta.noHP || '-'} />

        {!isAktif && (
          <div className="flex items-start gap-2 p-2 mt-2 rounded-md bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium">Peserta tidak aktif</p>
              <p>{peserta.ketAktif || 'Status kepesertaan tidak aktif, tidak bisa didaftarkan BPJS.'}</p>
            </div>
          </div>
        )}

        {isAktif && kelasMismatch && (
          <div className="flex items-start gap-2 p-2 mt-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium">Kelas tidak sesuai</p>
              <p>
                Hak kelas pasien: <span className="font-mono font-bold">{kelasName}</span>.
                Pastikan ruang rawat sesuai atau proses upgrade kelas.
              </p>
            </div>
          </div>
        )}

        {peserta.tunggakan > 0 && (
          <div className="flex items-start gap-2 p-2 mt-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium">Ada tunggakan</p>
              <p>Tunggakan: Rp {Math.round(Number(peserta.tunggakan)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InfoRow({
  label,
  value,
  mono,
  icon,
}: {
  label: string
  value: string
  mono?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={mono ? 'font-mono font-medium' : 'font-medium'}>
        {value}
      </span>
    </div>
  )
}
