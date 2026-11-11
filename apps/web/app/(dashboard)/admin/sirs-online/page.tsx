'use client'

import { useState } from 'react'
import {
  useSirsConfig,
  useUpdateSirsConfig,
  useTestSirsConnection,
  useGenerateRL,
  useIndikator,
  useSendSirsToKemenkes,
  useSirsSubmissions,
  useSirsSubmissionStats,
} from '@/hooks/use-sirs-online'
import type {
  RL13Data, RL32Data, RL35Row, RL38Row, RL39Row,
  RL312Row, RL41Row, RL51Row, RL33Row, Indikator,
} from '@/lib/api/sirs-online'

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const RL_ITEMS = [
  { key: 'rl13', label: 'RL 1.3', desc: 'Ketersediaan Tempat Tidur', needsPeriod: false },
  { key: 'rl32', label: 'RL 3.2', desc: 'Rawat Inap', needsPeriod: true },
  { key: 'rl33', label: 'RL 3.3', desc: 'Rawat Darurat (IGD)', needsPeriod: true },
  { key: 'rl34', label: 'RL 3.4', desc: 'Pengunjung', needsPeriod: true },
  { key: 'rl35', label: 'RL 3.5', desc: 'Kunjungan Rawat Jalan', needsPeriod: true },
  { key: 'rl38', label: 'RL 3.8', desc: 'Laboratorium', needsPeriod: true },
  { key: 'rl39', label: 'RL 3.9', desc: 'Radiologi', needsPeriod: true },
  { key: 'rl312', label: 'RL 3.12', desc: 'Pembedahan', needsPeriod: true },
  { key: 'rl41', label: 'RL 4.1', desc: 'Morbiditas Rawat Inap', needsPeriod: true },
  { key: 'rl51', label: 'RL 5.1', desc: 'Mortalitas', needsPeriod: true },
] as const

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// ==================== CONFIG TAB ====================

