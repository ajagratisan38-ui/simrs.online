'use client'

import { useState } from 'react'
import {
  useSiranapConfig,
  useUpdateSiranapConfig,
  useTestSiranapConnection,
  useSiranapBedData,
  useSendSiranap,
  useSiranapStats,
  useSiranapSubmissions,
} from '@/hooks/use-siranap'

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ==================== CONFIG TAB ====================

function ConfigTab() {
  const { data: config, isLoading } = useSiranapConfig()
  const updateConfig = useUpdateSiranapConfig()
  const testConnection = useTestSiranapConnection()

  const [form, setForm] = useState({
    kode_rs: '',
    password: '',
    endpoint: '',
    auto_send: false,
    send_times: ['06:00', '18:00'],
    send_on_change: false,
  })
  const [initialized, setInitialized] = useState(false)

  if (config && !initialized) {
    setForm({
      kode_rs: config.kode_rs || '',
      password: config.password || '',
      endpoint: config.endpoint || '',
      auto_send: config.auto_send ?? false,
      send_times: config.send_times?.length ? config.send_times : ['06:00', '18:00'],
      send_on_change: config.send_on_change ?? false,
    })
    setInitialized(true)
  }

  const handleSave = () => {
    updateConfig.mutate(form)
  }

  const handleTest = () => {
    testConnection.mutate()
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-3">{[1, 2, 3].map((i) => (
      <div key={i} className="h-10 bg-muted rounded" />
    ))}</div>
  }

  return (
    <div className="space-y-6">
      {/* Credentials */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold">Kredensial SIRANAP</h3>
        <p className="text-xs text-muted-foreground">
          Dapatkan Kode RS dan Password dari akun SIRS Online Kemenkes RI
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium">Kode RS</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              placeholder="Contoh: 3374099"
              value={form.kode_rs}
              onChange={(e) => setForm({ ...form, kode_rs: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Password</label>
            <input
              type="password"
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              placeholder="Password SIRS Online"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium">Endpoint URL</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm text-muted-foreground"
            placeholder="https://sirs.yankes.kemkes.go.id/sirsservice/ranap"
            value={form.endpoint}
            onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Biarkan kosong untuk menggunakan endpoint default Kemenkes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={!form.kode_rs || !form.password || testConnection.isPending}
            className="px-3 py-1.5 text-xs border rounded-md hover:bg-muted disabled:opacity-50"
          >
            {testConnection.isPending ? 'Testing...' : '🔌 Test Koneksi'}
          </button>
          {testConnection.data && (
            <span className={`text-xs ${testConnection.data.data.success ? 'text-green-600' : 'text-red-600'}`}>
              {testConnection.data.data.message}
            </span>
          )}
        </div>
      </div>

      {/* Auto-send Schedule */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold">Jadwal Pengiriman Otomatis</h3>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.auto_send}
            onChange={(e) => setForm({ ...form, auto_send: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Aktifkan pengiriman otomatis</span>
        </label>

        {form.auto_send && (
          <>
            <div>
              <label className="text-xs font-medium">Jam Pengiriman</label>
              <div className="flex gap-2 mt-1">
                {form.send_times.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...form.send_times]
                        newTimes[idx] = e.target.value
                        setForm({ ...form, send_times: newTimes })
                      }}
                      className="px-2 py-1 border rounded text-sm"
                    />
                    {form.send_times.length > 1 && (
                      <button
                        onClick={() => {
                          const newTimes = form.send_times.filter((_, i) => i !== idx)
                          setForm({ ...form, send_times: newTimes })
                        }}
                        className="text-red-500 text-xs hover:underline"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {form.send_times.length < 4 && (
                  <button
                    onClick={() => setForm({
                      ...form,
                      send_times: [...form.send_times, '12:00'],
                    })}
                    className="text-xs text-primary hover:underline"
                  >
                    + Tambah Jam
                  </button>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.send_on_change}
                onChange={(e) => setForm({ ...form, send_on_change: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Kirim juga saat ada perubahan bed (real-time)</span>
            </label>
          </>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateConfig.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {updateConfig.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </button>
      </div>

      {updateConfig.isSuccess && (
        <p className="text-xs text-green-600">✅ Konfigurasi tersimpan</p>
      )}
    </div>
  )
}

// ==================== BED DATA TAB ====================

function BedDataTab() {
  const { data, isLoading } = useSiranapBedData()
  const sendNow = useSendSiranap()

  if (isLoading) {
    return <div className="animate-pulse space-y-3">{[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-12 bg-muted rounded" />
    ))}</div>
  }

  const rooms = data?.rooms ?? []
  const summary = data?.summary

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{summary.total_ruang}</p>
            <p className="text-xs text-muted-foreground">Ruangan</p>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{summary.total_tt}</p>
            <p className="text-xs text-muted-foreground">Total TT</p>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.total_terpakai}</p>
            <p className="text-xs text-muted-foreground">Terpakai</p>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.total_kosong}</p>
            <p className="text-xs text-muted-foreground">Kosong</p>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.bor}%</p>
            <p className="text-xs text-muted-foreground">BOR</p>
          </div>
        </div>
      )}

      {/* Bed Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium">Ruangan</th>
              <th className="text-center px-2 py-2 text-xs font-medium">Kelas</th>
              <th className="text-center px-2 py-2 text-xs font-medium">Total TT</th>
              <th className="text-center px-2 py-2 text-xs font-medium">♂ Terpakai</th>
              <th className="text-center px-2 py-2 text-xs font-medium">♀ Terpakai</th>
              <th className="text-center px-2 py-2 text-xs font-medium">♂ Kosong</th>
              <th className="text-center px-2 py-2 text-xs font-medium">♀ Kosong</th>
              <th className="text-center px-2 py-2 text-xs font-medium">Waiting</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const occupancy = room.total_tt > 0
                ? Math.round(((room.terpakai_pria + room.terpakai_wanita) / room.total_tt) * 100)
                : 0
              return (
                <tr key={room.kode_ruang} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <span className="font-medium">{room.nama_ruang}</span>
                    <span className="text-xs text-muted-foreground ml-1">({room.kode_ruang})</span>
                  </td>
                  <td className="text-center px-2 py-2">
                    {room.kelas ? `Kelas ${room.kelas}` : '-'}
                  </td>
                  <td className="text-center px-2 py-2 font-medium">{room.total_tt}</td>
                  <td className="text-center px-2 py-2 text-red-600">{room.terpakai_pria}</td>
                  <td className="text-center px-2 py-2 text-red-600">{room.terpakai_wanita}</td>
                  <td className="text-center px-2 py-2 text-green-600">{room.kosong_pria}</td>
                  <td className="text-center px-2 py-2 text-green-600">{room.kosong_wanita}</td>
                  <td className="text-center px-2 py-2">{room.waiting}</td>
                </tr>
              )
            })}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  Belum ada ruang rawat inap aktif
                </td>
              </tr>
            )}
          </tbody>
          {summary && rooms.length > 0 && (
            <tfoot className="bg-muted/30 font-medium">
              <tr className="border-t-2">
                <td className="px-3 py-2">TOTAL</td>
                <td className="text-center px-2 py-2">-</td>
                <td className="text-center px-2 py-2">{summary.total_tt}</td>
                <td className="text-center px-2 py-2 text-red-600" colSpan={2}>
                  {summary.total_terpakai}
                </td>
                <td className="text-center px-2 py-2 text-green-600" colSpan={2}>
                  {summary.total_kosong}
                </td>
                <td className="text-center px-2 py-2">-</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Send Button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Data di atas akan dikirim ke SIRANAP Kemenkes dalam format XML
        </p>
        <button
          onClick={() => sendNow.mutate()}
          disabled={sendNow.isPending || rooms.length === 0}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {sendNow.isPending ? 'Mengirim...' : '📤 Kirim Sekarang'}
        </button>
      </div>

      {sendNow.isSuccess && (
        <div className={`p-3 rounded-lg text-sm ${
          sendNow.data.data.status === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {sendNow.data.data.status === 'success'
            ? `✅ Berhasil mengirim ${sendNow.data.data.rooms_sent} ruangan (${sendNow.data.data.duration_ms}ms)`
            : `❌ Gagal: ${sendNow.data.data.error_message}`
          }
        </div>
      )}

      {sendNow.isError && (
        <div className="p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
          ❌ {(sendNow.error as Error).message}
        </div>
      )}
    </div>
  )
}

// ==================== LOG TAB ====================

function LogTab() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [days, setDays] = useState(7)
  const { data, isLoading } = useSiranapSubmissions(50, 0, statusFilter, days)
  const stats = useSiranapStats()

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border rounded-lg p-3">
            <p className="text-xl font-bold">{stats.data.total}</p>
            <p className="text-xs text-muted-foreground">Total Pengiriman</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xl font-bold text-green-600">{stats.data.success}</p>
            <p className="text-xs text-muted-foreground">Berhasil</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xl font-bold text-red-600">{stats.data.failed}</p>
            <p className="text-xs text-muted-foreground">Gagal</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-xl font-bold text-blue-600">{stats.data.successRate}%</p>
            <p className="text-xs text-muted-foreground">Tingkat Keberhasilan</p>
          </div>
        </div>
      )}

      {stats.data?.lastSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
          ✅ Terakhir berhasil: {formatDate(stats.data.lastSuccess)}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select
          value={statusFilter ?? 'all'}
          onChange={(e) => setStatusFilter(e.target.value === 'all' ? undefined : e.target.value)}
          className="px-3 py-1.5 border rounded-md text-sm"
        >
          <option value="all">Semua Status</option>
          <option value="success">Berhasil</option>
          <option value="failed">Gagal</option>
        </select>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-1.5 border rounded-md text-sm"
        >
          <option value={7}>7 hari terakhir</option>
          <option value={14}>14 hari terakhir</option>
          <option value={30}>30 hari terakhir</option>
          <option value={90}>90 hari terakhir</option>
        </select>
      </div>

      {/* Submission List */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">{[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-muted rounded" />
        ))}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium">Waktu</th>
                <th className="text-center px-2 py-2 text-xs font-medium">Status</th>
                <th className="text-center px-2 py-2 text-xs font-medium">Ruangan</th>
                <th className="text-center px-2 py-2 text-xs font-medium">Durasi</th>
                <th className="text-left px-2 py-2 text-xs font-medium">Trigger</th>
                <th className="text-left px-2 py-2 text-xs font-medium">Pesan</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((sub) => (
                <tr key={sub.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 text-xs">{formatDate(sub.created_at)}</td>
                  <td className="text-center px-2 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      sub.status === 'success'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sub.status === 'success' ? '✅ Berhasil' : '❌ Gagal'}
                    </span>
                  </td>
                  <td className="text-center px-2 py-2">{sub.rooms_sent}</td>
                  <td className="text-center px-2 py-2 text-xs">
                    {sub.duration_ms ? `${sub.duration_ms}ms` : '-'}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      sub.triggered_by === 'scheduler'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {sub.triggered_by === 'scheduler' ? '⏰ Auto' : '👤 Manual'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                    {sub.error_message || sub.response_message || '-'}
                  </td>
                </tr>
              ))}
              {(data?.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Belum ada riwayat pengiriman
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Menampilkan {data.data.length} dari {data.total} pengiriman
        </p>
      )}
    </div>
  )
}

// ==================== MAIN PAGE ====================

export default function SiranapPage() {
  const [tab, setTab] = useState<'config' | 'bed-data' | 'log'>('bed-data')

  const tabs = [
    { id: 'bed-data' as const, label: '🛏️ Ketersediaan TT' },
    { id: 'config' as const, label: '⚙️ Konfigurasi' },
    { id: 'log' as const, label: '📜 Riwayat Pengiriman' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">SIRANAP</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sistem Informasi Rawat Inap — Pelaporan ketersediaan tempat tidur ke Kemenkes RI
        </p>
      </div>

      {/* Info Banner */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>SIRANAP</strong> adalah sistem pelaporan ketersediaan tempat tidur rumah sakit
          ke Kemenkes RI. Data dikirim secara otomatis minimal 2x sehari (pagi & sore)
          agar masyarakat dapat melihat ketersediaan bed secara online di{' '}
          <a
            href="https://yankes.kemkes.go.id/app/siranap/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            yankes.kemkes.go.id/app/siranap
          </a>
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'config' && <ConfigTab />}
      {tab === 'bed-data' && <BedDataTab />}
      {tab === 'log' && <LogTab />}
    </div>
  )
}
