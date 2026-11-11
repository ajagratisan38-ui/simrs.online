'use client'

import { formatRupiah } from '@/lib/utils'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Package,
  Plus,
  Power,
  Loader2,
  Users,
  UserCheck,
  Stethoscope,
  HardDrive,
  Receipt,
  Clock,
  X,
  Save,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import {
  usePlansList,
  useCreatePlan,
  useUpdatePlan,
  useTogglePlan,
  useDeletePlan,
  useTransactions,
} from '@/hooks/use-tenants-admin'
import { toast } from 'sonner'
import type { SubscriptionPlan } from '@/lib/api/super-admin'

function formatRupiahOrGratis(amount: number | string): string {
  const num = Math.round(Number(amount) || 0)
  return num === 0 ? 'Gratis' : formatRupiah(num)
}

type Tab = 'plans' | 'transactions'

interface PlanForm {
  code: string
  name: string
  price_monthly: string
  price_yearly: string
  max_users: string
  max_patients: string
  max_doctors: string
  max_storage_gb: string
  trial_days: string
}

const EMPTY_FORM: PlanForm = {
  code: '', name: '',
  price_monthly: '', price_yearly: '',
  max_users: '', max_patients: '', max_doctors: '', max_storage_gb: '',
  trial_days: '0',
}

