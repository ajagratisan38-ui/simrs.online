'use client'

import { useState } from 'react'
import { useTteConfig, useUpdateTteConfig, useTteStats } from '@/hooks/use-tte'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  PenLine,
  ShieldCheck,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Users,
  BarChart3,
  ExternalLink,
  Lock,
  Server,
} from 'lucide-react'

const PROVIDERS = [
  {
    id: 'internal',
    name: 'Internal',
    description: 'TTE dasar menggunakan hash SHA-512 internal tanpa sertifikat PSrE',
    icon: Lock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    borderColor: 'border-gray-200 dark:border-gray-700',
  },
  {
    id: 'bsre',
    name: 'BSrE (BSSN)',
    description: 'Balai Sertifikasi Elektronik — PSrE pemerintah, gratis untuk instansi',
    icon: ShieldCheck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    id: 'vida',
    name: 'VIDA',
    description: 'PSrE swasta tersertifikasi Komdigi — integrasi API modern',
    icon: ShieldCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  {
    id: 'privy',
    name: 'Privy',
    description: 'PSrE swasta tersertifikasi — identitas digital & e-meterai',
    icon: ShieldCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
]

const LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: 'Basic', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  advanced: { label: 'Advanced', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  qualified: { label: 'Qualified', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
}

export default function TteConfigPage() {
  const { data: configData, isLoading: configLoading } = useTteConfig()
  const { data: statsData, isLoading: statsLoading } = useTteStats()
  const updateConfig = useUpdateTteConfig()

  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})

  const config = configData?.data
  const stats = statsData?.data

  const handleConfigureProvider = (providerId: string) => {
    setSelectedProvider(providerId)
    setFormData({})
    setConfigDialogOpen(true)
  }

  const handleSaveConfig = () => {
    if (!selectedProvider) return

    const payload: Record<string, string> = { provider: selectedProvider }

    if (selectedProvider === 'bsre') {
      if (formData.url) payload.bsre_url = formData.url
      if (formData.username) payload.bsre_username = formData.username
      if (formData.password) payload.bsre_password = formData.password
    } else if (selectedProvider === 'vida') {
      if (formData.url) payload.vida_url = formData.url
      if (formData.api_key) payload.vida_api_key = formData.api_key
      if (formData.api_secret) payload.vida_api_secret = formData.api_secret
    } else if (selectedProvider === 'privy') {
      if (formData.url) payload.privy_url = formData.url
      if (formData.merchant_key) payload.privy_merchant_key = formData.merchant_key
      if (formData.merchant_token) payload.privy_merchant_token = formData.merchant_token
    }

    updateConfig.mutate(payload, {
      onSuccess: () => setConfigDialogOpen(false),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenLine className="h-6 w-6 text-blue-600" />
            TTE — Tanda Tangan Elektronik
          </h1>
          <p className="text-muted-foreground mt-1">
            Konfigurasi dan monitoring tanda tangan elektronik tersertifikasi
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{stats?.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Total TTE</p>
                  </div>
                  <PenLine className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">
                      {stats?.byType?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tipe Dokumen
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">
                      {stats?.bySigner?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Penandatangan
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">
                      {stats?.byLevel?.find((l) => l.level === 'qualified')?.count || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tersertifikasi
                    </p>
                  </div>
                  <ShieldCheck className="h-8 w-8 text-emerald-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Provider Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Provider TTE
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROVIDERS.map((provider) => {
            const isActive = config?.provider === provider.id
            const providerConfig = config
              ? provider.id === 'bsre'
                ? config.bsre
                : provider.id === 'vida'
                  ? config.vida
                  : provider.id === 'privy'
                    ? config.privy
                    : null
              : null

            const Icon = provider.icon

            return (
              <Card
                key={provider.id}
                className={`relative transition-all ${
                  isActive
                    ? `ring-2 ring-blue-500 ${provider.bgColor}`
                    : 'hover:shadow-md'
                }`}
              >
                {isActive && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-blue-600">Aktif</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className={`h-5 w-5 ${provider.color}`} />
                    {provider.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {provider.description}
                  </p>

                  {providerConfig && provider.id !== 'internal' && (
                    <div className="flex items-center gap-2 text-xs">
                      {providerConfig.hasCredentials ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-green-700 dark:text-green-400">
                            Kredensial terkonfigurasi
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-amber-600" />
                          <span className="text-amber-700 dark:text-amber-400">
                            Belum dikonfigurasi
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  <Button
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleConfigureProvider(provider.id)}
                  >
                    <Settings className="h-4 w-4 mr-1.5" />
                    {isActive ? 'Konfigurasi' : 'Aktifkan & Konfigurasi'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Statistics breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Document Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              TTE per Tipe Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : stats?.byType && stats.byType.length > 0 ? (
              <div className="space-y-2">
                {stats.byType.map((item) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <span className="text-sm">{item.label}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada data TTE
              </p>
            )}
          </CardContent>
        </Card>

        {/* By Signer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top Penandatangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : stats?.bySigner && stats.bySigner.length > 0 ? (
              <div className="space-y-2">
                {stats.bySigner.map((item, i) => (
                  <div
                    key={`${item.name}-${i}`}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div>
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-2 capitalize">
                        {item.role}
                      </span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada data penandatangan
              </p>
            )}
          </CardContent>
        </Card>

        {/* By Level */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Distribusi Level TTE
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : stats?.byLevel && stats.byLevel.length > 0 ? (
              <div className="flex gap-4 flex-wrap">
                {stats.byLevel.map((item) => {
                  const levelInfo = LEVEL_LABELS[item.level] || {
                    label: item.level,
                    color: 'bg-gray-100 text-gray-800',
                  }
                  const percentage = stats.total > 0
                    ? Math.round((item.count / stats.total) * 100)
                    : 0

                  return (
                    <div
                      key={item.level}
                      className={`flex-1 min-w-[140px] rounded-lg p-4 ${levelInfo.color}`}
                    >
                      <p className="text-2xl font-bold">{item.count}</p>
                      <p className="text-sm font-medium">{levelInfo.label}</p>
                      <p className="text-xs opacity-75">{percentage}% dari total</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada data distribusi level
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                Tentang TTE di SIMRS
              </p>
              <ul className="mt-2 space-y-1 text-blue-800 dark:text-blue-300">
                <li>
                  TTE berfungsi sebagai pengganti tanda tangan basah pada dokumen digital rumah sakit
                </li>
                <li>
                  Setiap tanda tangan menghasilkan hash SHA-512 yang menjamin integritas dokumen
                </li>
                <li>
                  Provider PSrE (BSrE/VIDA/Privy) memberikan sertifikat yang diakui secara hukum
                  sesuai UU ITE dan PP 71/2019
                </li>
                <li>
                  Jika dokumen diubah setelah penandatanganan, verifikasi akan mendeteksi perubahan
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Konfigurasi{' '}
              {PROVIDERS.find((p) => p.id === selectedProvider)?.name || ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedProvider === 'internal' && (
              <div className="text-sm text-muted-foreground rounded-lg bg-muted p-3">
                Mode internal menggunakan hash SHA-512 tanpa sertifikat PSrE
                eksternal. Cocok untuk penggunaan internal RS yang belum
                mengintegrasikan dengan PSrE.
              </div>
            )}

            {selectedProvider === 'bsre' && (
              <>
                <div>
                  <Label htmlFor="bsre-url">URL BSrE API</Label>
                  <Input
                    id="bsre-url"
                    placeholder="https://esign.bsre.bssn.go.id/api/v2"
                    value={formData.url || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bsre-username">Username</Label>
                  <Input
                    id="bsre-username"
                    placeholder="username BSrE"
                    value={formData.username || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bsre-password">Password / Passphrase</Label>
                  <Input
                    id="bsre-password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {selectedProvider === 'vida' && (
              <>
                <div>
                  <Label htmlFor="vida-url">URL VIDA API</Label>
                  <Input
                    id="vida-url"
                    placeholder="https://api.vida.id/v1"
                    value={formData.url || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="vida-key">API Key</Label>
                  <Input
                    id="vida-key"
                    placeholder="VIDA API Key"
                    value={formData.api_key || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, api_key: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="vida-secret">API Secret</Label>
                  <Input
                    id="vida-secret"
                    type="password"
                    placeholder="••••••••"
                    value={formData.api_secret || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, api_secret: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {selectedProvider === 'privy' && (
              <>
                <div>
                  <Label htmlFor="privy-url">URL Privy API</Label>
                  <Input
                    id="privy-url"
                    placeholder="https://api.privy.id/v1"
                    value={formData.url || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="privy-key">Merchant Key</Label>
                  <Input
                    id="privy-key"
                    placeholder="Privy Merchant Key"
                    value={formData.merchant_key || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        merchant_key: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="privy-token">Merchant Token</Label>
                  <Input
                    id="privy-token"
                    type="password"
                    placeholder="••••••••"
                    value={formData.merchant_token || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        merchant_token: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfigDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={updateConfig.isPending}
            >
              {updateConfig.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan & Aktifkan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
