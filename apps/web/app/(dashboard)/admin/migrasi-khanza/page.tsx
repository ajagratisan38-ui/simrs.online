'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Database,
  Plug,
  Search,
  Play,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  TableProperties,
  RefreshCw,
} from 'lucide-react'
import {
  useTestConnection,
  useAnalyzeKhanza,
  useStartMigration,
  useMigrationProgress,
  useVerifyMigration,
} from '@/hooks/use-migration'
import type {
  KhanzaConnectionConfig,
  AnalyzeResult,
  VerificationResult,
} from '@/lib/api/migration'
import { toast } from 'sonner'

type Step = 'connect' | 'analyze' | 'migrate' | 'verify'

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'connect', label: 'Koneksi', icon: <Plug className="h-4 w-4" /> },
  { key: 'analyze', label: 'Analisis', icon: <Search className="h-4 w-4" /> },
  { key: 'migrate', label: 'Migrasi', icon: <Play className="h-4 w-4" /> },
  { key: 'verify', label: 'Verifikasi', icon: <CheckCircle className="h-4 w-4" /> },
]

export default function MigrasiKhanzaPage() {
  const [step, setStep] = useState<Step>('connect')
  const [config, setConfig] = useState<KhanzaConnectionConfig>({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'sik',
  })
  const [connected, setConnected] = useState(false)
  const [connectionInfo, setConnectionInfo] = useState<{
    version?: string
    tableCount?: number
  } | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [verifyResults, setVerifyResults] = useState<VerificationResult[] | null>(null)

  const testConn = useTestConnection()
  const analyze = useAnalyzeKhanza()
  const startMig = useStartMigration()
  const { data: progress } = useMigrationProgress(sessionId)
  const verify = useVerifyMigration()

  const handleTestConnection = useCallback(async () => {
    try {
      const result = await testConn.mutateAsync(config)
      if (result.connected) {
        setConnected(true)
        setConnectionInfo({
          version: result.version,
          tableCount: result.tableCount,
        })
        toast.success('Koneksi berhasil!')
      } else {
        setConnected(false)
        toast.error(`Koneksi gagal: ${result.error}`)
      }
    } catch {
      toast.error('Gagal menguji koneksi')
    }
  }, [config, testConn])

  const handleAnalyze = useCallback(async () => {
    try {
      const result = await analyze.mutateAsync(config)
      setAnalyzeResult(result)
      toast.success(`Analisis selesai: ${result.summary.totalRows.toLocaleString()} baris ditemukan`)
    } catch {
      toast.error('Gagal menganalisis database Khanza')
    }
  }, [config, analyze])

  const handleStartMigration = useCallback(
    async (dryRun: boolean) => {
      try {
        const result = await startMig.mutateAsync({ config, dryRun })
        setSessionId(result.sessionId)
        toast.info(result.message)
      } catch {
        toast.error('Gagal memulai migrasi')
      }
    },
    [config, startMig],
  )

  const handleVerify = useCallback(async () => {
    try {
      const results = await verify.mutateAsync(config)
      setVerifyResults(results)
    } catch {
      toast.error('Gagal memverifikasi migrasi')
    }
  }, [config, verify])

  const currentStepIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-orange-600" />
          Migrasi dari SIMRS Khanza
        </h1>
        <p className="text-muted-foreground">
          Import data langsung dari database MySQL Khanza ke SIMRS
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (idx <= currentStepIndex || (idx === 1 && connected)) {
                  setStep(s.key)
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                step === s.key
                  ? 'bg-primary text-primary-foreground'
                  : idx < currentStepIndex
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
            {idx < STEPS.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Connection */}
      {step === 'connect' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Koneksi Database Khanza
            </CardTitle>
            <CardDescription>
              Masukkan detail koneksi MySQL database Khanza (sik)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Host</label>
                <Input
                  value={config.host}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, host: e.target.value }))
                  }
                  placeholder="localhost atau IP server"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Port</label>
                <Input
                  type="number"
                  value={config.port}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, port: Number(e.target.value) }))
                  }
                  placeholder="3306"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Username</label>
                <Input
                  value={config.user}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, user: e.target.value }))
                  }
                  placeholder="root"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <Input
                  type="password"
                  value={config.password}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, password: e.target.value }))
                  }
                  placeholder="Password database"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Database</label>
                <Input
                  value={config.database}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, database: e.target.value }))
                  }
                  placeholder="sik"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleTestConnection}
                disabled={testConn.isPending}
              >
                {testConn.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4 mr-2" />
                )}
                Test Koneksi
              </Button>

              {connected && connectionInfo && (
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Terhubung
                  </Badge>
                  <span className="text-muted-foreground">
                    MySQL {connectionInfo.version} • {connectionInfo.tableCount} tabel
                  </span>
                </div>
              )}
            </div>

            {connected && (
              <div className="pt-4 border-t">
                <Button onClick={() => setStep('analyze')}>
                  Lanjut ke Analisis
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Analyze */}
      {step === 'analyze' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Analisis Database Khanza
            </CardTitle>
            <CardDescription>
              Scan tabel Khanza yang akan dimigrasikan beserta jumlah datanya
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleAnalyze}
              disabled={analyze.isPending}
            >
              {analyze.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {analyzeResult ? 'Scan Ulang' : 'Mulai Analisis'}
            </Button>

            {analyzeResult && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">{analyzeResult.summary.totalTables}</div>
                    <div className="text-sm text-muted-foreground">Total Tabel</div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {analyzeResult.summary.tablesFound}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-400">Ditemukan</div>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {analyzeResult.summary.tablesMissing}
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-400">Tidak Ada</div>
                  </div>
                  <div className="p-4 bg-teal-50 dark:bg-teal-950 rounded-lg text-center">
                    <div className="text-2xl font-bold text-teal-600">
                      {analyzeResult.summary.totalRows.toLocaleString()}
                    </div>
                    <div className="text-sm text-teal-700 dark:text-teal-400">Total Baris</div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left p-3 font-medium">Tabel Khanza</th>
                        <th className="text-right p-3 font-medium">Jumlah Data</th>
                        <th className="text-center p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyzeResult.tables.map((t) => (
                        <tr key={t.table} className="border-t">
                          <td className="p-3 font-mono text-xs">{t.table}</td>
                          <td className="p-3 text-right">
                            {t.exists ? t.rowCount.toLocaleString() : '-'}
                          </td>
                          <td className="p-3 text-center">
                            {t.exists ? (
                              t.rowCount > 0 ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Ada
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Kosong</Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Tidak Ada
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep('connect')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali
                  </Button>
                  <Button onClick={() => setStep('migrate')}>
                    Lanjut ke Migrasi
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Migrate */}
      {step === 'migrate' && (
        <div className="space-y-6">
          {!sessionId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Jalankan Migrasi
                </CardTitle>
                <CardDescription>
                  Pilih mode migrasi. Disarankan untuk melakukan Dry Run terlebih dahulu.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-2 border-dashed">
                    <CardContent className="p-6 text-center space-y-3">
                      <TestTube className="h-10 w-10 mx-auto text-teal-600" />
                      <h3 className="font-semibold text-lg">Dry Run (Simulasi)</h3>
                      <p className="text-sm text-muted-foreground">
                        Simulasikan proses migrasi tanpa menulis data apapun.
                        Gunakan untuk mengecek mapping dan potensi error.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleStartMigration(true)}
                        disabled={startMig.isPending}
                      >
                        {startMig.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 mr-2" />
                        )}
                        Jalankan Dry Run
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-orange-300 dark:border-orange-700">
                    <CardContent className="p-6 text-center space-y-3">
                      <Play className="h-10 w-10 mx-auto text-orange-600" />
                      <h3 className="font-semibold text-lg">Migrasi Aktual</h3>
                      <p className="text-sm text-muted-foreground">
                        Jalankan migrasi sungguhan. Data dari Khanza akan ditulis
                        ke database SIMRS.
                      </p>
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        onClick={() => handleStartMigration(false)}
                        disabled={startMig.isPending}
                      >
                        {startMig.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Jalankan Migrasi
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep('analyze')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {sessionId && progress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {progress.status === 'done' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : progress.status === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  )}
                  {progress.isDryRun ? 'Dry Run' : 'Migrasi'}{' '}
                  {progress.status === 'done'
                    ? 'Selesai'
                    : progress.status === 'error'
                      ? 'Error'
                      : 'Berjalan...'}
                </CardTitle>
                {progress.currentTable && progress.status !== 'done' && (
                  <CardDescription>
                    Sedang memproses: {progress.currentTable}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall progress bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress Keseluruhan</span>
                    <span className="font-medium">{progress.currentProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress.status === 'error'
                          ? 'bg-red-500'
                          : progress.status === 'done'
                            ? 'bg-green-500'
                            : 'bg-teal-500'
                      }`}
                      style={{ width: `${progress.currentProgress}%` }}
                    />
                  </div>
                </div>

                {progress.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                    <strong>Error:</strong> {progress.error}
                  </div>
                )}

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                    <div className="text-xl font-bold text-green-600">
                      {progress.tables.reduce((s, t) => s + t.inserted, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-400">
                      {progress.isDryRun ? 'Akan Diproses' : 'Berhasil'}
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
                    <div className="text-xl font-bold text-yellow-600">
                      {progress.tables.reduce((s, t) => s + t.skipped, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-400">Dilewati</div>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                    <div className="text-xl font-bold text-red-600">
                      {progress.tables.reduce((s, t) => s + t.errors, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-red-700 dark:text-red-400">Error</div>
                  </div>
                </div>

                {/* Table-by-table progress */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left p-2 font-medium">Tabel</th>
                        <th className="text-right p-2 font-medium">Sumber</th>
                        <th className="text-right p-2 font-medium">Proses</th>
                        <th className="text-right p-2 font-medium">Error</th>
                        <th className="text-center p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progress.tables.map((t) => (
                        <tr key={`${t.sourceTable}-${t.targetTable}`} className="border-t">
                          <td className="p-2">
                            <span className="font-mono text-xs">
                              {t.sourceTable} → {t.targetTable}
                            </span>
                          </td>
                          <td className="p-2 text-right">{t.sourceCount.toLocaleString()}</td>
                          <td className="p-2 text-right text-green-600">
                            {t.inserted.toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-red-600">
                            {t.errors > 0 ? t.errors.toLocaleString() : '-'}
                          </td>
                          <td className="p-2 text-center">
                            {t.status === 'done' ? (
                              <CheckCircle className="h-4 w-4 text-green-600 inline" />
                            ) : t.status === 'running' ? (
                              <Loader2 className="h-4 w-4 text-teal-600 animate-spin inline" />
                            ) : t.status === 'error' ? (
                              <XCircle className="h-4 w-4 text-red-600 inline" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {progress.status === 'done' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSessionId(null)
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Ulangi Migrasi
                    </Button>
                    <Button onClick={() => setStep('verify')}>
                      Lanjut Verifikasi
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 4: Verify */}
      {step === 'verify' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableProperties className="h-5 w-5" />
              Verifikasi Hasil Migrasi
            </CardTitle>
            <CardDescription>
              Bandingkan jumlah data antara database Khanza dan SIMRS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleVerify}
              disabled={verify.isPending}
            >
              {verify.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {verifyResults ? 'Verifikasi Ulang' : 'Jalankan Verifikasi'}
            </Button>

            {verifyResults && (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left p-3 font-medium">Tabel</th>
                        <th className="text-right p-3 font-medium">Khanza</th>
                        <th className="text-right p-3 font-medium">SIMRS</th>
                        <th className="text-center p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifyResults.map((v) => (
                        <tr key={v.table} className="border-t">
                          <td className="p-3 font-mono text-xs">{v.table}</td>
                          <td className="p-3 text-right">
                            {v.sourceCount >= 0 ? v.sourceCount.toLocaleString() : 'N/A'}
                          </td>
                          <td className="p-3 text-right">
                            {v.targetCount >= 0 ? v.targetCount.toLocaleString() : 'N/A'}
                          </td>
                          <td className="p-3 text-center">
                            {v.match ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                OK
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Cek
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                    Migrasi Selesai
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Data dari SIMRS Khanza telah berhasil dipindahkan ke SIMRS.
                    Pastikan untuk mengganti password default user yang diimpor.
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep('migrate')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
