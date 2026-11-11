import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

const out = path.resolve(__dirname, '..', 'docs', 'SIMRS-RBAC-Reference.pdf')
fs.mkdirSync(path.dirname(out), { recursive: true })

const doc = new PDFDocument({ size: 'A4', autoFirstPage: false, margin: 0,
  info: { Title: 'SIMRS SaaS \u2014 RBAC & Access Control Reference', Author: 'SIMRS Dev Team' },
})
const ws = fs.createWriteStream(out)
doc.pipe(ws)

const M = 50
const PW = 595.28
const PH = 841.89
const W = PW - M * 2
let pg = 0
let cy = 0

function page() {
  doc.addPage({ size: 'A4', margin: 0 })
  pg++
  cy = 50
  if (pg > 1) drawFooter()
}

function drawFooter() {
  doc.save()
  doc.moveTo(M, PH - 35).lineTo(M + W, PH - 35).lineWidth(0.4).strokeColor('#cbd5e1').stroke()
  doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
  doc.text('SIMRS SaaS \u2014 RBAC & Access Control Reference', M, PH - 27, { lineBreak: false })
  doc.text('CONFIDENTIAL \u2014 For Internal & Client Use Only', M + W / 2 - 80, PH - 27, { lineBreak: false })
  doc.text(`Halaman ${pg}`, M + W - 50, PH - 27, { lineBreak: false })
  doc.restore()
}

function space(n = 8) { cy += n }
function maxY() { return PH - 50 }

// ── Typography ──

function sectionTitle(text: string) {
  doc.save()
  doc.rect(M, cy, 4, 22).fill('#1e3a8a')
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#1e3a8a')
  doc.text(text, M + 14, cy + 3, { width: W - 14 })
  cy = doc.y + 10
  doc.restore()
}

function heading(text: string) {
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
  doc.text(text, M, cy, { width: W })
  cy = doc.y + 5
}

function para(text: string) {
  doc.font('Helvetica').fontSize(9.5).fillColor('#334155')
  doc.text(text, M, cy, { width: W, lineGap: 2.5 })
  cy = doc.y + 5
}

function bullet(text: string, indent = 0) {
  const x = M + 10 + indent
  doc.font('Helvetica').fontSize(9).fillColor('#64748b')
  doc.text('\u2022', x, cy, { lineBreak: false })
  doc.font('Helvetica').fontSize(9).fillColor('#334155')
  doc.text(text, x + 12, cy, { width: W - 22 - indent })
  cy = doc.y + 3
}

function bulletBold(lbl: string, desc: string) {
  const x = M + 10
  doc.font('Helvetica').fontSize(9).fillColor('#64748b')
  doc.text('\u2022', x, cy, { lineBreak: false })
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
  doc.text(lbl, x + 12, cy, { continued: true, lineBreak: false })
  doc.font('Helvetica').fillColor('#334155')
  doc.text(` \u2014 ${desc}`, { width: W - 30 })
  cy = doc.y + 3
}

function label(text: string) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0d9488')
  doc.text(text, M, cy, { width: W })
  cy = doc.y + 4
}

// ── Metric box (used in overview) ──

function metricBox(x: number, y: number, w: number, value: string, label2: string, color: string) {
  doc.save()
  doc.roundedRect(x, y, w, 52, 5).fillAndStroke('#f8fafc', '#e2e8f0')
  doc.rect(x, y, 5, 52).fill(color)
  doc.font('Helvetica-Bold').fontSize(22).fillColor(color)
  doc.text(value, x + 14, y + 8, { width: w - 24, align: 'center' })
  doc.font('Helvetica').fontSize(8).fillColor('#64748b')
  doc.text(label2, x + 14, y + 34, { width: w - 24, align: 'center' })
  doc.restore()
}

// ── Info box ──

function infoBox(text: string, color = '#3b82f6') {
  doc.save()
  doc.roundedRect(M, cy, W, 30, 4).fillAndStroke(color + '0a', color + '30')
  doc.rect(M, cy, 4, 30).fill(color)
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(color)
  doc.text(text, M + 14, cy + 10, { width: W - 24 })
  cy += 38
  doc.restore()
}

// ── TOC with dotted leaders ──

function tocEntry(text: string, pageNum: string, isChild = false) {
  const x = M + (isChild ? 20 : 0)
  const font = isChild ? 'Helvetica' : 'Helvetica-Bold'
  const fs = isChild ? 9.5 : 10.5
  doc.font(font).fontSize(fs).fillColor(isChild ? '#475569' : '#0f172a')
  doc.text(text, x, cy, { lineBreak: false })
  const textEnd = doc.widthOfString(text) + x + 8
  const pageNumW = doc.widthOfString(pageNum)
  const dotsEnd = M + W - pageNumW - 4
  doc.font('Helvetica').fontSize(8).fillColor('#cbd5e1')
  let dx = textEnd
  while (dx < dotsEnd) {
    doc.text('.', dx, cy + 2, { lineBreak: false })
    dx += 5
  }
  doc.font(font).fontSize(fs).fillColor(isChild ? '#475569' : '#0f172a')
  doc.text(pageNum, M + W - pageNumW, cy, { lineBreak: false })
  cy += isChild ? 17 : 21
}

// ── Table primitives ──

interface Col { l: string; w: number; a?: 'left' | 'center' | 'right' }

