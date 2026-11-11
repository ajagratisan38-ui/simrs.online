'use client'

import { useRef, useState } from 'react'

const MODULES = [
  ['Sistem Inti & SaaS', [
    ['Autentikasi & Login', 'S', 'JWT + Refresh Token, Redis session, bcrypt', 'Login page, auto-refresh token, protected routes', ''],
    ['MFA (Two-Factor Auth)', 'S', 'TOTP speakeasy, QR code, verify/enable/disable', 'Setup MFA page, login MFA step', ''],
    ['RBAC (Role-Based Access)', 'S', 'checkPermission middleware, 8 roles x permissions', 'PermissionGate, usePermissions, sidebar filtering', ''],
    ['User Management', 'S', 'CRUD users, reset password, role assignment', '/admin/pengguna: create/edit form', ''],
    ['Multi-Tenancy', 'S', 'Schema-per-tenant PostgreSQL, auto-provisioning', 'Subdomain/slug routing, tenant-scoped data', ''],
    ['Super Admin Platform', 'S', 'SA Panel terpisah, owner/operator roles, requireOwner middleware, JWT saRole', 'SA layout indigo, 9 menu items, role badge, owner-only guards, detail tenant', ''],
    ['Subscription & Billing SaaS', 'S', '4 tier plans, renewal, change plan, MRR/ARR/planDistribution', 'SA 4-tab: Overview metrics/Kelola RS/Paket Langganan/Transaksi', ''],
    ['SaaS Registration & Provisioning', 'S', 'Self-registration, auto-approve trial, payment flow, auto-provision schema+user', 'Landing page, /daftar form, /daftar/pembayaran upload bukti, /daftar/status timeline', ''],
    ['Email Notifications', 'S', 'Nodemailer SMTP, 8 email templates branded HTML, subscription expiry worker', 'SA Test Email, SMTP config, expiring alerts', ''],
    ['Profil RS (Tenant)', 'S', 'Get/update profile, getStats', '/admin/rs: form identity + contact, stats', ''],
    ['Onboarding Wizard', 'S', '6 methods: status/profile/addRoom/addDoctor/complete/skip', '/onboarding 5-step: Welcome→Profil RS→Poliklinik→Dokter→Selesai', ''],
    ['Patient Portal', 'S', 'Portal JWT auth NIK+DOB, 6 methods profile/visits/bills/medicalSummaries', '/portal: login, dashboard, riwayat, tagihan, rekam-medis accordion', ''],
  ]],
  ['Klinik & Medis', [
    ['Manajemen Pasien', 'S', 'CRUD, auto no_RM, soft delete, merge, NIK check', 'List+search, create 3-step, detail tabs, edit', ''],
    ['Pendaftaran & Antrian', 'S', 'Visit+queue, business rules, call queue, status', 'Split layout, form 3-step, tiket cetak', ''],
    ['Display Antrian (TV)', 'S', 'Endpoint antrian existing', '/display-antrian: fullscreen dark, bell ding-dong, auto-refresh 10s', ''],
    ['Kiosk / Anjungan Mandiri', 'S', 'Kiosk cara_masuk enum, reuse registration', '/kiosk: 8-step flow, numpad touch, ticket print, auto-reset 60s', ''],
    ['Rekam Medis (SOAP)', 'S', 'SOAP CRUD, ICD-10/9-CM, prescription, template', 'Exam page, SOAP form, diagnosis picker, auto-save', ''],
    ['CPPT Multi-Profesi', 'S', 'Create/update/verify/delete/list, profesi filter', 'Timeline view, SOAP-IE form dialog, verify/edit/delete', ''],
    ['Pengkajian Keperawatan', 'S', '~60 kolom, auto-score Morse+Barthel+BMI+Nutrisi', '7 tab sections, summary cards, save/finalize/print', ''],
    ['Resume Medis', 'S', 'getResumeMedis: hospital+patient+visit+SOAP+dx+rx', 'A4 KOP RS, SOAP table, download PDF html2canvas+jsPDF', ''],
    ['General Consent', 'S', 'CRUD consent per visit/patient', 'Form persetujuan + cetak A4', ''],
    ['Formulir Edukasi Pasien', 'S', 'Education topics CRUD, patient education records', 'Topik Edukasi admin, form edukasi per visit', ''],
    ['IGD (Gawat Darurat)', 'S', 'Triase level, auto-queue prioritas, IGD fields', 'Dashboard triase, daftar pasien, form registrasi', ''],
    ['Rawat Inap', 'S', 'Admisi, bed mgmt, transfer, discharge, BOR/LOS', 'Bed overview, admisi form, discharge modal', ''],
    ['Discharge / Cara Keluar', 'S', '5 tipe: Sembuh/APS/Rujuk/Meninggal/Lain, auto bill', 'DischargeModal 2-step conditional fields, double confirm', ''],
    ['Dokter & Jadwal Praktik', 'S', '15 methods: schedule/fee/earnings CRUD', '/admin/dokter: list + 3-tab Jadwal/Tarif/Jasa Medis', ''],
    ['Logbook Dokter', 'S', 'Tindakan per dokter, stats, CSV export', 'Date filter, stats cards, table, export CSV', ''],
    ['Bedah / Operasi', 'S', 'CRUD+tim bedah+instrumen+anestesi+perioperatif', 'List priority sort, detail 5-tab: Info/Tim/Instrumen/Anestesi/Perioperatif', ''],
    ['MCU (Medical Check Up)', 'S', '16 methods: package CRUD+register auto-exam+inputResult+conclude 4 tipe+certificate number auto MCU/YYYY/MM/XXXX+stats+getCertificateData', '3-tab: Dashboard stats+conclusion dist / Pendaftaran list+search+filter+cancel / Paket card grid+toggle — Detail: progress ring+exams by kategori+inline result input+ConcludeDialog+CertificateDialog print A4 Surat Keterangan Sehat', ''],
  ]],
  ['Penunjang & Operasional', [
    ['Farmasi & Dispensing', 'S', 'Drug CRUD, FIFO dispensing, stock, expiry alerts', 'Dashboard tabs, dispensing page, stok obat, alerts', ''],
    ['Penjualan Obat Bebas', 'S', '4 methods, stock deduction, daily summary', 'POS-style, search obat, ringkasan harian', ''],
    ['Mutasi Barang (Amprah)', 'S', '7 methods, approve/complete/reject workflow', '/farmasi/mutasi: list + inline actions', ''],
    ['Purchase Order', 'S', 'Supplier CRUD, PO lifecycle 5 status, auto stock in', 'List + detail 5-step progress bar, receive dialog batch+expiry', ''],
    ['Stock Opname', 'S', 'Auto-populate items, input count, stock adjustments', 'List + detail count input, selisih highlight, complete/cancel', ''],
    ['Gudang Umum', 'S', 'Item CRUD, add stock, 7 kategori warehouse', '/gudang: CRUD + kategori filter + low stock alert', ''],
    ['Asuransi & Penjamin', 'S', '13 methods: master + patient insurance CRUD', '/admin/asuransi, registration form integrated', ''],
    ['Laboratorium', 'S', '12 methods, 46 params, 7 kategori, full workflow', 'Queue+stats, detail 2-step results+finalize+print', ''],
    ['Radiologi', 'S', '11 methods, 34 jenis, 6 modalitas (X-Ray/USG/CT/MRI/Mammo/Pano)', 'Queue+filter modalitas, detail bacaan+kesan+print', ''],
    ['Gizi / Nutrisi', 'S', 'ADIME, meal plans, food items, calc Harris-Benedict+Mifflin, food cost', '5-tab: ADIME/Kalkulator/Bahan Makanan/Meal Plans/Food Cost', ''],
    ['Kasir & Billing', 'S', 'Bill, payment, discount, summary, outstanding', 'Dashboard tabs, detail, payment modal, receipt print', ''],
    ['Akuntansi & Keuangan', 'S', '25+ methods: COA tree, jurnal+posting+reverse, auto-journal payment/PO, buku besar, neraca saldo, neraca, laba rugi, arus kas, fiscal period close', '6-tab: Dashboard/Jurnal Umum/Bagan Akun tree/Buku Besar/Neraca/Laba Rugi — 55 seed COA', ''],
    ['HRIS / Kepegawaian', 'S', '25+ methods: employees NIP auto-gen, departments, shifts, scheduling, attendance, leave 12d/yr, payroll PPH21 progressive+BPJS+lembur', '7-tab: Dashboard SDM/Data Pegawai/Departemen/Jadwal Dinas calendar/Absensi/Cuti/Penggajian slip', ''],
    ['Manajemen Aset', 'S', '14+ methods: CRUD+kode auto-gen per kategori, penyusutan GL+SM, pemeliharaan+kalibrasi, mutasi, stats, garansi alerts', '4-tab: Daftar Aset CRUD+filter+stats / Pemeliharaan perbaikan+kalibrasi / Mutasi pindah+hapus+jual+hibah / Penyusutan per tahun', ''],
  ]],
  ['Integrasi Eksternal', [
    ['BPJS VClaim+PCare+e-Klaim+Antrol', 'S', 'VClaim SEP+peserta+rujukan, PCare 6 methods, e-Klaim INACBG 5 methods, Aplicare bed, Antrol 12 methods+antrol_bookings table', '8-tab: Peserta/SEP/Rujukan/PCare/e-Klaim/Aplicare/Monitoring/Antrol — full mock mode', ''],
    ['SATUSEHAT FHIR', 'S', 'OAuth2, 13 FHIR R4 resource mappers, BullMQ sync worker', '5-tab + Resources tab with 13 resource cards auto/manual badges', ''],
    ['Migrasi Khanza', 'S', 'MySQL connector, 20 field mappers, batch migrator, verifier', '4-step wizard: Connect→Analyze→Migrate→Verify, progress polling', ''],
    ['Terminologi LOINC + KFA', 'S', '14 methods: search/categories/stats + mapping lab→LOINC, drug→KFA, auto-map similarity', '3-tab: LOINC 90+ codes/KFA 101 entries/Mapping with inline combobox + auto-match', ''],
    ['CDSS High-Alert & Drug Interactions', 'S', '18 methods: 5-check pipeline HA+interactions+LASA+maxDose+duplicate, pg_trgm similarity', 'CdssAlertBanner severity, admin 4-tab: HA/LASA-NORUM/Interaksi/Riwayat — 65 seed interactions', ''],
    ['TTE / Tanda Tangan Elektronik', 'S', '11 methods: SHA-512 hash, 4 provider (Internal/BSrE/VIDA/Privy), tamper detection', 'SignaturePad Canvas, SignDialog, TteBadge verify, admin stats+provider config', ''],
    ['SIRS Online (RL Kemenkes)', 'S', '25+ methods: config CRUD, 10 RL generators (RL1.3/3.2-3.12/4.1/5.1), indikator BOR/LOS/TOI/BTO/GDR/NDR, sendToKemenkes POST, testConnection, submissions log+stats', '3-tab: Laporan RL 10 cards with preview renderers+Kirim / Konfigurasi kode_rs+endpoint+mode / Riwayat stats+breakdown+history', ''],
    ['SIRANAP (Ketersediaan TT)', 'S', '12 methods: config, live bed data gender split, XML payload builder, sendToKemenkes POST XML+MD5 auth, testConnection, checkAndRunScheduled multi-tenant cron, BullMQ scheduler */15 cron', '3-tab: Ketersediaan TT summary cards+bed table+send / Konfigurasi credentials+auto_send+multi-time+test / Riwayat stats+last success+submission table', ''],
  ]],
  ['Administrasi & Pelaporan', [
    ['Dashboard & Statistik', 'S', '7 endpoints, Redis cache 60/300/900s, auto-refresh', 'Stat cards, line/pie/bar recharts, auto-refresh 60s', ''],
    ['Laporan & Export', 'S', 'CSV/XLSX multi-sheet/PDF A4 multi-section, 6 report types, auth download', '7 report cards, filter, chart, table, 3 format buttons', ''],
    ['Audit Trail', 'S', 'audit_logs table, middleware auto-log, API', '/admin/audit: log viewer with filters', ''],
    ['Import Data (CSV)', 'S', 'Parse CSV, import patients/drugs, dup check', '/admin/import: upload + result display', ''],
    ['Backup & Recovery', 'S', 'pg_dump+gzip, BullMQ scheduler 15min, retention cleanup, restore command gen', '3-tab: Overview stats/Riwayat create+download+delete+restore/Jadwal frequency+storage', ''],
  ]],
  ['Infrastruktur & DevOps', [
    ['Offline Mode & Sync', 'S', 'Dexie.js 7 tables, SyncManager, POST /api/sync/batch, timestamp conflict', 'Offline banner, sync indicator, /admin/sync 3-tab', ''],
    ['PWA Installable', 'S', 'Web Push API (web-push), VAPID keys, push_subscriptions table, subscribe/unsubscribe/send/broadcast endpoints', 'Install prompt banner, splash screen standalone, SW push handler+click, notification toggle in user dropdown, update prompt', ''],
    ['Dark Mode', 'S', 'next-themes provider', 'ThemeToggle light/dark/system in user dropdown', ''],
    ['Security Hardening', 'S', 'Helmet CSP/HSTS, rate limit Redis, sanitize, AES-256-GCM encrypt', 'MFA page, multi-session, audit', ''],
    ['Docker & Deployment', 'S', 'Dockerfile.web + Dockerfile.server multi-stage, docker-compose.production.yml', 'PostgreSQL+Redis+MinIO containers, backup.sh', ''],
    ['Panduan Pengguna', 'S', 'Role-based guide content', '/panduan: 11 role guides, step-by-step, tips, cetak', ''],
  ]],
] as const

