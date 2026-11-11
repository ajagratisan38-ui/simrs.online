import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

const OUTPUT_PATH = path.resolve(
  __dirname, '..', '..', '..', 'docs', 'SIMRS-RBAC-Hak-Akses-Pengguna.pdf',
)

const TEAL = '#0d9488'
const GRAY = '#6b7280'
const DARK = '#1f2937'
const WHITE = '#ffffff'

interface RoleCard {
  label: string
  deskripsi: string
  bisa: string[]
  tidakBisa: string[]
  menu: string[]
}

const ROLES: RoleCard[] = [
  {
    label: 'Super Admin',
    deskripsi: 'Administrator platform SaaS yang mengelola seluruh tenant rumah sakit.',
    bisa: [
      'Membuat, mengedit, dan menonaktifkan tenant RS',
      'Melihat dashboard & statistik platform',
      'Melihat laporan seluruh RS',
      'Melihat audit log',
      'Mengelola konfigurasi platform',
    ],
    tidakBisa: [
      'Mengakses data pasien',
      'Mengakses rekam medis',
      'Mengakses farmasi, kasir, lab, radiologi',
    ],
    menu: ['Dashboard', 'Pengaturan (Kelola RS, Migrasi Khanza)', 'Panduan'],
  },
  {
    label: 'Admin RS',
    deskripsi: 'Administrator rumah sakit dengan akses penuh ke semua modul.',
    bisa: [
      'Akses penuh ke seluruh modul tanpa terkecuali',
      'Mengelola pengguna (tambah, edit, hapus, reset password)',
      'Mengelola pengaturan RS (profil, jadwal dokter, asuransi)',
      'Melihat laporan, audit log, dan backup',
      'Konfigurasi SATUSEHAT, BPJS, dan integrasi lainnya',
    ],
    tidakBisa: [],
    menu: ['Semua menu tampil (full access)'],
  },
  {
    label: 'Dokter',
    deskripsi: 'Tenaga medis yang memeriksa pasien, menulis rekam medis, diagnosis, dan resep.',
    bisa: [
      'Membuat, mengedit, dan finalisasi rekam medis (SOAP)',
      'Membuat diagnosis (ICD-10) dan tindakan (ICD-9-CM)',
      'Membuat resep obat & pengkajian',
      'Melihat & mengupdate data pasien',
      'Melihat hasil laboratorium dan radiologi',
      'Melihat stok obat (read-only) & jadwal praktik',
    ],
    tidakBisa: [
      'Mendaftarkan pasien baru',
      'Mengelola stok obat / dispensing',
      'Mengelola tagihan & pembayaran',
      'Mengelola pengguna / pengaturan RS',
    ],
    menu: ['Dashboard', 'IGD', 'Rawat Inap', 'Pasien', 'Rekam Medis',
      'Lab', 'Radiologi', 'Bedah', 'Gizi', 'Logbook', 'Panduan'],
  },
  {
    label: 'Perawat',
    deskripsi: 'Tenaga keperawatan yang melakukan pengkajian dan membantu pelayanan klinis.',
    bisa: [
      'Melihat & mengupdate data pasien',
      'Membuat pengkajian keperawatan (Morse, Barthel, nyeri)',
      'Melihat rekam medis & resep (read-only)',
      'Melihat order & hasil laboratorium',
    ],
    tidakBisa: [
      'Membuat/edit rekam medis (SOAP) & resep obat',
      'Finalisasi rekam medis',
      'Mengakses farmasi, kasir, laporan',
      'Mengelola pengguna / pengaturan',
    ],
    menu: ['Dashboard', 'IGD', 'Rawat Inap', 'Pasien', 'Rekam Medis', 'Gizi', 'Panduan'],
  },
  {
    label: 'Apoteker',
    deskripsi: 'Tenaga farmasi yang mengelola dispensing obat, stok, dan purchase order.',
    bisa: [
      'Melihat resep masuk dari dokter',
      'Dispensing obat ke pasien',
      'Mengelola stok obat (CRUD, batch, expired)',
      'Mengelola mutasi barang & purchase order',
      'Stock opname & penjualan obat bebas (OTC)',
      'Melihat data pasien (untuk verifikasi)',
    ],
    tidakBisa: [
      'Mengakses rekam medis / SOAP',
      'Membuat resep (hanya bisa membaca)',
      'Mengelola tagihan & pembayaran',
      'Mendaftarkan pasien & mengelola pengguna',
    ],
    menu: ['Dashboard', 'Farmasi (Resep, Stok, Mutasi, PO, OTC, Stock Opname)',
      'Gudang', 'Panduan'],
  },
  {
    label: 'Kasir',
    deskripsi: 'Petugas kasir yang mengelola tagihan pasien dan menerima pembayaran.',
    bisa: [
      'Melihat dan mengelola tagihan (generate, diskon)',
      'Menerima pembayaran (tunai, debit, kredit, transfer)',
      'Mencetak kuitansi pembayaran',
      'Melihat data pasien & ringkasan harian kasir',
    ],
    tidakBisa: [
      'Mengakses rekam medis',
      'Mengakses farmasi / stok obat',
      'Mendaftarkan pasien',
      'Mengakses laboratorium / radiologi',
      'Mengelola pengguna / pengaturan',
    ],
    menu: ['Dashboard', 'BPJS', 'Kasir', 'Penjualan Bebas', 'Panduan'],
  },
  {
    label: 'Pendaftaran',
    deskripsi: 'Petugas front office yang mendaftarkan pasien dan mengelola antrian.',
    bisa: [
      'Membuat pasien baru & mengedit data pasien',
      'Membuat kunjungan baru (rawat jalan, IGD)',
      'Mengelola antrian (panggil, skip, selesai)',
      'Membatalkan pendaftaran',
      'Melihat jadwal praktik dokter',
    ],
    tidakBisa: [
      'Mengakses rekam medis',
      'Mengakses farmasi / stok obat',
      'Mengelola tagihan / pembayaran',
      'Mengakses lab / radiologi & mengelola pengaturan',
    ],
    menu: ['Dashboard', 'Pendaftaran (Daftar Baru, Antrian)',
      'IGD', 'Rawat Inap', 'Pasien', 'BPJS', 'Panduan'],
  },
  {
    label: 'Rekam Medis',
    deskripsi: 'Petugas yang mengelola berkas rekam medis, coding ICD, dan kelengkapan dokumen.',
    bisa: [
      'Melihat data pasien',
      'Melihat & mengedit rekam medis (coding, kelengkapan)',
      'Melihat pengkajian keperawatan',
      'Melihat data pendaftaran / kunjungan',
    ],
    tidakBisa: [
      'Membuat rekam medis baru (SOAP)',
      'Finalisasi rekam medis',
      'Mengakses farmasi, kasir, lab, radiologi',
      'Mendaftarkan pasien baru & mengelola pengaturan',
    ],
    menu: ['Dashboard', 'Pasien', 'Rekam Medis', 'Panduan'],
  },
  {
    label: 'Manajemen',
    deskripsi: 'Direksi / manajemen RS yang memantau kinerja RS (read-only).',
    bisa: [
      'Melihat dashboard statistik RS',
      'Melihat semua laporan & export (Excel, PDF)',
      'Melihat data pasien, pendaftaran, tagihan (read-only)',
    ],
    tidakBisa: [
      'Membuat atau mengubah data apapun',
      'Mengakses rekam medis & farmasi',
      'Mengelola pengguna / pengaturan',
    ],
    menu: ['Dashboard', 'Laporan', 'Panduan'],
  },
  {
    label: 'Analis Laboratorium',
    deskripsi: 'Petugas lab yang memproses sampel dan menginput hasil pemeriksaan.',
    bisa: [
      'Melihat order pemeriksaan lab masuk',
      'Menerima sampel & memproses pemeriksaan',
      'Menginput dan memvalidasi hasil lab',
      'Melihat data pasien (untuk verifikasi)',
    ],
    tidakBisa: [
      'Mengakses rekam medis / SOAP',
      'Mengakses farmasi, kasir, radiologi',
      'Mendaftarkan pasien & mengelola pengaturan',
    ],
    menu: ['Dashboard', 'Laboratorium', 'Panduan'],
  },
  {
    label: 'Radiografer',
    deskripsi: 'Petugas radiologi yang memproses pemeriksaan dan menginput hasil bacaan.',
    bisa: [
      'Melihat order pemeriksaan radiologi masuk',
      'Memproses pemeriksaan (X-Ray, USG, CT, MRI, dll)',
      'Menginput hasil bacaan & kesan radiologis',
      'Melihat data pasien (untuk verifikasi)',
    ],
    tidakBisa: [
      'Mengakses rekam medis / SOAP',
      'Mengakses farmasi, kasir, laboratorium',
      'Mendaftarkan pasien & mengelola pengaturan',
    ],
    menu: ['Dashboard', 'Radiologi', 'Panduan'],
  },
]

