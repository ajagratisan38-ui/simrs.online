'use client'

import { formatRupiahAccounting as formatRupiah } from '@/lib/utils'
import { useState, useMemo, useCallback } from 'react'
import { DateInput } from '@/components/ui/date-input'
import {
  Calculator,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Search,
  Eye,
  Printer,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Landmark,
  DollarSign,
  FileText,
  BookOpen,
} from 'lucide-react'
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useJournals,
  useJournal,
  useCreateJournal,
  usePostJournal,
  useReverseJournal,
  useDeleteJournal,
  useLedger,
  useBalanceSheet,
  useIncomeStatement,
  useAccountingDashboard,
} from '@/hooks/use-accounting'
import type {
  Account,
  JournalEntry,
  CreateJournalLine,
  Neraca,
  NeracaGroup,
  LabaRugi,
  LabaRugiGroup,
} from '@/lib/api/accounting'

// ─── Helpers ──────────────────────────────────────────────


function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const TIPE_COLORS: Record<string, string> = {
  aset: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  kewajiban: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ekuitas: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  pendapatan: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  beban: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  posted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  reversed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const SUB_TIPE_LABELS: Record<string, string> = {
  aset_lancar: 'Aset Lancar',
  aset_tetap: 'Aset Tetap',
  kewajiban_lancar: 'Kewajiban Lancar',
  kewajiban_jangka_panjang: 'Kewajiban Jangka Panjang',
  ekuitas: 'Ekuitas',
  pendapatan_operasional: 'Pendapatan Operasional',
  pendapatan_lain: 'Pendapatan Lain-lain',
  beban_operasional: 'Beban Operasional',
  beban_lain: 'Beban Lain-lain',
}

// ─── Main Page ────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Calculator },
  { id: 'jurnal', label: 'Jurnal Umum', icon: FileText },
  { id: 'coa', label: 'Bagan Akun', icon: BookOpen },
  { id: 'buku-besar', label: 'Buku Besar', icon: BookOpen },
  { id: 'neraca', label: 'Neraca', icon: Landmark },
  { id: 'laba-rugi', label: 'Laba Rugi', icon: TrendingUp },
] as const

type TabId = typeof TABS[number]['id']