function drawTableHeader(x0: number, tw: number, cols: Col[], fs: number) {
  doc.save()
  doc.rect(x0, cy, tw, 22).fill('#1e293b')
  let hx = x0
  cols.forEach((c) => {
    doc.font('Helvetica-Bold').fontSize(fs).fillColor('#ffffff')
    doc.text(c.l, hx + 4, cy + 6, { width: c.w - 8, align: c.a || 'left', lineBreak: false })
    hx += c.w
  })
  cy += 22
  doc.restore()
}

function drawTableRow(x0: number, tw: number, cols: Col[], row: string[], ri: number, fs: number, rh: number) {
  const bg = ri % 2 === 0 ? '#ffffff' : '#f8fafc'
  doc.save()
  doc.rect(x0, cy, tw, rh).fill(bg)
  doc.moveTo(x0, cy).lineTo(x0, cy + rh).lineWidth(0.3).strokeColor('#e2e8f0').stroke()
  doc.moveTo(x0 + tw, cy).lineTo(x0 + tw, cy + rh).lineWidth(0.3).strokeColor('#e2e8f0').stroke()
  doc.moveTo(x0, cy + rh).lineTo(x0 + tw, cy + rh).lineWidth(0.3).strokeColor('#e2e8f0').stroke()
  let rx = x0
  cols.forEach((c, ci) => {
    if (ci > 0) {
      doc.moveTo(rx, cy).lineTo(rx, cy + rh).lineWidth(0.3).strokeColor('#e2e8f0').stroke()
    }
    const val = row[ci] || ''
    const isCheck = val === '\u2713'
    doc.font(isCheck ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs)
      .fillColor(isCheck ? '#059669' : '#334155')
    doc.text(val, rx + 4, cy + (rh - fs - 1) / 2, { width: c.w - 8, align: c.a || 'left', lineBreak: false })
    rx += c.w
  })
  cy += rh
  doc.restore()
}

function drawTable(cols: Col[], rows: string[][], opts?: { fs?: number; rh?: number }) {
  const fs = opts?.fs ?? 8.5
  const rh = opts?.rh ?? 19
  const tw = cols.reduce((s, c) => s + c.w, 0)
  const x0 = M
  drawTableHeader(x0, tw, cols, fs)
  rows.forEach((row, ri) => drawTableRow(x0, tw, cols, row, ri, fs, rh))
  cy += 8
}

// ── Grouped matrix table (with row groups + page break support) ──

interface MatrixGroup {
  group: string
  perms: string[]
}

function drawMatrixTable(
  roleCols: string[],
  groups: MatrixGroup[],
  rolePerms: Record<string, string[]>,
  fs: number,
  rh: number,
) {
  const permColW = 140
  const roleColW = 30
  const groupColW = 55
  const cols: Col[] = [
    { l: 'Grup', w: groupColW, a: 'center' },
    { l: 'Permission', w: permColW },
    ...roleCols.map((c) => ({ l: c, w: roleColW, a: 'center' as const })),
  ]
  const tw = cols.reduce((s, c) => s + c.w, 0)
  const x0 = M

  function header() {
    drawTableHeader(x0, tw, cols, fs)
  }

  header()
  let ri = 0
  groups.forEach((g) => {
    const groupRows = g.perms.length
    if (cy + rh * groupRows > maxY() - 10) {
      page()
      header()
    }
    g.perms.forEach((perm, pi) => {
      const bg = ri % 2 === 0 ? '#ffffff' : '#f8fafc'
      doc.save()
      doc.rect(x0, cy, tw, rh).fill(bg)

      // Group cell (merged visually)
      if (pi === 0) {
        const groupH = rh * groupRows
        doc.rect(x0, cy, groupColW, groupH).fill('#f1f5f9')
        doc.moveTo(x0, cy).lineTo(x0, cy + groupH).lineWidth(0.3).strokeColor('#e2e8f0').stroke()
        doc.moveTo(x0 + groupColW, cy).lineTo(x0 + groupColW, cy + groupH).lineWidth(0.3).strokeColor('#e2e8f0').stroke()
        const textY = cy + (groupH - 8) / 2
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569')
        doc.text(g.group, x0 + 3, textY, { width: groupColW - 6, align: 'center' })
      }

      // Permission cell
      doc.font('Helvetica').fontSize(fs).fillColor('#334155')
      doc.text(perm, x0 + groupColW + 4, cy + (rh - fs) / 2, { width: permColW - 8, lineBreak: false })
      doc.moveTo(x0 + groupColW, cy + rh).lineTo(x0 + tw, cy + rh).lineWidth(0.2).strokeColor('#e2e8f0').stroke()

      // Role checkmarks
      let rx = x0 + groupColW + permColW
      roleCols.forEach((rc) => {
        doc.moveTo(rx, cy).lineTo(rx, cy + rh).lineWidth(0.2).strokeColor('#e2e8f0').stroke()
        if (rolePerms[rc]?.includes(perm)) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#059669')
          doc.text('\u2713', rx + 2, cy + (rh - 9) / 2, { width: roleColW - 4, align: 'center', lineBreak: false })
        }
        rx += roleColW
      })
      doc.moveTo(x0 + tw, cy).lineTo(x0 + tw, cy + rh).lineWidth(0.3).strokeColor('#e2e8f0').stroke()

      cy += rh
      ri++
      doc.restore()
    })
  })
  cy += 8
}

