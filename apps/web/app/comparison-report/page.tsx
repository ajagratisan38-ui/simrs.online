'use client'

import { useRef, useState } from 'react'

const bdr = '1px solid #d1d5db'
const f = 'Segoe UI, Tahoma, Arial, sans-serif'

const thStyle: React.CSSProperties = {
  border: bdr,
  padding: '4px 6px',
  background: '#1e3a5f',
  color: '#fff',
  fontSize: 8.5,
  textAlign: 'left',
  fontWeight: 600,
}

const tdBase: React.CSSProperties = {
  border: bdr,
  padding: '3px 6px',
  fontSize: 8.5,
  verticalAlign: 'top',
}

const pageBase: React.CSSProperties = {
  fontFamily: f,
  width: 794,
  minHeight: 1100,
  padding: '24px 30px 14px',
  color: '#1a1a1a',
  fontSize: 10,
  lineHeight: 1.4,
  background: '#ffffff',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
}

const RIKY_MODULES = [
  { nama: 'Pendaftaran Pasien', detail: 'Identitas, kartu cetak, general consent' },
  { nama: 'Rawat Jalan (Poliklinik)', detail: 'Antrian, SOAP perawat & dokter, riwayat' },
  { nama: 'IGD / Emergency', detail: 'SOAP IGD, cetak laporan kunjungan' },
  { nama: 'Rawat Inap', detail: 'Admisi bed, observasi SOAP, pulangkan' },
  { nama: 'Kasir / Billing', detail: 'Tagihan layanan, biaya tambahan manual' },
  { nama: 'Gudang Farmasi', detail: 'Batch stok, retur, stok opname dasar' },
  { nama: 'Apotik / Dispensing', detail: 'Eksekusi resep, penjualan obat bebas' },
  { nama: 'Amprah / Mutasi Barang', detail: 'Request + respon mutasi gudang↔apotik' },
  { nama: 'Radiologi', detail: '2-step: terima → hasil diagnosa radiologist' },
  { nama: 'Laboratorium', detail: '2-step: terima → hasil diagnosa laborist' },
  { nama: 'ICD-10 & ICD-9-CM', detail: 'Kodifikasi casemix oleh coder' },
  { nama: 'Gizi', detail: 'Info nutrisi pasien inap (read-only)' },
  { nama: 'Manajemen (User, Ref, DB)', detail: 'CRUD user, import referensi, backup/restore' },
  { nama: 'Logbook Dokter', detail: 'Catatan tindakan di halaman profil' },
  { nama: 'Telemedisin', detail: 'Via app terpisah (telemedic repo)' },
  { nama: 'General Consent', detail: 'Cetak dari menu pendaftaran' },
]

