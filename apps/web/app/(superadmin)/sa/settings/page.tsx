'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Settings,
  Save,
  Loader2,
  Globe,
  Mail,
  CreditCard,
  Shield,
  CheckCircle,
  Send,
  AlertTriangle,
  RefreshCw,
  Plug,
  Info,
} from 'lucide-react'
import { usePlatformSettings, useUpdateSettings } from '@/hooks/use-registration'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'

type SettingCategory = 'general' | 'domain' | 'email' | 'billing' | 'security' | 'integrations'

const CATEGORIES: Array<{
  id: SettingCategory
  label: string
  icon: React.ElementType
  description: string
}> = [
  { id: 'general', label: 'Umum', icon: Settings, description: 'Nama platform, registrasi, maintenance' },
  { id: 'domain', label: 'Domain', icon: Globe, description: 'Domain utama dan subdomain config' },
  { id: 'email', label: 'Email / SMTP', icon: Mail, description: 'Konfigurasi SMTP dan template email' },
  { id: 'billing', label: 'Billing & Rekening', icon: CreditCard, description: 'Rekening bank, grace period, auto-suspend' },
  { id: 'security', label: 'Keamanan', icon: Shield, description: 'IP whitelist, 2FA, session timeout' },
  { id: 'integrations', label: 'Integrasi', icon: Plug, description: 'SATUSEHAT, BPJS, WhatsApp, Payment Gateway' },
]

const SENSITIVE_KEYS = ['smtp_password_enc', 'whatsapp_api_key', 'payment_gateway_api_key']

const BOOLEAN_KEYS = [
  'enable_self_registration', 'auto_approve_trial', 'maintenance_mode',
  'enforce_2fa_superadmin', 'custom_domain_enabled',
]

