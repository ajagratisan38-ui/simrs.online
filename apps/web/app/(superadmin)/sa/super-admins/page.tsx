'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Plus,
  Shield,
  ShieldCheck,
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  X,
} from 'lucide-react'
import {
  useSuperAdminsList,
  useCreateSuperAdmin,
  useToggleSuperAdmin,
  useDeleteSuperAdmin,
} from '@/hooks/use-tenants-admin'

function formatDate(d: string | null): string {
  if (!d) return 'Belum pernah'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function OwnerGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useAuthStore()
  if (user?.saRole !== 'owner') {
    router.replace('/sa')
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm text-muted-foreground">Hanya owner yang dapat mengakses halaman ini</p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

export default function SuperAdminsPage() {
  return (
    <OwnerGuard>
      <SuperAdminsContent />
    </OwnerGuard>
  )
}

function SuperAdminsContent() {
  const { data: admins, isLoading } = useSuperAdminsList()
  const createMutation = useCreateSuperAdmin()
  const toggleMutation = useToggleSuperAdmin()
  const deleteMutation = useDeleteSuperAdmin()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('operator')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleCreate = () => {
    if (!name || !email || password.length < 8) return
    createMutation.mutate(
      { name, email, password, sa_role: role },
      {
        onSuccess: () => {
          setShowForm(false)
          setName(''); setEmail(''); setPassword(''); setRole('operator')
        },
      },
    )
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setDeleteId(null),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Kelola Super Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage akun super admin platform
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Tambah
        </Button>
      </div>

      {/* Create Form Dialog */}
      {showForm && (
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tambah Super Admin</CardTitle>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama *</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Super Admin"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="admin@simrs.id"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Min 8 karakter"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <select
                  value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="owner">Owner (Full Access)</option>
                  <option value="operator">Operator (Limited)</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleCreate} disabled={createMutation.isPending || !name || !email || password.length < 8}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Buat Super Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
            </div>
          ) : !admins?.length ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada super admin</p>
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${admin.role === 'owner' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                      {admin.role === 'owner' ? (
                        <ShieldCheck className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Shield className="h-5 w-5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{admin.name}</p>
                        <Badge variant={admin.role === 'owner' ? 'default' : 'secondary'} className="text-[10px]">
                          {admin.role}
                        </Badge>
                        {!admin.is_active && (
                          <Badge variant="destructive" className="text-[10px]">
                            Nonaktif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Login terakhir: {formatDate(admin.last_login_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMutation.mutate({ id: admin.id, isActive: !admin.is_active })}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400"
                      title={admin.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {admin.is_active ? (
                        <ToggleRight className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteId(admin.id)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg">Hapus Super Admin?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Aksi ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleDelete(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
