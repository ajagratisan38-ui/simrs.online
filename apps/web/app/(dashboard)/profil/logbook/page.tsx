'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Users,
  Stethoscope,
  ClipboardList,
  Pill,
  Search,
  ChevronRight,
  Download,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLogbook, useLogbookStats } from '@/hooks/use-logbook'
import { cn } from '@/lib/utils'

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users
  label: string
  value: number | undefined
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">
            {value !== undefined ? value : '—'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

const VISIT_TIPE_LABEL: Record<string, string> = {
  rawat_jalan: 'Rawat Jalan',
  igd: 'IGD',
  rawat_inap: 'Rawat Inap',
}

const VISIT_TIPE_COLOR: Record<string, string> = {
  rawat_jalan: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  igd: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  rawat_inap: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
}

export default function LogbookPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [tipe, setTipe] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useLogbook({
    page,
    limit: 20,
    search: search || undefined,
    tipe: tipe || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const { data: statsData } = useLogbookStats(
    startDate || undefined,
    endDate || undefined,
  )

  const entries = data?.data ?? []
  const meta = data?.meta
  const stats = statsData?.data

  function handleSearch() {
    setSearch(searchInput)
    setPage(1)
  }

  function handleExportCSV() {
    if (!entries.length) return

    const headers = [
      'Tanggal',
      'No. Kunjungan',
      'Pasien',
      'No. RM',
      'Tipe',
      'Poli',
      'Diagnosis',
      'Tindakan',
    ]

    const rows = entries.map((e) => [
      e.tanggal,
      e.visit_number,
      e.patient_nama,
      e.no_rekam_medis,
      VISIT_TIPE_LABEL[e.visit_tipe] || e.visit_tipe,
      e.room_nama,
      e.diagnoses.map((d) => `${d.icd10_code} ${d.icd10_name}`).join('; '),
      e.procedures.map((p) => p.nama_tindakan).join('; '),
    ])

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logbook-dokter-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Logbook Dokter
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rekap seluruh tindakan dan pelayanan yang telah dilakukan
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={entries.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          icon={Users}
          label="Total Pasien"
          value={stats?.totalPasien}
          color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
        />
        <StatCard
          icon={Stethoscope}
          label="Kunjungan"
          value={stats?.totalKunjungan}
          color="bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400"
        />
        <StatCard
          icon={ClipboardList}
          label="Diagnosis"
          value={stats?.totalDiagnosis}
          color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
        />
        <StatCard
          icon={ClipboardList}
          label="Tindakan"
          value={stats?.totalTindakan}
          color="bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400"
        />
        <StatCard
          icon={Pill}
          label="Resep"
          value={stats?.totalResep}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
        />
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Cari pasien (nama / no RM)..."
                className="pl-9"
              />
            </div>
            <Button size="sm" onClick={handleSearch}>
              Cari
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs">Dari Tanggal</Label>
                <DateInput
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val)
                    setPage(1)
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sampai Tanggal</Label>
                <DateInput
                  value={endDate}
                  onChange={(val) => {
                    setEndDate(val)
                    setPage(1)
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipe Kunjungan</Label>
                <Select
                  value={tipe}
                  onChange={(e) => {
                    setTipe(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">Semua Tipe</option>
                  <option value="rawat_jalan">Rawat Jalan</option>
                  <option value="igd">IGD</option>
                  <option value="rawat_inap">Rawat Inap</option>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search || tipe || startDate
                ? 'Tidak ada data yang cocok dengan filter'
                : 'Belum ada catatan logbook'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-2.5 font-medium">Pasien</th>
                    <th className="text-left px-4 py-2.5 font-medium">Tipe</th>
                    <th className="text-left px-4 py-2.5 font-medium">Poli</th>
                    <th className="text-left px-4 py-2.5 font-medium">Diagnosis</th>
                    <th className="text-left px-4 py-2.5 font-medium">Tindakan</th>
                    <th className="px-4 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="text-sm">
                          {new Date(entry.tanggal).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {entry.visit_number}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{entry.patient_nama}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.no_rekam_medis} ·{' '}
                          {entry.patient_jk === 'L' ? 'Lk' : 'Pr'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            VISIT_TIPE_COLOR[entry.visit_tipe],
                          )}
                        >
                          {VISIT_TIPE_LABEL[entry.visit_tipe] || entry.visit_tipe}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {entry.room_nama}
                      </td>
                      <td className="px-4 py-2.5">
                        {entry.diagnoses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.diagnoses.map((dx, i) => (
                              <span
                                key={i}
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded border',
                                  dx.tipe === 'utama'
                                    ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-300'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-900 dark:border-gray-700',
                                )}
                              >
                                {dx.icd10_code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {entry.procedures.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.procedures.map((proc, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300"
                              >
                                {proc.kode_tindakan || proc.nama_tindakan}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/rekam-medis/${entry.visit_id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Hal {meta.page} dari {meta.totalPages} ({meta.total} catatan)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
