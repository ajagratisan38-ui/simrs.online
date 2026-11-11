'use client'

import { useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { PrescriptionItemInput } from '@/lib/api/medical-records'

const FREKUENSI_OPTIONS = [
  { value: '1x1', label: '1 × 1' },
  { value: '2x1', label: '2 × 1' },
  { value: '3x1', label: '3 × 1' },
  { value: '4x1', label: '4 × 1' },
  { value: '1x2', label: '1 × 2' },
  { value: '2x2', label: '2 × 2' },
  { value: 'prn', label: 'Jika perlu (PRN)' },
  { value: 'stat', label: 'Segera (STAT)' },
]

interface PrescriptionFormProps {
  items: PrescriptionItemInput[]
  catatanDokter: string
  onItemsChange: (items: PrescriptionItemInput[]) => void
  onCatatanChange: (catatan: string) => void
  disabled?: boolean
}

function emptyItem(): PrescriptionItemInput {
  return {
    nama_obat: '',
    dosis: '',
    satuan: 'tablet',
    frekuensi: '3x1',
    durasi_hari: 3,
    jumlah: 9,
    aturan_pakai: '',
    catatan: '',
  }
}

function calcJumlah(frekuensi: string, durasi: number): number {
  const match = frekuensi.match(/^(\d+)x(\d+)$/)
  if (!match) return durasi
  return parseInt(match[1] ?? '1') * parseInt(match[2] ?? '1') * durasi
}

export function PrescriptionForm({
  items,
  catatanDokter,
  onItemsChange,
  onCatatanChange,
  disabled,
}: PrescriptionFormProps) {
  const addItem = useCallback(() => {
    onItemsChange([...items, emptyItem()])
  }, [items, onItemsChange])

  const removeItem = useCallback(
    (index: number) => {
      onItemsChange(items.filter((_, i) => i !== index))
    },
    [items, onItemsChange],
  )

  const updateItem = useCallback(
    (index: number, field: keyof PrescriptionItemInput, value: unknown) => {
      const updated = items.map((item, i) => {
        if (i !== index) return item
        const next = { ...item, [field]: value }
        // Auto-calc jumlah when frekuensi or durasi changes
        if (field === 'frekuensi' || field === 'durasi_hari') {
          next.jumlah = calcJumlah(
            field === 'frekuensi' ? (value as string) : next.frekuensi || '3x1',
            field === 'durasi_hari' ? (value as number) : next.durasi_hari || 3,
          )
        }
        return next
      })
      onItemsChange(updated)
    },
    [items, onItemsChange],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Resep Obat</label>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah Obat
          </Button>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
          Belum ada resep. Klik "Tambah Obat" untuk menambahkan.
        </p>
      )}

      {items.map((item, i) => (
        <div
          key={i}
          className="relative border rounded-md p-4 space-y-3"
        >
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 text-destructive"
              onClick={() => removeItem(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <div className="pr-8">
            <Label className="text-xs">Nama Obat</Label>
            <Input
              value={item.nama_obat}
              onChange={(e) => updateItem(i, 'nama_obat', e.target.value)}
              placeholder="Cth: Paracetamol 500mg"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Dosis</Label>
              <Input
                value={item.dosis || ''}
                onChange={(e) => updateItem(i, 'dosis', e.target.value)}
                placeholder="500mg"
                disabled={disabled}
              />
            </div>
            <div>
              <Label className="text-xs">Satuan</Label>
              <Select
                value={item.satuan || 'tablet'}
                onChange={(e) => updateItem(i, 'satuan', e.target.value)}
                disabled={disabled}
              >
                <option value="tablet">Tablet</option>
                <option value="kapsul">Kapsul</option>
                <option value="sirup">Sirup (ml)</option>
                <option value="ampul">Ampul</option>
                <option value="vial">Vial</option>
                <option value="tube">Tube</option>
                <option value="sachet">Sachet</option>
                <option value="tetes">Tetes</option>
                <option value="suppositoria">Suppositoria</option>
                <option value="inhaler">Inhaler</option>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Frekuensi</Label>
              <Select
                value={item.frekuensi || '3x1'}
                onChange={(e) => updateItem(i, 'frekuensi', e.target.value)}
                disabled={disabled}
              >
                {FREKUENSI_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Durasi (hari)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={item.durasi_hari || ''}
                onChange={(e) =>
                  updateItem(i, 'durasi_hari', parseInt(e.target.value) || 1)
                }
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                Jumlah{' '}
                <span className="text-muted-foreground font-normal">
                  (auto: frek × durasi)
                </span>
              </Label>
              <Input
                type="number"
                min={1}
                value={item.jumlah}
                onChange={(e) =>
                  updateItem(i, 'jumlah', parseInt(e.target.value) || 1)
                }
                disabled={disabled}
              />
            </div>
            <div>
              <Label className="text-xs">Aturan Pakai</Label>
              <Input
                value={item.aturan_pakai || ''}
                onChange={(e) =>
                  updateItem(i, 'aturan_pakai', e.target.value)
                }
                placeholder="Cth: Setelah makan"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Catatan dokter */}
      <div>
        <Label className="text-xs">Catatan untuk Apoteker</Label>
        <Textarea
          value={catatanDokter}
          onChange={(e) => onCatatanChange(e.target.value)}
          placeholder="Catatan khusus untuk apoteker..."
          rows={2}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