// ══════════════════════════════════════════════════════════
// PAGE 1 — COVER
// ══════════════════════════════════════════════════════════

doc.addPage({ size: 'A4', margin: 0 })
pg++

doc.rect(0, 0, PW, PH).fill('#1e293b')

doc.moveTo(M, 200).lineTo(M + 60, 200).lineWidth(4).strokeColor('#3b82f6').stroke()
doc.font('Helvetica-Bold').fontSize(38).fillColor('#ffffff').text('SIMRS SaaS', M, 218)
doc.font('Helvetica-Bold').fontSize(19).fillColor('#94a3b8')
doc.text('RBAC & Permission', M, 275)
doc.text('Reference Guide', M, 300)

doc.moveTo(M, 345).lineTo(M + 50, 345).lineWidth(3).strokeColor('#0d9488').stroke()

doc.font('Helvetica').fontSize(10.5).fillColor('#94a3b8').text('Dokumentasi lengkap:', M, 365)
const coverItems = [
  '11 Role dengan hak akses terperinci',
  '38 Permission unik per modul',
  '35+ Halaman & fitur yang dapat diakses',
  'Dual-layer security (Frontend + Backend)',
  '13 Test account lengkap dengan password',
]
doc.font('Helvetica').fontSize(10).fillColor('#64748b')
coverItems.forEach((t, i) => doc.text(`\u203A  ${t}`, M + 12, 390 + i * 22))

// Version info block
const viY = 530
doc.moveTo(M, viY).lineTo(M + 100, viY).lineWidth(0.5).strokeColor('#475569').stroke()

const viLabels = ['VERSI', 'TANGGAL', 'TENANT DEMO']
const viValues = [
  'Versi 1.0',
  new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
  'rs-demo.simrs.online',
]
viLabels.forEach((lbl, i) => {
  const y = viY + 16 + i * 28
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748b').text(lbl, M, y, { lineBreak: false })
  doc.font('Helvetica').fontSize(10).fillColor('#cbd5e1').text(viValues[i], M + 100, y - 1, { lineBreak: false })
})

doc.moveTo(M, PH - 50).lineTo(M + W, PH - 50).lineWidth(0.5).strokeColor('#334155').stroke()
doc.font('Helvetica').fontSize(8).fillColor('#475569')
doc.text('CONFIDENTIAL \u2014 For Internal & Client Use Only', M, PH - 40, { width: W, align: 'center' })

// ══════════════════════════════════════════════════════════
// PAGE 2 — TABLE OF CONTENTS
// ══════════════════════════════════════════════════════════

page()
sectionTitle('Daftar Isi')
space(12)

tocEntry('1.   Overview Sistem RBAC', '3')
tocEntry('2.   Daftar Role (11 Role)', '3')
tocEntry('3.   Daftar Permission (38 Permission Unik)', '4')
tocEntry('4.   Matriks Akses Role \u00D7 Permission', '6')
tocEntry('5.   Rincian Per Role \u2014 Menu & Fitur', '7')
tocEntry('5.1   Superadmin \u2014 SA Panel', '7', true)
tocEntry('5.2   Admin RS \u2014 Akses Penuh (38 Permission)', '7', true)
tocEntry('5.3   Dokter \u2014 Fokus Klinis (17 Permission)', '8', true)
tocEntry('5.4   Perawat \u2014 Asistensi Klinis (9 Permission)', '8', true)
tocEntry('5.5   Apoteker \u2014 Farmasi & Stok (7 Permission)', '8', true)
tocEntry('5.6   Kasir \u2014 Billing & Pembayaran (6 Permission)', '8', true)
tocEntry('5.7   Pendaftaran \u2014 Front Office (9 Permission)', '8', true)
tocEntry('5.8   Rekam Medis, Manajemen, Lab, Radiologi', '9', true)
tocEntry('6.   Security Guard: Frontend & Backend', '9')
tocEntry('6.1   Frontend Guard (Menu Filtering)', '9', true)
tocEntry('6.2   Backend Guard (RBAC Middleware)', '9', true)
tocEntry('6.3   Alur Autentikasi & Session', '9', true)
tocEntry('7.   Test Accounts \u2014 Tenant rs-demo', '10')
tocEntry('7.1   Super Admin (Platform Level)', '10', true)
tocEntry('7.2   Akun Tenant rs-demo (12 User)', '10', true)
tocEntry('7.3   Ringkasan Akses Per Akun', '10', true)

// ══════════════════════════════════════════════════════════
// PAGE 3 — OVERVIEW + ROLE LIST
// ══════════════════════════════════════════════════════════

page()
sectionTitle('1. Overview Sistem RBAC')

para('SIMRS SaaS mengimplementasikan Role-Based Access Control (RBAC) untuk mengatur hak akses pengguna secara granular. Sistem ini beroperasi pada dua level:')
space(2)
bulletBold('Platform Level', 'Super Admin (owner/operator) mengelola seluruh tenant RS melalui SA Panel terpisah.')
bulletBold('Tenant Level', 'Setiap RS memiliki role internal (admin, dokter, perawat, dll) dengan permission masing-masing.')
space(4)
para('Setiap aksi di-guard pada dua lapisan: Frontend (menu di-filter berdasarkan role) dan Backend (middleware RBAC memeriksa permission sebelum endpoint dieksekusi).')
space(8)

