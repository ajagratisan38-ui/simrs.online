'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMfaStatus, setupMfa, activateMfa, disableMfa } from '@/lib/api/auth'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldCheck, ShieldOff, QrCode, CheckCircle2 } from 'lucide-react'

export default function MfaSetupPage() {
  const searchParams = useSearchParams()
  const enforceMode = searchParams.get('enforce') === '1'
  const queryClient = useQueryClient()

  const { data: statusRes, isLoading } = useQuery({
    queryKey: ['mfa-status'],
    queryFn: getMfaStatus,
  })

  const mfaEnabled = statusRes?.data?.mfaEnabled ?? false

  // Setup flow state
  const [step, setStep] = useState<'idle' | 'qr' | 'verify' | 'done'>('idle')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Disable flow state
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState<string | null>(null)

  const setupMutation = useMutation({
    mutationFn: setupMfa,
    onSuccess: (data) => {
      setQrCodeUrl(data.data.qrCodeUrl)
      setStep('qr')
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const activateMutation = useMutation({
    mutationFn: (token: string) => activateMfa(token),
    onSuccess: () => {
      setStep('done')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] })
    },
    onError: (err: Error) => {
      setError(err.message)
      setVerifyCode('')
    },
  })

  const disableMutation = useMutation({
    mutationFn: (token: string) => disableMfa(token),
    onSuccess: () => {
      setDisableCode('')
      setDisableError(null)
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] })
    },
    onError: (err: Error) => {
      setDisableError(err.message)
      setDisableCode('')
    },
  })

  // Auto-submit verification
  useEffect(() => {
    if (verifyCode.length === 6 && step === 'qr') {
      activateMutation.mutate(verifyCode)
    }
  }, [verifyCode])

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Multi-Factor Authentication
        </h1>
        <p className="text-sm text-muted-foreground">
          Tambahkan lapisan keamanan ekstra untuk akun Anda
        </p>
      </div>

      {enforceMode && !mfaEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            ⚠️ MFA Wajib Diaktifkan
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Administrator platform mewajibkan MFA untuk semua Super Admin.
            Anda harus mengaktifkan MFA sebelum dapat mengakses panel admin.
          </p>
        </div>
      )}

      {/* Current Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {mfaEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              Status MFA
            </CardTitle>
            <Badge variant={mfaEnabled ? 'success' : 'secondary'}>
              {mfaEnabled ? 'Aktif' : 'Tidak Aktif'}
            </Badge>
          </div>
          <CardDescription>
            {mfaEnabled
              ? 'MFA aktif. Setiap login akan meminta kode dari aplikasi authenticator.'
              : 'MFA belum aktif. Aktifkan untuk keamanan ekstra.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Enable MFA */}
      {!mfaEnabled && step === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aktifkan MFA</CardTitle>
            <CardDescription>
              Anda memerlukan aplikasi authenticator seperti Google Authenticator,
              Authy, atau Microsoft Authenticator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
                {error}
              </div>
            )}
            <Button
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
            >
              <QrCode className="h-4 w-4 mr-2" />
              {setupMutation.isPending ? 'Generating...' : 'Generate QR Code'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Code + Verify */}
      {!mfaEnabled && step === 'qr' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scan QR Code</CardTitle>
            <CardDescription>
              Scan kode QR ini dengan aplikasi authenticator Anda,
              lalu masukkan kode 6 digit untuk verifikasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {qrCodeUrl && (
              <div className="flex justify-center">
                <img
                  src={qrCodeUrl}
                  alt="QR Code MFA"
                  className="w-48 h-48 rounded-lg border"
                />
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="verify-code">Kode Verifikasi (6 digit)</Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                value={verifyCode}
                onChange={(e) => {
                  setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => activateMutation.mutate(verifyCode)}
                disabled={verifyCode.length !== 6 || activateMutation.isPending}
                className="flex-1"
              >
                {activateMutation.isPending ? 'Memverifikasi...' : 'Verifikasi & Aktifkan'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('idle')
                  setQrCodeUrl('')
                  setVerifyCode('')
                  setError(null)
                }}
              >
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success */}
      {step === 'done' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-lg font-semibold">MFA Berhasil Diaktifkan</h3>
              <p className="text-sm text-muted-foreground">
                Mulai sekarang, setiap login akan meminta kode dari aplikasi authenticator Anda.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disable MFA */}
      {mfaEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Nonaktifkan MFA</CardTitle>
            <CardDescription>
              Masukkan kode dari aplikasi authenticator untuk menonaktifkan MFA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {disableError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {disableError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="disable-code">Kode MFA (6 digit)</Label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center text-xl tracking-[0.5em] font-mono"
                value={disableCode}
                onChange={(e) => {
                  setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }}
                autoComplete="one-time-code"
              />
            </div>

            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate(disableCode)}
              disabled={disableCode.length !== 6 || disableMutation.isPending}
            >
              {disableMutation.isPending ? 'Memproses...' : 'Nonaktifkan MFA'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
