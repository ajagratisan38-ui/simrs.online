'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, ClipboardCheck, CheckCircle, Clock, AlertTriangle,
  XCircle, FileText, Printer, Save, Play, Eye,
} from 'lucide-react'
import {
  useMcuRegistration, useStartMcu, useInputExamResult,
  useConcludeMcu, useCancelMcu, useMcuCertificate,
} from '@/hooks/use-mcu'
import type { McuExamination } from '@/lib/api/mcu'

const CATEGORY_LABELS: Record<string, string> = {
  fisik_umum: 'Fisik Umum',
  mata: 'Mata',
  tht: 'THT',
  gigi: 'Gigi',
  lab: 'Laboratorium',
  radiologi: 'Radiologi',
  ekg: 'EKG',
  spirometri: 'Spirometri',
  audiometri: 'Audiometri',
  psikologi: 'Psikologi',
}

const CATEGORY_COLORS: Record<string, string> = {
  fisik_umum: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  mata: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  tht: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  gigi: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  lab: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  radiologi: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  ekg: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  spirometri: 'bg-lime-100 text-lime-700 dark:bg-lime-900 dark:text-lime-300',
  audiometri: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  psikologi: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  registered: { label: 'Terdaftar', color: 'bg-blue-100 text-blue-700', icon: Clock },
  in_progress: { label: 'Dalam Proses', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  waiting_review: { label: 'Menunggu Review', color: 'bg-purple-100 text-purple-700', icon: AlertTriangle },
  completed: { label: 'Selesai', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700', icon: XCircle },
}

const CONCLUSION_OPTIONS = [
  { value: 'fit', label: 'Fit / Sehat', desc: 'Peserta layak bekerja tanpa batasan', color: 'border-green-500 bg-green-50' },
  { value: 'fit_with_notes', label: 'Fit dengan Catatan', desc: 'Layak dengan rekomendasi tertentu', color: 'border-yellow-500 bg-yellow-50' },
  { value: 'temporarily_unfit', label: 'Tidak Fit Sementara', desc: 'Perlu istirahat/pengobatan dulu', color: 'border-orange-500 bg-orange-50' },
  { value: 'unfit', label: 'Tidak Fit', desc: 'Tidak layak untuk posisi tersebut', color: 'border-red-500 bg-red-50' },
]

export default function McuDetailPage() {
  const params = useParams()
  const router = useRouter()
  const mcuId = params.mcuId as string

  const { data: reg, isLoading } = useMcuRegistration(mcuId)
  const startMcu = useStartMcu()
  const cancelMcu = useCancelMcu()

  const [editingExam, setEditingExam] = useState<string | null>(null)
  const [showConcludeDialog, setShowConcludeDialog] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)

  if (isLoading) {
    return <div className="text-center py-16 text-gray-500">Memuat data MCU...</div>
  }

  if (!reg) {
    return (
      <div className="text-center py-16">
        <XCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">Data MCU tidak ditemukan</p>
        <button onClick={() => router.push('/mcu')} className="mt-4 px-4 py-2 text-sm text-teal-600 hover:underline">
          Kembali
        </button>
      </div>
    )
  }

  const statusMeta = STATUS_CONFIG[reg.status] || STATUS_CONFIG.registered
  const examinations = reg.examinations || []
  const progress = reg.progress || { total: 0, completed: 0, percentage: 0 }

  const groupedExams = examinations.reduce<Record<string, McuExamination[]>>((acc, exam) => {
    if (!acc[exam.kategori]) acc[exam.kategori] = []
    acc[exam.kategori].push(exam)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/mcu')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-teal-600" />
              MCU — {reg.patient_nama}
            </h1>
            <p className="text-sm text-gray-500">{reg.certificate_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusMeta.color}`}>
            <statusMeta.icon className="h-4 w-4" />
            {statusMeta.label}
          </span>

          {reg.status === 'registered' && (
            <button
              onClick={() => startMcu.mutate(mcuId)}
              disabled={startMcu.isPending}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 flex items-center gap-2"
            >
              <Play className="h-4 w-4" /> Mulai Pemeriksaan
            </button>
          )}

          {(reg.status === 'in_progress' || reg.status === 'waiting_review') && (
            <button
              onClick={() => setShowConcludeDialog(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Kesimpulan
            </button>
          )}

          {reg.status === 'completed' && (
            <button
              onClick={() => setShowCertificate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <Printer className="h-4 w-4" /> Cetak Surat
            </button>
          )}

          {reg.status !== 'completed' && reg.status !== 'cancelled' && (
            <button
              onClick={() => { if (confirm('Batalkan MCU ini?')) cancelMcu.mutate(mcuId) }}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" /> Batalkan
            </button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Patient Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Data Pasien</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nama</span>
              <span className="font-medium text-gray-900 dark:text-white">{reg.patient_nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">No. RM</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{reg.no_rekam_medis}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">NIK</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{reg.patient_nik}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jenis Kelamin</span>
              <span className="text-gray-700 dark:text-gray-300">{reg.patient_gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal Lahir</span>
              <span className="text-gray-700 dark:text-gray-300">{new Date(reg.patient_dob).toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* MCU Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Info MCU</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Paket</span>
              <span className="font-medium text-teal-600">{reg.package_nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal</span>
              <span className="text-gray-700 dark:text-gray-300">{new Date(reg.tanggal).toLocaleDateString('id-ID')}</span>
            </div>
            {reg.tujuan && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tujuan</span>
                <span className="text-gray-700 dark:text-gray-300">{reg.tujuan}</span>
              </div>
            )}
            {reg.perusahaan && (
              <div className="flex justify-between">
                <span className="text-gray-500">Perusahaan</span>
                <span className="text-gray-700 dark:text-gray-300">{reg.perusahaan}</span>
              </div>
            )}
            {reg.doctor && (
              <div className="flex justify-between">
                <span className="text-gray-500">Dokter</span>
                <span className="text-gray-700 dark:text-gray-300">{reg.doctor.nama}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Progress</h3>
          <div className="text-center mb-3">
            <span className="text-4xl font-bold text-teal-600">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div
              className="bg-teal-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-center text-gray-500">
            {progress.completed} / {progress.total} pemeriksaan selesai
          </p>

          {reg.conclusion && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Kesimpulan:</p>
              <p className={`text-sm font-semibold ${
                reg.conclusion === 'fit' ? 'text-green-600'
                : reg.conclusion === 'fit_with_notes' ? 'text-yellow-600'
                : reg.conclusion === 'temporarily_unfit' ? 'text-orange-600'
                : 'text-red-600'
              }`}>
                {CONCLUSION_OPTIONS.find((o) => o.value === reg.conclusion)?.label || reg.conclusion}
              </p>
              {reg.conclusion_notes && (
                <p className="text-xs text-gray-500 mt-1">{reg.conclusion_notes}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Examinations by category */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rangkaian Pemeriksaan</h2>

        {Object.entries(groupedExams).map(([kategori, exams]) => (
          <div key={kategori} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${CATEGORY_COLORS[kategori] || 'bg-gray-100 text-gray-700'}`}>
                  {CATEGORY_LABELS[kategori] || kategori}
                </span>
                <span className="text-xs text-gray-500">
                  {exams.filter((e) => e.is_completed).length}/{exams.length} selesai
                </span>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {exams.map((exam) => (
                <ExamRow
                  key={exam.id}
                  exam={exam}
                  isEditing={editingExam === exam.id}
                  onEdit={() => setEditingExam(editingExam === exam.id ? null : exam.id)}
                  canEdit={reg.status === 'in_progress' || reg.status === 'waiting_review'}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Dialogs */}
      {showConcludeDialog && (
        <ConcludeDialog
          mcuId={mcuId}
          onClose={() => setShowConcludeDialog(false)}
        />
      )}

      {showCertificate && (
        <CertificateDialog
          mcuId={mcuId}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  )
}

function ExamRow({
  exam,
  isEditing,
  onEdit,
  canEdit,
}: {
  exam: McuExamination
  isEditing: boolean
  onEdit: () => void
  canEdit: boolean
}) {
  const inputResult = useInputExamResult()
  const [hasil, setHasil] = useState(exam.hasil || '')
  const [nilai, setNilai] = useState(exam.nilai || '')
  const [satuan, setSatuan] = useState(exam.satuan || '')
  const [nilaiNormal, setNilaiNormal] = useState(exam.nilai_normal || '')
  const [isAbnormal, setIsAbnormal] = useState(exam.is_abnormal)
  const [catatan, setCatatan] = useState(exam.catatan || '')

  const handleSave = () => {
    inputResult.mutate(
      {
        examId: exam.id,
        data: {
          hasil: hasil || undefined,
          nilai: nilai || undefined,
          satuan: satuan || undefined,
          nilai_normal: nilaiNormal || undefined,
          is_abnormal: isAbnormal,
          catatan: catatan || undefined,
        },
      },
      { onSuccess: () => onEdit() },
    )
  }

  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {exam.is_completed ? (
            <CheckCircle className={`h-5 w-5 ${exam.is_abnormal ? 'text-red-500' : 'text-green-500'}`} />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{exam.nama}</p>
            {exam.is_completed && (
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                {exam.hasil && <span>Hasil: {exam.hasil}</span>}
                {exam.nilai && <span>{exam.nilai} {exam.satuan}</span>}
                {exam.nilai_normal && <span>(Normal: {exam.nilai_normal})</span>}
                {exam.is_abnormal && <span className="text-red-500 font-medium">ABNORMAL</span>}
              </div>
            )}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={onEdit}
            className="text-xs text-teal-600 hover:underline flex items-center gap-1"
          >
            {exam.is_completed ? <Eye className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {exam.is_completed ? 'Edit' : 'Input Hasil'}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="mt-3 ml-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hasil Pemeriksaan</label>
            <textarea
              value={hasil}
              onChange={(e) => setHasil(e.target.value)}
              rows={2}
              placeholder="Deskripsi hasil..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nilai</label>
              <input value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="120" className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Satuan</label>
              <input value={satuan} onChange={(e) => setSatuan(e.target.value)} placeholder="mmHg" className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nilai Normal</label>
              <input value={nilaiNormal} onChange={(e) => setNilaiNormal(e.target.value)} placeholder="120/80" className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAbnormal}
                onChange={(e) => setIsAbnormal(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-red-600 font-medium">Abnormal</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Catatan</label>
            <input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan..." className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800" />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={inputResult.isPending}
              className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Save className="h-3 w-3" />
              {inputResult.isPending ? 'Menyimpan...' : 'Simpan Hasil'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ConcludeDialog({ mcuId, onClose }: { mcuId: string; onClose: () => void }) {
  const [conclusion, setConclusion] = useState('')
  const [notes, setNotes] = useState('')
  const concludeMcu = useConcludeMcu()

  const handleSubmit = () => {
    if (!conclusion) return
    concludeMcu.mutate(
      { id: mcuId, data: { conclusion, conclusion_notes: notes || undefined } },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Kesimpulan MCU
        </h2>

        <div className="space-y-3 mb-4">
          {CONCLUSION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setConclusion(opt.value)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                conclusion === opt.value ? opt.color : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-sm text-gray-900 dark:text-white">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Catatan / Rekomendasi
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Catatan tambahan untuk surat keterangan..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!conclusion || concludeMcu.isPending}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {concludeMcu.isPending ? 'Menyimpan...' : 'Simpan Kesimpulan'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CertificateDialog({ mcuId, onClose }: { mcuId: string; onClose: () => void }) {
  const { data: certData, isLoading } = useMcuCertificate(mcuId)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !certData) return

    const reg = certData.registration
    const tenant = certData.tenant
    const examinations = reg.examinations || []
    const abnormals = examinations.filter((e: McuExamination) => e.is_abnormal)

    const concLabel = CONCLUSION_OPTIONS.find((o) => o.value === reg.conclusion)?.label || reg.conclusion

    const age = reg.patient_dob
      ? Math.floor((Date.now() - new Date(reg.patient_dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : '-'

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Surat Keterangan Sehat - ${reg.patient_nama}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; padding: 40px; max-width: 800px; margin: auto; }
  .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { font-size: 16pt; margin-bottom: 4px; }
  .header h2 { font-size: 14pt; margin-bottom: 8px; }
  .header p { font-size: 10pt; }
  .title { text-align: center; margin: 20px 0; }
  .title h3 { font-size: 14pt; text-decoration: underline; }
  .title p { font-size: 10pt; }
  .section { margin: 15px 0; }
  .section h4 { font-size: 12pt; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table.info td { padding: 3px 8px; vertical-align: top; }
  table.info td:first-child { width: 160px; }
  table.data { border: 1px solid #000; }
  table.data th, table.data td { border: 1px solid #000; padding: 5px 8px; text-align: left; font-size: 10pt; }
  table.data th { background: #f0f0f0; }
  .conclusion { margin: 20px 0; padding: 15px; border: 2px solid #000; text-align: center; }
  .conclusion h4 { font-size: 14pt; margin-bottom: 5px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig-box { text-align: center; width: 200px; }
  .sig-line { border-bottom: 1px solid #000; height: 60px; }
  .abnormal { color: red; font-weight: bold; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <div class="header">
    <h1>${tenant?.name || 'RUMAH SAKIT'}</h1>
    <p>${tenant?.address || ''}</p>
    <p>Telp: ${tenant?.phone || ''} | Email: ${tenant?.email || ''}</p>
  </div>

  <div class="title">
    <h3>SURAT KETERANGAN KESEHATAN</h3>
    <p>No: ${reg.certificate_number}</p>
  </div>

  <div class="section">
    <h4>I. Identitas Peserta</h4>
    <table class="info">
      <tr><td>Nama Lengkap</td><td>: <strong>${reg.patient_nama}</strong></td></tr>
      <tr><td>No. Rekam Medis</td><td>: ${reg.no_rekam_medis}</td></tr>
      <tr><td>NIK</td><td>: ${reg.patient_nik}</td></tr>
      <tr><td>Jenis Kelamin</td><td>: ${reg.patient_gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
      <tr><td>Usia</td><td>: ${age} tahun</td></tr>
      ${reg.perusahaan ? `<tr><td>Perusahaan</td><td>: ${reg.perusahaan}</td></tr>` : ''}
      ${reg.tujuan ? `<tr><td>Tujuan MCU</td><td>: ${reg.tujuan}</td></tr>` : ''}
    </table>
  </div>

  <div class="section">
    <h4>II. Hasil Pemeriksaan</h4>
    <table class="data">
      <thead><tr><th>No</th><th>Kategori</th><th>Pemeriksaan</th><th>Hasil</th><th>Nilai</th><th>Normal</th><th>Ket</th></tr></thead>
      <tbody>
        ${examinations.map((e: McuExamination, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td>${CATEGORY_LABELS[e.kategori] || e.kategori}</td>
            <td>${e.nama}</td>
            <td>${e.hasil || '-'}</td>
            <td>${e.nilai ? `${e.nilai} ${e.satuan || ''}` : '-'}</td>
            <td>${e.nilai_normal || '-'}</td>
            <td class="${e.is_abnormal ? 'abnormal' : ''}">${e.is_abnormal ? 'ABNORMAL' : 'Normal'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${abnormals.length > 0 ? `
    <div class="section">
      <h4>III. Temuan Abnormal</h4>
      <ul style="padding-left: 20px;">
        ${abnormals.map((e: McuExamination) => `
          <li><strong>${e.nama}</strong>: ${e.hasil || ''} ${e.catatan ? `— ${e.catatan}` : ''}</li>
        `).join('')}
      </ul>
    </div>
  ` : ''}

  <div class="conclusion">
    <h4>KESIMPULAN</h4>
    <p style="font-size: 14pt; font-weight: bold; margin: 8px 0;">${concLabel}</p>
    ${reg.conclusion_notes ? `<p style="font-size: 10pt;">Catatan: ${reg.conclusion_notes}</p>` : ''}
  </div>

  <p style="margin: 15px 0; font-size: 10pt;">
    Demikian surat keterangan kesehatan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
  </p>

  <div class="signatures">
    <div></div>
    <div class="sig-box">
      <p>${tenant?.address?.split(',')[0] || ''}, ${new Date(reg.concluded_at || reg.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p>Dokter Pemeriksa,</p>
      <div class="sig-line"></div>
      <p><strong>${reg.doctor?.nama || '.......................'}</strong></p>
      ${reg.doctor?.sip ? `<p style="font-size: 9pt;">SIP: ${reg.doctor.sip}</p>` : ''}
    </div>
  </div>

</body></html>`)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
        <FileText className="h-12 w-12 mx-auto text-teal-600 mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Surat Keterangan Sehat
        </h2>

        {isLoading ? (
          <p className="text-sm text-gray-500 mb-4">Memuat data sertifikat...</p>
        ) : certData ? (
          <div className="space-y-3 mb-4">
            <p className="text-sm text-gray-500">
              No: <span className="font-mono font-medium">{certData.registration.certificate_number}</span>
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Pasien: <strong>{certData.registration.patient_nama}</strong>
            </p>
          </div>
        ) : (
          <p className="text-sm text-red-500 mb-4">Data tidak tersedia</p>
        )}

        <div className="flex justify-center gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Tutup
          </button>
          <button
            onClick={handlePrint}
            disabled={isLoading || !certData}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Cetak
          </button>
        </div>
      </div>
    </div>
  )
}