export default function SAPlansPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('plans')

  if (user?.saRole !== 'owner') {
    router.replace('/sa')
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Package className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm text-muted-foreground">Hanya owner yang dapat mengakses halaman ini</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Paket & Transaksi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola paket langganan dan riwayat transaksi
        </p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {[
          { id: 'plans' as Tab, label: 'Paket Langganan', icon: Package },
          { id: 'transactions' as Tab, label: 'Transaksi', icon: Receipt },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plans' && <PlansTab />}
      {tab === 'transactions' && <TransactionsTab />}
    </div>
  )
}

function PlanFormDialog({
  editingPlan,
  onClose,
}: {
  editingPlan: SubscriptionPlan | null
  onClose: () => void
}) {
  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()
  const isEdit = !!editingPlan

  const [form, setForm] = useState<PlanForm>(
    editingPlan
      ? {
          code: editingPlan.code,
          name: editingPlan.name,
          price_monthly: String(editingPlan.price_monthly),
          price_yearly: String(editingPlan.price_yearly),
          max_users: String(editingPlan.max_users || ''),
          max_patients: String(editingPlan.max_patients || ''),
          max_doctors: String(editingPlan.max_doctors || ''),
          max_storage_gb: String(editingPlan.max_storage_gb || ''),
          trial_days: String(editingPlan.trial_days || 0),
        }
      : { ...EMPTY_FORM },
  )

  const handleSubmit = () => {
    if (!form.code || !form.name) {
      toast.error('Kode dan nama paket wajib diisi')
      return
    }

    const payload = {
      code: form.code,
      name: form.name,
      price_monthly: Number(form.price_monthly) || 0,
      price_yearly: Number(form.price_yearly) || 0,
      max_users: Number(form.max_users) || 0,
      max_patients: Number(form.max_patients) || 0,
      max_doctors: Number(form.max_doctors) || 0,
      max_storage_gb: Number(form.max_storage_gb) || 0,
      trial_days: Number(form.trial_days) || 0,
    } as Partial<SubscriptionPlan>

    if (isEdit) {
      updatePlan.mutate({ id: editingPlan.id, data: payload }, {
        onSuccess: () => { toast.success('Paket berhasil diupdate'); onClose() },
        onError: (err) => toast.error(err.message),
      })
    } else {
      createPlan.mutate(payload, {
        onSuccess: () => { toast.success('Paket berhasil dibuat'); onClose() },
        onError: (err) => toast.error(err.message),
      })
    }
  }

  const isPending = createPlan.isPending || updatePlan.isPending

  const fields: Array<{ key: keyof PlanForm; label: string; placeholder: string; type?: string; disabled?: boolean }> = [
    { key: 'code', label: 'Kode *', placeholder: 'basic', disabled: isEdit },
    { key: 'name', label: 'Nama *', placeholder: 'Basic' },
    { key: 'price_monthly', label: 'Harga/Bulan (Rp)', placeholder: '1500000', type: 'number' },
    { key: 'price_yearly', label: 'Harga/Tahun (Rp)', placeholder: '15000000', type: 'number' },
    { key: 'max_users', label: 'Max Users', placeholder: '0 = unlimited', type: 'number' },
    { key: 'max_patients', label: 'Max Pasien', placeholder: '0 = unlimited', type: 'number' },
    { key: 'max_doctors', label: 'Max Dokter', placeholder: '0 = unlimited', type: 'number' },
    { key: 'max_storage_gb', label: 'Storage (GB)', placeholder: '0 = unlimited', type: 'number' },
    { key: 'trial_days', label: 'Trial (hari)', placeholder: '0', type: 'number' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-base font-semibold">
            {isEdit ? `Edit: ${editingPlan.name}` : 'Tambah Paket Baru'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key} className={f.key === 'name' || f.key === 'code' ? '' : ''}>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {f.label}
                </label>
                <Input
                  type={f.type || 'text'}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  disabled={f.disabled}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
          <Button variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isEdit ? 'Simpan' : 'Buat Paket'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function PlansTab() {
  const { data: plans, isLoading } = usePlansList(true)
  const togglePlan = useTogglePlan()
  const deletePlanMut = useDeletePlan()

  const [dialogPlan, setDialogPlan] = useState<SubscriptionPlan | null | 'create'>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<SubscriptionPlan | null>(null)

  const handleDelete = (plan: SubscriptionPlan) => {
    deletePlanMut.mutate(plan.id, {
      onSuccess: () => {
        toast.success(`Paket "${plan.name}" berhasil dihapus`)
        setDeleteConfirm(null)
      },
      onError: (err) => toast.error(err.message),
    })
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setDialogPlan('create')} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Tambah Paket
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans?.map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? 'opacity-50 grayscale' : undefined}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-[10px]">
                  {plan.is_active ? 'Aktif' : 'Off'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{plan.code}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xl font-bold text-indigo-600">
                  {formatRupiahOrGratis(plan.price_monthly)}
                </p>
                <p className="text-xs text-muted-foreground">/bulan</p>
                {plan.price_yearly > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRupiahOrGratis(plan.price_yearly)}/tahun
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  Max {plan.max_users || '∞'} user
                </div>
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3 w-3 text-muted-foreground" />
                  Max {plan.max_patients || '∞'} pasien
                </div>
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="h-3 w-3 text-muted-foreground" />
                  Max {plan.max_doctors || '∞'} dokter
                </div>
                <div className="flex items-center gap-1.5">
                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                  {plan.max_storage_gb || '∞'} GB storage
                </div>
                {plan.trial_days > 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <Clock className="h-3 w-3" />
                    Trial {plan.trial_days} hari
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-0"
                  onClick={() => setDialogPlan(plan)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-0"
                  onClick={() =>
                    togglePlan.mutate(
                      { id: plan.id, isActive: !plan.is_active },
                      {
                        onSuccess: () => toast.success(
                          plan.is_active ? 'Paket dinonaktifkan' : 'Paket diaktifkan',
                        ),
                      },
                    )
                  }
                  disabled={togglePlan.isPending}
                >
                  <Power className={`h-3 w-3 ${plan.is_active ? 'text-emerald-500' : 'text-slate-400'}`} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-0 hover:border-red-300 hover:text-red-500"
                  onClick={() => setDeleteConfirm(plan)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      {dialogPlan && (
        <PlanFormDialog
          editingPlan={dialogPlan === 'create' ? null : dialogPlan}
          onClose={() => setDialogPlan(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="font-bold text-lg">Hapus Paket?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Paket <span className="font-semibold">{deleteConfirm.name}</span> akan dihapus permanen.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tidak bisa dihapus jika masih ada tenant yang menggunakan paket ini.
              </p>
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deletePlanMut.isPending}
              >
                {deletePlanMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TransactionsTab() {
  const { data: transactions, isLoading } = useTransactions()

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Riwayat Transaksi</CardTitle>
      </CardHeader>
      <CardContent>
        {!transactions?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Belum ada transaksi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Tanggal</th>
                  <th className="pb-2 pr-4">Tenant</th>
                  <th className="pb-2 pr-4">Tipe</th>
                  <th className="pb-2 pr-4">Jumlah</th>
                  <th className="pb-2 pr-4">Metode</th>
                  <th className="pb-2 pr-4">Periode</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: Record<string, unknown>) => (
                  <tr key={String(tx.id)} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 text-xs">
                      {new Date(String(tx.created_at)).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-2.5 pr-4 font-medium">{String(tx.tenant_name || '-')}</td>
                    <td className="py-2.5 pr-4 capitalize">{String(tx.type)}</td>
                    <td className="py-2.5 pr-4">{formatRupiah(Number(tx.amount))}</td>
                    <td className="py-2.5 pr-4 capitalize">{String(tx.payment_method || '-')}</td>
                    <td className="py-2.5 pr-4 capitalize">{String(tx.period || '-')}</td>
                    <td className="py-2.5">
                      <Badge
                        variant={String(tx.status) === 'paid' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {String(tx.status) === 'paid' ? 'Lunas' : String(tx.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