const BELUM = [
  ['CSSD (Sterilisasi)', 'Penerimaan alat kotor, proses sterilisasi, distribusi, tracking siklus sterilisasi'],
  ['Fisioterapi / Rehabilitasi', 'Asesmen fisioterapi, rencana terapi, pelaksanaan, evaluasi perkembangan kondisi'],
  ['Hemodialisa', 'Tindakan hemodialisa, monitoring kondisi sebelum/selama/sesudah, jadwal rutin'],
  ['Vaksinasi', 'Jadwal vaksin, pemberian, riwayat vaksinasi pasien, stok vaksin'],
  ['Surveilans HAIs', 'Pantau infeksi terkait pelayanan (PPI/IPCN), indikator, pencegahan risiko infeksi'],
  ['Farmasi Klinis', 'Monitoring terapi obat, evaluasi penggunaan obat, konseling farmasi, visite apoteker'],
  ['Klaim Management', 'Coding INA-CBG, kelengkapan dokumen, pengajuan, verifikasi, monitoring status klaim'],
  ['Laporan Kustom Builder', 'Drag-and-drop: pilih kolom, filter, grouping tanpa coding'],
  ['Laundry / Linen', 'Pencucian, distribusi, sirkulasi linen RS, tracking kiloan/satuan'],
  ['WhatsApp Gateway', 'Reminder jadwal, notifikasi hasil lab, pengingat kontrol'],
  ['Telemedisin', 'Video call, chat konsultasi, e-prescription jarak jauh'],
  ['RIS/PACS Integration', 'DICOM viewer untuk gambar radiologi, integrasi RIS'],
  ['LIS Hardware (HL7/ASTM)', 'Koneksi alat lab auto-input hasil'],
  ['Analitik Prediktif (AI)', 'Prediksi kunjungan, early warning, demand forecasting obat'],
  ['Mobile App Native', 'Aplikasi mobile native (iOS/Android) untuk pasien — booking, riwayat, notifikasi'],
]

