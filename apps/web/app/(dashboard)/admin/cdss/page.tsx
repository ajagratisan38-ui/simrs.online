'use client'

import { useState, useMemo } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  ArrowRightLeft,
  History,
  Search,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useHighAlertDrugs,
  useSetHighAlert,
  useLasaDrugs,
  useSetLasa,
  useDetectLasaPairs,
  useSearchInteractions,
  useAddInteraction,
  useDeleteInteraction,
  useInteractionStats,
  useAlertStats,
} from '@/hooks/use-cdss'
import type { HighAlertDrug, LasaPair } from '@/lib/api/cdss'

const HIGH_ALERT_CATEGORIES = [
  { value: 'elektrolit_konsentrat', label: 'Elektrolit Konsentrat' },
  { value: 'antikoagulan', label: 'Antikoagulan' },
  { value: 'insulin', label: 'Insulin' },
  { value: 'opioid', label: 'Opioid' },
  { value: 'kemoterapi', label: 'Kemoterapi' },
  { value: 'muscle_relaxant', label: 'Pelemas Otot' },
  { value: 'agonis_adrenergik', label: 'Agonis Adrenergik' },
  { value: 'sedasi', label: 'Sedasi' },
]

const TABS = [
  { id: 'high-alert', label: 'High-Alert', icon: ShieldAlert },
  { id: 'lasa', label: 'LASA / NORUM', icon: AlertTriangle },
  { id: 'interactions', label: 'Interaksi Obat', icon: ArrowRightLeft },
  { id: 'history', label: 'Riwayat Alert', icon: History },
]

// ───────────────────────────────────────────
// MAIN PAGE
// ───────────────────────────────────────────

export default function CdssPage() {
  const [activeTab, setActiveTab] = useState('high-alert')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" />
          Clinical Decision Support System (CDSS)
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manajemen obat high-alert, deteksi interaksi obat, dan LASA/NORUM
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'high-alert' && <HighAlertTab />}
      {activeTab === 'lasa' && <LasaTab />}
      {activeTab === 'interactions' && <InteractionsTab />}
      {activeTab === 'history' && <AlertHistoryTab />}
    </div>
  )
}

// ───────────────────────────────────────────
// TAB 1: HIGH-ALERT DRUGS
// ───────────────────────────────────────────

