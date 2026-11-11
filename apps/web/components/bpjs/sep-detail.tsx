'use client'

import { useState } from 'react'
import {
  FileText,
  Calendar,
  Building2,
  Stethoscope,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import type { BpjsSepData } from '@/lib/api/bpjs'

interface SepDetailProps {
  sep: BpjsSepData
  onDelete?: (noSep: string) => void
  isDeleting?: boolean
  compact?: boolean
}

export function SepDetail({ sep, onDelete, isDeleting, compact }: SepDetailProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const pelayananLabel = sep.jnsPelayanan === '1' ? 'Rawat Inap' : 'Rawat Jalan'

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-md border bg-teal-50/50 dark:bg-teal-950/20">
        <FileText className="h-4 w-4 text-teal-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">SEP: {sep.noSep}</p>
          <p className="text-xs text-muted-foreground">
            {sep.tglSep} · {pelayananLabel} · Kelas {sep.kelasRawat}
          </p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {pelayananLabel}
        </Badge>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-600" />
              Detail SEP
            </CardTitle>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7 px-2"
                onClick={() => setConfirmOpen(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow
            label="No. SEP"
            value={sep.noSep}
            mono
            icon={<FileText className="h-3 w-3" />}
          />
          <InfoRow
            label="Tanggal"
            value={sep.tglSep}
            icon={<Calendar className="h-3 w-3" />}
          />
          <InfoRow
            label="Jenis Pelayanan"
            value={pelayananLabel}
            icon={<Stethoscope className="h-3 w-3" />}
          />
          <InfoRow label="Kelas Rawat" value={`Kelas ${sep.kelasRawat}`} />
          <InfoRow label="No. RM" value={sep.noMR} mono />
          {sep.diagnosa && (
            <InfoRow
              label="Diagnosa"
              value={`${sep.diagnosa.kode} — ${sep.diagnosa.nama}`}
            />
          )}
          {sep.poli && (
            <InfoRow
              label="Poli Tujuan"
              value={sep.poli.tujuan}
              icon={<Building2 className="h-3 w-3" />}
            />
          )}
          {sep.rujukan && (
            <>
              <div className="border-t pt-2 mt-2" />
              <InfoRow label="No. Rujukan" value={sep.rujukan.noRujukan || '-'} mono />
              <InfoRow label="PPK Perujuk" value={sep.rujukan.ppkRujukan || '-'} />
              <InfoRow label="Tgl Rujukan" value={sep.rujukan.tglRujukan || '-'} />
            </>
          )}
          {sep.catatan && (
            <>
              <div className="border-t pt-2 mt-2" />
              <div>
                <span className="text-xs text-muted-foreground">Catatan</span>
                <p className="text-sm mt-0.5">{sep.catatan}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogClose onClose={() => setConfirmOpen(false)} />
        <DialogHeader>
          <DialogTitle>Hapus SEP</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm">
            Anda yakin ingin menghapus SEP <span className="font-mono font-bold">{sep.noSep}</span>?
            Tindakan ini tidak bisa dibatalkan.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onDelete?.(sep.noSep)
              setConfirmOpen(false)
            }}
            disabled={isDeleting}
          >
            {isDeleting ? 'Menghapus...' : 'Hapus SEP'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}

function InfoRow({
  label,
  value,
  mono,
  icon,
}: {
  label: string
  value: string
  mono?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-xs flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={`text-right ${mono ? 'font-mono' : ''} font-medium`}>
        {value}
      </span>
    </div>
  )
}
