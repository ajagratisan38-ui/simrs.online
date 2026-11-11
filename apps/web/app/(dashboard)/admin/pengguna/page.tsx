'use client'

import { useState, useMemo } from 'react'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useResetPassword } from '@/hooks/use-users'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Users, Search, Plus, Loader2, Pencil, Trash2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'dokter', label: 'Dokter' },
  { value: 'perawat', label: 'Perawat' },
  { value: 'apoteker', label: 'Apoteker' },
  { value: 'kasir', label: 'Kasir' },
  { value: 'pendaftaran', label: 'Pendaftaran' },
  { value: 'rekam_medis', label: 'Rekam Medis' },
  { value: 'manajemen', label: 'Manajemen' },
  { value: 'lab', label: 'Laboratorium' },
  { value: 'radiologi', label: 'Radiologi' },
]

const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  admin: 'destructive',
  dokter: 'default',
  perawat: 'default',
  apoteker: 'secondary',
  kasir: 'secondary',
  pendaftaran: 'outline',
  rekam_medis: 'outline',
  manajemen: 'default',
  lab: 'secondary',
  radiologi: 'secondary',
}

interface FormData {
  name: string
  email: string
  password: string
  role: string
  is_active: boolean
}

const INITIAL_FORM: FormData = {
  name: '',
  email: '',
  password: '',
  role: 'perawat',
  is_active: true,
}

export default function PenggunaPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(INITIAL_FORM)

  const searchParam = useMemo(() => search.trim() || undefined, [search])
  const { data, isLoading, isFetching } = useUsers({ page, limit: 20, search: searchParam })
  const createMut = useCreateUser()
  const updateMut = useUpdateUser()
  const deleteMut = useDeleteUser()
  const resetPwMut = useResetPassword()

  const users = data?.data || []
  const meta = data?.meta

  const openCreate = () => {
    setEditingId(null)
    setForm(INITIAL_FORM)
    setShowDialog(true)
  }

  const openEdit = (user: { id: string; name: string; email: string; role: string; is_active: boolean }) => {
    setEditingId(user.id)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active,
    })
    setShowDialog(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateMut.mutateAsync({
          id: editingId,
          data: {
            name: form.name,
            email: form.email,
            role: form.role,
            is_active: form.is_active,
          },
        })
        toast.success('Pengguna berhasil diperbarui')
      } else {
        if (!form.password) {
          toast.error('Password wajib diisi untuk pengguna baru')
          return
        }
        await createMut.mutateAsync({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          is_active: form.is_active,
        })
        toast.success('Pengguna berhasil ditambahkan')
      }
      setShowDialog(false)
    } catch (err) {
      toast.error(editingId ? 'Gagal memperbarui pengguna' : 'Gagal menambahkan pengguna')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus pengguna "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return
    try {
      await deleteMut.mutateAsync(id)
      toast.success('Pengguna berhasil dihapus')
    } catch {
      toast.error('Gagal menghapus pengguna')
    }
  }

  const handleResetPassword = async (id: string, name: string) => {
    const newPw = prompt(`Reset password untuk "${name}".\nMasukkan password baru (min 8 karakter):`)
    if (!newPw || newPw.length < 8) {
      if (newPw) toast.error('Password minimal 8 karakter')
      return
    }
    try {
      await resetPwMut.mutateAsync({ id, password: newPw })
      toast.success('Password berhasil direset')
    } catch {
      toast.error('Gagal mereset password')
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-teal-600" />
            Manajemen Pengguna
          </h1>
          <p className="text-muted-foreground">Kelola akun pengguna sistem</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pengguna
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Daftar Pengguna</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email..."
                className="pl-8 w-64"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                autoComplete="off"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {isFetching && !isLoading && (
            <div className="absolute top-2 right-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600 dark:text-teal-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada pengguna ditemukan
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Login Terakhir</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROLE_COLORS[user.role] || 'outline'}>
                          {ROLES.find((r) => r.value === user.role)?.label || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleString('id-ID', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : 'Belum pernah'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => openEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reset Password"
                            onClick={() => handleResetPassword(user.id, user.name)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Hapus"
                            onClick={() => handleDelete(user.id, user.name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Halaman {meta.page} dari {meta.totalPages} ({meta.total} pengguna)
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Lengkap</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dr. Siti Rahmawati"
                autoComplete="off"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="siti@rs-demo.simrs.id"
                autoComplete="off"
              />
            </div>
            {!editingId && (
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  autoComplete="new-password"
                />
              </div>
            )}
            <div>
              <Label>Role</Label>
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active">Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingId ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