// Metric boxes
const boxW = (W - 24) / 4
metricBox(M, cy, boxW, '11', 'Role', '#3b82f6')
metricBox(M + boxW + 8, cy, boxW, '38', 'Permission Unik', '#0d9488')
metricBox(M + (boxW + 8) * 2, cy, boxW, '35+', 'Halaman / Fitur', '#8b5cf6')
metricBox(M + (boxW + 8) * 3, cy, boxW, '2', 'Layer Guard\n(Frontend + Backend)', '#f59e0b')
cy += 62

space(8)
sectionTitle('2. Daftar Role (11 Role)')

drawTable(
  [{ l: '#', w: 24, a: 'center' }, { l: 'Nama Role', w: 88 }, { l: 'Level', w: 55, a: 'center' }, { l: 'Perm', w: 40, a: 'center' }, { l: 'Deskripsi', w: W - 207 }],
  [
    ['1', 'superadmin', 'Platform', '7', 'Pengelola platform SaaS (owner/operator)'],
    ['2', 'admin', 'Tenant', '38', 'Administrator RS \u2014 akses penuh ke semua fitur'],
    ['3', 'dokter', 'Tenant', '17', 'Dokter \u2014 fokus klinis, rekam medis, resep'],
    ['4', 'perawat', 'Tenant', '9', 'Perawat \u2014 asistensi klinis, pengkajian'],
    ['5', 'apoteker', 'Tenant', '7', 'Apoteker \u2014 farmasi, stok, dispensing obat'],
    ['6', 'kasir', 'Tenant', '6', 'Kasir \u2014 billing & pembayaran'],
    ['7', 'pendaftaran', 'Tenant', '9', 'Front office \u2014 registrasi pasien & antrian'],
    ['8', 'rekam_medis', 'Tenant', '5', 'Petugas RM \u2014 arsip rekam medis'],
    ['9', 'manajemen', 'Tenant', '7', 'Pimpinan RS \u2014 laporan & statistik'],
    ['10', 'lab', 'Tenant', '4', 'Petugas laboratorium'],
    ['11', 'radiologi', 'Tenant', '4', 'Petugas radiologi'],
  ],
)

// ══════════════════════════════════════════════════════════
// PAGE 4 — PERMISSIONS (part 1)
// ══════════════════════════════════════════════════════════

page()
sectionTitle('3. Daftar Permission (38 Permission Unik)')
para('Seluruh permission dikelompokkan berdasarkan domain/modul bisnis RS:')
space(4)

const pCols: Col[] = [{ l: 'Permission', w: 195 }, { l: 'Deskripsi', w: W - 195 }]
const pOpts = { fs: 8.5, rh: 17 }

label('Pasien (4)')
drawTable(pCols, [
  ['patient:create', 'Membuat data pasien baru'],
  ['patient:read', 'Melihat data pasien'],
  ['patient:update', 'Mengubah data pasien'],
  ['patient:delete', 'Menghapus pasien (soft delete)'],
], pOpts)
space(2)

label('Pendaftaran & Antrian (5)')
drawTable(pCols, [
  ['registration:create', 'Membuat kunjungan baru'],
  ['registration:read', 'Melihat daftar kunjungan'],
  ['registration:update', 'Mengubah status kunjungan'],
  ['registration:cancel', 'Membatalkan kunjungan'],
  ['queue:manage', 'Mengelola antrian (panggil/selesai)'],
], pOpts)
space(2)

label('Jadwal (1)')
drawTable(pCols, [['doctor-schedule:read', 'Melihat jadwal praktik dokter']], pOpts)
space(2)

label('Rekam Medis & Assessment (6)')
drawTable(pCols, [
  ['medical-record:create', 'Membuat rekam medis (SOAP)'],
  ['medical-record:read', 'Melihat rekam medis'],
  ['medical-record:update', 'Mengubah rekam medis draft'],
  ['medical-record:finalize', 'Finalisasi rekam medis'],
  ['assessment:create', 'Membuat pengkajian keperawatan'],
  ['assessment:read', 'Melihat data pengkajian'],
], pOpts)
space(2)

label('Farmasi (6)')
drawTable(pCols, [
  ['pharmacy:read', 'Melihat data farmasi'],
  ['pharmacy:manage', 'Mengelola dispensing obat'],
  ['prescription:read', 'Melihat resep obat'],
  ['prescription:create', 'Membuat resep (e-prescription)'],
  ['stock:read', 'Melihat stok obat/barang'],
  ['stock:manage', 'Kelola stok, mutasi, purchase order'],
], pOpts)

// ══════════════════════════════════════════════════════════
// PAGE 5 — PERMISSIONS (part 2)
// ══════════════════════════════════════════════════════════

page()

label('Kasir & Billing (4)')
drawTable(pCols, [
  ['billing:read', 'Melihat tagihan pasien'],
  ['billing:manage', 'Mengelola billing'],
  ['payment:create', 'Memproses pembayaran'],
  ['payment:read', 'Melihat riwayat pembayaran'],
], pOpts)
space(2)

label('Laboratorium (3)')
drawTable(pCols, [
  ['lab-order:read', 'Melihat order laboratorium'],
  ['lab-result:create', 'Menginput hasil lab'],
  ['lab-result:read', 'Melihat hasil laboratorium'],
], pOpts)
space(2)

