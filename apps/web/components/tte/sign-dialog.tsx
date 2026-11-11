'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SignaturePad } from './signature-pad'
import { useSignDocument } from '@/hooks/use-tte'
import {
  PenLine,
  Loader2,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from 'lucide-react'

interface SignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentType: string
  documentId: string
  documentLabel: string
  documentSummary?: string
  onSuccess?: () => void
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  medical_record: 'Rekam Medis',
  cppt: 'CPPT',
  general_consent: 'General Consent',
  resume_medis: 'Resume Medis',
  resep: 'Resep Obat',
  lab_result: 'Hasil Laboratorium',
  radiology_result: 'Hasil Radiologi',
  nursing_assessment: 'Pengkajian Keperawatan',
  surgery_report: 'Laporan Operasi',
}

export function SignDialog({
  open,
  onOpenChange,
  documentType,
  documentId,
  documentLabel,
  documentSummary,
  onSuccess,
}: SignDialogProps) {
  const [signatureData, setSignatureData] = useState('')
  const [sipNumber, setSipNumber] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [success, setSuccess] = useState(false)
  const [signatureId, setSignatureId] = useState<string | null>(null)

  const signMutation = useSignDocument()

  const canSign = signatureData.length > 100 && agreed

  const handleSign = async () => {
    if (!canSign) return

    try {
      const result = await signMutation.mutateAsync({
        document_type: documentType,
        document_id: documentId,
        signature_data: signatureData,
        sip_number: sipNumber || undefined,
      })
      setSuccess(true)
      setSignatureId(result.data.id)
      onSuccess?.()
    } catch {
      // Error handled by mutation hook
    }
  }

  const handleClose = () => {
    setSignatureData('')
    setSipNumber('')
    setAgreed(false)
    setSuccess(false)
    setSignatureId(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-blue-600" />
            Tanda Tangan Elektronik
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">
                Dokumen Berhasil Ditandatangani
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {DOCUMENT_TYPE_LABELS[documentType] || documentType}
              </p>
              {signatureId && (
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  ID: {signatureId.slice(0, 8)}...
                </p>
              )}
            </div>
            <Button onClick={handleClose}>Tutup</Button>
          </div>
        ) : (
          <>
            {/* Document Summary */}
            <div className="rounded-lg border bg-muted/50 p-3 flex items-start gap-3">
              <FileText className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm">{documentLabel}</p>
                {documentSummary && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {documentSummary}
                  </p>
                )}
                <Badge variant="outline" className="mt-1 text-xs">
                  {DOCUMENT_TYPE_LABELS[documentType] || documentType}
                </Badge>
              </div>
            </div>

            {/* Signature Pad */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Tanda Tangan
              </Label>
              <SignaturePad
                onSave={setSignatureData}
                width={420}
                height={180}
              />
            </div>

            {/* SIP/STR Number */}
            <div>
              <Label htmlFor="sip-number" className="text-sm">
                No. SIP / STR{' '}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                id="sip-number"
                placeholder="Masukkan nomor SIP/STR"
                value={sipNumber}
                onChange={(e) => setSipNumber(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Agreement Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg border p-3 hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <div className="text-sm">
                <p className="font-medium flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Pernyataan Keabsahan
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Saya menyatakan dokumen ini benar, sah, dan dapat
                  dipertanggungjawabkan sesuai peraturan yang berlaku
                </p>
              </div>
            </label>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Batal
              </Button>
              <Button
                onClick={handleSign}
                disabled={!canSign || signMutation.isPending}
              >
                {signMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menandatangani...
                  </>
                ) : (
                  <>
                    <PenLine className="h-4 w-4 mr-2" />
                    Tanda Tangani
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
