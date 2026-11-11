'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Stethoscope,
  Search,
  Calendar,
  Check,
  X,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDoctorList, useTodaySchedule } from '@/hooks/use-doctors'
import {
  type DoctorStatus,
  DOCTOR_STATUS_LABELS,
  DOCTOR_STATUS_COLORS,
} from '@/lib/api/doctors'
import { cn } from '@/lib/utils'

const HARI_LABELS: Record<string, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
}

const STATUS_FILTERS: { value: DoctorStatus | 'all' | 'inactive'; label: string }[] = [
  { value: 'all', label: 'Semua Aktif' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'cuti_panjang', label: 'Cuti Panjang' },
  { value: 'inactive', label: 'Pindah/Resign/Pensiun' },
]

export default function DokterAdminPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DoctorStatus | 'all' | 'inactive'>('all')

  const { data: doctorsRes, isLoading } = useDoctorList(
    statusFilter === 'inactive'
      ? { includeInactive: true, includeDeleted: true }
      : statusFilter !== 'all'
        ? { status: statusFilter }
        : undefined,
  )
  const { data: todayRes } = useTodaySchedule()

  const doctors = doctorsRes?.data ?? []
  const todaySchedule = todayRes?.data ?? []

  let filtered = doctors
  if (statusFilter === 'inactive') {
    filtered = filtered.filter((d) =>
      ['pindah', 'resign', 'pensiun'].includes(d.status),
    )
  }
  if (search) {
    filtered = filtered.filter(
      (d) =>
        d.nama.toLowerCase().includes(search.toLowerCase()) ||
        (d.spesialisasi ?? '').toLowerCase().includes(search.toLowerCase()),
    )
  }

  const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']
  const todayDay = HARI_LABELS[days[new Date().getDay()]] ?? ''

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-teal-600" />
            Manajemen Dokter
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jadwal praktik, tarif layanan, dan jasa medis
          </p>
        </div>
      </div>

      {/* Today Schedule Card */}
      {todaySchedule.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              Jadwal Hari Ini — {todayDay}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todaySchedule.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                >
                  <div>
                    <div className="font-medium text-sm">{s.doctor_nama}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.spesialisasi || 'Umum'} • {s.room_nama}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {s.jam_mulai.slice(0, 5)} - {s.jam_selesai.slice(0, 5)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                statusFilter === f.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari dokter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Doctor List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'Tidak ada dokter yang cocok' : 'Belum ada data dokter'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <Link
              key={doc.id}
              href={`/admin/dokter/${doc.id}`}
              className="block"
            >
              <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm',
                      doc.deleted_at ? 'bg-red-300' : doc.is_available ? 'bg-teal-600' : 'bg-gray-400',
                    )}
                  >
                    {doc.nama.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {doc.nama}
                      {doc.deleted_at ? (
                        <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 line-through">
                          Dinonaktifkan
                        </Badge>
                      ) : doc.status && doc.status !== 'aktif' ? (
                        <Badge className={cn('text-[10px] px-1.5 py-0', DOCTOR_STATUS_COLORS[doc.status])}>
                          {DOCTOR_STATUS_LABELS[doc.status]}
                        </Badge>
                      ) : doc.is_available ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Cuti
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {doc.spesialisasi || 'Umum'}
                      {doc.no_sip && ` • SIP: ${doc.no_sip}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatRupiah(Number(doc.tarif_konsultasi))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Tarif konsultasi
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