label('Radiologi (3)')
drawTable(pCols, [
  ['radiology-order:read', 'Melihat order radiologi'],
  ['radiology-result:create', 'Menginput hasil radiologi'],
  ['radiology-result:read', 'Melihat hasil radiologi'],
], pOpts)
space(2)

label('Dashboard & Laporan (3)')
drawTable(pCols, [
  ['dashboard:read', 'Akses halaman dashboard'],
  ['report:read', 'Melihat laporan'],
  ['statistics:read', 'Melihat statistik'],
], pOpts)
space(2)

label('Administrasi (8)')
drawTable(pCols, [
  ['user:create', 'Menambah user baru'],
  ['user:read', 'Melihat daftar user'],
  ['user:update', 'Mengubah data user'],
  ['user:delete', 'Menghapus user'],
  ['tenant:manage', 'Mengelola profil tenant/RS'],
  ['settings:manage', 'Mengelola pengaturan sistem'],
  ['audit-log:read', 'Melihat audit log'],
  ['admin:manage', 'Manajemen admin penuh'],
], pOpts)

// ══════════════════════════════════════════════════════════
// PAGE 6 — MATRIX (grouped rows, page-spanning)
// ══════════════════════════════════════════════════════════

page()
sectionTitle('4. Matriks Akses Role \u00D7 Permission')
para('Tabel berikut menunjukkan permission yang dimiliki setiap role. Tanda \u2713 = memiliki akses.')
space(2)
doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
doc.text('SA = Superadmin \u00B7 AD = Admin \u00B7 DK = Dokter \u00B7 PR = Perawat \u00B7 AP = Apoteker \u00B7 KS = Kasir \u00B7 PD = Pendaftaran \u00B7 RM = Rekam Medis \u00B7 MN = Manajemen \u00B7 LB = Lab \u00B7 RD = Radiologi', M, cy, { width: W })
cy = doc.y + 8

const roleCols = ['SA', 'AD', 'DK', 'PR', 'AP', 'KS', 'PD', 'RM', 'MN', 'LB', 'RD']
const rolePerms: Record<string, string[]> = {
  SA: ['tenant:manage', 'settings:manage', 'user:read', 'dashboard:read', 'report:read', 'statistics:read', 'audit-log:read'],
  AD: [
    'patient:create', 'patient:read', 'patient:update', 'patient:delete',
    'registration:create', 'registration:read', 'registration:update', 'registration:cancel',
    'queue:manage', 'doctor-schedule:read',
    'medical-record:create', 'medical-record:read', 'medical-record:update', 'medical-record:finalize',
    'assessment:create', 'assessment:read',
    'pharmacy:read', 'pharmacy:manage', 'prescription:read', 'prescription:create',
    'stock:read', 'stock:manage',
    'billing:read', 'billing:manage', 'payment:create', 'payment:read',
    'lab-order:read', 'lab-result:create', 'lab-result:read',
    'radiology-order:read', 'radiology-result:create', 'radiology-result:read',
    'dashboard:read', 'report:read', 'statistics:read',
    'user:create', 'user:read', 'user:update', 'user:delete',
    'tenant:manage', 'settings:manage', 'audit-log:read', 'admin:manage',
  ],
  DK: ['patient:read', 'patient:update', 'medical-record:create', 'medical-record:read', 'medical-record:update', 'medical-record:finalize', 'assessment:create', 'assessment:read', 'prescription:create', 'prescription:read', 'pharmacy:read', 'lab-order:read', 'lab-result:read', 'radiology-order:read', 'radiology-result:read', 'dashboard:read', 'doctor-schedule:read'],
  PR: ['patient:read', 'patient:update', 'assessment:create', 'assessment:read', 'medical-record:read', 'prescription:read', 'lab-order:read', 'lab-result:read', 'dashboard:read'],
  AP: ['pharmacy:read', 'pharmacy:manage', 'prescription:read', 'stock:read', 'stock:manage', 'patient:read', 'dashboard:read'],
  KS: ['billing:read', 'billing:manage', 'payment:create', 'payment:read', 'patient:read', 'dashboard:read'],
  PD: ['patient:create', 'patient:read', 'patient:update', 'registration:create', 'registration:read', 'registration:update', 'registration:cancel', 'queue:manage', 'doctor-schedule:read'],
  RM: ['patient:read', 'medical-record:read', 'medical-record:update', 'assessment:read', 'registration:read', 'dashboard:read'],
  MN: ['dashboard:read', 'report:read', 'statistics:read', 'patient:read', 'registration:read', 'billing:read', 'payment:read'],
  LB: ['lab-order:read', 'lab-result:create', 'lab-result:read', 'patient:read', 'dashboard:read'],
  RD: ['radiology-order:read', 'radiology-result:create', 'radiology-result:read', 'patient:read', 'dashboard:read'],
}