const STATUS_LABEL: Record<string, string> = { S: 'Selesai', P: 'Sebagian' }
const STATUS_BG: Record<string, string> = { S: '#dcfce7', P: '#fef9c3' }
const STATUS_FG: Record<string, string> = { S: '#166534', P: '#854d0e' }

const bdr = '1px solid #d1d5db'
const f = 'Segoe UI, Tahoma, Arial, sans-serif'
const thStyle: React.CSSProperties = {
  border: bdr,
  padding: '4px 6px',
  background: '#f3f4f6',
  fontSize: 9,
  textAlign: 'left',
  fontWeight: 600,
  textTransform: 'uppercase',
}

function Badge({ s }: { s: string }) {
  return (
    <span
      style={{
        background: STATUS_BG[s],
        color: STATUS_FG[s],
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 600,
        display: 'inline-block',
      }}
    >
      {STATUS_LABEL[s]}
    </span>
  )
}

function ModuleTable({
  items,
}: {
  items: readonly (readonly [string, string, string, string, string])[]
}) {
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: '17%' }}>Modul</th>
          <th style={{ ...thStyle, width: '7%' }}>Status</th>
          <th style={{ ...thStyle, width: '33%' }}>Backend</th>
          <th style={{ ...thStyle, width: '43%' }}>Frontend</th>
        </tr>
      </thead>
      <tbody>
        {items.map((m, i) => (
          <tr key={m[0]} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
            <td style={{ border: bdr, padding: '3px 6px', fontSize: 9, fontWeight: 600 }}>
              {m[0]}
            </td>
            <td style={{ border: bdr, padding: '3px 6px', fontSize: 9 }}>
              <Badge s={m[1]} />
            </td>
            <td style={{ border: bdr, padding: '3px 6px', fontSize: 9 }}>{m[2]}</td>
            <td style={{ border: bdr, padding: '3px 6px', fontSize: 9 }}>
              {m[3]}
              {m[4] && (
                <div
                  style={{
                    fontSize: 8,
                    color: '#92400e',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 2,
                    padding: '1px 4px',
                    marginTop: 2,
                  }}
                >
                  ⚠ {m[4]}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CategoryHeader({
  name,
  items,
}: {
  name: string
  items: readonly (readonly [string, string, string, string, string])[]
}) {
  const done = items.filter((m) => m[1] === 'S').length
  const part = items.filter((m) => m[1] === 'P').length
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
      {name}{' '}
      <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 400 }}>
        ({items.length} modul — {done} selesai
        {part > 0 ? `, ${part} sebagian` : ''})
      </span>
    </div>
  )
}

function SectionTitle({ num, title }: { num: number; title: string }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#1e40af',
        borderBottom: '2px solid #3b82f6',
        paddingBottom: 2,
        marginBottom: 8,
      }}
    >
      {num}. {title}
    </div>
  )
}