function HighAlertTab() {
  const { data, isLoading } = useHighAlertDrugs()
  const setHighAlert = useSetHighAlert()
  const [search, setSearch] = useState('')
  const [editDrug, setEditDrug] = useState<HighAlertDrug | null>(null)
  const [category, setCategory] = useState('')
  const [instructions, setInstructions] = useState('')

  const drugs = data?.data || []
  const filtered = useMemo(() => {
    if (!search) return drugs
    const q = search.toLowerCase()
    return drugs.filter(
      (d) =>
        d.nama.toLowerCase().includes(q) ||
        (d.nama_generik?.toLowerCase().includes(q)) ||
        d.kode.toLowerCase().includes(q),
    )
  }, [drugs, search])

  function openEdit(drug: HighAlertDrug) {
    setEditDrug(drug)
    setCategory(drug.high_alert_category || '')
    setInstructions(drug.special_instructions || '')
  }

  function handleSave() {
    if (!editDrug) return
    setHighAlert.mutate({
      drugId: editDrug.id,
      is_high_alert: true,
      high_alert_category: category || null,
      special_instructions: instructions || null,
    }, {
      onSuccess: () => setEditDrug(null),
    })
  }

  function handleToggle(drug: HighAlertDrug) {
    setHighAlert.mutate({
      drugId: drug.id,
      is_high_alert: !drug.is_high_alert,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{drugs.length}</p>
              <p className="text-xs text-muted-foreground">Obat High-Alert</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Kategori High-Alert</p>
            <p>Mengikuti standar WHO/ISMP untuk keselamatan pasien di rumah sakit Indonesia</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Double Check</p>
            <p>Obat high-alert memerlukan verifikasi ganda sebelum dispensing ke pasien</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari obat high-alert..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Kode</th>
              <th className="text-left p-3 font-medium">Nama Obat</th>
              <th className="text-left p-3 font-medium">Generik</th>
              <th className="text-left p-3 font-medium">Kategori</th>
              <th className="text-left p-3 font-medium">Instruksi</th>
              <th className="text-center p-3 font-medium">High-Alert</th>
              <th className="text-center p-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {drugs.length === 0
                    ? 'Belum ada obat yang ditandai sebagai high-alert'
                    : 'Tidak ditemukan obat yang cocok'}
                </td>
              </tr>
            )}
            {filtered.map((drug) => (
              <tr key={drug.id} className="hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{drug.kode}</td>
                <td className="p-3 font-medium">{drug.nama}</td>
                <td className="p-3 text-muted-foreground">{drug.nama_generik || '-'}</td>
                <td className="p-3">
                  {drug.high_alert_category ? (
                    <Badge variant="outline" className="text-xs">
                      {HIGH_ALERT_CATEGORIES.find((c) => c.value === drug.high_alert_category)?.label || drug.high_alert_category}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                  {drug.special_instructions || '-'}
                </td>
                <td className="p-3 text-center">
                  <Switch
                    checked={drug.is_high_alert}
                    onCheckedChange={() => handleToggle(drug)}
                  />
                </td>
                <td className="p-3 text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(drug)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editDrug} onOpenChange={(open) => !open && setEditDrug(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfigurasi High-Alert: {editDrug?.nama}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori High-Alert</label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Pilih kategori...</option>
                {HIGH_ALERT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Instruksi Khusus</label>
              <Textarea
                placeholder="Contoh: Simpan terpisah, label khusus, perlu verifikasi ganda..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDrug(null)}>Batal</Button>
            <Button onClick={handleSave} disabled={setHighAlert.isPending}>
              {setHighAlert.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ───────────────────────────────────────────
// TAB 2: LASA / NORUM
// ───────────────────────────────────────────

function LasaTab() {
  const { data, isLoading } = useLasaDrugs()
  const setLasa = useSetLasa()
  const { data: detectedData, isLoading: detecting, refetch: detectPairs } = useDetectLasaPairs()
  const [search, setSearch] = useState('')
  const [showDetected, setShowDetected] = useState(false)

  const drugs = data?.data || []
  const detectedPairs: LasaPair[] = detectedData?.data || []

  const filtered = useMemo(() => {
    if (!search) return drugs
    const q = search.toLowerCase()
    return drugs.filter(
      (d) =>
        d.nama.toLowerCase().includes(q) ||
        (d.nama_generik?.toLowerCase().includes(q)),
    )
  }, [drugs, search])

  function handleToggle(drug: HighAlertDrug, field: 'is_lasa' | 'is_norum') {
    setLasa.mutate({
      drugId: drug.id,
      is_lasa: field === 'is_lasa' ? !drug.is_lasa : drug.is_lasa,
      is_norum: field === 'is_norum' ? !drug.is_norum : drug.is_norum,
    })
  }

  function handleDetect() {
    setShowDetected(true)
    detectPairs()
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="space-y-4">
      {/* Stats + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{drugs.length}</p>
                <p className="text-xs text-muted-foreground">Obat LASA/NORUM</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <Button onClick={handleDetect} disabled={detecting} variant="outline">
          <RefreshCw className={cn('h-4 w-4 mr-1', detecting && 'animate-spin')} />
          Deteksi Otomatis
        </Button>
      </div>

      {/* Detected pairs */}
      {showDetected && detectedPairs.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Pasangan Obat Mirip Terdeteksi ({detectedPairs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Obat A</th>
                    <th className="text-left p-2 font-medium">Obat B</th>
                    <th className="text-right p-2 font-medium">Kemiripan</th>
                    <th className="text-center p-2 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {detectedPairs.map((pair, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-2">{pair.drug_a.nama}</td>
                      <td className="p-2">{pair.drug_b.nama}</td>
                      <td className="p-2 text-right">
                        <Badge variant={pair.similarity > 0.6 ? 'destructive' : 'secondary'}>
                          {Math.round(pair.similarity * 100)}%
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setLasa.mutate({
                              drugId: pair.drug_a.id as string,
                              is_lasa: true,
                              lasa_pairs: [pair.drug_b.nama as string],
                            })
                            setLasa.mutate({
                              drugId: pair.drug_b.id as string,
                              is_lasa: true,
                              lasa_pairs: [pair.drug_a.nama as string],
                            })
                          }}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Tandai
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showDetected && detectedPairs.length === 0 && !detecting && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center text-sm text-green-700 dark:text-green-300">
            Tidak ditemukan pasangan obat dengan nama mirip
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari obat LASA/NORUM..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Nama Obat</th>
              <th className="text-left p-3 font-medium">Generik</th>
              <th className="text-center p-3 font-medium">LASA</th>
              <th className="text-center p-3 font-medium">NORUM</th>
              <th className="text-left p-3 font-medium">Pasangan Mirip</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Belum ada obat LASA/NORUM
                </td>
              </tr>
            )}
            {filtered.map((drug) => {
              let pairs: string[] = []
              try {
                if (drug.lasa_pairs) pairs = JSON.parse(drug.lasa_pairs)
              } catch {
                // skip
              }
              return (
                <tr key={drug.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{drug.nama}</td>
                  <td className="p-3 text-muted-foreground">{drug.nama_generik || '-'}</td>
                  <td className="p-3 text-center">
                    <Switch
                      checked={drug.is_lasa}
                      onCheckedChange={() => handleToggle(drug, 'is_lasa')}
                    />
                  </td>
                  <td className="p-3 text-center">
                    <Switch
                      checked={drug.is_norum}
                      onCheckedChange={() => handleToggle(drug, 'is_norum')}
                    />
                  </td>
                  <td className="p-3">
                    {pairs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {pairs.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────
// TAB 3: INTERAKSI OBAT
// ───────────────────────────────────────────

function InteractionsTab() {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const { data, isLoading } = useSearchInteractions(search || undefined, severityFilter || undefined)
  const { data: statsData } = useInteractionStats()
  const addInteraction = useAddInteraction()
  const delInteraction = useDeleteInteraction()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    drug_a_name: '',
    drug_b_name: '',
    severity: 'moderate' as string,
    effect: '',
    mechanism: '',
    recommendation: '',
    evidence_level: 'established',
    source: 'Manual Entry',
  })

  const interactions = data?.data || []
  const stats = statsData?.data

  function handleAdd() {
    addInteraction.mutate(form, {
      onSuccess: () => {
        setShowAdd(false)
        setForm({
          drug_a_name: '', drug_b_name: '', severity: 'moderate',
          effect: '', mechanism: '', recommendation: '',
          evidence_level: 'established', source: 'Manual Entry',
        })
      },
    })
  }

  const severityBadge = (sev: string) => {
    const map: Record<string, string> = {
      major: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      minor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    }
    return map[sev] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total Interaksi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats?.by_severity?.major || 0}</p>
            <p className="text-xs text-muted-foreground">Major</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats?.by_severity?.moderate || 0}</p>
            <p className="text-xs text-muted-foreground">Moderate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats?.by_severity?.minor || 0}</p>
            <p className="text-xs text-muted-foreground">Minor</p>
          </CardContent>
        </Card>
      </div>

      {/* Interaction checker - inline version */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-5 w-5" />
            Cek Interaksi Obat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Gunakan fitur pencarian di atas untuk mencari dan memeriksa interaksi antar obat.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari interaksi (nama obat, efek)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-40">
          <option value="">Semua</option>
          <option value="major">Major</option>
          <option value="moderate">Moderate</option>
          <option value="minor">Minor</option>
        </Select>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Obat A</th>
                <th className="text-left p-3 font-medium">Obat B</th>
                <th className="text-center p-3 font-medium">Severity</th>
                <th className="text-left p-3 font-medium">Efek</th>
                <th className="text-left p-3 font-medium">Rekomendasi</th>
                <th className="text-center p-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {interactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Tidak ditemukan interaksi obat
                  </td>
                </tr>
              )}
              {interactions.map((ix) => (
                <tr key={ix.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium capitalize">{ix.drug_a_name}</td>
                  <td className="p-3 font-medium capitalize">{ix.drug_b_name}</td>
                  <td className="p-3 text-center">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded uppercase', severityBadge(ix.severity))}>
                      {ix.severity}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground max-w-[250px]">
                    <p className="line-clamp-2">{ix.effect}</p>
                  </td>
                  <td className="p-3 text-muted-foreground max-w-[250px]">
                    <p className="line-clamp-2">{ix.recommendation}</p>
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm('Hapus interaksi ini?')) {
                          delInteraction.mutate(ix.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Interaksi Obat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nama Obat A</label>
                <Input
                  placeholder="warfarin"
                  value={form.drug_a_name}
                  onChange={(e) => setForm({ ...form, drug_a_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Nama Obat B</label>
                <Input
                  placeholder="aspirin"
                  value={form.drug_b_name}
                  onChange={(e) => setForm({ ...form, drug_b_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Severity</label>
              <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                <option value="major">Major</option>
                <option value="moderate">Moderate</option>
                <option value="minor">Minor</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Efek</label>
              <Textarea
                placeholder="Deskripsi efek interaksi..."
                value={form.effect}
                onChange={(e) => setForm({ ...form, effect: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Mekanisme</label>
              <Input
                placeholder="Mekanisme interaksi (opsional)"
                value={form.mechanism}
                onChange={(e) => setForm({ ...form, mechanism: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Rekomendasi</label>
              <Textarea
                placeholder="Rekomendasi tindakan..."
                value={form.recommendation}
                onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button
              onClick={handleAdd}
              disabled={
                !form.drug_a_name || !form.drug_b_name || !form.effect || !form.recommendation ||
                addInteraction.isPending
              }
            >
              {addInteraction.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ───────────────────────────────────────────
// TAB 4: RIWAYAT ALERT
// ───────────────────────────────────────────

function AlertHistoryTab() {
  const { data, isLoading } = useAlertStats()
  const stats = data?.data

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const alerts = stats?.recent || []
  const typeLabels: Record<string, string> = {
    high_alert: 'High-Alert',
    interaction: 'Interaksi',
    lasa: 'LASA/NORUM',
    max_dose: 'Dosis Maks',
    duplicate: 'Duplikat',
    allergy: 'Alergi',
  }

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total Alert</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats?.overridden || 0}</p>
            <p className="text-xs text-muted-foreground">Di-override</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats?.override_rate || 0}%</p>
            <p className="text-xs text-muted-foreground">Override Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">Per Tipe</p>
            <div className="space-y-1">
              {Object.entries(stats?.by_type || {}).map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span>{typeLabels[type] || type}</span>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent alerts */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Waktu</th>
              <th className="text-center p-3 font-medium">Tipe</th>
              <th className="text-center p-3 font-medium">Severity</th>
              <th className="text-left p-3 font-medium">Judul</th>
              <th className="text-left p-3 font-medium">Obat</th>
              <th className="text-center p-3 font-medium">Override</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {alerts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Belum ada riwayat alert CDSS
                </td>
              </tr>
            )}
            {alerts.map((alert) => (
              <tr key={alert.id} className="hover:bg-muted/30">
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(alert.created_at).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="p-3 text-center">
                  <Badge variant="outline" className="text-xs">
                    {typeLabels[alert.alert_type] || alert.alert_type}
                  </Badge>
                </td>
                <td className="p-3 text-center">
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded uppercase',
                    severityColors[alert.severity],
                  )}>
                    {alert.severity}
                  </span>
                </td>
                <td className="p-3 max-w-[250px]">
                  <p className="line-clamp-1 font-medium">{alert.title}</p>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(alert.drug_names || []).map((name, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-center">
                  {alert.is_overridden ? (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                      Override
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