const matrixGroups: MatrixGroup[] = [
  { group: 'Pasien', perms: ['patient:create', 'patient:read', 'patient:update', 'patient:delete'] },
  { group: 'Pendaftaran\n& Antrian', perms: ['registration:create', 'registration:read', 'registration:update', 'registration:cancel', 'queue:manage'] },
  { group: 'Jadwal', perms: ['doctor-schedule:read'] },
  { group: 'Rekam Medis\n&\nAssessment', perms: ['medical-record:create', 'medical-record:read', 'medical-record:update', 'medical-record:finalize', 'assessment:create', 'assessment:read'] },
  { group: 'Farmasi', perms: ['pharmacy:read', 'pharmacy:manage', 'prescription:read', 'prescription:create', 'stock:read', 'stock:manage'] },
  { group: 'Kasir &\nBilling', perms: ['billing:read', 'billing:manage', 'payment:create', 'payment:read'] },
  { group: 'Laboratorium', perms: ['lab-order:read', 'lab-result:create', 'lab-result:read'] },
  { group: 'Radiologi', perms: ['radiology-order:read', 'radiology-result:create', 'radiology-result:read'] },
  { group: 'Dashboard &\nLaporan', perms: ['dashboard:read', 'report:read', 'statistics:read'] },
  { group: 'Administrasi', perms: ['user:create', 'user:read', 'user:update', 'user:delete', 'tenant:manage', 'settings:manage', 'audit-log:read', 'admin:manage'] },
]

drawMatrixTable(roleCols, matrixGroups, rolePerms, 7, 15)

// ══════════════════════════════════════════════════════════
// PAGE — ROLE DETAIL: SA + ADMIN
// ══════════════════════════════════════════════════════════

page()
sectionTitle('5. Rincian Per Role \u2014 Menu & Fitur')

heading('5.1  Superadmin \u2014 SA Panel')
para('Beroperasi di panel khusus (/sa/*). Sub-role: Owner (akses penuh) dan Operator (terbatas).')
space(2)

drawTable(
  [{ l: '#', w: 22, a: 'center' }, { l: 'Halaman', w: 120 }, { l: 'Fungsi', w: W - 228 }, { l: 'Owner Only', w: 66, a: 'center' }],
  [
    ['1', '/sa', 'Dashboard \u2014 metrik platform, statistik, revenue', '\u2014'],
    ['2', '/sa/registrations', 'Antrian pendaftaran RS baru', '\u2014'],
    ['3', '/sa/tenants', 'Daftar tenant, toggle aktif, hapus', '\u2014'],
    ['4', '/sa/tenants/[id]', 'Detail tenant: stats, users, subscription', '\u2014'],
    ['5', '/sa/payments', 'Verifikasi pembayaran', '\u2014'],
    ['6', '/sa/plans', 'Kelola paket langganan & transaksi', '\u2713'],
    ['7', '/sa/monitoring', 'Monitoring sistem & tenant', '\u2014'],
    ['8', '/sa/settings', '12 pengaturan platform', '\u2713'],
    ['9', '/sa/super-admins', 'Kelola akun super admin', '\u2713'],
    ['10', '/sa/activity', 'Activity log', '\u2014'],
  ], { fs: 8, rh: 17 },
)

space(6)
heading('5.2  Admin RS \u2014 Akses Penuh (38 Permission)')
para('Admin memiliki seluruh 38 permission dan mengakses semua halaman tenant:')

drawTable([{ l: 'Kategori', w: 110 }, { l: 'Halaman / Sub-menu', w: W - 110 }], [
  ['Dashboard', '/dashboard \u2014 Overview lengkap semua modul'],
  ['Pendaftaran', 'Daftar Baru + Kelola Antrian'],
  ['IGD / Rawat Inap', '/igd + /rawat-inap'],
  ['Pasien', '/pasien \u2014 CRUD, deteksi duplikasi NIK'],
  ['Rekam Medis', 'SOAP, CPPT, Pengkajian, Resume, Consent, Edukasi'],
  ['Farmasi (7 sub)', 'Resep, Stok, Alerts, Mutasi, PO, OTC, Stock Opname'],
  ['BPJS (8 tab)', 'Peserta, SEP, Rujukan, PCare, e-Klaim, Aplicare, Monitoring, Antrol'],
  ['Kasir / Keuangan', 'Billing + Jurnal, COA, Buku Besar, Neraca, Laba Rugi'],
  ['Lab / Rad / Bedah', 'Order, hasil, operasi, tim bedah'],
  ['MCU / Gizi', 'Medical Check Up + Nutrisi (5 tab)'],
  ['Laporan', '7 jenis + export XLSX/PDF/CSV'],
  ['Kepegawaian', 'Pegawai, Jadwal, Absensi, Penggajian'],
  ['Pengaturan (18)', 'Profil RS, Ruangan, Dokter, Asuransi, Pengguna, Audit, dll'],
], { fs: 8, rh: 16 })

// ══════════════════════════════════════════════════════════
// PAGE — DOKTER + PERAWAT + APOTEKER + KASIR + PENDAFTARAN
// ══════════════════════════════════════════════════════════

page()

heading('5.3  Dokter \u2014 Fokus Klinis (17 Permission)')
para('Fokus utama: rekam medis, diagnosa, resep, dan melihat hasil penunjang.')
space(2)

drawTable([{ l: 'Menu', w: 115 }, { l: 'Hak Akses', w: W - 115 }], [
  ['Dashboard', 'Overview kunjungan hari ini'],
  ['IGD / Rawat Inap', 'Pemeriksaan pasien, visite, discharge'],
  ['Pasien', 'Lihat & update data pasien'],
  ['Rekam Medis', 'Buat SOAP, CPPT, diagnosis ICD-10, finalisasi'],
  ['Lab / Radiologi', 'Lihat order & hasil pemeriksaan (read-only)'],
  ['Bedah', 'Jadwal & detail operasi, laporan post-op'],
  ['MCU / Gizi', 'Input hasil MCU, konsultasi gizi'],
  ['Logbook', 'Catatan tindakan pribadi'],
])