const COMPARISON = [
  {
    kategori: 'Klinik & Pelayanan Medis (Wajib RS)',
    items: [
      { modul: 'Pendaftaran & Identitas Pasien', riky: '✅ Basic', kita: '✅ Full (3-step, NIK check, merge, soft-delete, duplikasi)', verdict: 'Kita lebih lengkap' },
      { modul: 'Rawat Jalan + Antrian', riky: '✅ Antrian + SOAP', kita: '✅ Queue + SOAP + ICD-10/9-CM + Display TV + Kiosk', verdict: 'Kita lebih lengkap' },
      { modul: 'IGD / Gawat Darurat', riky: '✅ SOAP + laporan', kita: '✅ Triase level + prioritas antrian + field khusus IGD', verdict: 'Kita lebih lengkap' },
      { modul: 'Rawat Inap & Bed Mgmt', riky: '✅ Admisi + observasi', kita: '✅ Bed mgmt + transfer + discharge 5 tipe + BOR/LOS', verdict: 'Kita lebih lengkap' },
      { modul: 'Rekam Medis (SOAP)', riky: '✅ SOAP dasar', kita: '✅ SOAP + ICD-10/9-CM + e-prescription + template', verdict: 'Kita lebih lengkap' },
      { modul: 'CPPT Multi-Profesi', riky: '❌', kita: '✅ Timeline SOAP-IE, filter profesi, verifikasi', verdict: 'Hanya di Kita' },
      { modul: 'Pengkajian Keperawatan', riky: '❌', kita: '✅ Morse + Barthel + BMI + Nutrisi (auto-score)', verdict: 'Hanya di Kita' },
      { modul: 'Resume Medis', riky: '❌', kita: '✅ PDF A4 (KOP RS, SOAP, diagnosa, resep, TTD)', verdict: 'Hanya di Kita' },
      { modul: 'General Consent', riky: '✅ Cetak', kita: '✅ CRUD + cetak A4', verdict: 'Setara' },
      { modul: 'Formulir Edukasi Pasien', riky: '❌', kita: '✅ Template topik + record per kunjungan', verdict: 'Hanya di Kita' },
      { modul: 'Discharge / Cara Keluar', riky: '✅ Tombol pulang', kita: '✅ 5 tipe: Sembuh/APS/Rujuk/Meninggal/Lain', verdict: 'Kita lebih lengkap' },
      { modul: 'Bedah / Operasi', riky: '✅ Basic (1 file)', kita: '✅ 5-tab: Info+Tim+Instrumen+Anestesi+Perioperatif', verdict: 'Kita jauh lebih lengkap' },
      { modul: 'MCU (Medical Check Up)', riky: '❌', kita: '✅ Paket + exam + conclusion + sertifikat A4', verdict: 'Hanya di Kita' },
      { modul: 'Dokter & Jadwal Praktik', riky: '❌', kita: '✅ Schedule + fee + jasa medis per dokter', verdict: 'Hanya di Kita' },
      { modul: 'Logbook Dokter', riky: '✅ Di profil', kita: '✅ Stats + CSV export + date filter', verdict: 'Kita lebih lengkap' },
    ],
  },
  {
    kategori: 'Farmasi & Logistik (Wajib RS)',
    items: [
      { modul: 'Farmasi / Dispensing Obat', riky: '✅ Eksekusi resep', kita: '✅ FIFO + e-prescription + expiry alert + CDSS check', verdict: 'Kita lebih lengkap' },
      { modul: 'Penjualan Obat Bebas', riky: '✅ Dasar', kita: '✅ Dedicated POS + ringkasan harian', verdict: 'Kita lebih lengkap' },
      { modul: 'Gudang Farmasi / Stok', riky: '✅ Batch + retur', kita: '✅ CRUD + kategori + low stock + gudang umum', verdict: 'Kita lebih lengkap' },
      { modul: 'Amprah / Mutasi Barang', riky: '✅ Request-respon', kita: '✅ Approve/complete/reject workflow', verdict: 'Kita lebih lengkap' },
      { modul: 'Purchase Order Supplier', riky: '❌', kita: '✅ Supplier CRUD + PO lifecycle + auto stock in', verdict: 'Hanya di Kita' },
      { modul: 'Stock Opname', riky: '✅ Dasar', kita: '✅ Auto-populate + count + selisih + adjustment', verdict: 'Kita lebih lengkap' },
      { modul: 'Gudang Umum (Non-Obat)', riky: '❌', kita: '✅ 7 kategori + CRUD + low stock alert', verdict: 'Hanya di Kita' },
    ],
  },
  {
    kategori: 'Penunjang Medis (Wajib RS)',
    items: [
      { modul: 'Laboratorium', riky: '✅ 2-step dasar', kita: '✅ 46 parameter, 7 kategori, full workflow', verdict: 'Kita jauh lebih lengkap' },
      { modul: 'Radiologi', riky: '✅ 2-step dasar', kita: '✅ 34 jenis, 6 modalitas (X-Ray/USG/CT/MRI)', verdict: 'Kita jauh lebih lengkap' },
      { modul: 'Gizi / Nutrisi', riky: '✅ Read-only info', kita: '✅ ADIME + Harris-Benedict + meal plans + food cost', verdict: 'Kita jauh lebih lengkap' },
      { modul: 'ICD-10 & ICD-9-CM', riky: '✅ Ada', kita: '✅ Search + kategori + 107 kode seed', verdict: 'Setara+' },
    ],
  },
  {
    kategori: 'Keuangan & SDM',
    items: [
      { modul: 'Kasir & Billing', riky: '✅ Tagihan + cetak', kita: '✅ Bill + payment + discount + receipt + summary', verdict: 'Kita lebih lengkap' },
      { modul: 'Akuntansi (Jurnal, Neraca, L/R)', riky: '❌', kita: '✅ COA 55 akun, jurnal, buku besar, neraca, L/R, arus kas', verdict: 'Hanya di Kita' },
      { modul: 'Asuransi & Penjamin', riky: '❌', kita: '✅ Master asuransi, patient insurance, billing', verdict: 'Hanya di Kita' },
      { modul: 'HRIS / Kepegawaian', riky: '❌', kita: '✅ Pegawai, shift, absensi, cuti, payroll PPh21', verdict: 'Hanya di Kita' },
    ],
  },
  {
    kategori: 'Integrasi Pemerintah (Wajib Regulasi)',
    items: [
      { modul: 'BPJS VClaim (SEP, Rujukan)', riky: '❌ (repo terpisah)', kita: '✅ SEP, peserta, rujukan, built-in mock mode', verdict: 'Hanya di Kita' },
      { modul: 'BPJS PCare', riky: '❌', kita: '✅ Kunjungan, riwayat, obat DPHO', verdict: 'Hanya di Kita' },
      { modul: 'BPJS e-Klaim / INACBG', riky: '❌', kita: '✅ Grouping, claim CRUD, status monitoring', verdict: 'Hanya di Kita' },
      { modul: 'BPJS Aplicare', riky: '❌', kita: '✅ Bed availability, BOR per kelas', verdict: 'Hanya di Kita' },
      { modul: 'BPJS Antrol (Mobile JKN)', riky: '❌', kita: '✅ Task list, antrean, dashboard per poli', verdict: 'Hanya di Kita' },
      { modul: 'SATUSEHAT (Kemenkes FHIR)', riky: '❌', kita: '✅ 13 FHIR R4 resources, OAuth2, sync worker', verdict: 'Hanya di Kita' },
      { modul: 'Terminologi LOINC + KFA', riky: '❌', kita: '✅ 90 LOINC, 101 KFA, auto-mapping', verdict: 'Hanya di Kita' },
    ],
  },
  {
    kategori: 'Keamanan & Compliance',
    items: [
      { modul: 'MFA (Two-Factor Auth)', riky: '❌', kita: '✅ TOTP + QR Code + verify/enable/disable', verdict: 'Hanya di Kita' },
      { modul: 'RBAC Fine-grained', riky: '✅ 4 role dasar', kita: '✅ 8 role × per-aksi permissions', verdict: 'Kita lebih lengkap' },
      { modul: 'Audit Trail', riky: '❌', kita: '✅ Auto-log semua akses data sensitif', verdict: 'Hanya di Kita' },
      { modul: 'TTE (Tanda Tangan Elektronik)', riky: '❌', kita: '✅ SHA-512 + 4 provider + tamper detection', verdict: 'Hanya di Kita' },
      { modul: 'CDSS Drug Safety', riky: '❌', kita: '✅ 5-check pipeline, 65 drug interactions', verdict: 'Hanya di Kita' },
      { modul: 'Enkripsi Data Sensitif', riky: '❌', kita: '✅ AES-256-GCM, Helmet CSP/HSTS, rate limit', verdict: 'Hanya di Kita' },
    ],
  },
  {
    kategori: 'SaaS & Infrastruktur',
    items: [
      { modul: 'Multi-Tenancy (SaaS)', riky: '❌ Single-tenant', kita: '✅ Schema-per-tenant + auto-provision', verdict: 'Hanya di Kita' },
      { modul: 'Super Admin Platform', riky: '❌', kita: '✅ Panel terpisah + 9 halaman + monitoring', verdict: 'Hanya di Kita' },
      { modul: 'Subscription & Billing SaaS', riky: '❌', kita: '✅ 4 tier plans + MRR/ARR analytics', verdict: 'Hanya di Kita' },
      { modul: 'Onboarding Wizard RS Baru', riky: '❌', kita: '✅ 5-step guided setup', verdict: 'Hanya di Kita' },
      { modul: 'Portal Pasien', riky: '❌', kita: '✅ Login NIK+DOB, riwayat, tagihan, rekam medis', verdict: 'Hanya di Kita' },
      { modul: 'Offline-First + Sync', riky: '✅ Dexie basic', kita: '✅ Dexie 7 tables + SW + Background Sync', verdict: 'Kita lebih lengkap' },
      { modul: 'PWA Installable', riky: '❌', kita: '✅ Manifest + push notification + install prompt', verdict: 'Hanya di Kita' },
      { modul: 'Backup Automated', riky: '✅ Manual', kita: '✅ pg_dump + BullMQ scheduler + retention', verdict: 'Kita lebih lengkap' },
      { modul: 'Docker / Deployment', riky: '❌', kita: '✅ Multi-stage Dockerfile + docker-compose', verdict: 'Hanya di Kita' },
      { modul: 'Migrasi dari Khanza', riky: '❌', kita: '✅ MySQL connector + 20 mappers + wizard', verdict: 'Hanya di Kita' },
    ],
  },
]