function PageFooter({ page, total, tgl }: { page: number; total: number; tgl: string }) {
  return (
    <div
      style={{
        borderTop: '1px solid #e5e7eb',
        paddingTop: 5,
        marginTop: 'auto',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#9ca3af',
      }}
    >
      <span>SIMRS SaaS Progress Report — {tgl}</span>
      <span>
        Halaman {page} / {total}
      </span>
    </div>
  )
}

const pageBase: React.CSSProperties = {
  fontFamily: f,
  width: 794,
  minHeight: 1100,
  padding: '24px 30px 14px',
  color: '#1a1a1a',
  fontSize: 10,
  lineHeight: 1.45,
  background: '#ffffff',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
}

export default function ProgressReportPage() {
  const pagesRef = useRef<(HTMLDivElement | null)[]>([])
  const [generating, setGenerating] = useState(false)
  const TOTAL_PAGES = 6

  const allMods = MODULES.flatMap(([, items]) => items)
  const total = allMods.length
  const selesai = allMods.filter((m) => m[1] === 'S').length
  const sebagian = allMods.filter((m) => m[1] === 'P').length
  const pct = Math.round(((selesai + sebagian * 0.5) / total) * 100)
  const tgl = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        const imgRatio = canvas.height / canvas.width
        const drawW = pdfW
        const drawH = pdfW * imgRatio

        if (i > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, 0, drawW, Math.min(drawH, pdfH))
      }

      pdf.save('SIMRS-SaaS-Progress-Report.pdf')
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('Gagal generate PDF. Coba lagi.')
    } finally {
      setGenerating(false)
    }
  }

  const sebagianMods = allMods.filter((m) => m[1] === 'P')

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh', padding: '20px 0' }}>
      {/* Download Button */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <button
          onClick={handleDownloadPDF}
          disabled={generating}
          style={{
            padding: '12px 40px',
            background: generating ? '#9ca3af' : '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: generating ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {generating ? '⏳ Generating PDF...' : `📄 Download PDF (${TOTAL_PAGES} Halaman)`}
        </button>
      </div>

      {/* ═══════════ PAGE 1: Header + Ringkasan + Tech Stack ═══════════ */}
      <div ref={setPageRef(0)} style={{ ...pageBase, margin: '0 auto 20px' }}>
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 14,
            borderBottom: '3px solid #1e40af',
            paddingBottom: 8,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
            SIMRS SaaS
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 2 }}>
            Laporan Progress Pengembangan
          </div>
          <div style={{ color: '#6b7280', fontSize: 10 }}>
            Sistem Informasi Manajemen Rumah Sakit berbasis Software-as-a-Service
          </div>
          <div style={{ color: '#9ca3af', fontSize: 9, marginTop: 3 }}>Tanggal: {tgl}</div>
        </div>

        <SectionTitle num={1} title="Ringkasan Eksekutif" />

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[
            { v: total, l: 'Total Modul', c: '#1e40af', bg: '#eff6ff' },
            { v: selesai, l: 'Selesai', c: '#16a34a', bg: '#f0fdf4' },
            { v: sebagian, l: 'Sebagian', c: '#ca8a04', bg: '#fefce8' },
            { v: BELUM.length, l: 'Belum Dibangun', c: '#dc2626', bg: '#fef2f2' },
          ].map((s) => (
            <div
              key={s.l}
              style={{
                flex: 1,
                border: bdr,
                borderRadius: 6,
                padding: '10px 8px',
                textAlign: 'center',
                background: s.bg,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div
                style={{
                  fontSize: 8,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: 0.3,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            height: 18,
            background: '#e5e7eb',
            borderRadius: 9,
            overflow: 'hidden',
            marginBottom: 10,
            border: '1px solid #d1d5db',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #16a34a, #22c55e)',
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {pct}% Progress Keseluruhan
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { v: '1', l: 'Consolidated Migration', c: '#7c3aed', bg: '#f5f3ff' },
            { v: '400+', l: 'API Endpoints', c: '#0891b2', bg: '#ecfeff' },
            { v: '90+', l: 'Halaman UI', c: '#ea580c', bg: '#fff7ed' },
            { v: '13', l: 'Test Files', c: '#059669', bg: '#ecfdf5' },
          ].map((s) => (
            <div
              key={s.l}
              style={{
                flex: 1,
                border: bdr,
                borderRadius: 6,
                padding: '8px 6px',
                textAlign: 'center',
                background: s.bg,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 8, color: '#6b7280', textTransform: 'uppercase' }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <SectionTitle num={2} title="Technology Stack" />
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 10 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '20%' }}>Lapisan</th>
              <th style={thStyle}>Teknologi</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Frontend', 'Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui'],
              ['State Mgmt', 'Zustand + TanStack Query (React Query)'],
              ['Backend', 'Node.js 20+, Express 4, TypeScript'],
              ['Database', 'PostgreSQL 16 (schema-per-tenant multi-tenancy)'],
              ['Cache & Queue', 'Redis 7 + BullMQ (backup scheduler, sync, FHIR worker, expiry)'],
              ['Offline', 'Dexie.js (IndexedDB wrapper) — 7 tables, SyncManager'],
              ['Auth', 'JWT + Refresh Token + MFA (TOTP speakeasy) + Portal JWT'],
              ['Charts', 'Recharts (lazy-loaded via next/dynamic)'],
              ['PDF/Excel', 'html2canvas-pro + jsPDF, ExcelJS multi-sheet, PDFKit'],
              ['Email', 'Nodemailer SMTP, 8 branded HTML templates'],
              ['Container', 'Docker multi-stage + Docker Compose production'],
              ['Monorepo', 'Turborepo + pnpm workspaces (3 packages shared)'],
            ].map(([k, v], i) => (
              <tr key={k} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
                <td style={{ border: bdr, padding: '3px 7px', fontSize: 9, fontWeight: 600 }}>
                  {k}
                </td>
                <td style={{ border: bdr, padding: '3px 7px', fontSize: 9 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <PageFooter page={1} total={TOTAL_PAGES} tgl={tgl} />
      </div>

      {/* ═══════════ PAGE 2: Sistem Inti & SaaS ═══════════ */}
      <div ref={setPageRef(1)} style={{ ...pageBase, margin: '0 auto 20px' }}>
        <SectionTitle num={3} title="Detail Progress per Modul" />

        <CategoryHeader name={MODULES[0][0] as string} items={MODULES[0][1]} />
        <ModuleTable items={MODULES[0][1]} />

        <div style={{ marginTop: 12 }}>
          <CategoryHeader name={MODULES[1][0] as string} items={MODULES[1][1]} />
          <ModuleTable items={MODULES[1][1]} />
        </div>

        <div style={{ flex: 1 }} />
        <PageFooter page={2} total={TOTAL_PAGES} tgl={tgl} />
      </div>

      {/* ═══════════ PAGE 3: Penunjang + Integrasi ═══════════ */}
      <div ref={setPageRef(2)} style={{ ...pageBase, margin: '0 auto 20px' }}>
        <div
          style={{
            fontSize: 10,
            color: '#6b7280',
            marginBottom: 6,
            fontStyle: 'italic',
          }}
        >
          Lanjutan — Detail Progress per Modul
        </div>

        <CategoryHeader name={MODULES[2][0] as string} items={MODULES[2][1]} />
        <ModuleTable items={MODULES[2][1]} />

        <div style={{ marginTop: 12 }}>
          <CategoryHeader name={MODULES[3][0] as string} items={MODULES[3][1]} />
          <ModuleTable items={MODULES[3][1]} />
        </div>

        <div style={{ flex: 1 }} />
        <PageFooter page={3} total={TOTAL_PAGES} tgl={tgl} />
      </div>

      {/* ═══════════ PAGE 4: Admin + Infra + SaaS Architecture ═══════════ */}
      <div ref={setPageRef(3)} style={{ ...pageBase, margin: '0 auto 20px' }}>
        <div
          style={{
            fontSize: 10,
            color: '#6b7280',
            marginBottom: 6,
            fontStyle: 'italic',
          }}
        >
          Lanjutan — Detail Progress per Modul
        </div>

        <CategoryHeader name={MODULES[4][0] as string} items={MODULES[4][1]} />
        <ModuleTable items={MODULES[4][1]} />

        <div style={{ marginTop: 12 }}>
          <CategoryHeader name={MODULES[5][0] as string} items={MODULES[5][1]} />
          <ModuleTable items={MODULES[5][1]} />
        </div>

        <div style={{ marginTop: 16 }}>
          <SectionTitle num={4} title="Arsitektur SaaS Multi-Tenant" />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '20%' }}>Aspek</th>
                <th style={thStyle}>Detail Implementasi</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Multi-Tenancy',
                  'Schema-per-tenant PostgreSQL. create_tenant_schema() PL/pgSQL auto-provisions 40+ tables, indexes, triggers, seed data. Subdomain routing production + path-based dev.',
                ],
                [
                  'SaaS Registration',
                  'Landing page → self-register → trial auto-approve / paid → upload bukti bayar → SA verifikasi → auto-provision tenant+schema+admin user → email notifikasi.',
                ],
                [
                  'Super Admin Panel',
                  'Layout indigo terpisah di /sa. 2 role: Owner (akses penuh) + Operator (operasional). requireOwner middleware. 9 halaman: Dashboard, Registrations, Tenants, Detail, Payments, Monitoring, Plans, Settings, Super Admins.',
                ],
                [
                  'Subscription',
                  '4 tier: Trial (free, 5 user) / Basic (Rp1.5M, 20 user) / Professional (Rp5M, 60 user) / Enterprise (Rp10M, unlimited). Renewal, change plan, MRR/ARR analytics.',
                ],
                [
                  'Patient Portal',
                  'Login NIK+DOB terpisah dengan portal JWT 4h. Dashboard, riwayat kunjungan, tagihan, rekam medis read-only. UU PDP compliant.',
                ],
                [
                  'Onboarding',
                  '5-step wizard setelah RS pertama kali login: Welcome → Profil RS → Poliklinik → Dokter → Selesai.',
                ],
              ].map(([k, v], i) => (
                <tr key={k} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
                  <td style={{ border: bdr, padding: '4px 7px', fontSize: 9, fontWeight: 600 }}>
                    {k}
                  </td>
                  <td style={{ border: bdr, padding: '4px 7px', fontSize: 9 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1 }} />
        <PageFooter page={4} total={TOTAL_PAGES} tgl={tgl} />
      </div>

      {/* ═══════════ PAGE 5: Sebagian Detail + Roadmap + Arsitektur ═══════════ */}
      <div ref={setPageRef(4)} style={{ ...pageBase, margin: '0 auto 20px' }}>
        {sebagianMods.length > 0 && (
          <>
            <SectionTitle num={5} title="Modul Sebagian Selesai — Detail Kekurangan" />
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>
              Modul berikut sudah dibangun namun masih ada fitur yang belum lengkap:
            </div>
            {sebagianMods.map((m) => (
              <div
                key={m[0]}
                style={{
                  padding: '6px 10px',
                  border: bdr,
                  borderLeft: '3px solid #eab308',
                  borderRadius: 4,
                  marginBottom: 6,
                  background: '#fffbeb',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e' }}>⚠ {m[0]}</div>
                <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>{m[4]}</div>
              </div>
            ))}
          </>
        )}

        <div style={{ marginTop: sebagianMods.length > 0 ? 14 : 0 }}>
          <SectionTitle num={sebagianMods.length > 0 ? 6 : 5} title="Modul Belum Dibangun (Roadmap)" />
          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>
            Modul berikut ada di roadmap tetapi belum mulai dikerjakan:
          </div>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '4%' }}>No</th>
                <th style={{ ...thStyle, width: '26%' }}>Modul</th>
                <th style={thStyle}>Deskripsi Fitur</th>
              </tr>
            </thead>
            <tbody>
              {BELUM.map(([nama, desc], i) => (
                <tr key={nama} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
                  <td
                    style={{ border: bdr, padding: '3px 6px', fontSize: 9, textAlign: 'center' }}
                  >
                    {i + 1}
                  </td>
                  <td style={{ border: bdr, padding: '3px 6px', fontSize: 9, fontWeight: 600 }}>
                    {nama}
                  </td>
                  <td style={{ border: bdr, padding: '3px 6px', fontSize: 9 }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16 }}>
          <SectionTitle num={sebagianMods.length > 0 ? 7 : 6} title="Keamanan & Compliance" />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '20%' }}>Aspek</th>
                <th style={thStyle}>Implementasi</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Authentication',
                  'JWT access + refresh token rotation, MFA TOTP (speakeasy), multi-session limit, Redis session store, portal JWT terpisah.',
                ],
                [
                  'Authorization',
                  'RBAC 8 role × fine-grained permissions, checkPermission middleware, SA owner/operator split, requireOwner guard.',
                ],
                [
                  'Data Protection',
                  'AES-256-GCM enkripsi data sensitif, Helmet CSP/HSTS/X-Frame, input sanitization, bcrypt salt ≥12.',
                ],
                [
                  'Rate Limiting',
                  'Redis-backed: login 5req/15min, API 100req/min per tenant.',
                ],
                [
                  'Audit & TTE',
                  'Audit trail middleware auto-log semua akses, TTE SHA-512 hash + 4 provider (Internal/BSrE/VIDA/Privy) + tamper detection.',
                ],
                [
                  'CDSS Safety',
                  '5-check pipeline: high-alert, drug interactions (65 seed), LASA pg_trgm similarity, max dose, duplicate therapy.',
                ],
                [
                  'Backup',
                  'pg_dump+gzip automated, BullMQ scheduler, retention policy, restore validation + command gen.',
                ],
              ].map(([k, v], i) => (
                <tr key={k} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
                  <td style={{ border: bdr, padding: '4px 7px', fontSize: 9, fontWeight: 600 }}>
                    {k}
                  </td>
                  <td style={{ border: bdr, padding: '4px 7px', fontSize: 9 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1 }} />
        <PageFooter page={5} total={TOTAL_PAGES} tgl={tgl} />
      </div>

      {/* ═══════════ PAGE 6: Summary + Highlights ═══════════ */}
      <div ref={setPageRef(5)} style={{ ...pageBase, margin: '0 auto 20px' }}>
        <SectionTitle num={sebagianMods.length > 0 ? 8 : 7} title="Integrasi Pemerintah" />
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div
            style={{
              flex: 1,
              border: bdr,
              borderRadius: 6,
              padding: '8px 10px',
              background: '#f0fdf4',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
              🏥 BPJS Kesehatan
            </div>
            <div
              style={{ fontSize: 9, color: '#374151', display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <span>• VClaim: peserta, SEP, rujukan, prosedur, faskes, dokter</span>
              <span>• PCare: pendaftaran, kunjungan, riwayat, obat DPHO</span>
              <span>• e-Klaim/INACBG: grouping, claim CRUD, status</span>
              <span>• Aplicare: bed availability + BOR per kelas</span>
              <span>• Antrol: jadwal dokter, tambah/update/batal antrean, task list, dashboard</span>
              <span>• Auth: HMAC-SHA256 + AES decrypt, full mock mode</span>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              border: bdr,
              borderRadius: 6,
              padding: '8px 10px',
              background: '#eff6ff',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
              🇮🇩 SATUSEHAT (Kemenkes)
            </div>
            <div
              style={{ fontSize: 9, color: '#374151', display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <span>• OAuth2 client credentials + Redis token cache</span>
              <span>• 13 FHIR R4 resources mapped:</span>
              <span style={{ paddingLeft: 8 }}>
                Patient, Encounter, Condition, Observation, MedicationRequest, Procedure,
                AllergyIntolerance, MedicationDispense, ServiceRequest, DiagnosticReport,
                Composition, Practitioner, Location
              </span>
              <span>• BullMQ async sync worker</span>
              <span>• Auto-sync on visit complete</span>
            </div>
          </div>
        </div>

        <SectionTitle num={sebagianMods.length > 0 ? 9 : 8} title="Kesimpulan" />
        <div
          style={{
            border: bdr,
            borderRadius: 6,
            padding: '10px 12px',
            background: '#f0fdf4',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 10, lineHeight: 1.6 }}>
            <strong>Progress keseluruhan: {pct}%</strong> — dari {total} modul yang
            direncanakan,{' '}
            <strong style={{ color: '#16a34a' }}>{selesai} modul telah selesai</strong>
            {sebagian > 0 && (
              <>
                {' '}dan{' '}
                <strong style={{ color: '#ca8a04' }}>{sebagian} modul sebagian selesai</strong>
              </>
            )}
            . Tersisa <strong style={{ color: '#dc2626' }}>{BELUM.length} modul</strong> dalam
            roadmap yang belum dimulai.
          </div>
          <div style={{ fontSize: 9, color: '#6b7280', marginTop: 6 }}>
            Sistem sudah mencakup seluruh alur utama operasional RS: pendaftaran → pemeriksaan →
            resep → dispensing → billing → pembayaran, ditambah modul penunjang (Lab, Radiologi,
            Bedah, Gizi, MCU, Gudang), integrasi BPJS 5 layanan &amp; SATUSEHAT 13 FHIR resources,
            SIRS Online 10 laporan RL &amp; SIRANAP ketersediaan TT otomatis ke Kemenkes,
            akuntansi lengkap, HRIS/kepegawaian, CDSS keamanan obat, serta arsitektur SaaS
            multi-tenant dengan portal pasien dan onboarding wizard.
          </div>
        </div>

        <div
          style={{
            border: bdr,
            borderRadius: 6,
            padding: '8px 12px',
            background: '#eff6ff',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
            Highlight Fitur Unggulan:
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2px 14px',
              fontSize: 9,
            }}
          >
            {[
              'SaaS multi-tenant schema-per-tenant',
              'SA Panel owner/operator role enforcement',
              'Self-registration + auto-provisioning',
              'Patient Portal login NIK+DOB',
              'Onboarding wizard 5-step RS baru',
              'Offline-first + sinkronisasi otomatis',
              'BPJS VClaim+PCare+e-Klaim+Aplicare+Antrol',
              'SATUSEHAT FHIR 13 resources + worker',
              'Akuntansi: jurnal, neraca, laba rugi, arus kas',
              'HRIS: jadwal dinas, absensi, payroll PPH21',
              'CDSS 5-check drug safety pipeline',
              'TTE 4 provider + tamper detection',
              'Terminologi LOINC 90+ / KFA 101 kode',
              'Kiosk Anjungan Mandiri 8-step + bell',
              'Display Antrian TV fullscreen',
              'Pengkajian Keperawatan auto-scoring',
              'CPPT Multi-Profesi timeline',
              'Bedah 5-tab operasi lengkap',
              'MCU paket+exam+conclusion+sertifikat',
              'SIRS Online 10 RL + indikator rumah sakit',
              'SIRANAP ketersediaan TT auto-send',
              'Purchase Order + receive tracking',
              'Stock Opname auto-populate + selisih',
              'Resume Medis PDF A4 download',
              'Laporan XLSX multi-sheet + PDF',
              'Backup automated + restore guide',
              'Email notifikasi 8 template',
              'PWA installable + push notification',
            ].map((h) => (
              <div key={h} style={{ display: 'flex', gap: 3, alignItems: 'baseline' }}>
                <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 8 }}>✓</span>{' '}
                <span>{h}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Final footer */}
        <div
          style={{ borderTop: '2px solid #1e40af', paddingTop: 6, textAlign: 'center' }}
        >
          <div style={{ fontSize: 10, color: '#6b7280' }}>
            SIMRS SaaS — Laporan Progress Pengembangan
          </div>
          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>
            {tgl} • Halaman {TOTAL_PAGES} / {TOTAL_PAGES}
          </div>
        </div>
      </div>
    </div>
  )
}