function generate() {
  const dir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const TOTAL = 1 + ROLES.length
  const PW = 595.28
  const PH = 841.89
  const ML = 50
  const W = PW - 100
  const LINE_H = 15

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    autoFirstPage: false,
    info: {
      Title: 'SIMRS SaaS — Hak Akses Pengguna (RBAC)',
      Author: 'SIMRS SaaS',
    },
  })

  const stream = fs.createWriteStream(OUTPUT_PATH)
  doc.pipe(stream)

  // PDFKit advances doc.y after every text() call, and triggers
  // continueOnNewPage when doc.y passes the bottom margin.
  // We reset doc.y after every text call to prevent phantom pages.
  const txt = (
    s: string, x: number, y: number,
    font: string, size: number, color: string,
    opts?: { align?: 'center' | 'right'; width?: number },
  ) => {
    doc.font(font).fontSize(size).fillColor(color)
    doc.text(s, x, y, {
      lineBreak: false,
      width: opts?.width ?? W,
      align: opts?.align,
    })
    doc.y = 50
  }

  const footerLine = (pageNum: number) => {
    const fy = PH - 48
    doc.moveTo(ML, fy).lineTo(ML + W, fy)
      .lineWidth(0.5).strokeColor('#d1d5db').stroke()
    const savedBottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    txt('SIMRS SaaS \u2014 Hak Akses Pengguna', ML, fy + 5, 'Helvetica', 7.5, GRAY)
    txt(
      `Halaman ${pageNum} dari ${TOTAL}`, ML, fy + 5,
      'Helvetica', 7.5, GRAY, { align: 'right' },
    )
    doc.page.margins.bottom = savedBottom
  }

  // ═══════════════ PAGE 1 — COVER ═══════════════
  doc.addPage({ size: 'A4', margin: 50 })
  doc.rect(0, 0, PW, PH).fill('#f0fdfa')
  doc.rect(ML, 200, W, 3).fill(TEAL)

  txt('SIMRS SaaS', ML, 225, 'Helvetica-Bold', 32, TEAL, { align: 'center' })
  txt('Sistem Informasi Manajemen Rumah Sakit', ML, 264, 'Helvetica', 15, DARK, { align: 'center' })
  doc.rect(ML + 100, 296, W - 200, 0.5).fill('#d1d5db')

  txt('Hak Akses Pengguna', ML, 316, 'Helvetica-Bold', 20, DARK, { align: 'center' })
  txt('Role-Based Access Control (RBAC)', ML, 344, 'Helvetica', 12, GRAY, { align: 'center' })
  doc.rect(ML + 140, 372, W - 280, 0.5).fill('#d1d5db')

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  txt(`Versi 1.0  \u2014  ${today}`, ML, 388, 'Helvetica', 10, GRAY, { align: 'center' })

  txt('Daftar 11 Role Pengguna:', ML + 80, 440, 'Helvetica-Bold', 11, DARK)

  let sy = 462
  for (let i = 0; i < ROLES.length; i++) {
    const bg = i % 2 === 0 ? '#e6fffa' : '#f0fdfa'
    doc.rect(ML + 60, sy - 2, W - 120, 17).fill(bg)
    txt(`${String(i + 1).padStart(2, ' ')}.`, ML + 66, sy, 'Helvetica-Bold', 9, TEAL)
    txt(ROLES[i]!.label, ML + 88, sy, 'Helvetica-Bold', 9, DARK)
    sy += 17
  }

  txt(
    'Detail hak akses masing-masing role pada halaman berikutnya.',
    ML, sy + 20, 'Helvetica', 8.5, GRAY, { align: 'center' },
  )

  // ═══════════════ ROLE PAGES (1 per role) ═══════════════
  for (let ri = 0; ri < ROLES.length; ri++) {
    const role = ROLES[ri]!
    doc.addPage({ size: 'A4', margin: 50 })
    doc.rect(0, 0, PW, PH).fill(WHITE)

    let y = 50

    // Header bar
    doc.rect(ML, y, W, 32).fill(TEAL)
    txt(role.label, ML + 12, y + 8, 'Helvetica-Bold', 16, WHITE)
    txt(
      `Role ${ri + 1} / ${ROLES.length}`, ML + 12, y + 10,
      'Helvetica', 9, '#99f6e4', { align: 'right', width: W - 24 },
    )
    y += 42

    // Deskripsi
    txt(role.deskripsi, ML + 8, y, 'Helvetica', 10, GRAY)
    y += 22

    // Separator
    doc.rect(ML, y, W, 0.5).fill('#e5e7eb')
    y += 12

    // ── Yang Bisa Dilakukan ──
    doc.rect(ML, y, W, 24).fill('#ecfdf5')
    txt('Yang Bisa Dilakukan', ML + 10, y + 6, 'Helvetica-Bold', 11, '#059669')
    y += 32

    for (const item of role.bisa) {
      txt(`\u2022   ${item}`, ML + 20, y, 'Helvetica', 10, DARK)
      y += LINE_H
    }
    y += 16

    // ── Yang Tidak Bisa Dilakukan ──
    if (role.tidakBisa.length > 0) {
      doc.rect(ML, y, W, 24).fill('#fef2f2')
      txt('Yang Tidak Bisa Dilakukan', ML + 10, y + 6, 'Helvetica-Bold', 11, '#dc2626')
      y += 32

      for (const item of role.tidakBisa) {
        txt(`\u2022   ${item}`, ML + 20, y, 'Helvetica', 10, GRAY)
        y += LINE_H
      }
      y += 16
    }

    // ── Menu Sidebar ──
    doc.rect(ML, y, W, 24).fill('#eff6ff')
    txt('Menu yang Tampil di Sidebar', ML + 10, y + 6, 'Helvetica-Bold', 11, '#2563eb')
    y += 32

    for (const item of role.menu) {
      txt(`\u2022   ${item}`, ML + 20, y, 'Helvetica', 10, DARK)
      y += LINE_H
    }

    footerLine(ri + 2)
  }

  doc.end()

  stream.on('finish', () => {
    const kb = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)
    console.log(`\nPDF berhasil dibuat: ${OUTPUT_PATH}`)
    console.log(`   ${TOTAL} halaman (1 cover + ${ROLES.length} role), ${kb} KB`)
  })
}

generate()