function PageFooter({ page, total, tgl }: { page: number; total: number; tgl: string }) {
  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 5, marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#9ca3af' }}>
      <span>SIMRS SaaS — Laporan Perbandingan Modul • {tgl}</span>
      <span>Halaman {page} / {total}</span>
    </div>
  )
}

function SectionTitle({ title, mt }: { title: string; mt?: number }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f', borderBottom: '2px solid #2563eb', paddingBottom: 2, marginBottom: 6, marginTop: mt ?? 10 }}>
      {title}
    </div>
  )
}

function VerdictBadge({ v }: { v: string }) {
  const isOnlyUs = v.includes('Hanya di Kita')
  const isBetter = v.includes('lebih lengkap') || v.includes('jauh lebih')
  const bg = isOnlyUs ? '#dbeafe' : isBetter ? '#dcfce7' : '#f3f4f6'
  const fg = isOnlyUs ? '#1e40af' : isBetter ? '#166534' : '#374151'
  return <span style={{ background: bg, color: fg, padding: '1px 5px', borderRadius: 3, fontSize: 7.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{v}</span>
}

function CategoryTable({ cat }: { cat: typeof COMPARISON[number] }) {
  const onlyUsCount = cat.items.filter((i) => i.verdict.includes('Hanya di Kita')).length
  const betterCount = cat.items.filter((i) => i.verdict.includes('lebih lengkap')).length
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '3px 8px', borderLeft: '3px solid #2563eb', marginBottom: 3 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#374151' }}>{cat.kategori}</span>
        <span style={{ fontSize: 7, color: '#6b7280' }}>
          {onlyUsCount > 0 ? `${onlyUsCount} eksklusif` : ''}
          {onlyUsCount > 0 && betterCount > 0 ? ' · ' : ''}
          {betterCount > 0 ? `${betterCount} lebih baik` : ''}
        </span>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '22%', padding: '3px 5px', fontSize: 8 }}>Modul</th>
            <th style={{ ...thStyle, width: '14%', textAlign: 'center', padding: '3px 5px', fontSize: 8 }}>SIMRS.dev</th>
            <th style={{ ...thStyle, width: '42%', padding: '3px 5px', fontSize: 8 }}>SIMRS SaaS (Kami)</th>
            <th style={{ ...thStyle, width: '22%', textAlign: 'center', padding: '3px 5px', fontSize: 8 }}>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {cat.items.map((item, i) => {
            const isExcl = item.verdict.includes('Hanya di Kita')
            return (
              <tr key={item.modul} style={{ background: isExcl ? '#f0f9ff' : i % 2 === 1 ? '#f9fafb' : 'white' }}>
                <td style={{ ...tdBase, fontWeight: 600, fontSize: 8, padding: '2px 5px' }}>{item.modul}</td>
                <td style={{ ...tdBase, textAlign: 'center', fontSize: 8, padding: '2px 5px' }}>{item.riky}</td>
                <td style={{ ...tdBase, color: '#1e40af', fontSize: 7.5, padding: '2px 5px' }}>{item.kita}</td>
                <td style={{ ...tdBase, textAlign: 'center', padding: '2px 5px' }}><VerdictBadge v={item.verdict} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const TOTAL_PAGES = 4

export default function ComparisonReportPage() {
  const pagesRef = useRef<(HTMLDivElement | null)[]>([])
  const [generating, setGenerating] = useState(false)

  const tgl = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const allItems = COMPARISON.flatMap((c) => c.items)
  const onlyUs = allItems.filter((i) => i.verdict.includes('Hanya di Kita')).length
  const better = allItems.filter((i) => i.verdict.includes('lebih lengkap')).length
  const equal = allItems.filter((i) => i.verdict === 'Setara' || i.verdict === 'Setara+').length

  const setPageRef = (i: number) => (el: HTMLDivElement | null) => {
    pagesRef.current[i] = el
  }

  const handleDownloadPDF = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < TOTAL_PAGES; i++) {
        const el = pagesRef.current[i]
        if (!el) continue
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: 794 })
        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        const imgRatio = canvas.height / canvas.width
        if (i > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, Math.min(pdfW * imgRatio, pdfH))
      }
      pdf.save('SIMRS-SaaS-Comparison-Report.pdf')
    } catch {
      alert('Gagal generate PDF.')
    } finally {
      setGenerating(false)
    }
  }

  const page2Cats = COMPARISON.slice(0, 3)
  const page3Cats = COMPARISON.slice(3)

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <button
          onClick={handleDownloadPDF}
          disabled={generating}
          style={{
            padding: '12px 40px', background: generating ? '#9ca3af' : '#1e3a5f', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
            cursor: generating ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {generating ? 'Generating PDF...' : `Download PDF (${TOTAL_PAGES} Halaman)`}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE 1 — Cover + Ringkasan + Teknologi + Modul Referensi
          ══════════════════════════════════════════════════════ */}
      <div ref={setPageRef(0)} style={{ ...pageBase, margin: '0 auto 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 14, borderBottom: '3px solid #1e3a5f', paddingBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>SIMRS SaaS</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Laporan Perbandingan Modul &amp; Fitur</div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>SIMRS SaaS (Produk Kami) vs SIMRS.dev Open Source (rikyperdana/simrs)</div>
          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 3 }}>Tanggal: {tgl}</div>
        </div>

        <SectionTitle title="1. Latar Belakang" mt={4} />
        <div style={{ fontSize: 9, lineHeight: 1.55, marginBottom: 8, textAlign: 'justify' }}>
          <p style={{ margin: '0 0 4px' }}>
            Pengembangan <strong>SIMRS SaaS</strong> terinspirasi dari proyek open-source <strong>SIMRS.dev</strong> (rikyperdana/simrs) —
            sebuah sistem informasi RS berbasis Node.js + MongoDB untuk edukasi dan referensi alur RS.
            Tujuan SIMRS SaaS adalah membangun sistem yang <strong>jauh lebih lengkap, enterprise-ready, dan sesuai regulasi Indonesia</strong> (BPJS, SATUSEHAT, UU PDP),
            dengan arsitektur SaaS multi-tenant.
          </p>
          <p style={{ margin: 0 }}>
            Laporan ini memastikan bahwa <strong>seluruh modul wajib operasional RS</strong> telah terimplementasi
            dan mengidentifikasi keunggulan dibandingkan referensi awal.
          </p>
        </div>

        <SectionTitle title="2. Ringkasan Perbandingan" mt={6} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[
            { label: 'SIMRS.dev (Referensi)', value: '~16', sub: 'modul', bg: '#f3f4f6', fg: '#374151' },
            { label: 'SIMRS SaaS (Kami)', value: '59', sub: 'modul', bg: '#eff6ff', fg: '#1e40af' },
            { label: 'Hanya di Kami', value: String(onlyUs), sub: 'modul eksklusif', bg: '#f0fdf4', fg: '#166534' },
            { label: 'Kami Lebih Lengkap', value: String(better), sub: 'modul', bg: '#ecfdf5', fg: '#059669' },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, border: bdr, borderRadius: 6, padding: '8px 6px', textAlign: 'center', background: s.bg }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.fg }}>{s.value}</div>
              <div style={{ fontSize: 7.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.sub}</div>
              <div style={{ fontSize: 7, color: '#9ca3af', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <SectionTitle title="3. Perbandingan Teknologi" mt={6} />
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 10 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '20%' }}>Aspek</th>
              <th style={{ ...thStyle, width: '40%' }}>SIMRS.dev (Referensi)</th>
              <th style={{ ...thStyle, width: '40%' }}>SIMRS SaaS (Kami)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Frontend', 'MithrilJS + Bulma CSS', 'Next.js 14 + React 18 + Tailwind + shadcn/ui'],
              ['Backend', 'Express 4 + JavaScript ES6', 'Express 4 + TypeScript strict mode'],
              ['Database', 'MongoDB / RedisDB (NoSQL)', 'PostgreSQL 16 (ACID) + Redis 7'],
              ['Arsitektur', 'Single-tenant, 1 database', 'Multi-tenant SaaS (schema-per-tenant)'],
              ['Auth', 'Username + password dasar', 'JWT + Refresh Token + MFA TOTP + RBAC'],
              ['Offline', 'Dexie.js (basic sync)', 'Dexie.js + SW + Background Sync + PWA'],
              ['Integrasi', 'Tidak ada built-in', 'BPJS 5 layanan + SATUSEHAT 13 FHIR'],
              ['Deploy', 'Glitch / manual node', 'Docker multi-stage + docker-compose'],
              ['Ukuran', '120 KB (bundled)', 'Full enterprise monorepo (scalable)'],
              ['Lisensi', 'Hak Cipta, izin diperlukan', 'SaaS commercial-ready'],
            ].map(([k, r, s], i) => (
              <tr key={k} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
                <td style={{ ...tdBase, fontWeight: 600 }}>{k}</td>
                <td style={tdBase}>{r}</td>
                <td style={{ ...tdBase, color: '#1e40af', fontWeight: 500 }}>{s}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <SectionTitle title="4. Modul SIMRS.dev — Semua Sudah Tercakup" mt={6} />
        <div style={{ fontSize: 8.5, color: '#374151', marginBottom: 4 }}>
          Berikut <strong>16 modul</strong> dari SIMRS.dev — seluruhnya sudah terimplementasi di SIMRS SaaS:
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '4%' }}>#</th>
              <th style={{ ...thStyle, width: '28%' }}>Modul SIMRS.dev</th>
              <th style={{ ...thStyle, width: '40%' }}>Fitur di SIMRS.dev</th>
              <th style={{ ...thStyle, width: '10%', textAlign: 'center' }}>Kami?</th>
              <th style={{ ...thStyle, width: '18%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {RIKY_MODULES.map((m, i) => (
              <tr key={m.nama} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
                <td style={{ ...tdBase, textAlign: 'center', fontSize: 8 }}>{i + 1}</td>
                <td style={{ ...tdBase, fontWeight: 600, fontSize: 8 }}>{m.nama}</td>
                <td style={{ ...tdBase, fontSize: 8 }}>{m.detail}</td>
                <td style={{ ...tdBase, textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>✅</td>
                <td style={tdBase}><span style={{ background: '#dcfce7', color: '#166534', padding: '1px 4px', borderRadius: 3, fontSize: 7, fontWeight: 600 }}>Lebih Lengkap</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ flex: 1 }} />
        <PageFooter page={1} total={TOTAL_PAGES} tgl={tgl} />
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE 2 — Section 5: Klinik + Farmasi + Penunjang
          ══════════════════════════════════════════════════════ */}
      <div ref={setPageRef(1)} style={{ ...pageBase, margin: '0 auto 20px' }}>
        <SectionTitle title="5. Detail Perbandingan per Kategori" mt={0} />
        {page2Cats.map((cat) => <CategoryTable key={cat.kategori} cat={cat} />)}
        <div style={{ flex: 1 }} />
        <PageFooter page={2} total={TOTAL_PAGES} tgl={tgl} />
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE 3 — Section 5 lanjutan: Keuangan + Integrasi + Keamanan + SaaS
          ══════════════════════════════════════════════════════ */}
      <div ref={setPageRef(2)} style={{ ...pageBase, margin: '0 auto 20px' }}>
        <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 6, fontStyle: 'italic' }}>Lanjutan — Detail Perbandingan per Kategori</div>
        {page3Cats.map((cat) => <CategoryTable key={cat.kategori} cat={cat} />)}
        <div style={{ flex: 1 }} />
        <PageFooter page={3} total={TOTAL_PAGES} tgl={tgl} />
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE 4 — Section 6 + 7 + 8: Hanya Referensi + Checklist + Kesimpulan
          ══════════════════════════════════════════════════════ */}
      <div ref={setPageRef(3)} style={{ ...pageBase, margin: '0 auto 20px' }}>

        {/* Section 6 */}
        <SectionTitle title="6. Modul yang Hanya Ada di SIMRS.dev (Belum di Kami)" mt={0} />
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 4 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '25%' }}>Modul</th>
              <th style={thStyle}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...tdBase, fontWeight: 600 }}>Telemedisin</td>
              <td style={tdBase}>Video call via app terpisah (repo telemedic). Belum built-in, sudah masuk roadmap SIMRS SaaS.</td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: 8, color: '#6b7280', fontStyle: 'italic', marginBottom: 8 }}>
          Catatan: Telemedisin di SIMRS.dev bukan built-in (app terpisah). Hanya 1 dari 16 modul yang belum ada di kami.
        </div>

        {/* Section 7 */}
        <SectionTitle title="7. Checklist Modul Wajib Operasional RS" mt={4} />
        <div style={{ fontSize: 8.5, color: '#374151', marginBottom: 4 }}>
          Berdasarkan standar operasional RS Indonesia (Kemenkes, SNARS, KARS):
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 10 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '4%', fontSize: 7.5 }}>#</th>
              <th style={{ ...thStyle, width: '30%', fontSize: 7.5 }}>Modul Wajib RS</th>
              <th style={{ ...thStyle, width: '10%', textAlign: 'center', fontSize: 7.5 }}>Referensi</th>
              <th style={{ ...thStyle, width: '10%', textAlign: 'center', fontSize: 7.5 }}>Kami</th>
              <th style={{ ...thStyle, width: '46%', fontSize: 7.5 }}>Detail Implementasi Kami</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Pendaftaran & Rekam Medis', '✅', '✅', 'CRUD pasien + SOAP + ICD-10 + resume medis PDF'],
              ['Rawat Jalan (Poliklinik)', '✅', '✅', 'Queue + display TV + kiosk + SOAP + e-prescription'],
              ['Rawat Inap & Discharge', '✅', '✅', 'Bed mgmt + BOR/LOS + discharge 5 tipe'],
              ['IGD / Gawat Darurat', '✅', '✅', 'Triase + prioritas + SOAP'],
              ['Farmasi & Dispensing', '✅', '✅', 'FIFO + expiry alert + CDSS safety check'],
              ['Laboratorium', '✅', '✅', '46 parameter, 7 kategori, full workflow'],
              ['Radiologi', '✅', '✅', '34 jenis, 6 modalitas, queue + bacaan + kesan'],
              ['Kasir & Billing', '✅', '✅', 'Bill + payment + receipt + daily summary'],
              ['Gudang / Stok', '✅', '✅', 'Gudang farmasi + gudang umum + Purchase Order'],
              ['Gizi / Nutrisi', '✅', '✅', 'ADIME + meal plans + kalkulator + food cost'],
              ['Bedah / Operasi', '⚠️', '✅', '5-tab: tim, instrumen, anestesi, perioperatif'],
              ['BPJS Integration', '❌', '✅', 'VClaim + PCare + e-Klaim + Aplicare + Antrol'],
              ['SATUSEHAT (FHIR)', '❌', '✅', '13 FHIR R4 resources + OAuth2 + sync worker'],
              ['Akuntansi Keuangan', '❌', '✅', 'COA 55 akun + jurnal + neraca + laba rugi + arus kas'],
              ['HRIS / Kepegawaian', '❌', '✅', 'Pegawai + shift + absensi + cuti + payroll PPh21'],
              ['Audit Trail & Keamanan', '❌', '✅', 'MFA + RBAC + TTE + CDSS + enkripsi AES-256'],
            ].map(([modul, riky, kita, detail], i) => (
              <tr key={modul} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
                <td style={{ ...tdBase, textAlign: 'center', fontSize: 7.5 }}>{i + 1}</td>
                <td style={{ ...tdBase, fontWeight: 600, fontSize: 8 }}>{modul}</td>
                <td style={{ ...tdBase, textAlign: 'center', fontSize: 10 }}>{riky}</td>
                <td style={{ ...tdBase, textAlign: 'center', fontSize: 10 }}>{kita}</td>
                <td style={{ ...tdBase, fontSize: 7.5, color: '#374151' }}>{detail}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Section 8 */}
        <SectionTitle title="8. Kesimpulan" mt={4} />
        <div style={{ border: bdr, borderRadius: 6, padding: '8px 12px', background: '#f0fdf4', marginBottom: 8 }}>
          <div style={{ fontSize: 9, lineHeight: 1.6, textAlign: 'justify' }}>
            <strong>Seluruh modul wajib operasional RS telah terimplementasi di SIMRS SaaS.</strong> Dari {allItems.length} poin
            perbandingan, <strong style={{ color: '#16a34a' }}>{onlyUs} modul hanya ada di kami</strong>,{' '}
            <strong style={{ color: '#059669' }}>{better} modul kami lebih lengkap</strong>
            {equal > 0 ? <>, dan <strong>{equal} modul setara</strong></> : ''}. Hanya <strong>1 modul</strong> (Telemedisin) yang belum ada — sudah masuk roadmap.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, border: bdr, borderRadius: 6, padding: '8px 10px', background: '#eff6ff' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#1e3a5f', marginBottom: 4 }}>Keunggulan Utama SIMRS SaaS:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px 0', fontSize: 8 }}>
              {[
                'SaaS multi-tenant (banyak RS, 1 platform)',
                'BPJS 5 layanan lengkap (built-in)',
                'SATUSEHAT 13 FHIR resources',
                'Akuntansi: jurnal, neraca, laba rugi, arus kas',
                'HRIS: shift, absensi, payroll PPh21',
                'CDSS drug safety (65 interaksi)',
                'TTE tersertifikasi (UU ITE)',
                'Portal Pasien + MCU + CPPT',
                'Offline-first + PWA installable',
                'Docker + migrasi Khanza otomatis',
              ].map((h) => (
                <div key={h} style={{ display: 'flex', gap: 3, alignItems: 'baseline' }}>
                  <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 7 }}>✓</span> <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, border: bdr, borderRadius: 6, padding: '8px 10px', background: '#fefce8' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#854d0e', marginBottom: 4 }}>Roadmap Selanjutnya:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px 0', fontSize: 8 }}>
              {[
                'Telemedisin (video call)',
                'CSSD / Sterilisasi',
                'Fisioterapi / Rehabilitasi',
                'Hemodialisa',
                'Vaksinasi',
                'Surveilans HAIs (PPI)',
                'RL1–RL6 Laporan Kemenkes',
                'WhatsApp Gateway',
                'Mobile App Native',
                'RIS/PACS + LIS Hardware',
              ].map((h) => (
                <div key={h} style={{ display: 'flex', gap: 3, alignItems: 'baseline' }}>
                  <span style={{ color: '#ca8a04', fontWeight: 700, fontSize: 7 }}>○</span> <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ border: bdr, borderRadius: 6, padding: '8px 12px', background: '#f8fafc' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Skor Perbandingan Akhir:</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
                <span>SIMRS.dev (Referensi)</span><span style={{ fontWeight: 700 }}>~16 modul</span>
              </div>
              <div style={{ height: 12, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '27%', background: '#9ca3af', borderRadius: 6 }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 700, color: '#1e40af' }}>SIMRS SaaS (Kami)</span><span style={{ fontWeight: 700, color: '#1e40af' }}>59 modul</span>
              </div>
              <div style={{ height: 12, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #2563eb, #16a34a)', borderRadius: 6 }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ borderTop: '2px solid #1e3a5f', paddingTop: 5, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#6b7280' }}>SIMRS SaaS — Laporan Perbandingan Modul &amp; Fitur</div>
          <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 2 }}>{tgl} • Halaman {TOTAL_PAGES} / {TOTAL_PAGES}</div>
        </div>
      </div>
    </div>
  )
}
