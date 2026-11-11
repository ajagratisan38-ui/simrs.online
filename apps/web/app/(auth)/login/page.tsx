'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { loginApi } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/auth-store'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Eye, EyeOff, Building2, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react'

const loginFormSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  tenantSlug: z.string().min(1, 'Kode RS wajib diisi'),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AuthLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthLayout>
    }>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [mfaStep, setMfaStep] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [pendingCredentials, setPendingCredentials] = useState<LoginFormValues | null>(null)
  const mfaInputRef = useRef<HTMLInputElement>(null)

  const slugFromUrl = searchParams.get('rs') || ''

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      tenantSlug: slugFromUrl || 'rs-demo',
    },
  })

  useEffect(() => {
    if (slugFromUrl) {
      setValue('tenantSlug', slugFromUrl)
    }
  }, [slugFromUrl, setValue])

  useEffect(() => {
    if (mfaStep && mfaInputRef.current) {
      mfaInputRef.current.focus()
    }
  }, [mfaStep])

  const onSubmit = async (data: LoginFormValues) => {
    setError(null)

    try {
      const response = await loginApi(data.email, data.password, data.tenantSlug)

      if (response.data.mfaRequired) {
        if (response.data.mfaSetupRequired && response.data.tempAccessToken) {
          setAuth({
            user: { id: response.data.userId, name: '', email: data.email, role: 'superadmin' },
            accessToken: response.data.tempAccessToken,
            refreshToken: '',
            tenantSlug: 'platform',
          })
          router.push('/profil/mfa?enforce=1')
          return
        }
        setPendingCredentials(data)
        setMfaStep(true)
        return
      }

      setAuth({
        user: response.data.user,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        tenantSlug: data.tenantSlug,
      })

      if (response.data.user.role === 'superadmin') {
        router.push('/sa')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal, coba lagi'
      setError(message)
    }
  }

  const handleMfaSubmit = async () => {
    if (!pendingCredentials || mfaCode.length !== 6) return

    setMfaLoading(true)
    setError(null)

    try {
      const response = await loginApi(
        pendingCredentials.email,
        pendingCredentials.password,
        pendingCredentials.tenantSlug,
        mfaCode,
      )

      if (!response.data.mfaRequired) {
        setAuth({
          user: response.data.user,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          tenantSlug: pendingCredentials.tenantSlug,
        })

        if (response.data.user.role === 'superadmin') {
          router.push('/sa')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kode MFA tidak valid'
      setError(message)
      setMfaCode('')
    } finally {
      setMfaLoading(false)
    }
  }

  useEffect(() => {
    if (mfaCode.length === 6) {
      handleMfaSubmit()
    }
  }, [mfaCode])

  // --- MFA Step ---
  if (mfaStep) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Verifikasi MFA</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Masukkan kode 6 digit dari aplikasi authenticator
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mfa-code" className="text-sm font-medium">
              Kode MFA
            </Label>
            <Input
              ref={mfaInputRef}
              id="mfa-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="h-14 text-center text-3xl tracking-[0.6em] font-mono border-2 focus:border-primary"
              value={mfaCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                setMfaCode(val)
              }}
              autoComplete="one-time-code"
            />
          </div>

          <Button
            className="w-full h-11"
            disabled={mfaCode.length !== 6 || mfaLoading}
            onClick={handleMfaSubmit}
          >
            {mfaLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mfaLoading ? 'Memverifikasi...' : 'Verifikasi'}
          </Button>

          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
            onClick={() => {
              setMfaStep(false)
              setMfaCode('')
              setPendingCredentials(null)
              setError(null)
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke login
          </button>
        </div>
      </AuthLayout>
    )
  }

  // --- Normal Login ---
  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Selamat Datang</h1>
          <p className="text-sm text-muted-foreground">
            Masuk ke akun Anda untuk melanjutkan
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Kode RS */}
          <div className="space-y-2">
            <Label htmlFor="tenantSlug" className="text-sm font-medium">
              Kode RS (Subdomain)
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="tenantSlug"
                placeholder="contoh: rsharapan"
                className="pl-10 h-11"
                {...register('tenantSlug')}
                aria-invalid={!!errors.tenantSlug}
              />
            </div>
            {errors.tenantSlug ? (
              <p className="text-xs text-destructive">{errors.tenantSlug.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Subdomain RS yang didaftarkan, misal: <span className="font-medium">rsharapan</span> dari rsharapan.simrs.id
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nama@rumahsakit.id"
                autoComplete="email"
                className="pl-10 h-11"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                autoComplete="current-password"
                className="pl-10 pr-11 h-11"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          Belum memiliki akun?{' '}
          <span className="text-foreground font-medium">Hubungi administrator RS Anda</span>
        </p>
      </div>
    </AuthLayout>
  )
}