function SettingLabel(key: string): string {
  const map: Record<string, string> = {
    platform_name: 'Nama Platform',
    platform_tagline: 'Tagline',
    contact_email: 'Email Kontak',
    contact_phone: 'Telepon Kontak',
    enable_self_registration: 'Registrasi Mandiri',
    auto_approve_trial: 'Auto-Approve Trial',
    maintenance_mode: 'Mode Maintenance',
    default_timezone: 'Timezone Default',
    primary_domain: 'Domain Utama',
    smtp_host: 'SMTP Host',
    smtp_port: 'SMTP Port',
    smtp_user: 'SMTP Username',
    smtp_password_enc: 'SMTP Password',
    smtp_from_email: 'Email Pengirim',
    smtp_from_name: 'Nama Pengirim',
    bank_name: 'Nama Bank',
    bank_account_number: 'Nomor Rekening',
    bank_account_name: 'Nama Pemilik Rekening',
    auto_suspend_days: 'Auto-Suspend Setelah Expired (hari)',
    grace_period_days: 'Grace Period (hari)',
    max_concurrent_sessions: 'Max Session per User',
    enforce_2fa_superadmin: 'Wajib 2FA Super Admin',
    allowed_ips_superadmin: 'IP Whitelist Super Admin',
    session_timeout_minutes: 'Session Timeout (menit)',
    satusehat_mode: 'SATUSEHAT Mode',
    satusehat_organization_id: 'SATUSEHAT Organization ID',
    bpjs_mode: 'BPJS Mode',
    whatsapp_gateway_url: 'WhatsApp Gateway URL',
    whatsapp_api_key: 'WhatsApp API Key',
    payment_gateway_provider: 'Payment Gateway Provider',
    payment_gateway_api_key: 'Payment Gateway API Key',
    invoice_prefix: 'Prefix Nomor Invoice',
    invoice_footer: 'Footer Text Invoice',
    wildcard_ssl_status: 'Wildcard SSL Status',
    custom_domain_enabled: 'Custom Domain Enabled',
  }
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function SettingHint(key: string): string | null {
  const map: Record<string, string> = {
    enable_self_registration: 'Jika aktif, RS bisa mendaftar mandiri via halaman /daftar',
    auto_approve_trial: 'Auto-approve pendaftaran paket Trial tanpa review manual',
    maintenance_mode: 'Jika aktif, semua tenant akan melihat halaman maintenance',
    bank_name: 'Contoh: BCA, Mandiri, BNI, BRI',
    bank_account_number: 'Ditampilkan ke RS saat checkout pembayaran',
    bank_account_name: 'Nama pemilik rekening yang terdaftar di bank',
    auto_suspend_days: 'Berapa hari setelah expired sebelum tenant di-suspend otomatis',
    grace_period_days: 'Grace period antara expired dan auto-suspend',
    smtp_host: 'Contoh: smtp.gmail.com, smtp.mailtrap.io',
    smtp_port: 'Biasanya 587 (TLS) atau 465 (SSL)',
    smtp_password_enc: 'Untuk Gmail, gunakan App Password (bukan password akun)',
    allowed_ips_superadmin: 'Pisahkan dengan koma. Kosongkan untuk mengizinkan semua IP',
    satusehat_mode: 'sandbox atau production',
    bpjs_mode: 'sandbox atau production',
    payment_gateway_provider: 'Contoh: midtrans, xendit, doku',
    invoice_prefix: 'Contoh: INV- akan menghasilkan INV-20261001-001',
  }
  return map[key] || null
}

export default function SASettingsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('general')
  const { data: settings, isLoading } = usePlatformSettings()
  const updateMut = useUpdateSettings()

  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [checkingExpiry, setCheckingExpiry] = useState(false)

  if (user?.saRole !== 'owner') {
    router.replace('/sa')
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <Settings className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm text-muted-foreground">Hanya owner yang dapat mengakses halaman ini</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (settings) {
      const vals: Record<string, string> = {}
      for (const s of settings) {
        vals[s.key] = s.value || ''
      }
      setEditValues(vals)
      setDirty(false)
    }
  }, [settings])

  const filteredSettings = settings?.filter((s) => s.category === activeCategory) || []

  const handleChange = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = () => {
    if (!settings) return
    const updates = settings
      .filter((s) => s.category === activeCategory && editValues[s.key] !== (s.value || ''))
      .map((s) => ({ key: s.key, value: editValues[s.key] || '' }))

    if (updates.length === 0) {
      toast.info('Tidak ada perubahan')
      return
    }

    updateMut.mutate(updates, {
      onSuccess: () => {
        toast.success('Pengaturan berhasil disimpan')
        setDirty(false)
      },
      onError: (err) => toast.error(err.message),
    })
  }

  const handleSendTestEmail = async () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      toast.error('Masukkan email yang valid')
      return
    }
    setSendingTest(true)
    try {
      const res = await apiClient.post('/super-admin/test-email', { to: testEmail })
      toast.success(res.message || 'Email test berhasil dikirim!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim email test')
    } finally {
      setSendingTest(false)
    }
  }

  const handleCheckExpiry = async () => {
    setCheckingExpiry(true)
    try {
      const res = await apiClient.post('/super-admin/check-expiring')
      const d = res.data
      const parts = [`${d.notified} notifikasi dikirim`]
      if (d.suspended > 0) parts.push(`${d.suspended} tenant di-suspend`)
      if (d.errors > 0) parts.push(`${d.errors} error`)
      toast.success(`Selesai: ${parts.join(', ')}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menjalankan pengecekan')
    } finally {
      setCheckingExpiry(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Pengaturan Platform
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Konfigurasi global platform SIMRS
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Category sidebar */}
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const count = settings?.filter((s) => s.category === cat.id).length || 0
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setDirty(false) }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-left transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-sm'
                    : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`p-1.5 rounded-md ${
                  activeCategory === cat.id
                    ? 'bg-indigo-100 dark:bg-indigo-900/40'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  <Icon className="h-4 w-4 shrink-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{cat.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{cat.description}</p>
                </div>
                {count > 0 && (
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Settings form */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {(() => {
                      const cat = CATEGORIES.find((c) => c.id === activeCategory)
                      const Icon = cat?.icon || Settings
                      return <Icon className="h-4 w-4 text-indigo-600" />
                    })()}
                    {CATEGORIES.find((c) => c.id === activeCategory)?.label}
                  </CardTitle>
                  <CardDescription>
                    {CATEGORIES.find((c) => c.id === activeCategory)?.description}
                  </CardDescription>
                </div>
                {dirty && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMut.isPending}
                    className="gap-1.5"
                  >
                    {updateMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Simpan Perubahan
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto" />
                </div>
              ) : filteredSettings.length === 0 ? (
                <div className="text-center py-10">
                  <Info className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Belum ada setting untuk kategori ini.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Jalankan migrasi terbaru untuk menambahkan settings.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredSettings.map((setting) => {
                    const hint = SettingHint(setting.key)
                    return (
                      <div key={setting.key} className="space-y-1.5">
                        <label className="text-sm font-medium flex items-center gap-2">
                          {SettingLabel(setting.key)}
                          {SENSITIVE_KEYS.includes(setting.key) && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                              sensitif
                            </span>
                          )}
                        </label>
                        {hint && (
                          <p className="text-xs text-muted-foreground">{hint}</p>
                        )}
                        {BOOLEAN_KEYS.includes(setting.key) ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={editValues[setting.key] === 'true' ? 'default' : 'outline'}
                              onClick={() => handleChange(setting.key, 'true')}
                              className="text-xs gap-1"
                            >
                              <CheckCircle className="h-3 w-3" /> Aktif
                            </Button>
                            <Button
                              size="sm"
                              variant={editValues[setting.key] !== 'true' ? 'default' : 'outline'}
                              onClick={() => handleChange(setting.key, 'false')}
                              className="text-xs"
                            >
                              Nonaktif
                            </Button>
                          </div>
                        ) : (
                          <Input
                            type={SENSITIVE_KEYS.includes(setting.key) ? 'password' : 'text'}
                            value={editValues[setting.key] || ''}
                            onChange={(e) => handleChange(setting.key, e.target.value)}
                            placeholder={setting.description || SettingLabel(setting.key)}
                            className="max-w-lg"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Test Card */}
          {activeCategory === 'email' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-indigo-600" />
                  Test Email SMTP
                </CardTitle>
                <CardDescription>
                  Kirim email percobaan untuk memastikan konfigurasi SMTP benar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 max-w-md">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendTestEmail()}
                  />
                  <Button
                    onClick={handleSendTestEmail}
                    disabled={sendingTest}
                    size="sm"
                    className="whitespace-nowrap gap-1.5"
                  >
                    {sendingTest ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Kirim Test
                  </Button>
                </div>
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg max-w-md">
                  <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Pastikan SMTP sudah disimpan. Untuk Gmail gunakan App Password (bukan password akun biasa).
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing helper cards */}
          {activeCategory === 'billing' && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    Info Rekening Bank
                  </CardTitle>
                  <CardDescription>
                    Data rekening ini ditampilkan ke RS pada halaman pembayaran saat checkout
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg max-w-md">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank</span>
                        <span className="font-medium">{editValues['bank_name'] || '(belum diisi)'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">No. Rek</span>
                        <span className="font-mono font-medium">{editValues['bank_account_number'] || '(belum diisi)'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Atas Nama</span>
                        <span className="font-medium">{editValues['bank_account_name'] || '(belum diisi)'}</span>
                      </div>
                    </div>
                    {(!editValues['bank_name'] || !editValues['bank_account_number']) && (
                      <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Isi data rekening agar RS bisa melakukan pembayaran
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-indigo-600" />
                    Cek Langganan Kadaluarsa
                  </CardTitle>
                  <CardDescription>
                    Kirim notifikasi ke RS yang langganannya akan berakhir (14, 7, 3, 1 hari).
                    Otomatis berjalan setiap hari pukul 08:00 WIB.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleCheckExpiry}
                    disabled={checkingExpiry}
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                  >
                    {checkingExpiry ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Jalankan Sekarang
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Integrations helper */}
          {activeCategory === 'integrations' && filteredSettings.length === 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plug className="h-4 w-4 text-indigo-600" />
                  Integrasi Tersedia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { name: 'SATUSEHAT', desc: 'FHIR R4 interop Kemenkes', status: 'Dikonfigurasi per-tenant' },
                    { name: 'BPJS Kesehatan', desc: 'VClaim, PCare, e-Klaim, Antrol', status: 'Dikonfigurasi per-tenant' },
                    { name: 'WhatsApp Gateway', desc: 'Notifikasi via WhatsApp', status: 'Segera hadir' },
                    { name: 'Payment Gateway', desc: 'Midtrans, Xendit, dll', status: 'Segera hadir' },
                  ].map((item) => (
                    <div key={item.name} className="p-3 border rounded-lg">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                      <p className="text-[10px] text-indigo-600 mt-1">{item.status}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
