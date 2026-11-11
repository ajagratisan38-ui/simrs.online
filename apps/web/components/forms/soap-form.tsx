'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Save, Clock, Plus, Trash2, AlertTriangle, FileText, BookmarkPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { DiagnosisPicker } from './diagnosis-picker'
import { PrescriptionForm } from './prescription-form'
import { useTemplates, useCreateTemplate } from '@/hooks/use-medical-record'
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type {
  MedicalRecordInput,
  VitalSignsInput,
  DiagnosisInput,
  ProcedureInput,
  PrescriptionItemInput,
} from '@/lib/api/medical-records'

// Vital sign ranges for warning highlights
const VITAL_RANGES: Record<
  string,
  { min: number; max: number; label: string; unit: string }
> = {
  tekanan_darah_sistolik: { min: 90, max: 140, label: 'Sistolik', unit: 'mmHg' },
  tekanan_darah_diastolik: { min: 60, max: 90, label: 'Diastolik', unit: 'mmHg' },
  nadi: { min: 60, max: 100, label: 'Nadi', unit: 'x/mnt' },
  suhu: { min: 36.0, max: 37.5, label: 'Suhu', unit: '°C' },
  respirasi: { min: 12, max: 20, label: 'Respirasi', unit: 'x/mnt' },
  spo2: { min: 95, max: 100, label: 'SpO2', unit: '%' },
}

interface SOAPFormProps {
  initialData?: MedicalRecordInput
  onSave: (data: MedicalRecordInput) => void
  onFinalize: (data: MedicalRecordInput) => void
  isSaving?: boolean
  isFinalizing?: boolean
  lastSavedAt?: Date | null
  disabled?: boolean
}

