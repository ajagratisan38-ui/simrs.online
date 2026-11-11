'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useVerifySignature } from '@/hooks/use-tte'
import {
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Award,
} from 'lucide-react'

interface TteBadgeProps {
  signatureId: string | null
  signerName?: string
  signerRole?: string
  signedAt?: string
  signatureLevel?: 'basic' | 'advanced' | 'qualified'
  compact?: boolean
  className?: string
}

export function TteBadge({
  signatureId,
  signerName,
  signerRole,
  signedAt,
  signatureLevel,
  compact = false,
  className = '',
}: TteBadgeProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [verifyTriggered, setVerifyTriggered] = useState(false)

  const { data: verifyResult, isLoading: isVerifying } = useVerifySignature(
    verifyTriggered && signatureId ? signatureId : '',
  )

  if (!signatureId) {
    if (compact) {
      return (
        <Badge variant="secondary" className={`text-xs ${className}`}>
          <ShieldOff className="h-3 w-3 mr-1" />
          Belum TTE
        </Badge>
      )
    }
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        <ShieldOff className="h-3.5 w-3.5" />
        Belum ditandatangani
      </div>
    )
  }

  const level = signatureLevel || 'basic'
  const isQualified = level === 'qualified'
  const isAdvanced = level === 'advanced'

  const badgeColor = isQualified
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : isAdvanced
      ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : ''

  const levelLabel = isQualified
    ? 'TTE Tersertifikasi'
    : isAdvanced
      ? 'TTE Lanjutan'
      : 'TTE Internal'

  const LevelIcon = isQualified || !isAdvanced
    ? ShieldCheck
    : ShieldAlert

  return (
    <>
      <Badge
        variant={isQualified || isAdvanced ? 'default' : 'secondary'}
        className={`cursor-pointer text-xs ${badgeColor} ${className}`}
        onClick={() => setDetailOpen(true)}
      >
        <LevelIcon className="h-3 w-3 mr-1" />
        {compact ? 'TTE' : levelLabel}
      </Badge>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LevelIcon className={`h-5 w-5 ${
                isQualified ? 'text-green-600' : isAdvanced ? 'text-blue-600' : 'text-gray-600'
              }`} />
              {levelLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2 text-sm">
              {signerName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium">{signerName}</p>
                    {signerRole && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {signerRole}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {signedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-muted-foreground">
                    {new Date(signedAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              )}

              {signatureLevel && (
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-muted-foreground capitalize">
                    Level: {signatureLevel}
                  </p>
                </div>
              )}
            </div>

            {/* Verification Result */}
            {verifyTriggered && verifyResult && (
              <div className={`rounded-md p-3 text-xs ${
                verifyResult.data.valid
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
              }`}>
                <div className="flex items-center gap-1.5 font-medium">
                  {verifyResult.data.valid ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {verifyResult.data.valid ? 'Valid — Dokumen Utuh' : 'Tidak Valid'}
                </div>
                <p className="mt-1">{verifyResult.data.details}</p>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setVerifyTriggered(true)}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Memverifikasi...
                </>
              ) : verifyTriggered ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                  Verifikasi Ulang
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                  Verifikasi Integritas
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
