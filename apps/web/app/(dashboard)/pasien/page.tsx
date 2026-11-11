'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PermissionGate } from '@/components/ui/permission-gate'
import { usePatients, useDeletePatient } from '@/hooks/use-patients'
import { toast } from 'sonner'

export default function PasienPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, isError } = usePatients({
    search: debouncedSearch,
    page,
    limit,
    sort: 'nama',
    order: 'asc',
  })

  const deleteMutation = useDeletePatient()

  const patients = data?.data ?? []
  const meta = data?.meta

  function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus pasien "${nama}"?`)) return
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Pasien "${nama}" berhasil dihapus`),
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pasien</h1>
          <p className="text-muted-foreground">
            Kelola data pasien rumah sakit
          </p>
        </div>
        <PermissionGate permission="patient:create">
          <Button asChild>
            <Link href="/pasien/baru">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pasien
            </Link>
          </Button>
        </PermissionGate>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, NIK, No RM, No BPJS..."
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium">No RM</th>
              <th className="text-left px-4 py-3 font-medium">Nama</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">NIK</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Tgl Lahir</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">JK</th>
              <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">No BPJS</th>
              <th className="text-right px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20 ml-auto" /></td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Gagal memuat data pasien
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {search ? 'Tidak ditemukan pasien yang cocok' : 'Belum ada data pasien'}
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr
                  key={p.id}
                  className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/pasien/${p.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{p.no_rekam_medis}</td>
                  <td className="px-4 py-3 font-medium">{p.nama}</td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-xs">{p.nik}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {new Date(p.tanggal_lahir).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant={p.jenis_kelamin === 'L' ? 'default' : 'secondary'}>
                      {p.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell font-mono text-xs">
                    {p.no_bpjs || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <PermissionGate permission="patient:update">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/pasien/${p.id}/edit`)}
                        >
                          Edit
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission="patient:delete">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(p.id, p.nama)}
                          disabled={deleteMutation.isPending}
                        >
                          Hapus
                        </Button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, meta.total)} dari {meta.total} pasien
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