export function SOAPForm({
  initialData,
  onSave,
  onFinalize,
  isSaving,
  isFinalizing,
  lastSavedAt,
  disabled,
}: SOAPFormProps) {
  // --- State ---
  const [vitalSigns, setVitalSigns] = useState<VitalSignsInput>(
    initialData?.vital_signs || {},
  )
  const [subjective, setSubjective] = useState(initialData?.subjective || '')
  const [objective, setObjective] = useState(initialData?.objective || '')
  const [assessment, setAssessment] = useState(initialData?.assessment || '')
  const [plan, setPlan] = useState(initialData?.plan || '')
  const [alergi, setAlergi] = useState<string[]>(initialData?.alergi || [])
  const [alergiInput, setAlergiInput] = useState('')
  const [riwayatPenyakit, setRiwayatPenyakit] = useState(
    initialData?.riwayat_penyakit || '',
  )
  const [catatanTambahan, setCatatanTambahan] = useState(
    initialData?.catatan_tambahan || '',
  )
  const [diagnoses, setDiagnoses] = useState<DiagnosisInput[]>(
    initialData?.diagnoses || [],
  )
  const [procedures, setProcedures] = useState<ProcedureInput[]>(
    initialData?.procedures || [],
  )
  const [rxItems, setRxItems] = useState<PrescriptionItemInput[]>(
    initialData?.prescription?.items || [],
  )
  const [rxCatatan, setRxCatatan] = useState(
    initialData?.prescription?.catatan_dokter || '',
  )
  const [showConfirm, setShowConfirm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateField, setTemplateField] = useState<string>('soap')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplCategory, setTplCategory] = useState('umum')

  // Track changes for auto-save debounce
  const changeCountRef = useRef(0)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // --- Build data object ---
  const buildData = useCallback((): MedicalRecordInput => {
    const data: MedicalRecordInput = {
      subjective: subjective || undefined,
      objective: objective || undefined,
      assessment: assessment || undefined,
      plan: plan || undefined,
      vital_signs: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
      alergi: alergi.length > 0 ? alergi : undefined,
      riwayat_penyakit: riwayatPenyakit || undefined,
      catatan_tambahan: catatanTambahan || undefined,
      diagnoses: diagnoses.length > 0 ? diagnoses : undefined,
    }
    // Filter out incomplete procedures (empty nama_tindakan)
    const validProcedures = procedures.filter(
      (p) => p.nama_tindakan && p.nama_tindakan.trim().length >= 2,
    )
    if (validProcedures.length > 0) {
      data.procedures = validProcedures
    }
    // Filter out incomplete prescription items (empty nama_obat)
    const validRxItems = rxItems.filter(
      (item) => item.nama_obat && item.nama_obat.trim().length >= 2,
    )
    if (validRxItems.length > 0) {
      data.prescription = {
        catatan_dokter: rxCatatan || undefined,
        items: validRxItems,
      }
    }
    return data
  }, [
    subjective, objective, assessment, plan, vitalSigns,
    alergi, riwayatPenyakit, catatanTambahan,
    diagnoses, procedures, rxItems, rxCatatan,
  ])

  // --- Auto-save debounce (2 seconds) ---
  useEffect(() => {
    if (disabled) return
    changeCountRef.current++
    if (changeCountRef.current <= 1) return // Skip initial render

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      onSave(buildData())
    }, 2000)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    subjective, objective, assessment, plan, vitalSigns,
    alergi, riwayatPenyakit, catatanTambahan,
    diagnoses, procedures, rxItems, rxCatatan,
  ])

  // --- Vital sign helpers ---
  const updateVital = (key: keyof VitalSignsInput, value: string) => {
    const num = value === '' ? null : parseFloat(value)
    setVitalSigns((prev) => {
      const next = { ...prev, [key]: num }
      // Auto-calc BMI
      if (key === 'tinggi_badan' || key === 'berat_badan') {
        const tb = key === 'tinggi_badan' ? num : prev.tinggi_badan
        const bb = key === 'berat_badan' ? num : prev.berat_badan
        if (tb && bb && tb > 0) {
          const tbm = tb / 100
          next.bmi = Math.round((bb / (tbm * tbm)) * 10) / 10
        } else {
          next.bmi = null
        }
      }
      return next
    })
  }

  const isOutOfRange = (key: string, value: number | null | undefined) => {
    if (value == null) return false
    const range = VITAL_RANGES[key]
    if (!range) return false
    return value < range.min || value > range.max
  }

  // --- Procedure helpers ---
  const addProcedure = () => {
    setProcedures([
      ...procedures,
      { nama_tindakan: '', tarif: 0, qty: 1, total: 0 },
    ])
  }

  const updateProcedure = (
    index: number,
    field: keyof ProcedureInput,
    value: unknown,
  ) => {
    setProcedures(
      procedures.map((p, i) => {
        if (i !== index) return p
        const next = { ...p, [field]: value }
        if (field === 'tarif' || field === 'qty') {
          next.total =
            (field === 'tarif' ? (value as number) : next.tarif) *
            (field === 'qty' ? (value as number) : next.qty)
        }
        return next
      }),
    )
  }

  const removeProcedure = (index: number) => {
    setProcedures(procedures.filter((_, i) => i !== index))
  }

  // --- Alergi helpers ---
  const addAlergi = () => {
    if (alergiInput.trim() && !alergi.includes(alergiInput.trim())) {
      setAlergi([...alergi, alergiInput.trim()])
      setAlergiInput('')
    }
  }

  // --- Templates ---
  const { data: templatesData } = useTemplates()
  const templates = templatesData?.data ?? []
  const saveTemplate = useCreateTemplate()

  const applyTemplate = (content: Record<string, unknown>) => {
    if (content.subjective) setSubjective(content.subjective as string)
    if (content.objective) setObjective(content.objective as string)
    if (content.assessment) setAssessment(content.assessment as string)
    if (content.plan) setPlan(content.plan as string)
    setShowTemplates(false)
  }

  const handleSaveTemplate = () => {
    if (!tplName.trim()) return
    const content: Record<string, string> = {}
    if (subjective.trim()) content.subjective = subjective.trim()
    if (objective.trim()) content.objective = objective.trim()
    if (assessment.trim()) content.assessment = assessment.trim()
    if (plan.trim()) content.plan = plan.trim()
    saveTemplate.mutate(
      { name: tplName.trim(), category: tplCategory, content },
      {
        onSuccess: () => {
          setShowSaveTemplate(false)
          setTplName('')
          setTplCategory('umum')
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      {/* ============== VITAL SIGNS ============== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Tanda Vital
            {Object.entries(vitalSigns).some(
              ([k, v]) => isOutOfRange(k, v as number),
            ) && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Abnormal
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* TD */}
            <div>
              <Label className="text-xs">TD Sistolik (mmHg)</Label>
              <Input
                type="number"
                value={vitalSigns.tekanan_darah_sistolik ?? ''}
                onChange={(e) =>
                  updateVital('tekanan_darah_sistolik', e.target.value)
                }
                className={cn(
                  isOutOfRange(
                    'tekanan_darah_sistolik',
                    vitalSigns.tekanan_darah_sistolik,
                  ) && 'border-red-500 bg-red-50',
                )}
                disabled={disabled}
                placeholder="120"
              />
            </div>
            <div>
              <Label className="text-xs">TD Diastolik (mmHg)</Label>
              <Input
                type="number"
                value={vitalSigns.tekanan_darah_diastolik ?? ''}
                onChange={(e) =>
                  updateVital('tekanan_darah_diastolik', e.target.value)
                }
                className={cn(
                  isOutOfRange(
                    'tekanan_darah_diastolik',
                    vitalSigns.tekanan_darah_diastolik,
                  ) && 'border-red-500 bg-red-50',
                )}
                disabled={disabled}
                placeholder="80"
              />
            </div>
            <div>
              <Label className="text-xs">Nadi (x/mnt)</Label>
              <Input
                type="number"
                value={vitalSigns.nadi ?? ''}
                onChange={(e) => updateVital('nadi', e.target.value)}
                className={cn(
                  isOutOfRange('nadi', vitalSigns.nadi) &&
                    'border-red-500 bg-red-50',
                )}
                disabled={disabled}
                placeholder="80"
              />
            </div>
            <div>
              <Label className="text-xs">Suhu (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={vitalSigns.suhu ?? ''}
                onChange={(e) => updateVital('suhu', e.target.value)}
                className={cn(
                  isOutOfRange('suhu', vitalSigns.suhu) &&
                    'border-red-500 bg-red-50',
                )}
                disabled={disabled}
                placeholder="36.5"
              />
            </div>
            <div>
              <Label className="text-xs">Respirasi (x/mnt)</Label>
              <Input
                type="number"
                value={vitalSigns.respirasi ?? ''}
                onChange={(e) => updateVital('respirasi', e.target.value)}
                className={cn(
                  isOutOfRange('respirasi', vitalSigns.respirasi) &&
                    'border-red-500 bg-red-50',
                )}
                disabled={disabled}
                placeholder="18"
              />
            </div>
            <div>
              <Label className="text-xs">SpO2 (%)</Label>
              <Input
                type="number"
                value={vitalSigns.spo2 ?? ''}
                onChange={(e) => updateVital('spo2', e.target.value)}
                className={cn(
                  isOutOfRange('spo2', vitalSigns.spo2) &&
                    'border-red-500 bg-red-50',
                )}
                disabled={disabled}
                placeholder="98"
              />
            </div>
            <div>
              <Label className="text-xs">TB (cm)</Label>
              <Input
                type="number"
                value={vitalSigns.tinggi_badan ?? ''}
                onChange={(e) => updateVital('tinggi_badan', e.target.value)}
                disabled={disabled}
                placeholder="170"
              />
            </div>
            <div>
              <Label className="text-xs">BB (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={vitalSigns.berat_badan ?? ''}
                onChange={(e) => updateVital('berat_badan', e.target.value)}
                disabled={disabled}
                placeholder="65"
              />
            </div>
          </div>
          {vitalSigns.bmi != null && (
            <div className="mt-2 text-sm">
              BMI:{' '}
              <span
                className={cn(
                  'font-medium',
                  vitalSigns.bmi < 18.5 || vitalSigns.bmi > 25
                    ? 'text-red-600'
                    : 'text-green-600',
                )}
              >
                {vitalSigns.bmi}
              </span>
              <span className="text-muted-foreground ml-1">
                {vitalSigns.bmi < 18.5
                  ? '(Underweight)'
                  : vitalSigns.bmi <= 25
                    ? '(Normal)'
                    : vitalSigns.bmi <= 30
                      ? '(Overweight)'
                      : '(Obese)'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============== ALERGI ============== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alergi & Riwayat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Alergi</Label>
            <div className="flex gap-2">
              <Input
                value={alergiInput}
                onChange={(e) => setAlergiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAlergi())}
                placeholder="Ketik alergi lalu Enter"
                disabled={disabled}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAlergi}
                disabled={disabled || !alergiInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {alergi.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {alergi.map((a, i) => (
                  <Badge key={i} variant="destructive" className="gap-1">
                    {a}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() =>
                          setAlergi(alergi.filter((_, j) => j !== i))
                        }
                      >
                        <span className="text-xs">×</span>
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Riwayat Penyakit</Label>
            <Textarea
              value={riwayatPenyakit}
              onChange={(e) => setRiwayatPenyakit(e.target.value)}
              rows={2}
              placeholder="Riwayat penyakit dahulu..."
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* ============== SOAP ============== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">SOAP</CardTitle>
            {!disabled && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(true)}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Pakai Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveTemplate(true)}
                  disabled={!subjective.trim() && !objective.trim() && !assessment.trim() && !plan.trim()}
                >
                  <BookmarkPlus className="h-4 w-4 mr-1" />
                  Simpan Template
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-medium">
              S — Subjective{' '}
              <span className="font-normal text-muted-foreground">
                (keluhan pasien)
              </span>
            </Label>
            <Textarea
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              rows={3}
              placeholder="Keluhan utama pasien, riwayat perjalanan penyakit..."
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs font-medium">
              O — Objective{' '}
              <span className="font-normal text-muted-foreground">
                (hasil pemeriksaan)
              </span>
            </Label>
            <Textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
              placeholder="Keadaan umum, pemeriksaan fisik, hasil lab..."
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs font-medium">
              A — Assessment{' '}
              <span className="font-normal text-muted-foreground">
                (diagnosis kerja)
              </span>
            </Label>
            <Textarea
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              rows={3}
              placeholder="Diagnosis kerja, diagnosis banding..."
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs font-medium">
              P — Plan{' '}
              <span className="font-normal text-muted-foreground">
                (rencana tatalaksana)
              </span>
            </Label>
            <Textarea
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              rows={3}
              placeholder="Rencana pengobatan, tindakan, edukasi pasien..."
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* ============== DIAGNOSIS ============== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diagnosis</CardTitle>
        </CardHeader>
        <CardContent>
          <DiagnosisPicker
            diagnoses={diagnoses}
            onChange={setDiagnoses}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* ============== TINDAKAN ============== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Tindakan</CardTitle>
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProcedure}
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah Tindakan
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {procedures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
              Belum ada tindakan
            </p>
          ) : (
            <div className="space-y-2">
              {procedures.map((proc, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 items-end border rounded-md p-3"
                >
                  <div className="col-span-5">
                    <Label className="text-xs">Nama Tindakan</Label>
                    <Input
                      value={proc.nama_tindakan}
                      onChange={(e) =>
                        updateProcedure(i, 'nama_tindakan', e.target.value)
                      }
                      placeholder="Nama tindakan"
                      disabled={disabled}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Tarif</Label>
                    <Input
                      type="number"
                      value={proc.tarif || ''}
                      onChange={(e) =>
                        updateProcedure(
                          i,
                          'tarif',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={proc.qty}
                      onChange={(e) =>
                        updateProcedure(
                          i,
                          'qty',
                          parseInt(e.target.value) || 1,
                        )
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Total</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        value={Math.round(Number(proc.total)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                        disabled
                        className="bg-muted"
                      />
                      {!disabled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 text-destructive"
                          onClick={() => removeProcedure(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============== RESEP ============== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resep</CardTitle>
        </CardHeader>
        <CardContent>
          <PrescriptionForm
            items={rxItems}
            catatanDokter={rxCatatan}
            onItemsChange={setRxItems}
            onCatatanChange={setRxCatatan}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* ============== CATATAN TAMBAHAN ============== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Catatan Tambahan</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={catatanTambahan}
            onChange={(e) => setCatatanTambahan(e.target.value)}
            rows={3}
            placeholder="Catatan tambahan..."
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* ============== FOOTER ============== */}
      {!disabled && (
        <div className="sticky bottom-0 bg-background border-t py-3 px-4 -mx-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <Save className="h-3 w-3 animate-pulse" />
                Menyimpan...
              </>
            ) : lastSavedAt ? (
              <>
                <Clock className="h-3 w-3" />
                Tersimpan {formatTimeAgo(lastSavedAt)}
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSave(buildData())}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              Simpan Draft
            </Button>
            <Button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={isFinalizing}
            >
              Selesai Periksa
            </Button>
          </div>
        </div>
      )}

      {/* ============== CONFIRM DIALOG ============== */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogHeader>
          <DialogClose onClose={() => setShowConfirm(false)} />
          <DialogTitle>Selesai Periksa?</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-muted-foreground">
            Rekam medis akan difinalisasi dan <strong>tidak bisa diedit</strong>{' '}
            setelah ini. Resep akan otomatis dikirim ke farmasi.
          </p>
          {diagnoses.length === 0 && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Belum ada diagnosis yang ditambahkan
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirm(false)}>
            Batal
          </Button>
          <Button
            onClick={() => {
              setShowConfirm(false)
              onFinalize(buildData())
            }}
            disabled={isFinalizing}
          >
            {isFinalizing ? 'Memproses...' : 'Ya, Finalisasi'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ============== TEMPLATES DIALOG ============== */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogHeader>
          <DialogClose onClose={() => setShowTemplates(false)} />
          <DialogTitle>Pilih Template</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada template tersedia
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.content)}
                  className="w-full text-left px-3 py-2 border rounded-md hover:bg-accent text-sm"
                >
                  <span className="font-medium">{tpl.name}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {tpl.category}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============== SAVE AS TEMPLATE DIALOG ============== */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogHeader>
          <DialogClose onClose={() => setShowSaveTemplate(false)} />
          <DialogTitle>Simpan Sebagai Template</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Nama Template</Label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="cth: Demam Umum, Hipertensi Kontrol..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Kategori</Label>
              <Select value={tplCategory} onValueChange={setTplCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="umum">Umum</SelectItem>
                  <SelectItem value="penyakit_dalam">Penyakit Dalam</SelectItem>
                  <SelectItem value="anak">Anak</SelectItem>
                  <SelectItem value="bedah">Bedah</SelectItem>
                  <SelectItem value="obgyn">Obstetri & Ginekologi</SelectItem>
                  <SelectItem value="saraf">Saraf</SelectItem>
                  <SelectItem value="mata">Mata</SelectItem>
                  <SelectItem value="tht">THT</SelectItem>
                  <SelectItem value="kulit">Kulit & Kelamin</SelectItem>
                  <SelectItem value="gigi">Gigi & Mulut</SelectItem>
                  <SelectItem value="igd">IGD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-muted p-3 text-xs space-y-1">
              <p className="font-medium text-sm mb-2">Preview isi template:</p>
              {subjective.trim() && <p><span className="font-medium">S:</span> {subjective.trim().slice(0, 80)}...</p>}
              {objective.trim() && <p><span className="font-medium">O:</span> {objective.trim().slice(0, 80)}...</p>}
              {assessment.trim() && <p><span className="font-medium">A:</span> {assessment.trim().slice(0, 80)}...</p>}
              {plan.trim() && <p><span className="font-medium">P:</span> {plan.trim().slice(0, 80)}...</p>}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>
            Batal
          </Button>
          <Button
            onClick={handleSaveTemplate}
            disabled={!tplName.trim() || saveTemplate.isPending}
          >
            {saveTemplate.isPending ? 'Menyimpan...' : 'Simpan Template'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'baru saja'
  if (seconds < 60) return `${seconds} detik lalu`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} menit lalu`
}