space(8)
heading('5.4  Perawat \u2014 Asistensi Klinis (9 Permission)')
para('Fokus: pengkajian keperawatan dan asistensi rekam medis.')
space(2)

drawTable([{ l: 'Menu', w: 115 }, { l: 'Hak Akses', w: W - 115 }], [
  ['Dashboard', 'Overview hari ini'],
  ['IGD / Rawat Inap', 'Triage, monitoring pasien'],
  ['Pasien', 'Lihat & update data pasien'],
  ['Rekam Medis', 'Lihat RM (read-only), buat pengkajian keperawatan'],
  ['MCU / Gizi', 'Input hasil MCU, skrining nutrisi pasien'],
])

space(8)
heading('5.5  Apoteker \u2014 Farmasi & Stok (7 Permission)')
drawTable([{ l: 'Menu', w: 115 }, { l: 'Hak Akses', w: W - 115 }], [
  ['Dashboard', 'Overview farmasi'],
  ['Farmasi (7 sub)', 'Resep, Stok, Alerts, Mutasi, PO, OTC, Stock Opname'],
  ['Gudang / CDSS', 'Gudang umum + Drug interaction checker'],
], { rh: 18 })

space(8)
heading('5.6  Kasir \u2014 Billing & Pembayaran (6 Permission)')
drawTable([{ l: 'Menu', w: 115 }, { l: 'Hak Akses', w: W - 115 }], [
  ['Dashboard', 'Overview kasir'],
  ['BPJS / Kasir', 'SEP, billing, proses bayar, cetak kuitansi'],
  ['Keuangan / OTC', 'Jurnal otomatis + penjualan obat bebas'],
], { rh: 18 })

space(8)
heading('5.7  Pendaftaran \u2014 Front Office (9 Permission)')
drawTable([{ l: 'Menu', w: 115 }, { l: 'Hak Akses', w: W - 115 }], [
  ['Dashboard', 'Overview antrian hari ini'],
  ['Pendaftaran', 'Form pendaftaran + kelola antrian'],
  ['IGD / Rawat Inap', 'Registrasi pasien IGD & rawat inap'],
  ['Pasien / BPJS', 'CRUD pasien, cek peserta BPJS, buat SEP'],
], { rh: 18 })

// ══════════════════════════════════════════════════════════
// PAGE — OTHERS + SECURITY
// ══════════════════════════════════════════════════════════

page()

heading('5.8  Rekam Medis, Manajemen, Lab, Radiologi')
para('Role dengan akses terbatas pada modul spesifik:')
space(2)
drawTable([{ l: 'Role', w: 85 }, { l: 'Perm', w: 35, a: 'center' }, { l: 'Menu yang Dapat Diakses', w: W - 120 }], [
  ['rekam_medis', '5', 'Dashboard, Pasien (lihat), Rekam Medis (lihat & edit, pengkajian)'],
  ['manajemen', '7', 'Dashboard, Keuangan (read-only), Laporan (7 jenis + export), Kepegawaian'],
  ['lab', '4', 'Dashboard, Laboratorium (terima sampel, proses, input hasil, finalisasi)'],
  ['radiologi', '4', 'Dashboard, Radiologi (proses, input bacaan & kesan, cetak hasil)'],
], { rh: 22 })

space(10)
sectionTitle('6. Security Guard: Frontend & Backend')

heading('6.1  Frontend Guard (Menu Filtering)')
para('Setiap menu item di Next.js didefinisikan dengan array roles. Hook usePermissions() memfilter menu secara otomatis berdasarkan role user yang sedang login:')
space(3)
bullet('MENU_ITEMS di packages/constants/src/menu-items.ts \u2014 setiap item punya roles: Role[]')
bullet('usePermissions() hook melakukan filterItems() berdasarkan role yang login')
bullet('Tenant subscription modules di-check via allowedModules (pembatasan per paket)')
bullet('SA Panel layout terpisah dengan flag ownerOnly per menu item')

space(10)
heading('6.2  Backend Guard (RBAC Middleware)')
para('Setiap route Express.js dilindungi oleh middleware bertingkat:')
space(3)
bullet('authenticate \u2014 verifikasi JWT access token pada setiap request')
bullet('checkPermission(...perms) \u2014 cek role user vs required permission \u2192 HTTP 403 jika ditolak')
bullet('tenantMiddleware \u2014 identifikasi tenant dari subdomain / header X-Tenant-Slug')
bullet('saIpWhitelist \u2014 IP whitelist khusus SA endpoints (dari platform_settings)')
bullet('Rate limiting \u2014 Redis-backed per tenant dan per endpoint')

space(10)
heading('6.3  Alur Autentikasi & Session')
space(3)
bullet('Login \u2192 JWT Access Token (15 menit) + Refresh Token (dari session_timeout_minutes DB)')
bullet('MFA TOTP opsional; wajib untuk SA jika enforce_2fa_superadmin = true')
bullet('Session limit: max_concurrent_sessions dari platform_settings')
bullet('Token rotation: refresh token dirotasi setiap kali access token di-refresh')
bullet('Audit trail: semua akses data sensitif tercatat di tabel audit_logs')
bullet('Password hashing: bcrypt dengan salt rounds \u2265 12')

