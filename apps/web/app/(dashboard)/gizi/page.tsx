'use client'

import { formatRupiah } from '@/lib/utils'
import { useState, useMemo } from 'react'
import {
  useNutritionOrders,
  useNutritionOrder,
  useUpdateNutritionOrder,
  useAddNutritionLog,
  useCalculateNutrition,
  useFoodItems,
  useCreateFoodItem,
  useUpdateFoodItem,
  useDeleteFoodItem,
  useMealPlans,
  useMealPlan,
  useCreateMealPlan,
  useDeleteMealPlan,
  useFoodCostSummary,
} from '@/hooks/use-nutrition'
import type {
  NutritionOrderRow,
  NutritionLogRow,
  NutritionCalcInput,
  NutritionCalcResult,
  FoodItemRow,
  MealPlanRow,
} from '@/lib/api/nutrition'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DateInput } from '@/components/ui/date-input'
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
import {
  Utensils,
  Loader2,
  Users,
  CheckCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Beaker,
  Activity,
  Target,
  TrendingUp,
  Save,
  Plus,
  Calculator,
  Apple,
  BookOpen,
  DollarSign,
  Trash2,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

const WAKTU_MAKAN_LABEL: Record<string, string> = {
  pagi: 'Pagi',
  siang: 'Siang',
  sore: 'Sore',
  snack_pagi: 'Snack Pagi',
  snack_sore: 'Snack Sore',
}

const BENTUK_MAKANAN = [
  { value: 'biasa', label: 'Biasa' },
  { value: 'lunak', label: 'Lunak' },
  { value: 'saring', label: 'Saring' },
  { value: 'cair', label: 'Cair' },
]

const JALUR_PEMBERIAN = [
  { value: 'oral', label: 'Oral' },
  { value: 'ngt', label: 'NGT (Nasogastric Tube)' },
  { value: 'parenteral', label: 'Parenteral' },
  { value: 'kombinasi', label: 'Kombinasi' },
]

const MONITORING_PARAMS = [
  'Berat badan', 'Intake makan', 'Albumin', 'Hemoglobin',
  'Gula darah', 'Lingkar lengan atas', 'Keluhan mual/muntah',
  'Toleransi diet', 'Balance cairan',
]

const EVAL_HASIL = [
  { value: 'membaik', label: 'Membaik', color: 'text-green-600' },
  { value: 'tetap', label: 'Tetap', color: 'text-yellow-600' },
  { value: 'memburuk', label: 'Memburuk', color: 'text-red-600' },
]

const FOOD_KATEGORI = [
  { value: 'karbohidrat', label: 'Karbohidrat' },
  { value: 'protein_hewani', label: 'Protein Hewani' },
  { value: 'protein_nabati', label: 'Protein Nabati' },
  { value: 'sayuran', label: 'Sayuran' },
  { value: 'buah', label: 'Buah' },
  { value: 'susu', label: 'Susu' },
  { value: 'minyak_lemak', label: 'Minyak/Lemak' },
  { value: 'bumbu', label: 'Bumbu' },
  { value: 'minuman', label: 'Minuman' },
  { value: 'snack', label: 'Snack' },
  { value: 'suplemen', label: 'Suplemen' },
  { value: 'lainnya', label: 'Lainnya' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}


function AdimeSection({
  icon: Icon, title, color, children,
}: {
  icon: typeof ClipboardList; title: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2.5 ${color} border-b`}>
        <Icon className="h-4 w-4" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? '-'}</p>
    </div>
  )
}

type TabId = 'adime' | 'calculator' | 'food-items' | 'meal-plans' | 'food-cost'

const TABS: { id: TabId; label: string; icon: typeof Utensils }[] = [
  { id: 'adime', label: 'ADIME Orders', icon: ClipboardList },
  { id: 'calculator', label: 'Kalkulator Gizi', icon: Calculator },
  { id: 'food-items', label: 'Bahan Makanan', icon: Apple },
  { id: 'meal-plans', label: 'Meal Plans', icon: BookOpen },
  { id: 'food-cost', label: 'Food Cost', icon: DollarSign },
]

export default function GiziPage() {
  const [activeTab, setActiveTab] = useState<TabId>('adime')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Utensils className="h-6 w-6 text-orange-600" />
          Manajemen Gizi
        </h1>
        <p className="text-muted-foreground">
          ADIME, Kalkulator Nutrisi, Meal Planning, Food Cost
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'adime' && <AdimeTab />}
      {activeTab === 'calculator' && <CalculatorTab />}
      {activeTab === 'food-items' && <FoodItemsTab />}
      {activeTab === 'meal-plans' && <MealPlansTab />}
      {activeTab === 'food-cost' && <FoodCostTab />}
    </div>
  )
}

/* ═══════════════════════════════════════ */
/*           TAB 1: ADIME ORDERS          */
/* ═══════════════════════════════════════ */

function AdimeTab() {
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editAdime, setEditAdime] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)

  const { data, isLoading } = useNutritionOrders({ status: status || undefined, page, limit: 20 })
  const { data: detailOrder, isLoading: detailLoading } = useNutritionOrder(detailId || '')
  const updateMut = useUpdateNutritionOrder()
  const addLogMut = useAddNutritionLog()

  const orders = data?.data || []
  const meta = data?.meta

  const [adimeForm, setAdimeForm] = useState({
    assessment_bb: '', assessment_tb: '', assessment_lla: '',
    assessment_albumin: '', assessment_hb: '', assessment_gds: '',
    assessment_fisik: '', assessment_riwayat_makan: '', assessment_riwayat_penyakit: '',
    diagnosis_gizi: '',
    intervention_jenis_diet: '', intervention_bentuk_makanan: '',
    intervention_jalur_pemberian: '', intervention_frekuensi: '', intervention_keterangan: '',
    monitoring_parameter: [] as string[], monitoring_frekuensi: '', monitoring_catatan: '',
    evaluation_hasil: '', evaluation_target_tercapai: false,
    evaluation_catatan: '', evaluation_tindak_lanjut: '',
  })

  const [logForm, setLogForm] = useState({
    waktu_makan: 'pagi', menu: '', porsi_disajikan: '1', porsi_dimakan: '1', catatan: '',
  })

  const openDetail = (order: NutritionOrderRow) => {
    setDetailId(order.id)
    setEditAdime(false)
  }

  const startEditAdime = () => {
    if (!detailOrder) return
    const o = detailOrder
    setAdimeForm({
      assessment_bb: o.assessment_bb ? String(o.assessment_bb) : '',
      assessment_tb: o.assessment_tb ? String(o.assessment_tb) : '',
      assessment_lla: o.assessment_lla ? String(o.assessment_lla) : '',
      assessment_albumin: o.assessment_albumin ? String(o.assessment_albumin) : '',
      assessment_hb: o.assessment_hb ? String(o.assessment_hb) : '',
      assessment_gds: o.assessment_gds ? String(o.assessment_gds) : '',
      assessment_fisik: o.assessment_fisik || '',
      assessment_riwayat_makan: o.assessment_riwayat_makan || '',
      assessment_riwayat_penyakit: o.assessment_riwayat_penyakit || '',
      diagnosis_gizi: o.diagnosis_gizi || '',
      intervention_jenis_diet: o.intervention_jenis_diet || '',
      intervention_bentuk_makanan: o.intervention_bentuk_makanan || '',
      intervention_jalur_pemberian: o.intervention_jalur_pemberian || '',
      intervention_frekuensi: o.intervention_frekuensi || '',
      intervention_keterangan: o.intervention_keterangan || '',
      monitoring_parameter: Array.isArray(o.monitoring_parameter)
        ? o.monitoring_parameter
        : JSON.parse(String(o.monitoring_parameter || '[]')),
      monitoring_frekuensi: o.monitoring_frekuensi || '',
      monitoring_catatan: o.monitoring_catatan || '',
      evaluation_hasil: o.evaluation_hasil || '',
      evaluation_target_tercapai: o.evaluation_target_tercapai || false,
      evaluation_catatan: o.evaluation_catatan || '',
      evaluation_tindak_lanjut: o.evaluation_tindak_lanjut || '',
    })
    setEditAdime(true)
  }

  const saveAdime = async () => {
    if (!detailId) return
    try {
      await updateMut.mutateAsync({
        id: detailId,
        data: {
          assessment: {
            bb: adimeForm.assessment_bb ? Number(adimeForm.assessment_bb) : undefined,
            tb: adimeForm.assessment_tb ? Number(adimeForm.assessment_tb) : undefined,
            lla: adimeForm.assessment_lla ? Number(adimeForm.assessment_lla) : undefined,
            albumin: adimeForm.assessment_albumin ? Number(adimeForm.assessment_albumin) : undefined,
            hb: adimeForm.assessment_hb ? Number(adimeForm.assessment_hb) : undefined,
            gds: adimeForm.assessment_gds ? Number(adimeForm.assessment_gds) : undefined,
            fisik: adimeForm.assessment_fisik || undefined,
            riwayat_makan: adimeForm.assessment_riwayat_makan || undefined,
            riwayat_penyakit: adimeForm.assessment_riwayat_penyakit || undefined,
          },
          diagnosis_gizi: adimeForm.diagnosis_gizi || undefined,
          intervention: {
            jenis_diet: adimeForm.intervention_jenis_diet || undefined,
            bentuk_makanan: adimeForm.intervention_bentuk_makanan || undefined,
            jalur_pemberian: adimeForm.intervention_jalur_pemberian || undefined,
            frekuensi: adimeForm.intervention_frekuensi || undefined,
            keterangan: adimeForm.intervention_keterangan || undefined,
          },
          monitoring: {
            parameter: adimeForm.monitoring_parameter,
            frekuensi: adimeForm.monitoring_frekuensi || undefined,
            catatan: adimeForm.monitoring_catatan || undefined,
          },
          evaluation: {
            hasil: (adimeForm.evaluation_hasil as 'membaik' | 'memburuk' | 'tetap') || undefined,
            target_tercapai: adimeForm.evaluation_target_tercapai,
            catatan: adimeForm.evaluation_catatan || undefined,
            tindak_lanjut: adimeForm.evaluation_tindak_lanjut || undefined,
          },
        },
      })
      toast.success('ADIME berhasil disimpan')
      setEditAdime(false)
    } catch {
      toast.error('Gagal menyimpan ADIME')
    }
  }

  const submitLog = async () => {
    if (!detailId || !logForm.menu) return
    try {
      await addLogMut.mutateAsync({
        nutrition_order_id: detailId,
        waktu_makan: logForm.waktu_makan as 'pagi' | 'siang' | 'sore' | 'snack_pagi' | 'snack_sore',
        menu: logForm.menu,
        porsi_disajikan: Number(logForm.porsi_disajikan),
        porsi_dimakan: Number(logForm.porsi_dimakan),
        catatan: logForm.catatan || undefined,
      })
      toast.success('Log pemberian dicatat')
      setShowLogForm(false)
      setLogForm({ waktu_makan: 'pagi', menu: '', porsi_disajikan: '1', porsi_dimakan: '1', catatan: '' })
    } catch {
      toast.error('Gagal mencatat pemberian')
    }
  }

  const toggleMonitoringParam = (param: string) => {
    setAdimeForm((p) => ({
      ...p,
      monitoring_parameter: p.monitoring_parameter.includes(param)
        ? p.monitoring_parameter.filter((x) => x !== param)
        : [...p.monitoring_parameter, param],
    }))
  }

  const hasAdimeData = (o: NutritionOrderRow) =>
    o.assessment_bb || o.diagnosis_gizi || o.intervention_jenis_diet || o.evaluation_hasil

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Utensils className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Order</p>
                <p className="text-xl font-bold">{meta?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diet Aktif</p>
                <p className="text-xl font-bold text-green-600">
                  {orders.filter((o) => o.status === 'aktif').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selesai</p>
                <p className="text-xl font-bold text-gray-500">
                  {orders.filter((o) => o.status === 'selesai').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Order Gizi</CardTitle>
            <Select
              className="w-40"
              value={status || 'all'}
              onChange={(e) => { setStatus(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
            >
              <option value="all">Semua</option>
              <option value="aktif">Aktif</option>
              <option value="selesai">Selesai</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Utensils className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada order gizi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pasien</TableHead>
                    <TableHead>No. RM</TableHead>
                    <TableHead>Tipe Diet</TableHead>
                    <TableHead>Kalori</TableHead>
                    <TableHead>ADIME</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="group">
                      <TableCell className="font-medium">{order.patient_nama}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{order.no_rekam_medis}</TableCell>
                      <TableCell>{order.diet_type}</TableCell>
                      <TableCell>{order.kalori_target} kkal</TableCell>
                      <TableCell>
                        {hasAdimeData(order)
                          ? <Badge variant="default" className="bg-orange-600">Lengkap</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Belum</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'aktif' ? 'default' : 'secondary'}>
                          {order.status === 'aktif' ? 'Aktif' : 'Selesai'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" onClick={() => openDetail(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {meta.page} dari {meta.totalPages} ({meta.total} data)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail + ADIME Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) { setDetailId(null); setEditAdime(false) } }} size="xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Detail Order Gizi — ADIME
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
          ) : detailOrder ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                <div><span className="text-muted-foreground">Pasien:</span> <span className="font-medium">{detailOrder.patient_nama}</span></div>
                <div><span className="text-muted-foreground">RM:</span> <span className="font-mono">{detailOrder.no_rekam_medis}</span></div>
                <div><span className="text-muted-foreground">Diet:</span> <span className="font-medium">{detailOrder.diet_type}</span></div>
                <div><span className="text-muted-foreground">Kalori:</span> <span className="font-medium">{detailOrder.kalori_target} kkal</span></div>
                <Badge variant={detailOrder.status === 'aktif' ? 'default' : 'secondary'}>{detailOrder.status}</Badge>
              </div>
              <div className="flex gap-2">
                {!editAdime && (
                  <Button size="sm" onClick={startEditAdime}>
                    <ClipboardList className="h-4 w-4 mr-1" />
                    {hasAdimeData(detailOrder) ? 'Edit ADIME' : 'Isi ADIME'}
                  </Button>
                )}
                {detailOrder.status === 'aktif' && (
                  <Button size="sm" variant="outline" onClick={() => setShowLogForm(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Catat Pemberian
                  </Button>
                )}
              </div>

              {editAdime ? (
                <div className="space-y-4">
                  <AdimeSection icon={ClipboardList} title="A — Assessment (Pengkajian Gizi)" color="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div><Label className="text-xs">BB (kg)</Label><Input type="number" step="0.1" value={adimeForm.assessment_bb} onChange={(e) => setAdimeForm((p) => ({ ...p, assessment_bb: e.target.value }))} /></div>
                      <div><Label className="text-xs">TB (cm)</Label><Input type="number" step="0.1" value={adimeForm.assessment_tb} onChange={(e) => setAdimeForm((p) => ({ ...p, assessment_tb: e.target.value }))} /></div>
                      <div><Label className="text-xs">IMT</Label><Input disabled value={adimeForm.assessment_bb && adimeForm.assessment_tb ? (Number(adimeForm.assessment_bb) / ((Number(adimeForm.assessment_tb) / 100) ** 2)).toFixed(1) : ''} /></div>
                      <div><Label className="text-xs">LLA (cm)</Label><Input type="number" step="0.1" value={adimeForm.assessment_lla} onChange={(e) => setAdimeForm((p) => ({ ...p, assessment_lla: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-xs">Albumin (g/dL)</Label><Input type="number" step="0.01" value={adimeForm.assessment_albumin} onChange={(e) => setAdimeForm((p) => ({ ...p, assessment_albumin: e.target.value }))} /></div>
                      <div><Label className="text-xs">Hb (g/dL)</Label><Input type="number" step="0.1" value={adimeForm.assessment_hb} onChange={(e) => setAdimeForm((p) => ({ ...p, assessment_hb: e.target.value }))} /></div>
                      <div><Label className="text-xs">GDS (mg/dL)</Label><Input type="number" step="1" value={adimeForm.assessment_gds} onChange={(e) => setAdimeForm((p) => ({ ...p, assessment_gds: e.target.value }))} /></div>
                    </div>
                    <div><Label className="text-xs">Pemeriksaan Fisik Klinis</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[60px] bg-background" value={adimeForm.assessment_fisik} onChange={(e) => setAdimeForm((p) => ({ ...p, assessment_fisik: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Riwayat Makan</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[50px] bg-background" value={adimeForm.assessment_riwayat_makan} onChange={(e) => setAdimeForm((p) => ({ ...p, assessment_riwayat_makan: e.target.value }))} /></div>
                      <div><Label className="text-xs">Riwayat Penyakit</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[50px] bg-background" value={adimeForm.assessment_riwayat_penyakit} onChange={(e) => setAdimeForm((p) => ({ ...p, assessment_riwayat_penyakit: e.target.value }))} /></div>
                    </div>
                  </AdimeSection>
                  <AdimeSection icon={Beaker} title="D — Diagnosis Gizi (Format PES)" color="bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">
                    <textarea className="w-full border rounded-md p-2 text-sm min-h-[80px] bg-background" placeholder="Problem - Etiology - Signs/Symptoms" value={adimeForm.diagnosis_gizi} onChange={(e) => setAdimeForm((p) => ({ ...p, diagnosis_gizi: e.target.value }))} />
                  </AdimeSection>
                  <AdimeSection icon={Activity} title="I — Intervention" color="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Jenis Diet</Label><Input value={adimeForm.intervention_jenis_diet} onChange={(e) => setAdimeForm((p) => ({ ...p, intervention_jenis_diet: e.target.value }))} /></div>
                      <div><Label className="text-xs">Bentuk Makanan</Label><Select value={adimeForm.intervention_bentuk_makanan} onChange={(e) => setAdimeForm((p) => ({ ...p, intervention_bentuk_makanan: e.target.value }))}><option value="">Pilih...</option>{BENTUK_MAKANAN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</Select></div>
                      <div><Label className="text-xs">Jalur Pemberian</Label><Select value={adimeForm.intervention_jalur_pemberian} onChange={(e) => setAdimeForm((p) => ({ ...p, intervention_jalur_pemberian: e.target.value }))}><option value="">Pilih...</option>{JALUR_PEMBERIAN.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}</Select></div>
                      <div><Label className="text-xs">Frekuensi</Label><Input value={adimeForm.intervention_frekuensi} onChange={(e) => setAdimeForm((p) => ({ ...p, intervention_frekuensi: e.target.value }))} /></div>
                    </div>
                    <div><Label className="text-xs">Keterangan</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[50px] bg-background" value={adimeForm.intervention_keterangan} onChange={(e) => setAdimeForm((p) => ({ ...p, intervention_keterangan: e.target.value }))} /></div>
                  </AdimeSection>
                  <AdimeSection icon={Target} title="M — Monitoring" color="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300">
                    <div><Label className="text-xs mb-2 block">Parameter yang Dipantau</Label><div className="flex flex-wrap gap-2">{MONITORING_PARAMS.map((param) => (<button key={param} type="button" className={`px-3 py-1 text-xs rounded-full border transition-colors ${adimeForm.monitoring_parameter.includes(param) ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 text-yellow-800 dark:text-yellow-200 font-medium' : 'bg-background hover:bg-muted'}`} onClick={() => toggleMonitoringParam(param)}>{param}</button>))}</div></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Frekuensi</Label><Input value={adimeForm.monitoring_frekuensi} onChange={(e) => setAdimeForm((p) => ({ ...p, monitoring_frekuensi: e.target.value }))} /></div>
                      <div><Label className="text-xs">Catatan</Label><Input value={adimeForm.monitoring_catatan} onChange={(e) => setAdimeForm((p) => ({ ...p, monitoring_catatan: e.target.value }))} /></div>
                    </div>
                  </AdimeSection>
                  <AdimeSection icon={TrendingUp} title="E — Evaluation" color="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Hasil</Label><Select value={adimeForm.evaluation_hasil} onChange={(e) => setAdimeForm((p) => ({ ...p, evaluation_hasil: e.target.value }))}><option value="">Pilih...</option>{EVAL_HASIL.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}</Select></div>
                      <div className="flex items-end gap-2 pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded" checked={adimeForm.evaluation_target_tercapai} onChange={(e) => setAdimeForm((p) => ({ ...p, evaluation_target_tercapai: e.target.checked }))} /><span className="text-sm">Target Tercapai</span></label></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Catatan Evaluasi</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[50px] bg-background" value={adimeForm.evaluation_catatan} onChange={(e) => setAdimeForm((p) => ({ ...p, evaluation_catatan: e.target.value }))} /></div>
                      <div><Label className="text-xs">Tindak Lanjut</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[50px] bg-background" value={adimeForm.evaluation_tindak_lanjut} onChange={(e) => setAdimeForm((p) => ({ ...p, evaluation_tindak_lanjut: e.target.value }))} /></div>
                    </div>
                  </AdimeSection>
                  <div className="flex gap-2 justify-end pt-2 border-t">
                    <Button variant="outline" onClick={() => setEditAdime(false)}>Batal</Button>
                    <Button onClick={saveAdime} disabled={updateMut.isPending}>
                      {updateMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Simpan ADIME
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <AdimeSection icon={ClipboardList} title="A — Assessment" color="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                    {detailOrder.assessment_bb ? (<>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ReadOnlyField label="BB (kg)" value={detailOrder.assessment_bb} />
                        <ReadOnlyField label="TB (cm)" value={detailOrder.assessment_tb} />
                        <ReadOnlyField label="IMT" value={detailOrder.assessment_imt} />
                        <ReadOnlyField label="LLA (cm)" value={detailOrder.assessment_lla} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <ReadOnlyField label="Albumin" value={detailOrder.assessment_albumin} />
                        <ReadOnlyField label="Hb" value={detailOrder.assessment_hb} />
                        <ReadOnlyField label="GDS" value={detailOrder.assessment_gds} />
                      </div>
                    </>) : <p className="text-sm text-muted-foreground italic">Belum diisi</p>}
                  </AdimeSection>
                  <AdimeSection icon={Beaker} title="D — Diagnosis Gizi" color="bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">
                    {detailOrder.diagnosis_gizi ? <p className="text-sm whitespace-pre-wrap">{detailOrder.diagnosis_gizi}</p> : <p className="text-sm text-muted-foreground italic">Belum diisi</p>}
                  </AdimeSection>
                  <AdimeSection icon={Activity} title="I — Intervention" color="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300">
                    {detailOrder.intervention_jenis_diet ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ReadOnlyField label="Jenis Diet" value={detailOrder.intervention_jenis_diet} />
                        <ReadOnlyField label="Bentuk" value={BENTUK_MAKANAN.find((b) => b.value === detailOrder.intervention_bentuk_makanan)?.label || detailOrder.intervention_bentuk_makanan} />
                        <ReadOnlyField label="Jalur" value={JALUR_PEMBERIAN.find((j) => j.value === detailOrder.intervention_jalur_pemberian)?.label || detailOrder.intervention_jalur_pemberian} />
                        <ReadOnlyField label="Frekuensi" value={detailOrder.intervention_frekuensi} />
                      </div>
                    ) : <p className="text-sm text-muted-foreground italic">Belum diisi</p>}
                  </AdimeSection>
                  <AdimeSection icon={Target} title="M — Monitoring" color="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300">
                    {(() => {
                      const params = Array.isArray(detailOrder.monitoring_parameter) ? detailOrder.monitoring_parameter : JSON.parse(String(detailOrder.monitoring_parameter || '[]'))
                      return params.length > 0 ? (<><div className="flex flex-wrap gap-1.5">{params.map((p: string) => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}</div><div className="grid grid-cols-2 gap-3"><ReadOnlyField label="Frekuensi" value={detailOrder.monitoring_frekuensi} /><ReadOnlyField label="Catatan" value={detailOrder.monitoring_catatan} /></div></>) : <p className="text-sm text-muted-foreground italic">Belum diisi</p>
                    })()}
                  </AdimeSection>
                  <AdimeSection icon={TrendingUp} title="E — Evaluation" color="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
                    {detailOrder.evaluation_hasil ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div><p className="text-xs text-muted-foreground">Hasil</p><Badge variant={detailOrder.evaluation_hasil === 'membaik' ? 'default' : detailOrder.evaluation_hasil === 'memburuk' ? 'destructive' : 'secondary'}>{EVAL_HASIL.find((h) => h.value === detailOrder.evaluation_hasil)?.label}</Badge></div>
                          <ReadOnlyField label="Target Tercapai" value={detailOrder.evaluation_target_tercapai ? 'Ya' : 'Belum'} />
                        </div>
                        {detailOrder.evaluation_catatan && <ReadOnlyField label="Catatan" value={detailOrder.evaluation_catatan} />}
                        {detailOrder.evaluation_tindak_lanjut && <ReadOnlyField label="Tindak Lanjut" value={detailOrder.evaluation_tindak_lanjut} />}
                      </div>
                    ) : <p className="text-sm text-muted-foreground italic">Belum diisi</p>}
                  </AdimeSection>
                  {detailOrder.logs && (detailOrder.logs as NutritionLogRow[]).length > 0 && (
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Log Pemberian Diet</CardTitle></CardHeader><CardContent className="p-0">
                      <Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Waktu</TableHead><TableHead>Menu</TableHead><TableHead>Porsi</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader>
                      <TableBody>{(detailOrder.logs as NutritionLogRow[]).map((log) => (
                        <TableRow key={log.id}><TableCell className="text-xs">{formatDate(log.tanggal)}</TableCell><TableCell><Badge variant="outline" className="text-xs">{WAKTU_MAKAN_LABEL[log.waktu_makan] || log.waktu_makan}</Badge></TableCell><TableCell className="text-sm">{log.menu}</TableCell><TableCell className="text-sm">{log.porsi_dimakan}/{log.porsi_disajikan}</TableCell><TableCell className="text-xs text-muted-foreground">{log.catatan || '-'}</TableCell></TableRow>
                      ))}</TableBody></Table>
                    </CardContent></Card>
                  )}
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter><Button variant="outline" onClick={() => { setDetailId(null); setEditAdime(false) }}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Log Dialog */}
      <Dialog open={showLogForm} onOpenChange={setShowLogForm} size="sm">
        <DialogContent>
          <DialogHeader><DialogTitle>Catat Pemberian Diet</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Waktu Makan</Label><Select value={logForm.waktu_makan} onChange={(e) => setLogForm((p) => ({ ...p, waktu_makan: e.target.value }))}>{Object.entries(WAKTU_MAKAN_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}</Select></div>
            <div><Label className="text-xs">Menu</Label><textarea className="w-full border rounded-md p-2 text-sm min-h-[60px] bg-background" value={logForm.menu} onChange={(e) => setLogForm((p) => ({ ...p, menu: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Porsi Disajikan</Label><Input type="number" step="0.1" min="0" value={logForm.porsi_disajikan} onChange={(e) => setLogForm((p) => ({ ...p, porsi_disajikan: e.target.value }))} /></div>
              <div><Label className="text-xs">Porsi Dimakan</Label><Input type="number" step="0.1" min="0" value={logForm.porsi_dimakan} onChange={(e) => setLogForm((p) => ({ ...p, porsi_dimakan: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Catatan</Label><Input value={logForm.catatan} onChange={(e) => setLogForm((p) => ({ ...p, catatan: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogForm(false)}>Batal</Button>
            <Button onClick={submitLog} disabled={addLogMut.isPending || !logForm.menu}>{addLogMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ═══════════════════════════════════════ */
/*        TAB 2: KALKULATOR GIZI          */
/* ═══════════════════════════════════════ */

function CalculatorTab() {
  const calcMut = useCalculateNutrition()
  const [form, setForm] = useState<NutritionCalcInput>({
    bb: 60, tb: 165, umur: 40, jenis_kelamin: 'L', aktivitas: 'ringan',
  })
  const [stressFactor, setStressFactor] = useState('1.0')
  const result = calcMut.data as NutritionCalcResult | undefined

  const doCalc = () => {
    calcMut.mutate({ ...form, stress_factor: parseFloat(stressFactor) || 1.0 })
  }

  const imtColor = (imt: number) => {
    if (imt < 18.5) return 'text-blue-600'
    if (imt < 25) return 'text-green-600'
    if (imt < 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-orange-600" />
            Input Data Pasien
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Berat Badan (kg)</Label>
              <Input type="number" step="0.1" value={form.bb} onChange={(e) => setForm((p) => ({ ...p, bb: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Tinggi Badan (cm)</Label>
              <Input type="number" step="0.1" value={form.tb} onChange={(e) => setForm((p) => ({ ...p, tb: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Umur (tahun)</Label>
              <Input type="number" value={form.umur} onChange={(e) => setForm((p) => ({ ...p, umur: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Jenis Kelamin</Label>
              <Select value={form.jenis_kelamin} onChange={(e) => setForm((p) => ({ ...p, jenis_kelamin: e.target.value as 'L' | 'P' }))}>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Tingkat Aktivitas</Label>
            <Select value={form.aktivitas} onChange={(e) => setForm((p) => ({ ...p, aktivitas: e.target.value as NutritionCalcInput['aktivitas'] }))}>
              <option value="bedrest">Bedrest (1.2)</option>
              <option value="ringan">Ringan (1.375)</option>
              <option value="sedang">Sedang (1.55)</option>
              <option value="berat">Berat (1.725)</option>
            </Select>
          </div>
          <div>
            <Label>Stress Factor</Label>
            <Input type="number" step="0.1" min="0.5" max="3" value={stressFactor} onChange={(e) => setStressFactor(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              1.0 = normal, 1.2 = bedah minor, 1.3 = infeksi, 1.5 = trauma, 2.0 = luka bakar berat
            </p>
          </div>
          <Button className="w-full" onClick={doCalc} disabled={calcMut.isPending}>
            {calcMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
            Hitung Kebutuhan Gizi
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {result ? (
          <>
            {/* IMT */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm mb-3">Status Gizi</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">IMT</p>
                    <p className={`text-2xl font-bold ${imtColor(result.imt)}`}>{result.imt}</p>
                    <Badge variant={result.status_imt === 'Normal' ? 'default' : 'secondary'}>{result.status_imt}</Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">BB Ideal</p>
                    <p className="text-2xl font-bold">{result.berat_badan_ideal}</p>
                    <p className="text-xs text-muted-foreground">kg</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Protein/kg BB</p>
                    <p className="text-2xl font-bold">{result.protein_per_kg}</p>
                    <p className="text-xs text-muted-foreground">g/kg</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BMR */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm mb-3">Basal Metabolic Rate (BMR)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Harris-Benedict</p>
                    <p className="text-xl font-bold">{result.bmr_harris_benedict} kkal</p>
                    <p className="text-xs text-muted-foreground">TDEE: {result.tdee_harris_benedict} kkal</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mifflin-St Jeor</p>
                    <p className="text-xl font-bold">{result.bmr_mifflin} kkal</p>
                    <p className="text-xs text-muted-foreground">TDEE: {result.tdee_mifflin} kkal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommended intake */}
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm mb-3">Kebutuhan Harian (Rata-rata)</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Kalori</p>
                    <p className="text-2xl font-bold text-orange-600">{result.kalori_rekomendasi}</p>
                    <p className="text-xs text-muted-foreground">kkal/hari</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Protein (20%)</p>
                    <p className="text-xl font-bold text-blue-600">{result.protein_g}g</p>
                    <p className="text-xs text-muted-foreground">{result.protein_g * 4} kkal</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Karbo (55%)</p>
                    <p className="text-xl font-bold text-green-600">{result.karbohidrat_g}g</p>
                    <p className="text-xs text-muted-foreground">{result.karbohidrat_g * 4} kkal</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lemak (25%)</p>
                    <p className="text-xl font-bold text-yellow-600">{result.lemak_g}g</p>
                    <p className="text-xs text-muted-foreground">{result.lemak_g * 9} kkal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Macro bar */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm mb-2">Distribusi Makronutrien</h3>
                <div className="h-6 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 h-full" style={{ width: '20%' }} title="Protein 20%" />
                  <div className="bg-green-500 h-full" style={{ width: '55%' }} title="Karbohidrat 55%" />
                  <div className="bg-yellow-500 h-full" style={{ width: '25%' }} title="Lemak 25%" />
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Protein 20%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Karbohidrat 55%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Lemak 25%</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-16 text-muted-foreground">
              <Calculator className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Masukkan data pasien dan klik Hitung</p>
              <p className="text-sm mt-1">Menggunakan Harris-Benedict & Mifflin-St Jeor</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════ */
/*         TAB 3: BAHAN MAKANAN           */
/* ═══════════════════════════════════════ */

function FoodItemsTab() {
  const [kategori, setKategori] = useState('')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    nama: '', kategori: 'karbohidrat', satuan: 'gram',
    kalori_per_unit: '', protein_per_unit: '', karbohidrat_per_unit: '', lemak_per_unit: '',
    harga_per_unit: '',
  })

  const { data: items, isLoading } = useFoodItems({ kategori: kategori || undefined, search: search || undefined })
  const createMut = useCreateFoodItem()
  const deleteMut = useDeleteFoodItem()

  const submitAdd = async () => {
    try {
      await createMut.mutateAsync({
        nama: addForm.nama,
        kategori: addForm.kategori,
        satuan: addForm.satuan,
        kalori_per_unit: Number(addForm.kalori_per_unit) || 0,
        protein_per_unit: Number(addForm.protein_per_unit) || 0,
        karbohidrat_per_unit: Number(addForm.karbohidrat_per_unit) || 0,
        lemak_per_unit: Number(addForm.lemak_per_unit) || 0,
        harga_per_unit: Number(addForm.harga_per_unit) || 0,
      })
      toast.success('Bahan makanan ditambahkan')
      setShowAdd(false)
      setAddForm({ nama: '', kategori: 'karbohidrat', satuan: 'gram', kalori_per_unit: '', protein_per_unit: '', karbohidrat_per_unit: '', lemak_per_unit: '', harga_per_unit: '' })
    } catch { toast.error('Gagal menambahkan') }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari bahan makanan..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Select className="w-48" value={kategori || 'all'} onChange={(e) => setKategori(e.target.value === 'all' ? '' : e.target.value)}>
            <option value="all">Semua Kategori</option>
            {FOOD_KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !items || items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Apple className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada bahan makanan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead className="text-right">Kalori</TableHead>
                    <TableHead className="text-right">Protein</TableHead>
                    <TableHead className="text-right">Karbo</TableHead>
                    <TableHead className="text-right">Lemak</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: FoodItemRow) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{FOOD_KATEGORI.find((k) => k.value === item.kategori)?.label || item.kategori}</Badge></TableCell>
                      <TableCell className="text-sm">{item.satuan}</TableCell>
                      <TableCell className="text-right text-sm">{item.kalori_per_unit}</TableCell>
                      <TableCell className="text-right text-sm">{item.protein_per_unit}g</TableCell>
                      <TableCell className="text-right text-sm">{item.karbohidrat_per_unit}g</TableCell>
                      <TableCell className="text-right text-sm">{item.lemak_per_unit}g</TableCell>
                      <TableCell className="text-right text-sm font-mono">{formatRupiah(Number(item.harga_per_unit))}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => {
                          if (confirm('Hapus bahan makanan ini?')) deleteMut.mutate(item.id)
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Bahan Makanan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama</Label><Input value={addForm.nama} onChange={(e) => setAddForm((p) => ({ ...p, nama: e.target.value }))} placeholder="Nasi Putih (100g)" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kategori</Label><Select value={addForm.kategori} onChange={(e) => setAddForm((p) => ({ ...p, kategori: e.target.value }))}>{FOOD_KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></div>
              <div><Label>Satuan</Label><Input value={addForm.satuan} onChange={(e) => setAddForm((p) => ({ ...p, satuan: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kalori (kkal)</Label><Input type="number" value={addForm.kalori_per_unit} onChange={(e) => setAddForm((p) => ({ ...p, kalori_per_unit: e.target.value }))} /></div>
              <div><Label>Protein (g)</Label><Input type="number" value={addForm.protein_per_unit} onChange={(e) => setAddForm((p) => ({ ...p, protein_per_unit: e.target.value }))} /></div>
              <div><Label>Karbohidrat (g)</Label><Input type="number" value={addForm.karbohidrat_per_unit} onChange={(e) => setAddForm((p) => ({ ...p, karbohidrat_per_unit: e.target.value }))} /></div>
              <div><Label>Lemak (g)</Label><Input type="number" value={addForm.lemak_per_unit} onChange={(e) => setAddForm((p) => ({ ...p, lemak_per_unit: e.target.value }))} /></div>
            </div>
            <div><Label>Harga per Satuan (Rp)</Label><Input type="number" value={addForm.harga_per_unit} onChange={(e) => setAddForm((p) => ({ ...p, harga_per_unit: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button onClick={submitAdd} disabled={createMut.isPending || !addForm.nama}>{createMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ═══════════════════════════════════════ */
/*          TAB 4: MEAL PLANS             */
/* ═══════════════════════════════════════ */

function MealPlansTab() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data: plans, isLoading } = useMealPlans(search || undefined)
  const { data: detailPlan } = useMealPlan(detailId || '')
  const createMut = useCreateMealPlan()
  const deleteMut = useDeleteMealPlan()

  const { data: foodItems } = useFoodItems()

  const [planForm, setPlanForm] = useState({
    nama: '', diet_type: '', catatan: '',
    items: [{ waktu_makan: 'pagi' as string, food_item_id: '', nama_menu: '', porsi: 1, satuan: 'porsi', kalori: 0, protein: 0, karbohidrat: 0, lemak: 0, harga: 0 }],
  })

  const addPlanItem = () => {
    setPlanForm((p) => ({
      ...p,
      items: [...p.items, { waktu_makan: 'siang', food_item_id: '', nama_menu: '', porsi: 1, satuan: 'porsi', kalori: 0, protein: 0, karbohidrat: 0, lemak: 0, harga: 0 }],
    }))
  }

  const updatePlanItem = (idx: number, field: string, value: string | number) => {
    setPlanForm((p) => {
      const items = [...p.items]
      items[idx] = { ...items[idx], [field]: value }
      // Auto-fill from food item
      if (field === 'food_item_id' && value && foodItems) {
        const fi = (foodItems as FoodItemRow[]).find((f) => f.id === value)
        if (fi) {
          items[idx] = {
            ...items[idx],
            nama_menu: fi.nama,
            kalori: Number(fi.kalori_per_unit),
            protein: Number(fi.protein_per_unit),
            karbohidrat: Number(fi.karbohidrat_per_unit),
            lemak: Number(fi.lemak_per_unit),
            harga: Number(fi.harga_per_unit),
            satuan: fi.satuan,
          }
        }
      }
      return { ...p, items }
    })
  }

  const removePlanItem = (idx: number) => {
    setPlanForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))
  }

  const totals = useMemo(() => {
    return planForm.items.reduce((acc, i) => ({
      kalori: acc.kalori + (i.kalori || 0),
      protein: acc.protein + (i.protein || 0),
      karbohidrat: acc.karbohidrat + (i.karbohidrat || 0),
      lemak: acc.lemak + (i.lemak || 0),
      harga: acc.harga + (i.harga || 0),
    }), { kalori: 0, protein: 0, karbohidrat: 0, lemak: 0, harga: 0 })
  }, [planForm.items])

  const submitPlan = async () => {
    try {
      await createMut.mutateAsync({
        nama: planForm.nama,
        diet_type: planForm.diet_type,
        catatan: planForm.catatan || undefined,
        items: planForm.items.filter((i) => i.nama_menu).map((i) => ({
          waktu_makan: i.waktu_makan as 'pagi' | 'snack_pagi' | 'siang' | 'snack_sore' | 'sore',
          food_item_id: i.food_item_id || undefined,
          nama_menu: i.nama_menu,
          porsi: i.porsi,
          satuan: i.satuan,
          kalori: i.kalori,
          protein: i.protein,
          karbohidrat: i.karbohidrat,
          lemak: i.lemak,
          harga: i.harga,
        })),
      })
      toast.success('Meal plan berhasil dibuat')
      setShowCreate(false)
      setPlanForm({
        nama: '', diet_type: '', catatan: '',
        items: [{ waktu_makan: 'pagi', food_item_id: '', nama_menu: '', porsi: 1, satuan: 'porsi', kalori: 0, protein: 0, karbohidrat: 0, lemak: 0, harga: 0 }],
      })
    } catch { toast.error('Gagal membuat meal plan') }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari meal plan..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Buat Meal Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : !plans || plans.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada meal plan</p>
          <p className="text-sm mt-1">Buat template menu diet yang bisa digunakan berulang</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(plans as MealPlanRow[]).map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailId(plan.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{plan.nama}</CardTitle>
                    <Badge variant="outline" className="mt-1">{plan.diet_type}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Hapus meal plan ini?')) deleteMut.mutate(plan.id)
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div><p className="text-muted-foreground">Kalori</p><p className="font-bold text-orange-600">{Math.round(Number(plan.kalori_total))}</p></div>
                  <div><p className="text-muted-foreground">Protein</p><p className="font-bold text-blue-600">{Math.round(Number(plan.protein_total))}g</p></div>
                  <div><p className="text-muted-foreground">Karbo</p><p className="font-bold text-green-600">{Math.round(Number(plan.karbohidrat_total))}g</p></div>
                  <div><p className="text-muted-foreground">Lemak</p><p className="font-bold text-yellow-600">{Math.round(Number(plan.lemak_total))}g</p></div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground flex justify-between">
                  <span>Total Cost: {formatRupiah(Number(plan.total_cost))}</span>
                  <span>{formatDate(plan.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detail Meal Plan</DialogTitle></DialogHeader>
          {detailPlan ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-bold text-lg">{detailPlan.nama}</h3>
                <Badge>{detailPlan.diet_type}</Badge>
              </div>
              <div className="grid grid-cols-5 gap-3 text-center p-3 bg-muted/50 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Kalori</p><p className="text-lg font-bold text-orange-600">{Math.round(Number(detailPlan.kalori_total))} kkal</p></div>
                <div><p className="text-xs text-muted-foreground">Protein</p><p className="text-lg font-bold text-blue-600">{Math.round(Number(detailPlan.protein_total))}g</p></div>
                <div><p className="text-xs text-muted-foreground">Karbo</p><p className="text-lg font-bold text-green-600">{Math.round(Number(detailPlan.karbohidrat_total))}g</p></div>
                <div><p className="text-xs text-muted-foreground">Lemak</p><p className="text-lg font-bold text-yellow-600">{Math.round(Number(detailPlan.lemak_total))}g</p></div>
                <div><p className="text-xs text-muted-foreground">Cost</p><p className="text-lg font-bold">{formatRupiah(Number(detailPlan.total_cost))}</p></div>
              </div>
              {detailPlan.catatan && <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{detailPlan.catatan}</p>}
              {detailPlan.items && detailPlan.items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Menu</TableHead>
                      <TableHead className="text-right">Kalori</TableHead>
                      <TableHead className="text-right">Protein</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailPlan.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell><Badge variant="outline" className="text-xs">{WAKTU_MAKAN_LABEL[item.waktu_makan] || item.waktu_makan}</Badge></TableCell>
                        <TableCell className="font-medium">{item.nama_menu}</TableCell>
                        <TableCell className="text-right text-sm">{Math.round(Number(item.kalori))}</TableCell>
                        <TableCell className="text-right text-sm">{Math.round(Number(item.protein))}g</TableCell>
                        <TableCell className="text-right text-sm font-mono">{formatRupiah(Number(item.harga))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          <DialogFooter><Button variant="outline" onClick={() => setDetailId(null)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate} size="xl">
        <DialogContent>
          <DialogHeader><DialogTitle>Buat Meal Plan</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama Plan</Label><Input value={planForm.nama} onChange={(e) => setPlanForm((p) => ({ ...p, nama: e.target.value }))} placeholder="Diet TKTP 2000 kkal" /></div>
              <div><Label>Tipe Diet</Label><Input value={planForm.diet_type} onChange={(e) => setPlanForm((p) => ({ ...p, diet_type: e.target.value }))} placeholder="TKTP / Rendah Garam / DM" /></div>
            </div>
            <div><Label>Catatan</Label><Input value={planForm.catatan} onChange={(e) => setPlanForm((p) => ({ ...p, catatan: e.target.value }))} placeholder="Catatan tambahan..." /></div>

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Item Menu</h4>
                <Button variant="outline" size="sm" onClick={addPlanItem}>
                  <Plus className="h-3 w-3 mr-1" /> Tambah Item
                </Button>
              </div>
              {planForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Waktu</Label>
                    <Select className="text-xs" value={item.waktu_makan} onChange={(e) => updatePlanItem(idx, 'waktu_makan', e.target.value)}>
                      {Object.entries(WAKTU_MAKAN_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Bahan Makanan</Label>
                    <Select className="text-xs" value={item.food_item_id} onChange={(e) => updatePlanItem(idx, 'food_item_id', e.target.value)}>
                      <option value="">Manual / Pilih...</option>
                      {foodItems && (foodItems as FoodItemRow[]).map((fi) => (
                        <option key={fi.id} value={fi.id}>{fi.nama}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Nama Menu</Label>
                    <Input className="text-xs" value={item.nama_menu} onChange={(e) => updatePlanItem(idx, 'nama_menu', e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Kalori</Label>
                    <Input type="number" className="text-xs" value={item.kalori} onChange={(e) => updatePlanItem(idx, 'kalori', Number(e.target.value))} />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Harga</Label>
                    <Input type="number" className="text-xs" value={item.harga} onChange={(e) => updatePlanItem(idx, 'harga', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2 flex gap-1 items-center">
                    <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                      P:{item.protein}g K:{item.karbohidrat}g L:{item.lemak}g
                    </Badge>
                    {planForm.items.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => removePlanItem(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-5 gap-2 text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                <div><p className="text-xs text-muted-foreground">Total Kalori</p><p className="font-bold text-orange-600">{totals.kalori} kkal</p></div>
                <div><p className="text-xs text-muted-foreground">Protein</p><p className="font-bold">{totals.protein}g</p></div>
                <div><p className="text-xs text-muted-foreground">Karbo</p><p className="font-bold">{totals.karbohidrat}g</p></div>
                <div><p className="text-xs text-muted-foreground">Lemak</p><p className="font-bold">{totals.lemak}g</p></div>
                <div><p className="text-xs text-muted-foreground">Total Cost</p><p className="font-bold">{formatRupiah(totals.harga)}</p></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={submitPlan} disabled={createMut.isPending || !planForm.nama || !planForm.diet_type}>
              {createMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Simpan Meal Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ═══════════════════════════════════════ */
/*           TAB 5: FOOD COST             */
/* ═══════════════════════════════════════ */

function FoodCostTab() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)

  const { data: summary, isLoading } = useFoodCostSummary(from, to)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Dari:</Label>
          <DateInput value={from} onChange={(v) => setFrom(v)} className="w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Sampai:</Label>
          <DateInput value={to} onChange={(v) => setTo(v)} className="w-40" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Pemberian</p>
                <p className="text-3xl font-bold text-orange-600">{summary.servings.total}</p>
                <p className="text-xs text-muted-foreground mt-1">kali penyajian</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Diet Aktif</p>
                <p className="text-3xl font-bold text-green-600">{summary.active_orders}</p>
                <p className="text-xs text-muted-foreground mt-1">pasien saat ini</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Meal Plans</p>
                <p className="text-3xl font-bold text-blue-600">{summary.meal_plans.total}</p>
                <p className="text-xs text-muted-foreground mt-1">template tersedia</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Food Waste</p>
                <p className="text-3xl font-bold text-red-600">{summary.servings.waste_percentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">porsi tidak dimakan</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Porsi Disajikan vs Dimakan</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Disajikan</span>
                      <span className="font-mono">{summary.servings.porsi_disajikan} porsi</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Dimakan</span>
                      <span className="font-mono">{summary.servings.porsi_dimakan} porsi</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{
                        width: summary.servings.porsi_disajikan
                          ? `${Math.round((summary.servings.porsi_dimakan / summary.servings.porsi_disajikan) * 100)}%`
                          : '0%',
                      }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-600">Terbuang</span>
                      <span className="font-mono text-red-600">
                        {summary.servings.porsi_disajikan - summary.servings.porsi_dimakan} porsi ({summary.servings.waste_percentage}%)
                      </span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{
                        width: `${summary.servings.waste_percentage}%`,
                      }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Biaya Meal Plan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Total Biaya Semua Plan</span>
                  <span className="text-xl font-bold">{formatRupiah(summary.meal_plans.total_cost)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Rata-rata per Plan</span>
                  <span className="text-xl font-bold">{formatRupiah(summary.meal_plans.avg_cost_per_plan)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Estimasi per Hari (per Plan)</span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatRupiah(summary.meal_plans.avg_cost_per_plan)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card><CardContent className="text-center py-12 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Data food cost belum tersedia</p>
        </CardContent></Card>
      )}
    </div>
  )
}