function ConfigTab() {
  const { data: config, isLoading } = useSirsConfig()
  const updateConfig = useUpdateSirsConfig()
  const testConn = useTestSirsConnection()
  const [form, setForm] = useState({
    kode_rs: '', username: '', password: '', endpoint: '',
    mode: 'sandbox' as 'sandbox' | 'production',
    auto_send_rl13: false, rl13_times: ['06:00', '18:00'],
  })
  const [init, setInit] = useState(false)

  if (config && !init) {
    setForm({
      kode_rs: config.kode_rs, username: config.username,
      password: config.password, endpoint: config.endpoint,
      mode: config.mode, auto_send_rl13: config.auto_send_rl13,
      rl13_times: config.rl13_times?.length ? config.rl13_times : ['06:00', '18:00'],
    })
    setInit(true)
  }

  if (isLoading) return <div className="animate-pulse space-y-3">{[1, 2, 3].map((i) => (
    <div key={i} className="h-10 bg-muted rounded" />
  ))}</div>

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold">Kredensial SIRS Online</h3>
        <p className="text-xs text-muted-foreground">
          Dapatkan akun dari sirs.kemkes.go.id — data dikirim ke sistem pelaporan RL Kemenkes
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium">Kode RS</label>
            <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              placeholder="3374099" value={form.kode_rs}
              onChange={(e) => setForm({ ...form, kode_rs: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium">Username</label>
            <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              placeholder="Username SIRS" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium">Password</label>
            <input type="password" className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              placeholder="Password SIRS" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium">Endpoint</label>
            <input type="text" className="w-full mt-1 px-3 py-2 border rounded-md text-sm text-muted-foreground"
              placeholder="https://sirs.kemkes.go.id/api" value={form.endpoint}
              onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium">Mode</label>
            <div className="flex gap-4 mt-2">
              {(['sandbox', 'production'] as const).map((m) => (
                <label key={m} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="mode" checked={form.mode === m}
                    onChange={() => setForm({ ...form, mode: m })} />
                  <span className="capitalize">{m}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => testConn.mutate()}
            disabled={!form.kode_rs || !form.password || testConn.isPending}
            className="px-3 py-1.5 text-xs border rounded-md hover:bg-muted disabled:opacity-50">
            {testConn.isPending ? 'Testing...' : '🔌 Test Koneksi'}
          </button>
          {testConn.data && (
            <span className={`text-xs ${testConn.data.data.success ? 'text-green-600' : 'text-red-600'}`}>
              {testConn.data.data.message}
            </span>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold">Auto-Kirim RL 1.3 (Tempat Tidur)</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.auto_send_rl13}
            onChange={(e) => setForm({ ...form, auto_send_rl13: e.target.checked })}
            className="rounded" />
          <span className="text-sm">Kirim RL 1.3 otomatis setiap hari</span>
        </label>
        {form.auto_send_rl13 && (
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">Jam:</span>
            {form.rl13_times.map((time, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <input type="time" value={time}
                  onChange={(e) => {
                    const t = [...form.rl13_times]
                    t[idx] = e.target.value
                    setForm({ ...form, rl13_times: t })
                  }}
                  className="px-2 py-1 border rounded text-sm" />
                {form.rl13_times.length > 1 && (
                  <button onClick={() => setForm({
                    ...form, rl13_times: form.rl13_times.filter((_, i) => i !== idx),
                  })} className="text-red-500 text-xs">✕</button>
                )}
              </div>
            ))}
            {form.rl13_times.length < 4 && (
              <button onClick={() => setForm({
                ...form, rl13_times: [...form.rl13_times, '12:00'],
              })} className="text-xs text-primary hover:underline">+ Tambah</button>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {updateConfig.isSuccess && <span className="text-xs text-green-600 self-center">✅ Tersimpan</span>}
        <button onClick={() => updateConfig.mutate(form)}
          disabled={updateConfig.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {updateConfig.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </button>
      </div>
    </div>
  )
}

// ==================== INDIKATOR CARD ====================

function IndikatorCard({ indikator }: { indikator: Indikator }) {
  const items = [
    { label: 'BOR', value: `${indikator.bor}%`, desc: 'Bed Occupancy Rate', ideal: '60-85%' },
    { label: 'LOS', value: `${indikator.los} hari`, desc: 'Length of Stay', ideal: '6-9 hari' },
    { label: 'TOI', value: `${indikator.toi} hari`, desc: 'Turn Over Interval', ideal: '1-3 hari' },
    { label: 'BTO', value: `${indikator.bto}x`, desc: 'Bed Turn Over', ideal: '40-50x/thn' },
    { label: 'GDR', value: `${indikator.gdr}‰`, desc: 'Gross Death Rate', ideal: '≤45‰' },
    { label: 'NDR', value: `${indikator.ndr}‰`, desc: 'Net Death Rate', ideal: '≤25‰' },
  ]

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {items.map((item) => (
        <div key={item.label} className="border rounded-lg p-2.5 text-center">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="text-lg font-bold">{item.value}</p>
          <p className="text-[10px] text-muted-foreground">{item.desc}</p>
          <p className="text-[10px] text-blue-500">Ideal: {item.ideal}</p>
        </div>
      ))}
    </div>
  )
}

// ==================== RL PREVIEW ====================

function RLPreview({ rlType, tahun, bulan }: {
  rlType: string; tahun: number; bulan: number
}) {
  const { data, isLoading, error } = useGenerateRL(
    rlType,
    rlType !== 'rl13' ? tahun : undefined,
    rlType !== 'rl13' ? bulan : undefined,
  )

  if (isLoading) return <div className="animate-pulse h-40 bg-muted rounded" />
  if (error) return <p className="text-sm text-red-600">Gagal memuat data: {(error as Error).message}</p>
  if (!data) return <p className="text-sm text-muted-foreground">Tidak ada data</p>

  // Render based on RL type
  if (rlType === 'rl13') return <RL13Preview data={data as RL13Data} />
  if (rlType === 'rl32') return <RL32Preview data={data as RL32Data} />
  if (rlType === 'rl33') return <SimpleTable rows={(data as { data: RL33Row[] }).data} columns={['kategori', 'baru', 'lama', 'total']} headers={['Kategori', 'Baru', 'Lama/Rujukan', 'Total']} />
  if (rlType === 'rl34') return <SimpleTable rows={(data as { data: RL33Row[] }).data} columns={['tipe', 'baru', 'lama', 'total']} headers={['Tipe Pelayanan', 'Pasien Baru', 'Pasien Lama', 'Total Kunjungan']} />
  if (rlType === 'rl35') return <RL35Preview data={(data as { data: RL35Row[] }).data} />
  if (rlType === 'rl38') return <CountTable rows={(data as { data: RL38Row[]; total: number }).data} label="Kategori Pemeriksaan" countLabel="Jumlah" total={(data as { total: number }).total} />
  if (rlType === 'rl39') return <CountTable rows={(data as { data: RL39Row[]; total: number }).data} label="Modalitas" countLabel="Jumlah" total={(data as { total: number }).total} />
  if (rlType === 'rl312') return <CountTable rows={(data as { data: RL312Row[]; total: number }).data} label="Jenis" countLabel="Jumlah" total={(data as { total: number }).total} />
  if (rlType === 'rl41') return <MorbidityPreview data={(data as { data: RL41Row[] }).data} />
  if (rlType === 'rl51') return <MortalityPreview data={data as { data: RL51Row[]; totalMeninggal: number }} />

  return <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60">{JSON.stringify(data, null, 2)}</pre>
}

function RL13Preview({ data }: { data: RL13Data }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <div className="border rounded p-2 text-center"><p className="text-xl font-bold">{data.summary.totalTT}</p><p className="text-[10px] text-muted-foreground">Total TT</p></div>
        <div className="border rounded p-2 text-center"><p className="text-xl font-bold text-red-600">{data.summary.terpakai}</p><p className="text-[10px] text-muted-foreground">Terpakai</p></div>
        <div className="border rounded p-2 text-center"><p className="text-xl font-bold text-green-600">{data.summary.kosong}</p><p className="text-[10px] text-muted-foreground">Kosong</p></div>
        <div className="border rounded p-2 text-center"><p className="text-xl font-bold text-blue-600">{data.summary.bor}%</p><p className="text-[10px] text-muted-foreground">BOR</p></div>
      </div>
      <table className="w-full text-xs border">
        <thead className="bg-muted/50"><tr>
          <th className="text-left px-2 py-1.5">Ruangan</th><th className="text-center px-2 py-1.5">Kelas</th>
          <th className="text-center px-2 py-1.5">Total TT</th><th className="text-center px-2 py-1.5">Terpakai</th><th className="text-center px-2 py-1.5">Kosong</th>
        </tr></thead>
        <tbody>{data.data.map((r) => (
          <tr key={r.kode_ruang} className="border-t">
            <td className="px-2 py-1">{r.nama_ruang} <span className="text-muted-foreground">({r.kode_ruang})</span></td>
            <td className="text-center px-2 py-1">{r.kelas || '-'}</td>
            <td className="text-center px-2 py-1 font-medium">{r.total_tt}</td>
            <td className="text-center px-2 py-1 text-red-600">{r.terpakai}</td>
            <td className="text-center px-2 py-1 text-green-600">{r.kosong}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function RL32Preview({ data }: { data: RL32Data }) {
  return (
    <div className="space-y-3">
      <IndikatorCard indikator={data.indikator} />
      <div className="overflow-x-auto">
        <table className="w-full text-xs border">
          <thead className="bg-muted/50"><tr>
            <th className="text-left px-2 py-1.5">Kelas</th>
            <th className="text-center px-2 py-1.5">Awal</th>
            <th className="text-center px-2 py-1.5">Masuk ♂</th><th className="text-center px-2 py-1.5">Masuk ♀</th>
            <th className="text-center px-2 py-1.5">Keluar Hidup ♂</th><th className="text-center px-2 py-1.5">Keluar Hidup ♀</th>
            <th className="text-center px-2 py-1.5">Keluar Mati ♂</th><th className="text-center px-2 py-1.5">Keluar Mati ♀</th>
            <th className="text-center px-2 py-1.5">HP</th>
          </tr></thead>
          <tbody>
            {data.data.map((r) => (
              <tr key={r.kelas} className="border-t">
                <td className="px-2 py-1 font-medium">{r.kelas}</td>
                <td className="text-center px-2 py-1">{r.awal_bulan}</td>
                <td className="text-center px-2 py-1">{r.masuk_pria}</td>
                <td className="text-center px-2 py-1">{r.masuk_wanita}</td>
                <td className="text-center px-2 py-1">{r.keluar_hidup_pria}</td>
                <td className="text-center px-2 py-1">{r.keluar_hidup_wanita}</td>
                <td className="text-center px-2 py-1 text-red-600">{r.keluar_mati_pria}</td>
                <td className="text-center px-2 py-1 text-red-600">{r.keluar_mati_wanita}</td>
                <td className="text-center px-2 py-1 font-medium">{r.hari_perawatan}</td>
              </tr>
            ))}
            <tr className="border-t-2 font-semibold bg-muted/30">
              <td className="px-2 py-1">TOTAL</td>
              <td className="text-center px-2 py-1">{data.data.reduce((s, r) => s + r.awal_bulan, 0)}</td>
              <td className="text-center px-2 py-1">{data.data.reduce((s, r) => s + r.masuk_pria, 0)}</td>
              <td className="text-center px-2 py-1">{data.data.reduce((s, r) => s + r.masuk_wanita, 0)}</td>
              <td className="text-center px-2 py-1">{data.data.reduce((s, r) => s + r.keluar_hidup_pria, 0)}</td>
              <td className="text-center px-2 py-1">{data.data.reduce((s, r) => s + r.keluar_hidup_wanita, 0)}</td>
              <td className="text-center px-2 py-1 text-red-600">{data.data.reduce((s, r) => s + r.keluar_mati_pria, 0)}</td>
              <td className="text-center px-2 py-1 text-red-600">{data.data.reduce((s, r) => s + r.keluar_mati_wanita, 0)}</td>
              <td className="text-center px-2 py-1">{data.data.reduce((s, r) => s + r.hari_perawatan, 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RL35Preview({ data }: { data: RL35Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border">
        <thead className="bg-muted/50"><tr>
          <th className="text-left px-2 py-1.5">Poliklinik</th>
          <th className="text-center px-2 py-1.5">Baru ♂</th><th className="text-center px-2 py-1.5">Baru ♀</th>
          <th className="text-center px-2 py-1.5">Lama ♂</th><th className="text-center px-2 py-1.5">Lama ♀</th>
          <th className="text-center px-2 py-1.5">Total</th>
        </tr></thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.kode_poli} className="border-t">
              <td className="px-2 py-1">{r.nama_poli} <span className="text-muted-foreground">({r.kode_poli})</span></td>
              <td className="text-center px-2 py-1">{r.baru_pria}</td><td className="text-center px-2 py-1">{r.baru_wanita}</td>
              <td className="text-center px-2 py-1">{r.lama_pria}</td><td className="text-center px-2 py-1">{r.lama_wanita}</td>
              <td className="text-center px-2 py-1 font-medium">{r.total}</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">Tidak ada data</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function SimpleTable({ rows, columns, headers }: {
  rows: Record<string, unknown>[]; columns: string[]; headers: string[]
}) {
  return (
    <table className="w-full text-xs border">
      <thead className="bg-muted/50"><tr>
        {headers.map((h, i) => <th key={i} className={`${i === 0 ? 'text-left' : 'text-center'} px-2 py-1.5`}>{h}</th>)}
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t">
            {columns.map((c, j) => (
              <td key={j} className={`${j === 0 ? 'text-left' : 'text-center'} px-2 py-1`}>
                {String(r[c] ?? '-')}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={columns.length} className="text-center py-4 text-muted-foreground">Tidak ada data</td></tr>}
      </tbody>
    </table>
  )
}

function CountTable({ rows, label, countLabel, total }: {
  rows: { kategori?: string; modalitas?: string; jenis?: string; jumlah: number }[]
  label: string; countLabel: string; total: number
}) {
  return (
    <div className="space-y-2">
      <table className="w-full text-xs border">
        <thead className="bg-muted/50"><tr>
          <th className="text-left px-2 py-1.5">{label}</th>
          <th className="text-center px-2 py-1.5">{countLabel}</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="px-2 py-1">{r.kategori || r.modalitas || r.jenis}</td>
              <td className="text-center px-2 py-1 font-medium">{r.jumlah}</td>
            </tr>
          ))}
          <tr className="border-t-2 font-semibold bg-muted/30">
            <td className="px-2 py-1">TOTAL</td>
            <td className="text-center px-2 py-1">{total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function MorbidityPreview({ data }: { data: RL41Row[] }) {
  return (
    <table className="w-full text-xs border">
      <thead className="bg-muted/50"><tr>
        <th className="text-center px-2 py-1.5 w-8">#</th>
        <th className="text-left px-2 py-1.5">ICD-10</th><th className="text-left px-2 py-1.5">Diagnosa</th>
        <th className="text-center px-2 py-1.5">♂</th><th className="text-center px-2 py-1.5">♀</th>
        <th className="text-center px-2 py-1.5">Total</th>
      </tr></thead>
      <tbody>
        {data.map((r) => (
          <tr key={r.peringkat} className="border-t">
            <td className="text-center px-2 py-1">{r.peringkat}</td>
            <td className="px-2 py-1 font-mono text-[10px]">{r.icd10_code}</td>
            <td className="px-2 py-1">{r.icd10_name}</td>
            <td className="text-center px-2 py-1">{r.pria}</td>
            <td className="text-center px-2 py-1">{r.wanita}</td>
            <td className="text-center px-2 py-1 font-medium">{r.jumlah}</td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">Tidak ada data</td></tr>}
      </tbody>
    </table>
  )
}

function MortalityPreview({ data }: { data: { data: RL51Row[]; totalMeninggal: number } }) {
  return (
    <div className="space-y-2">
      <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
        Total kematian periode ini: <strong>{data.totalMeninggal}</strong>
      </div>
      <table className="w-full text-xs border">
        <thead className="bg-muted/50"><tr>
          <th className="text-center px-2 py-1.5 w-8">#</th>
          <th className="text-left px-2 py-1.5">ICD-10</th><th className="text-left px-2 py-1.5">Penyebab</th>
          <th className="text-center px-2 py-1.5">♂</th><th className="text-center px-2 py-1.5">♀</th>
          <th className="text-center px-2 py-1.5">Total</th>
        </tr></thead>
        <tbody>
          {data.data.map((r) => (
            <tr key={r.peringkat} className="border-t">
              <td className="text-center px-2 py-1">{r.peringkat}</td>
              <td className="px-2 py-1 font-mono text-[10px]">{r.icd10_code}</td>
              <td className="px-2 py-1">{r.sebab}</td>
              <td className="text-center px-2 py-1">{r.pria}</td>
              <td className="text-center px-2 py-1">{r.wanita}</td>
              <td className="text-center px-2 py-1 font-medium">{r.jumlah}</td>
            </tr>
          ))}
          {data.data.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">Tidak ada data kematian</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

// ==================== LAPORAN RL TAB ====================

function LaporanTab() {
  const now = new Date()
  const [tahun, setTahun] = useState(now.getFullYear())
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [selectedRL, setSelectedRL] = useState<string | null>(null)
  const sendMutation = useSendSirsToKemenkes()

  const periode = `${String(bulan).padStart(2, '0')}/${tahun}`

  const handleSend = (rlType: string) => {
    if (!confirm(`Kirim ${rlType.toUpperCase()} periode ${BULAN[bulan - 1]} ${tahun} ke Kemenkes?`)) return
    sendMutation.mutate({ rl_type: rlType, periode })
  }

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs font-medium">Bulan</label>
          <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))}
            className="mt-1 px-3 py-2 border rounded-md text-sm block">
            {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Tahun</label>
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))}
            className="mt-1 px-3 py-2 border rounded-md text-sm block">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Send result */}
      {sendMutation.isSuccess && (
        <div className={`p-3 rounded-lg text-sm ${
          sendMutation.data.data.status === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {sendMutation.data.data.status === 'success'
            ? `✅ ${sendMutation.data.data.rl_type.toUpperCase()} berhasil dikirim (${sendMutation.data.data.duration_ms}ms)`
            : `❌ Gagal: ${sendMutation.data.data.error_message}`
          }
        </div>
      )}

      {/* RL Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {RL_ITEMS.map((rl) => (
          <div key={rl.key}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              selectedRL === rl.key ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
            onClick={() => setSelectedRL(selectedRL === rl.key ? null : rl.key)}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold">{rl.label}</span>
                <span className="text-xs text-muted-foreground ml-2">{rl.desc}</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedRL(rl.key) }}
                  className="px-2 py-1 text-[10px] border rounded hover:bg-muted">
                  👁 Lihat
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSend(rl.key) }}
                  disabled={sendMutation.isPending}
                  className="px-2 py-1 text-[10px] bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50">
                  📤 Kirim
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Panel */}
      {selectedRL && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Preview: {RL_ITEMS.find((r) => r.key === selectedRL)?.label} —{' '}
              {selectedRL === 'rl13'
                ? 'Real-time'
                : `${BULAN[bulan - 1]} ${tahun}`}
            </h3>
            <button onClick={() => setSelectedRL(null)}
              className="text-xs text-muted-foreground hover:underline">✕ Tutup</button>
          </div>
          <RLPreview rlType={selectedRL} tahun={tahun} bulan={bulan} />
        </div>
      )}
    </div>
  )
}

// ==================== RIWAYAT TAB ====================

function RiwayatTab() {
  const [rlFilter, setRlFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const { data, isLoading } = useSirsSubmissions(50, 0, rlFilter, statusFilter)
  const stats = useSirsSubmissionStats()

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
            <p className="text-xs text-muted-foreground">Terakhir Berhasil</p>
            <p className="text-sm font-medium">{formatDate(stats.data.lastSuccess)}</p>
          </div>
        </div>
      )}

      {/* Per-RL type breakdown */}
      {stats.data?.byType && stats.data.byType.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50"><tr>
              <th className="text-left px-3 py-2 font-medium">Tipe RL</th>
              <th className="text-center px-2 py-2 font-medium">Berhasil</th>
              <th className="text-center px-2 py-2 font-medium">Gagal</th>
              <th className="text-left px-2 py-2 font-medium">Terakhir Kirim</th>
            </tr></thead>
            <tbody>
              {stats.data.byType.map((t) => (
                <tr key={t.rl_type} className="border-t">
                  <td className="px-3 py-1.5 font-medium uppercase">{t.rl_type}</td>
                  <td className="text-center px-2 py-1.5 text-green-600">{t.success_count}</td>
                  <td className="text-center px-2 py-1.5 text-red-600">{t.failed_count}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{formatDate(t.last_sent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select value={rlFilter ?? 'all'} onChange={(e) => setRlFilter(e.target.value === 'all' ? undefined : e.target.value)}
          className="px-3 py-1.5 border rounded-md text-sm">
          <option value="all">Semua RL</option>
          {RL_ITEMS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select value={statusFilter ?? 'all'} onChange={(e) => setStatusFilter(e.target.value === 'all' ? undefined : e.target.value)}
          className="px-3 py-1.5 border rounded-md text-sm">
          <option value="all">Semua Status</option>
          <option value="success">Berhasil</option>
          <option value="failed">Gagal</option>
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
            <thead className="bg-muted/50"><tr>
              <th className="text-left px-3 py-2 text-xs font-medium">Waktu</th>
              <th className="text-center px-2 py-2 text-xs font-medium">Tipe</th>
              <th className="text-center px-2 py-2 text-xs font-medium">Periode</th>
              <th className="text-center px-2 py-2 text-xs font-medium">Status</th>
              <th className="text-center px-2 py-2 text-xs font-medium">Durasi</th>
              <th className="text-left px-2 py-2 text-xs font-medium">Pesan</th>
            </tr></thead>
            <tbody>
              {(data?.data ?? []).map((sub) => (
                <tr key={sub.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 text-xs">{formatDate(sub.created_at)}</td>
                  <td className="text-center px-2 py-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-medium uppercase">
                      {sub.rl_type}
                    </span>
                  </td>
                  <td className="text-center px-2 py-2 text-xs">{sub.periode}</td>
                  <td className="text-center px-2 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      sub.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {sub.status === 'success' ? '✅' : '❌'} {sub.status === 'success' ? 'Berhasil' : 'Gagal'}
                    </span>
                  </td>
                  <td className="text-center px-2 py-2 text-xs">{sub.duration_ms ? `${sub.duration_ms}ms` : '-'}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                    {sub.error_message || sub.response_message || '-'}
                  </td>
                </tr>
              ))}
              {(data?.data ?? []).length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada riwayat pengiriman</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ==================== MAIN PAGE ====================

export default function SirsOnlinePage() {
  const [tab, setTab] = useState<'laporan' | 'config' | 'riwayat'>('laporan')

  const tabs = [
    { id: 'laporan' as const, label: '📊 Laporan RL' },
    { id: 'config' as const, label: '⚙️ Konfigurasi' },
    { id: 'riwayat' as const, label: '📜 Riwayat Pengiriman' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SIRS Online</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pelaporan Rekam Laporan (RL) ke Kemenkes RI — RL 1.3, RL 3.2–3.12, RL 4.1, RL 5.1
        </p>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>SIRS Online</strong> adalah sistem pelaporan indikator pelayanan RS ke Kemenkes
          sesuai Permenkes 1171/2011. Data di-generate otomatis dari database SIMRS, admin hanya
          perlu review lalu kirim dengan 1 klik. RL 1.3 (Tempat Tidur) bisa dikirim otomatis harian.
        </p>
      </div>

      <div className="border-b">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'laporan' && <LaporanTab />}
      {tab === 'config' && <ConfigTab />}
      {tab === 'riwayat' && <RiwayatTab />}
    </div>
  )
}