space(8)
infoBox('Defense-in-depth: Frontend filtering + Backend middleware berjalan independen \u2014 keamanan berlapis.', '#0d9488')

// ══════════════════════════════════════════════════════════
// PAGE — TEST ACCOUNTS
// ══════════════════════════════════════════════════════════

page()
sectionTitle('7. Test Accounts \u2014 Tenant rs-demo')
para('Berikut daftar lengkap 13 akun untuk testing. Seluruh 11 role sudah memiliki akun test.')

space(6)
heading('7.1  Super Admin (Platform Level)')
space(2)
drawTable(
  [{ l: 'Nama', w: 135 }, { l: 'Email', w: 150 }, { l: 'Password', w: 90 }, { l: 'Sub-Role', w: 90, a: 'center' }],
  [['Super Admin SIMRS', 'admin@simrs.id', 'Admin123!', 'Owner']],
  { rh: 24 },
)

space(6)
heading('7.2  Akun Tenant rs-demo (12 User)')
para('URL Login: https://simrs.online/login   \u00B7   Tenant URL: https://rs-demo.simrs.online')
space(3)

drawTable(
  [{ l: '#', w: 22, a: 'center' }, { l: 'Nama Lengkap', w: 140 }, { l: 'Email', w: 168 }, { l: 'Password', w: 75 }, { l: 'Role', w: 70, a: 'center' }],
  [
    ['1', 'Admin RS Demo', 'admin@rs-demo.simrs.id', 'Demo123!', 'admin'],
    ['2', 'dr. Budi Santoso, Sp.PD', 'dr.budi@rs-demo.simrs.id', 'User123!', 'dokter'],
    ['3', 'dr. Siti Rahayu, Sp.A', 'dr.siti@rs-demo.simrs.id', 'User123!', 'dokter'],
    ['4', 'dr. Andi Wijaya', 'dr.andi@rs-demo.simrs.id', 'User123!', 'dokter'],
    ['5', 'Dewi Lestari, S.Kep', 'perawat.dewi@rs-demo.simrs.id', 'User123!', 'perawat'],
    ['6', 'Rina Wulandari, S.Farm', 'apoteker.rina@rs-demo.simrs.id', 'User123!', 'apoteker'],
    ['7', 'Maya Putri', 'kasir.maya@rs-demo.simrs.id', 'User123!', 'kasir'],
    ['8', 'Ahmad Fauzi', 'pendaftaran.ahmad@rs-demo.simrs.id', 'User123!', 'pendaftaran'],
    ['9', 'Petugas Rekam Medis', 'rekammedis@rs-demo.simrs.id', 'User123!', 'rekam_medis'],
    ['10', 'Pimpinan RS', 'manajemen@rs-demo.simrs.id', 'User123!', 'manajemen'],
    ['11', 'Petugas Lab', 'lab@rs-demo.simrs.id', 'User123!', 'lab'],
    ['12', 'Petugas Radiologi', 'radiologi@rs-demo.simrs.id', 'User123!', 'radiologi'],
  ], { fs: 8, rh: 18 },
)

space(4)
para('Catatan: Akun #1 (Admin) password Demo123!, akun #2\u201312 password User123!.')

space(6)
heading('7.3  Ringkasan Akses Per Akun')
space(3)

drawTable(
  [{ l: 'Akun (Role)', w: 145 }, { l: 'Menu yang Dapat Diakses', w: W - 145 }],
  [
    ['Admin RS Demo', 'SEMUA menu (35+ halaman) + 18 sub-pengaturan'],
    ['Dokter (3 akun)', 'Dashboard, IGD, Ranap, Pasien, RM, Lab*, Rad*, Bedah, MCU, Gizi, Logbook'],
    ['Perawat', 'Dashboard, IGD, Ranap, Pasien, RM*, MCU, Gizi'],
    ['Apoteker', 'Dashboard, Farmasi (7 sub), Gudang, CDSS'],
    ['Kasir', 'Dashboard, BPJS, Kasir, Keuangan, Farmasi-OTC'],
    ['Pendaftaran', 'Dashboard, Pendaftaran, Antrian, IGD, Ranap, Pasien, BPJS'],
    ['Rekam Medis', 'Dashboard, Pasien, Rekam Medis'],
    ['Manajemen', 'Dashboard, Keuangan*, Laporan, Kepegawaian'],
    ['Lab', 'Dashboard, Laboratorium'],
    ['Radiologi', 'Dashboard, Radiologi'],
  ], { rh: 19 },
)

space(3)
para('Keterangan:  * = read-only (hanya dapat melihat, tidak dapat input/edit data)')

space(8)
infoBox('Semua akun test sudah aktif dan siap digunakan.  Login: https://simrs.online/login', '#0d9488')

// ═══════════════════════════════════════

doc.end()
ws.on('finish', () => {
  console.log(`\n  \u2705 PDF Generated`)
  console.log(`  \uD83D\uDCC4 ${out}`)
  console.log(`  \uD83D\uDCE6 ${(fs.statSync(out).size / 1024).toFixed(1)} KB`)
  console.log(`  \uD83D\uDCDD ${pg} pages\n`)
})
