'use client'

import { useState, useCallback } from 'react'
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useEducationTopics,
  useTopicCategories,
  useCreateEducationTopic,
  useUpdateEducationTopic,
  useDeleteEducationTopic,
} from '@/hooks/use-education'
import { toast } from 'sonner'
import type { EducationTopic, CreateTopicInput, UpdateTopicInput } from '@/lib/api/education'

const KATEGORI_OPTIONS = [
  { value: 'diagnosis', label: 'Diagnosis' },
  { value: 'terapi', label: 'Terapi' },
  { value: 'obat', label: 'Obat' },
  { value: 'diet', label: 'Diet' },
  { value: 'nyeri', label: 'Nyeri' },
  { value: 'rehabilitasi', label: 'Rehabilitasi' },
  { value: 'luka', label: 'Luka' },
  { value: 'tanda_bahaya', label: 'Tanda Bahaya' },
  { value: 'discharge', label: 'Discharge' },
  { value: 'lain', label: 'Lain-lain' },
]

const KATEGORI_COLORS: Record<string, string> = {
  diagnosis: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  terapi: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  obat: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  diet: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  nyeri: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  rehabilitasi: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  luka: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  tanda_bahaya: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  discharge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  lain: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export default function AdminEducationTopicsPage() {
  const [search, setSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTopic, setEditTopic] = useState<EducationTopic | null>(null)

  const { data: topicsRes, isLoading } = useEducationTopics({
    search: search || undefined,
    kategori: filterKategori || undefined,
  })
  const topics = topicsRes?.data ?? []

  const { data: categoriesRes } = useTopicCategories()
  const categories = categoriesRes?.data ?? []

  const deleteMut = useDeleteEducationTopic()
  const toggleMut = useUpdateEducationTopic()

  const handleAdd = useCallback(() => {
    setEditTopic(null)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((topic: EducationTopic) => {
    setEditTopic(topic)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Hapus topik edukasi ini? Hanya bisa jika belum digunakan.')) return
      try {
        await deleteMut.mutateAsync(id)
        toast.success('Topik edukasi dihapus')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal menghapus')
      }
    },
    [deleteMut],
  )

  const handleToggle = useCallback(
    async (topic: EducationTopic) => {
      try {
        await toggleMut.mutateAsync({
          id: topic.id,
          data: { is_active: !topic.is_active },
        })
        toast.success(
          topic.is_active ? 'Topik dinonaktifkan' : 'Topik diaktifkan',
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal mengubah status')
      }
    },
    [toggleMut],
  )

  const totalTopics = topics.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Topik Edukasi Pasien
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola master data topik edukasi untuk dokumentasi
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Tambah Topik
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Topik</p>
            <p className="text-lg font-bold">{totalTopics}</p>
          </CardContent>
        </Card>
        {categories.slice(0, 4).map((cat) => (
          <Card key={cat.kategori}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground capitalize">
                {KATEGORI_OPTIONS.find((k) => k.value === cat.kategori)?.label || cat.kategori}
              </p>
              <p className="text-lg font-bold">{cat.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode atau nama topik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterKategori} onValueChange={setFilterKategori}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Kategori</SelectItem>
            {KATEGORI_OPTIONS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="w-32">Kategori</TableHead>
                <TableHead className="w-64">Materi</TableHead>
                <TableHead className="w-20 text-center">Status</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Tidak ada topik edukasi ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                topics.map((topic) => (
                  <TableRow key={topic.id}>
                    <TableCell className="font-mono text-xs">{topic.kode}</TableCell>
                    <TableCell className="font-medium text-sm">{topic.nama}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-[10px] ${KATEGORI_COLORS[topic.kategori] || KATEGORI_COLORS.lain}`}
                      >
                        {KATEGORI_OPTIONS.find((k) => k.value === topic.kategori)?.label || topic.kategori}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                      {topic.materi || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleToggle(topic)}
                        className="inline-flex"
                        title={topic.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {topic.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(topic)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(topic.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Form Dialog */}
      <TopicFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTopic={editTopic}
      />
    </div>
  )
}

// =====================================================
// TOPIC FORM DIALOG
// =====================================================

function TopicFormDialog({
  open,
  onOpenChange,
  editTopic,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editTopic: EducationTopic | null
}) {
  const createMut = useCreateEducationTopic()
  const updateMut = useUpdateEducationTopic()

  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [kategori, setKategori] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [materi, setMateri] = useState('')

  // Reset on open
  useState(() => {
    if (editTopic) {
      setKode(editTopic.kode)
      setNama(editTopic.nama)
      setKategori(editTopic.kategori)
      setDeskripsi(editTopic.deskripsi || '')
      setMateri(editTopic.materi || '')
    } else {
      setKode('')
      setNama('')
      setKategori('')
      setDeskripsi('')
      setMateri('')
    }
  })

  // Also reset when dialog opens with different topic
  const [prevId, setPrevId] = useState<string | null>(null)
  if ((editTopic?.id || null) !== prevId) {
    setPrevId(editTopic?.id || null)
    if (editTopic) {
      setKode(editTopic.kode)
      setNama(editTopic.nama)
      setKategori(editTopic.kategori)
      setDeskripsi(editTopic.deskripsi || '')
      setMateri(editTopic.materi || '')
    } else {
      setKode('')
      setNama('')
      setKategori('')
      setDeskripsi('')
      setMateri('')
    }
  }

  const handleSubmit = async () => {
    if (!kode || !nama || !kategori) {
      toast.error('Kode, nama, dan kategori wajib diisi')
      return
    }
    try {
      if (editTopic) {
        const data: UpdateTopicInput = { kode, nama, kategori, deskripsi, materi }
        await updateMut.mutateAsync({ id: editTopic.id, data })
        toast.success('Topik edukasi diperbarui')
      } else {
        const data: CreateTopicInput = { kode, nama, kategori, deskripsi, materi }
        await createMut.mutateAsync(data)
        toast.success('Topik edukasi berhasil ditambahkan')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editTopic ? 'Edit Topik Edukasi' : 'Tambah Topik Edukasi'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kode</Label>
              <Input
                placeholder="EDU-XX-001"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Select value={kategori} onValueChange={setKategori}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORI_OPTIONS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nama Topik</Label>
            <Input
              placeholder="Nama topik edukasi"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Deskripsi</Label>
            <Input
              placeholder="Deskripsi singkat"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Template Materi</Label>
            <Textarea
              rows={5}
              placeholder="Template materi edukasi yang akan diisi otomatis saat topik dipilih..."
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {editTopic ? 'Simpan Perubahan' : 'Tambah Topik'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