export default function KeuanganPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Keuangan & Akuntansi</h1>
          <p className="text-muted-foreground">
            Jurnal Umum, Buku Besar, Neraca, dan Laba Rugi
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'jurnal' && <JurnalTab />}
      {activeTab === 'coa' && <CoaTab />}
      {activeTab === 'buku-besar' && <BukuBesarTab />}
      {activeTab === 'neraca' && <NeracaTab />}
      {activeTab === 'laba-rugi' && <LabaRugiTab />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 1: DASHBOARD
// ═══════════════════════════════════════════════════════════

function DashboardTab() {
  const { data, isLoading, error } = useAccountingDashboard()

  if (isLoading) return <LoadingSkeleton />
  if (error || !data) {
    const errMsg = error
      ? ((error as Record<string, unknown>)?.response as Record<string, unknown>)?.data
        ? JSON.stringify(((error as Record<string, unknown>).response as Record<string, unknown>).data)
        : (error as Error).message
      : 'Data tidak tersedia'
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400 text-sm font-medium">Gagal memuat data dashboard</p>
        <p className="text-red-500 dark:text-red-500 text-xs mt-1">{errMsg}</p>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Aset', value: data.total_aset, icon: Building2, color: 'text-blue-600' },
    { label: 'Total Kewajiban', value: data.total_kewajiban, icon: TrendingDown, color: 'text-red-600' },
    { label: 'Total Ekuitas', value: data.total_ekuitas, icon: Landmark, color: 'text-purple-600' },
    { label: 'Pendapatan Bulan Ini', value: data.pendapatan_bulan_ini, icon: TrendingUp, color: 'text-green-600' },
    {
      label: 'Laba/Rugi Bulan Ini',
      value: data.laba_rugi_bulan_ini,
      icon: DollarSign,
      color: data.laba_rugi_bulan_ini >= 0 ? 'text-green-600' : 'text-red-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className={`text-lg font-bold ${card.color}`}>
                {formatRupiah(card.value)}
              </p>
            </div>
          )
        })}
      </div>

      {/* Kas & Bank */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.kas_bank.map((kb) => (
          <div key={kb.kode} className="border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{kb.nama}</span>
              <span className="text-xs text-muted-foreground">({kb.kode})</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{formatRupiah(kb.saldo)}</p>
          </div>
        ))}
      </div>

      {/* Journal Counts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-3 bg-card text-center">
          <p className="text-2xl font-bold text-yellow-600">{data.journal_counts.draft}</p>
          <p className="text-xs text-muted-foreground">Draft</p>
        </div>
        <div className="border rounded-lg p-3 bg-card text-center">
          <p className="text-2xl font-bold text-green-600">{data.journal_counts.posted}</p>
          <p className="text-xs text-muted-foreground">Posted</p>
        </div>
        <div className="border rounded-lg p-3 bg-card text-center">
          <p className="text-2xl font-bold text-red-600">{data.journal_counts.reversed}</p>
          <p className="text-xs text-muted-foreground">Reversed</p>
        </div>
      </div>

      {/* Recent Journals */}
      <div className="border rounded-lg bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Jurnal Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left">No. Jurnal</th>
                <th className="px-4 py-2 text-left">Tanggal</th>
                <th className="px-4 py-2 text-left">Deskripsi</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Kredit</th>
                <th className="px-4 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_journals.map((j) => (
                <tr key={j.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{j.nomor_jurnal}</td>
                  <td className="px-4 py-2">{formatDate(j.tanggal)}</td>
                  <td className="px-4 py-2 max-w-[200px] truncate">{j.deskripsi}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatRupiah(j.total_debit)}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatRupiah(j.total_kredit)}</td>
                  <td className="px-4 py-2 text-center">
                    <StatusBadge status={j.status} />
                  </td>
                </tr>
              ))}
              {data.recent_journals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada jurnal
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 2: JURNAL UMUM
// ═══════════════════════════════════════════════════════════

function JurnalTab() {
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    tanggalMulai: '',
    tanggalSelesai: '',
    status: '',
    search: '',
    page: 1,
  })

  const { data, isLoading } = useJournals({ ...filters, limit: 20 })
  const postMutation = usePostJournal()
  const deleteMutation = useDeleteJournal()
  const [reverseId, setReverseId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Dari</label>
          <DateInput
            value={filters.tanggalMulai}
            onChange={(v) => setFilters({ ...filters, tanggalMulai: v, page: 1 })}
            className="w-36"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Sampai</label>
          <DateInput
            value={filters.tanggalSelesai}
            onChange={(v) => setFilters({ ...filters, tanggalSelesai: v, page: 1 })}
            className="w-36"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="block border rounded px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Semua</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Cari</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="No. jurnal atau deskripsi..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="block w-full border rounded pl-8 pr-3 py-1.5 text-sm bg-background"
            />
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Buat Jurnal
        </button>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left">No. Jurnal</th>
              <th className="px-4 py-2 text-left">Tanggal</th>
              <th className="px-4 py-2 text-left">Deskripsi</th>
              <th className="px-4 py-2 text-left">Ref</th>
              <th className="px-4 py-2 text-right">Debit</th>
              <th className="px-4 py-2 text-right">Kredit</th>
              <th className="px-4 py-2 text-center">Status</th>
              <th className="px-4 py-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Tidak ada jurnal</td></tr>
            ) : data?.data?.map((j: JournalEntry) => (
              <tr key={j.id} className="border-b hover:bg-muted/30">
                <td className="px-4 py-2 font-mono text-xs">{j.nomor_jurnal}</td>
                <td className="px-4 py-2">{formatDate(j.tanggal)}</td>
                <td className="px-4 py-2 max-w-[250px] truncate">{j.deskripsi}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{j.referensi_tipe || '-'}</td>
                <td className="px-4 py-2 text-right font-mono">{formatRupiah(j.total_debit)}</td>
                <td className="px-4 py-2 text-right font-mono">{formatRupiah(j.total_kredit)}</td>
                <td className="px-4 py-2 text-center"><StatusBadge status={j.status} /></td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setDetailId(j.id)}
                      className="p-1 hover:bg-muted rounded"
                      title="Lihat detail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {j.status === 'draft' && (
                      <>
                        <button
                          onClick={() => postMutation.mutate(j.id)}
                          className="p-1 hover:bg-green-100 rounded text-green-600"
                          title="Posting"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Hapus jurnal draft ini?')) deleteMutation.mutate(j.id)
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    {j.status === 'posted' && (
                      <button
                        onClick={() => setReverseId(j.id)}
                        className="p-1 hover:bg-orange-100 rounded text-orange-600"
                        title="Reverse"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Menampilkan {data.data.length} dari {data.meta.total} jurnal
          </span>
          <div className="flex gap-1">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-3 py-1">
              {filters.page} / {data.meta.totalPages}
            </span>
            <button
              disabled={filters.page >= data.meta.totalPages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Journal Dialog */}
      {showCreate && <CreateJournalDialog onClose={() => setShowCreate(false)} />}

      {/* Journal Detail Dialog */}
      {detailId && <JournalDetailDialog id={detailId} onClose={() => setDetailId(null)} />}

      {/* Reverse Dialog */}
      {reverseId && <ReverseDialog id={reverseId} onClose={() => setReverseId(null)} />}
    </div>
  )
}

// ─── Create Journal Dialog ───────────────────────────────

function CreateJournalDialog({ onClose }: { onClose: () => void }) {
  const { data: accountsTree } = useAccounts()
  const createMutation = useCreateJournal()

  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [deskripsi, setDeskripsi] = useState('')
  const [catatan, setCatatan] = useState('')
  const [lines, setLines] = useState<CreateJournalLine[]>([
    { account_id: '', debit: 0, kredit: 0 },
    { account_id: '', debit: 0, kredit: 0 },
  ])

  const flatAccounts = useMemo(() => {
    if (!accountsTree) return []
    const result: Account[] = []
    const flatten = (nodes: Account[]) => {
      for (const n of nodes) {
        if (!n.is_header) result.push(n)
        if (n.children) flatten(n.children)
      }
    }
    flatten(accountsTree)
    return result
  }, [accountsTree])

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalKredit = lines.reduce((s, l) => s + (Number(l.kredit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalKredit) < 0.01

  const addLine = () => setLines([...lines, { account_id: '', debit: 0, kredit: 0 }])
  const removeLine = (i: number) => {
    if (lines.length <= 2) return
    setLines(lines.filter((_, idx) => idx !== i))
  }

  const updateLine = (i: number, field: keyof CreateJournalLine, value: string | number) => {
    const updated = [...lines]
    updated[i] = { ...updated[i], [field]: value }
    setLines(updated)
  }

  const handleSubmit = async () => {
    if (!deskripsi.trim() || !isBalanced) return
    const validLines = lines.filter((l) => l.account_id && (l.debit > 0 || l.kredit > 0))
    if (validLines.length < 2) return

    await createMutation.mutateAsync({ tanggal, deskripsi, catatan, lines: validLines })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Buat Jurnal Umum</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tanggal *</label>
              <DateInput
                value={tanggal}
                onChange={(v) => setTanggal(v)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Deskripsi *</label>
              <input
                type="text"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Keterangan jurnal..."
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Catatan</label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan tambahan (opsional)"
              className="w-full border rounded px-3 py-2 text-sm bg-background"
            />
          </div>

          {/* Lines */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left w-[45%]">Akun</th>
                  <th className="px-3 py-2 text-right w-[20%]">Debit</th>
                  <th className="px-3 py-2 text-right w-[20%]">Kredit</th>
                  <th className="px-3 py-2 w-[15%]"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-1.5">
                      <select
                        value={line.account_id}
                        onChange={(e) => updateLine(i, 'account_id', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm bg-background"
                      >
                        <option value="">-- Pilih Akun --</option>
                        {flatAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.kode} — {a.nama}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min="0"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(i, 'debit', Number(e.target.value) || 0)}
                        className="w-full border rounded px-2 py-1 text-sm text-right bg-background"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min="0"
                        value={line.kredit || ''}
                        onChange={(e) => updateLine(i, 'kredit', Number(e.target.value) || 0)}
                        className="w-full border rounded px-2 py-1 text-sm text-right bg-background"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button
                        onClick={() => removeLine(i)}
                        disabled={lines.length <= 2}
                        className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td className="px-3 py-2 text-right">TOTAL</td>
                  <td className="px-3 py-2 text-right font-mono">{formatRupiah(totalDebit)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatRupiah(totalKredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={addLine} className="text-sm text-primary hover:underline flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Tambah Baris
            </button>
            {!isBalanced && totalDebit + totalKredit > 0 && (
              <span className="text-sm text-red-600 font-medium">
                Selisih: {formatRupiah(Math.abs(totalDebit - totalKredit))}
              </span>
            )}
            {isBalanced && totalDebit > 0 && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Seimbang
              </span>
            )}
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm">Batal</button>
          <button
            onClick={handleSubmit}
            disabled={!deskripsi.trim() || !isBalanced || totalDebit === 0 || createMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium disabled:opacity-50"
          >
            {createMutation.isPending ? 'Menyimpan...' : 'Simpan Jurnal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Journal Detail Dialog ───────────────────────────────

function JournalDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useJournal(id)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Detail Jurnal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        ) : data ? (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">No. Jurnal:</span>{' '}
                <span className="font-mono font-medium">{data.nomor_jurnal}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                <StatusBadge status={data.status} />
              </div>
              <div>
                <span className="text-muted-foreground">Tanggal:</span> {formatDate(data.tanggal)}
              </div>
              <div>
                <span className="text-muted-foreground">Dibuat oleh:</span> {data.created_by_name}
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Deskripsi:</span> {data.deskripsi}
              </div>
              {data.catatan && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Catatan:</span> {data.catatan}
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left">Kode</th>
                    <th className="px-3 py-2 text-left">Nama Akun</th>
                    <th className="px-3 py-2 text-left">Keterangan</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((l) => (
                    <tr key={l.id} className="border-b">
                      <td className="px-3 py-2 font-mono text-xs">{l.account_kode}</td>
                      <td className="px-3 py-2">{l.account_nama}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.deskripsi || '-'}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {l.debit > 0 ? formatRupiah(l.debit) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {l.kredit > 0 ? formatRupiah(l.kredit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-right">TOTAL</td>
                    <td className="px-3 py-2 text-right font-mono">{formatRupiah(data.total_debit)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatRupiah(data.total_kredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : null}
        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm">Tutup</button>
        </div>
      </div>
    </div>
  )
}

// ─── Reverse Dialog ──────────────────────────────────────

function ReverseDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const reverseMutation = useReverseJournal()

  const handleReverse = async () => {
    if (!reason.trim()) return
    await reverseMutation.mutateAsync({ id, reason })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg w-full max-w-md">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-orange-600">Reverse Jurnal</h2>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Jurnal akan di-reverse dengan membuat jurnal balik baru. Jurnal asli akan ditandai sebagai &quot;reversed&quot;.
          </p>
          <div>
            <label className="text-sm font-medium">Alasan Reverse *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masukkan alasan reverse..."
              className="w-full border rounded px-3 py-2 text-sm bg-background resize-none"
              rows={3}
            />
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm">Batal</button>
          <button
            onClick={handleReverse}
            disabled={!reason.trim() || reverseMutation.isPending}
            className="px-4 py-2 bg-orange-600 text-white rounded text-sm font-medium disabled:opacity-50"
          >
            {reverseMutation.isPending ? 'Memproses...' : 'Reverse'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 3: BAGAN AKUN (COA)
// ═══════════════════════════════════════════════════════════

function CoaTab() {
  const { data: accounts, isLoading } = useAccounts()
  const deleteMutation = useDeleteAccount()
  const [showCreate, setShowCreate] = useState(false)

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Tambah Akun
        </button>
      </div>

      <div className="border rounded-lg bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Bagan Akun (Chart of Accounts)</h3>
        </div>
        <div className="p-2">
          {accounts && accounts.length > 0 ? (
            accounts.map((node) => (
              <CoaTreeNode
                key={node.id}
                node={node}
                onDelete={(id) => {
                  if (confirm('Hapus akun ini?')) deleteMutation.mutate(id)
                }}
              />
            ))
          ) : (
            <p className="p-4 text-center text-muted-foreground">Belum ada akun</p>
          )}
        </div>
      </div>

      {showCreate && <CreateAccountDialog onClose={() => setShowCreate(false)} accounts={accounts || []} />}
    </div>
  )
}

function CoaTreeNode({ node, onDelete, depth = 0 }: {
  node: Account
  onDelete: (id: string) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 rounded text-sm ${
          node.is_header ? 'font-semibold' : ''
        }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5">
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="font-mono text-xs text-muted-foreground w-16">{node.kode}</span>
        <span className="flex-1">{node.nama}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${TIPE_COLORS[node.tipe]}`}>
          {node.tipe}
        </span>
        <span className="text-xs text-muted-foreground w-12 text-center">
          {node.saldo_normal === 'debit' ? 'D' : 'K'}
        </span>
        {!node.is_header && (
          <button
            onClick={() => onDelete(node.id)}
            className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {expanded && hasChildren && node.children!.map((child) => (
        <CoaTreeNode key={child.id} node={child} onDelete={onDelete} depth={depth + 1} />
      ))}
    </div>
  )
}

function CreateAccountDialog({ onClose, accounts }: { onClose: () => void; accounts: Account[] }) {
  const createMutation = useCreateAccount()
  const [form, setForm] = useState({
    kode: '',
    nama: '',
    tipe: 'aset' as const,
    sub_tipe: '',
    parent_id: '',
    level: 3,
    saldo_normal: 'debit' as const,
    is_header: false,
  })

  const flatAll = useMemo(() => {
    const result: Account[] = []
    const flatten = (nodes: Account[]) => {
      for (const n of nodes) {
        result.push(n)
        if (n.children) flatten(n.children)
      }
    }
    flatten(accounts)
    return result
  }, [accounts])

  const handleSubmit = async () => {
    if (!form.kode || !form.nama) return
    await createMutation.mutateAsync({
      kode: form.kode,
      nama: form.nama,
      tipe: form.tipe,
      sub_tipe: form.sub_tipe || undefined,
      parent_id: form.parent_id || undefined,
      level: form.level,
      saldo_normal: form.saldo_normal,
      is_header: form.is_header,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg w-full max-w-md">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Tambah Akun</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Kode *</label>
              <input
                value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value })}
                placeholder="1-1011"
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nama *</label>
              <input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Nama akun"
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Tipe</label>
              <select
                value={form.tipe}
                onChange={(e) => {
                  const tipe = e.target.value as typeof form.tipe
                  const sn = ['aset', 'beban'].includes(tipe) ? 'debit' : 'kredit'
                  setForm({ ...form, tipe, saldo_normal: sn as 'debit' | 'kredit' })
                }}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="aset">Aset</option>
                <option value="kewajiban">Kewajiban</option>
                <option value="ekuitas">Ekuitas</option>
                <option value="pendapatan">Pendapatan</option>
                <option value="beban">Beban</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Saldo Normal</label>
              <select
                value={form.saldo_normal}
                onChange={(e) => setForm({ ...form, saldo_normal: e.target.value as 'debit' | 'kredit' })}
                className="w-full border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="debit">Debit</option>
                <option value="kredit">Kredit</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Parent Akun</label>
            <select
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm bg-background"
            >
              <option value="">-- Tidak ada (root) --</option>
              {flatAll.filter((a) => a.is_header).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.kode} — {a.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_header}
              onChange={(e) => setForm({ ...form, is_header: e.target.checked })}
              id="is_header"
            />
            <label htmlFor="is_header" className="text-sm">Akun header (grup, tidak untuk transaksi)</label>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm">Batal</button>
          <button
            onClick={handleSubmit}
            disabled={!form.kode || !form.nama || createMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium disabled:opacity-50"
          >
            {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 4: BUKU BESAR
// ═══════════════════════════════════════════════════════════

function BukuBesarTab() {
  const { data: accountsTree } = useAccounts()
  const [selectedAccount, setSelectedAccount] = useState('')
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')
  const [page, setPage] = useState(1)

  const flatAccounts = useMemo(() => {
    if (!accountsTree) return []
    const result: Account[] = []
    const flatten = (nodes: Account[]) => {
      for (const n of nodes) {
        if (!n.is_header) result.push(n)
        if (n.children) flatten(n.children)
      }
    }
    flatten(accountsTree)
    return result
  }, [accountsTree])

  const { data, isLoading } = useLedger(selectedAccount, {
    tanggalMulai: tanggalMulai || undefined,
    tanggalSelesai: tanggalSelesai || undefined,
    page,
    limit: 50,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[250px]">
          <label className="text-xs text-muted-foreground">Pilih Akun</label>
          <select
            value={selectedAccount}
            onChange={(e) => { setSelectedAccount(e.target.value); setPage(1) }}
            className="w-full border rounded px-3 py-1.5 text-sm bg-background"
          >
            <option value="">-- Pilih Akun --</option>
            {flatAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Dari</label>
          <DateInput
            value={tanggalMulai}
            onChange={(v) => { setTanggalMulai(v); setPage(1) }}
            className="w-36"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Sampai</label>
          <DateInput
            value={tanggalSelesai}
            onChange={(v) => { setTanggalSelesai(v); setPage(1) }}
            className="w-36"
          />
        </div>
      </div>

      {!selectedAccount ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          Pilih akun untuk melihat buku besar
        </div>
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : data ? (
        <div className="border rounded-lg bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{data.account.kode} — {data.account.nama}</h3>
              <p className="text-xs text-muted-foreground">
                Saldo Normal: {data.account.saldo_normal === 'debit' ? 'Debit' : 'Kredit'} |
                Saldo Awal: {formatRupiah(data.saldo_awal)}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left">Tanggal</th>
                  <th className="px-4 py-2 text-left">No. Jurnal</th>
                  <th className="px-4 py-2 text-left">Deskripsi</th>
                  <th className="px-4 py-2 text-right">Debit</th>
                  <th className="px-4 py-2 text-right">Kredit</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Belum ada transaksi pada akun ini
                    </td>
                  </tr>
                ) : data.data.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2">{formatDate(entry.tanggal)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{entry.nomor_jurnal}</td>
                    <td className="px-4 py-2 max-w-[200px] truncate">
                      {entry.line_deskripsi || entry.journal_deskripsi}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {entry.debit > 0 ? formatRupiah(entry.debit) : '-'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {entry.kredit > 0 ? formatRupiah(entry.kredit) : '-'}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono font-medium ${
                      entry.saldo < 0 ? 'text-red-600' : ''
                    }`}>
                      {formatRupiah(entry.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.meta.totalPages > 1 && (
            <div className="p-3 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {data.data.length} dari {data.meta.total}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="px-3 py-1">{page} / {data.meta.totalPages}</span>
                <button
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 5: NERACA (Balance Sheet)
// ═══════════════════════════════════════════════════════════

function NeracaTab() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const { data, isLoading } = useBalanceSheet(asOfDate)

  const handlePrint = useCallback(() => { window.print() }, [])

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Per Tanggal</label>
          <DateInput
            value={asOfDate}
            onChange={(v) => setAsOfDate(v)}
            className="w-36"
          />
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 border rounded px-3 py-1.5 text-sm hover:bg-muted mt-4"
        >
          <Printer className="h-4 w-4" /> Cetak
        </button>
      </div>

      {data && (
        <div className="print:block">
          {/* Balance check */}
          <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${
            data.is_balanced
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {data.is_balanced
              ? '✓ Neraca seimbang — Total Aset = Total Kewajiban + Ekuitas'
              : `✗ Neraca tidak seimbang — Selisih: ${formatRupiah(Math.abs(data.total_aset - data.total_kewajiban_ekuitas))}`}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ASET */}
            <div className="border rounded-lg bg-card">
              <div className="p-3 border-b bg-blue-50 dark:bg-blue-900/20">
                <h3 className="font-bold text-blue-800 dark:text-blue-300">ASET</h3>
              </div>
              <div className="p-3 space-y-4">
                {Object.entries(data.aset).map(([subTipe, group]: [string, NeracaGroup]) => (
                  <div key={subTipe}>
                    <h4 className="font-semibold text-sm mb-1">{SUB_TIPE_LABELS[subTipe] || subTipe}</h4>
                    {group.accounts.map((a) => (
                      <div key={a.kode} className="flex justify-between text-sm py-0.5 pl-4">
                        <span>{a.kode} — {a.nama}</span>
                        <span className="font-mono">{formatRupiah(a.saldo)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold border-t mt-1 pt-1 pl-4">
                      <span>Subtotal {SUB_TIPE_LABELS[subTipe] || subTipe}</span>
                      <span className="font-mono">{formatRupiah(group.subtotal)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base border-t-2 pt-2">
                  <span>TOTAL ASET</span>
                  <span className="font-mono text-blue-600">{formatRupiah(data.total_aset)}</span>
                </div>
              </div>
            </div>

            {/* KEWAJIBAN + EKUITAS */}
            <div className="space-y-4">
              {/* Kewajiban */}
              <div className="border rounded-lg bg-card">
                <div className="p-3 border-b bg-red-50 dark:bg-red-900/20">
                  <h3 className="font-bold text-red-800 dark:text-red-300">KEWAJIBAN</h3>
                </div>
                <div className="p-3 space-y-4">
                  {Object.entries(data.kewajiban).map(([subTipe, group]: [string, NeracaGroup]) => (
                    <div key={subTipe}>
                      <h4 className="font-semibold text-sm mb-1">{SUB_TIPE_LABELS[subTipe] || subTipe}</h4>
                      {group.accounts.map((a) => (
                        <div key={a.kode} className="flex justify-between text-sm py-0.5 pl-4">
                          <span>{a.kode} — {a.nama}</span>
                          <span className="font-mono">{formatRupiah(a.saldo)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold border-t mt-1 pt-1 pl-4">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatRupiah(group.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t-2 pt-2">
                    <span>Total Kewajiban</span>
                    <span className="font-mono text-red-600">{formatRupiah(data.total_kewajiban)}</span>
                  </div>
                </div>
              </div>

              {/* Ekuitas */}
              <div className="border rounded-lg bg-card">
                <div className="p-3 border-b bg-purple-50 dark:bg-purple-900/20">
                  <h3 className="font-bold text-purple-800 dark:text-purple-300">EKUITAS</h3>
                </div>
                <div className="p-3 space-y-4">
                  {Object.entries(data.ekuitas).map(([subTipe, group]: [string, NeracaGroup]) => (
                    <div key={subTipe}>
                      <h4 className="font-semibold text-sm mb-1">{SUB_TIPE_LABELS[subTipe] || subTipe}</h4>
                      {group.accounts.map((a) => (
                        <div key={a.kode} className="flex justify-between text-sm py-0.5 pl-4">
                          <span>{a.kode} — {a.nama}</span>
                          <span className="font-mono">{formatRupiah(a.saldo)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold border-t mt-1 pt-1 pl-4">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatRupiah(group.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t-2 pt-2">
                    <span>Total Ekuitas</span>
                    <span className="font-mono text-purple-600">{formatRupiah(data.total_ekuitas)}</span>
                  </div>
                </div>
              </div>

              {/* Grand Total K+E */}
              <div className="border-2 border-primary/30 rounded-lg p-3 bg-card">
                <div className="flex justify-between font-bold text-base">
                  <span>TOTAL KEWAJIBAN + EKUITAS</span>
                  <span className="font-mono">{formatRupiah(data.total_kewajiban_ekuitas)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TAB 6: LABA RUGI (Income Statement)
// ═══════════════════════════════════════════════════════════

function LabaRugiTab() {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.substring(0, 8) + '01'
  const [start, setStart] = useState(firstOfMonth)
  const [end, setEnd] = useState(today)
  const { data, isLoading } = useIncomeStatement(start, end)

  const handlePrint = useCallback(() => { window.print() }, [])

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Dari</label>
          <DateInput
            value={start}
            onChange={(v) => setStart(v)}
            className="w-36"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Sampai</label>
          <DateInput
            value={end}
            onChange={(v) => setEnd(v)}
            className="w-36"
          />
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 border rounded px-3 py-1.5 text-sm hover:bg-muted mt-4"
        >
          <Printer className="h-4 w-4" /> Cetak
        </button>
      </div>

      {data && (
        <div className="space-y-4 print:block">
          {/* PENDAPATAN */}
          <div className="border rounded-lg bg-card">
            <div className="p-3 border-b bg-green-50 dark:bg-green-900/20">
              <h3 className="font-bold text-green-800 dark:text-green-300">PENDAPATAN</h3>
            </div>
            <div className="p-3 space-y-3">
              {Object.entries(data.pendapatan).map(([subTipe, group]: [string, LabaRugiGroup]) => (
                <div key={subTipe}>
                  <h4 className="font-semibold text-sm mb-1">{SUB_TIPE_LABELS[subTipe] || subTipe}</h4>
                  {group.accounts.map((a) => (
                    <div key={a.kode} className="flex justify-between text-sm py-0.5 pl-4">
                      <span>{a.kode} — {a.nama}</span>
                      <span className="font-mono">{formatRupiah(a.saldo)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold border-t mt-1 pt-1 pl-4">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatRupiah(group.subtotal)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base border-t-2 pt-2">
                <span>TOTAL PENDAPATAN</span>
                <span className="font-mono text-green-600">{formatRupiah(data.total_pendapatan)}</span>
              </div>
            </div>
          </div>

          {/* BEBAN */}
          <div className="border rounded-lg bg-card">
            <div className="p-3 border-b bg-orange-50 dark:bg-orange-900/20">
              <h3 className="font-bold text-orange-800 dark:text-orange-300">BEBAN</h3>
            </div>
            <div className="p-3 space-y-3">
              {Object.entries(data.beban).map(([subTipe, group]: [string, LabaRugiGroup]) => (
                <div key={subTipe}>
                  <h4 className="font-semibold text-sm mb-1">{SUB_TIPE_LABELS[subTipe] || subTipe}</h4>
                  {group.accounts.map((a) => (
                    <div key={a.kode} className="flex justify-between text-sm py-0.5 pl-4">
                      <span>{a.kode} — {a.nama}</span>
                      <span className="font-mono">{formatRupiah(a.saldo)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold border-t mt-1 pt-1 pl-4">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatRupiah(group.subtotal)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base border-t-2 pt-2">
                <span>TOTAL BEBAN</span>
                <span className="font-mono text-orange-600">{formatRupiah(data.total_beban)}</span>
              </div>
            </div>
          </div>

          {/* LABA/RUGI BERSIH */}
          <div className={`border-2 rounded-lg p-4 ${
            data.laba_rugi >= 0
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-red-500 bg-red-50 dark:bg-red-900/20'
          }`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {data.laba_rugi >= 0
                  ? <TrendingUp className="h-5 w-5 text-green-600" />
                  : <TrendingDown className="h-5 w-5 text-red-600" />}
                <span className="font-bold text-lg">
                  {data.laba_rugi >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}
                </span>
              </div>
              <span className={`text-2xl font-bold font-mono ${
                data.laba_rugi >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatRupiah(data.laba_rugi)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-3" />
          <div className="h-3 bg-muted rounded w-2/3 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}
