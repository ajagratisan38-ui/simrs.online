'use client'

import { useRef, useState } from 'react'

interface TestStep {
  step: string
  expected: string
}

interface TestCase {
  id: string
  title: string
  steps: TestStep[]
}

interface TestSection {
  title: string
  subtitle: string
  tests: TestCase[]
}

const CREDENTIALS = [
  ['Super Admin', 'platform', 'admin@simrs.id', 'Admin123!'],
  ['Admin RS Demo', 'rs-demo', 'admin@rs-demo.simrs.id', 'Demo123!'],
  ['Dokter', 'rs-demo', 'dr.budi@rs-demo.simrs.id', 'User123!'],
  ['Perawat', 'rs-demo', 'perawat.dewi@rs-demo.simrs.id', 'User123!'],
  ['Apoteker', 'rs-demo', 'apoteker.rina@rs-demo.simrs.id', 'User123!'],
  ['Kasir', 'rs-demo', 'kasir.maya@rs-demo.simrs.id', 'User123!'],
  ['Pendaftaran', 'rs-demo', 'pendaftaran.ahmad@rs-demo.simrs.id', 'User123!'],
]

const SECTIONS: TestSection[] = [
  {
    title: 'BAGIAN 1 — ALUR SaaS',
    subtitle: 'Landing Page → Daftar RS → Bayar → Approval → Onboarding',
    tests: [
      {
        id: '1.1',
        title: 'Landing Page',
        steps: [
          { step: 'Buka http://localhost:3000/', expected: 'Hero, fitur, pricing, CTA "Daftar Sekarang"' },
          { step: 'Klik "Daftar Sekarang"', expected: 'Redirect ke /daftar' },
          { step: 'Scroll bawah, cek footer', expected: 'Link: Daftar, Cek Status, Portal, Login' },
        ],
      },
      {
        id: '1.2',
        title: 'Registrasi RS (Trial/Gratis)',
        steps: [
          { step: 'Buka /daftar', expected: 'Form 6-step wizard' },
          { step: 'Step 1: Pilih "Trial" (Gratis 30 hari)', expected: 'Card Trial selected' },
          { step: 'Step 2: Nama RS, Alamat, Telepon', expected: 'Terisi' },
          { step: 'Step 3: Nama Admin, Email, Password (min 8)', expected: 'Terisi' },
          { step: 'Step 4: Slug "rs-test-manual"', expected: 'Preview rs-test-manual.simrs.id ✅' },
          { step: 'Step 5: Skip migrasi → Step 6: Review', expected: 'Ringkasan sesuai' },
          { step: 'Klik "Daftar Sekarang"', expected: 'Trial auto-approve → Active' },
          { step: 'Catat ID registrasi (UUID)', expected: 'UUID untuk cek status' },
        ],
      },
      {
        id: '1.3',
        title: 'Registrasi RS (Berbayar)',
        steps: [
          { step: 'Buka /daftar, pilih "Basic" (Rp 1.5jt/bln)', expected: 'Card Basic selected' },
          { step: 'Isi Step 2-6 (RS & slug berbeda)', expected: 'Terisi' },
          { step: 'Klik "Daftar Sekarang"', expected: 'Status = payment_pending' },
          { step: 'Tombol "Lihat Instruksi Bayar"', expected: 'Link ke /daftar/pembayaran/[id]' },
        ],
      },
      {
        id: '1.4',
        title: 'Halaman Pembayaran',
        steps: [
          { step: 'Buka /daftar/pembayaran/[id]', expected: 'Info RS, paket, total tagihan' },
          { step: 'Cek info bank + Copy no rekening', expected: 'Ter-copy' },
          { step: 'Upload bukti (JPG/PNG, max 5MB)', expected: 'Preview muncul' },
          { step: 'Klik "Upload Bukti Pembayaran"', expected: 'Status → under_review' },
        ],
      },
      {
        id: '1.5',
        title: 'Cek Status Registrasi',
        steps: [
          { step: 'Buka /daftar/status, masukkan UUID', expected: 'Timeline 5-step' },
          { step: 'Trial → Active', expected: 'Step sampai akhir' },
          { step: 'Berbayar → payment_pending', expected: 'Tombol "Upload Bukti"' },
          { step: 'Ditolak → alasan', expected: 'Tombol "Daftar Ulang"' },
        ],
      },
      {
        id: '1.6',
        title: 'Verifikasi & Approval (SA)',
        steps: [
          { step: 'Login SA → /sa/registrations', expected: 'Daftar registrasi + filter' },
          { step: 'Expand detail registrasi', expected: 'Detail RS, bukti bayar' },
          { step: 'Klik "Verifikasi Pembayaran"', expected: 'Status → payment_verified' },
          { step: 'Klik "Approve"', expected: 'Auto-provision: tenant+schema+admin' },
          { step: 'Test Reject + isi alasan', expected: 'Status = rejected' },
          { step: '/sa/tenants', expected: 'Tenant baru muncul' },
        ],
      },
      {
        id: '1.7',
        title: 'Login RS Baru & Onboarding',
        steps: [
          { step: 'Login Kode RS = slug baru', expected: 'Redirect /onboarding' },
          { step: 'Step 1: Welcome → "Mulai Setup"', expected: 'Step 2' },
          { step: 'Step 2: Profil RS (nama, alamat, telp)', expected: 'Tersimpan' },
          { step: 'Step 3: Tambah poliklinik', expected: 'Muncul di list' },
          { step: 'Step 4: Tambah dokter (nama, email, SIP)', expected: 'Muncul di list' },
          { step: 'Step 5: Selesai → "Masuk Dashboard"', expected: 'Redirect /dashboard' },
          { step: 'Login ulang', expected: 'Langsung dashboard (no onboarding)' },
        ],
      },
    ],
  },
  {
    title: 'BAGIAN 2 — ALUR OPERASIONAL RS',
    subtitle: 'Pasien → Pendaftaran → Dokter → Farmasi → Kasir',
    tests: [
      {
        id: '2.1',
        title: 'Login & Dashboard',
        steps: [
          { step: 'Login: rs-demo / admin@rs-demo.simrs.id / Demo123!', expected: 'Redirect /dashboard' },
          { step: 'Cek dashboard: 20 card navigasi modul', expected: 'Stat cards, chart, sidebar lengkap' },
          { step: 'Klik toggle dark mode (header)', expected: 'Tema berubah light/dark/system' },
        ],
      },
      {
        id: '2.2',
        title: 'Manajemen Pasien',
        steps: [
          { step: '/pasien → "Pasien Baru"', expected: 'Form 3-step' },
          { step: 'Step 1: NIK 16 digit, Nama, JK, Tgl Lahir', expected: 'Terisi' },
          { step: 'Step 2: Alamat lengkap', expected: 'Terisi' },
          { step: 'Step 3: No HP → "Simpan"', expected: 'No RM auto (RM-XXXXXX)' },
          { step: 'Detail → Edit → Simpan', expected: 'Data terupdate' },
          { step: '/pasien, search nama', expected: 'Ditemukan' },
        ],
      },
      {
        id: '2.3',
        title: 'Pendaftaran & Antrian',
        steps: [
          { step: '/pendaftaran → cari pasien → Poli, Dokter, Penjamin', expected: 'Dropdown terisi' },
          { step: 'Klik "Daftarkan"', expected: 'Visit + antrian + tiket cetak' },
          { step: '/pendaftaran/antrian → Panggil → Layani → Selesai', expected: 'Status transisi benar' },
          { step: '/display-antrian', expected: 'Fullscreen 3 kolom, bell, refresh 10s' },
          { step: '/kiosk → cari → poli → dokter → tiket', expected: '8-step wizard, auto-reset 60s' },
        ],
      },
      {
        id: '2.4',
        title: 'Pemeriksaan Dokter (SOAP)',
        steps: [
          { step: 'Login dokter → /rekam-medis → klik pasien', expected: 'Form SOAP' },
          { step: 'S: "Demam 3 hari, batuk pilek"', expected: 'Tersimpan' },
          { step: 'O: TD 120/80, Suhu 38.5, Nadi 88, RR 20', expected: 'Tersimpan' },
          { step: 'A: Cari ICD-10 "demam" → R50.9', expected: 'Diagnosis ditambahkan' },
          { step: 'P: Resep Paracetamol + Amoxicillin 500mg', expected: '2 item, auto-save' },
        ],
      },
      {
        id: '2.5',
        title: 'CPPT, Pengkajian, Resume, Edukasi',
        steps: [
          { step: '"CPPT" → tambah SOAP-IE → verifikasi', expected: 'Timeline, filter profesi' },
          { step: 'Login perawat → "Pengkajian" 7 tab', expected: 'Skor auto-calc, save, finalize' },
          { step: '/rekam-medis/[visitId]/resume → PDF', expected: 'A4: KOP, SOAP, diagnosa, resep' },
          { step: '/rekam-medis/[visitId]/edukasi', expected: 'Form edukasi, cetak' },
          { step: 'General Consent: /pasien/[id]/general-consent', expected: 'Form + cetak A4' },
        ],
      },
      {
        id: '2.6',
        title: 'Dispensing & Pembayaran',
        steps: [
          { step: 'Login apoteker → /farmasi → resep menunggu', expected: 'Detail dispensing' },
          { step: 'CDSS Alert: cek peringatan obat jika ada', expected: 'Alert banner muncul (jika high-alert/interaksi)' },
          { step: 'Proses dispensing tiap obat', expected: 'Stok berkurang, "Dispensed"' },
          { step: 'Login kasir → /kasir → tagihan pasien', expected: 'Billing: konsultasi + obat' },
          { step: '"Tunai" → "Bayar"', expected: '"Lunas", struk cetak' },
        ],
      },
    ],
  },
  {
    title: 'BAGIAN 3 — MODUL PENDUKUNG',
    subtitle: 'Lab, Radiologi, Bedah, Gizi, Gudang, Rawat Inap, IGD, MCU',
    tests: [
      {
        id: '3.1',
        title: 'Laboratorium',
        steps: [
          { step: '/laboratorium', expected: 'Dashboard, antrian, stats' },
          { step: 'Order → Terima → Proses → Hasil → Final', expected: 'Transisi status, normal/abnormal, cetak' },
        ],
      },
      {
        id: '3.2',
        title: 'Radiologi',
        steps: [
          { step: '/radiologi → order', expected: 'Dashboard, filter modalitas' },
          { step: 'Input bacaan + kesan → Final', expected: 'Completed, print' },
        ],
      },
      {
        id: '3.3',
        title: 'Bedah / Operasi',
        steps: [
          { step: '/bedah', expected: 'Jadwal, priority sort (emergency > cito > elektif)' },
          { step: 'Detail 5 tab: Info, Tim, Instrumen, Anestesi, Periop', expected: 'Semua bisa diisi & disimpan' },
        ],
      },
      {
        id: '3.4',
        title: 'Gizi / Nutrisi',
        steps: [
          { step: '/gizi', expected: '5 tab: ADIME, Kalkulator, Bahan, Meal, Cost' },
          { step: 'Kalkulator: BB=70 TB=170 Umur=30 L', expected: 'IMT, BMR, kalori, makro' },
          { step: 'Bahan Makanan: CRUD + filter', expected: 'Data tersimpan' },
          { step: 'Meal Plans: buat + pilih bahan', expected: 'Kalori auto-calc' },
        ],
      },
      {
        id: '3.5',
        title: 'Gudang, Rawat Inap, IGD',
        steps: [
          { step: '/gudang → CRUD barang, stok', expected: 'List barang non-obat, kategori filter' },
          { step: '/rawat-inap → discharge', expected: 'Modal 2-step, 5 cara keluar' },
          { step: '/igd', expected: 'List pasien IGD aktif, triase' },
        ],
      },
      {
        id: '3.6',
        title: 'MCU (Medical Check Up)',
        steps: [
          { step: '/mcu → tab Dashboard', expected: '4 stat cards, distribusi kesimpulan, top paket' },
          { step: 'Tab Paket MCU: lihat 3 default paket', expected: 'Basic/Executive/Pre-Employment cards' },
          { step: 'Buat paket baru: nama + items per kategori', expected: 'Paket tersimpan, toggle aktif' },
          { step: 'Tab Pendaftaran: klik "Daftar MCU"', expected: 'Dialog: search pasien, pilih paket, tujuan' },
          { step: 'Daftar peserta MCU baru', expected: 'No sertifikat auto MCU/YYYY/MM/XXXX, status: registered' },
          { step: 'Klik detail MCU → mulai pemeriksaan', expected: 'Status → in_progress, exam grouped by kategori' },
          { step: 'Input hasil per exam: nilai, satuan, normal/abnormal', expected: 'Auto-mark abnormal, progress ring update' },
          { step: 'Selesai semua → Simpulkan: Fit/Fit+Notes/Temp Unfit/Unfit', expected: 'Status → completed, kesimpulan tersimpan' },
          { step: 'Cetak Surat Keterangan Sehat', expected: 'A4: KOP RS, identitas, hasil, kesimpulan, TTD dokter' },
        ],
      },
    ],
  },
  {
    title: 'BAGIAN 4 — KEUANGAN & KEPEGAWAIAN',
    subtitle: 'Akuntansi (COA, Jurnal, Neraca, Laba Rugi) — HRIS (Pegawai, Jadwal, Absensi, Gaji)',
    tests: [
      {
        id: '4.1',
        title: 'Akuntansi / Keuangan',
        steps: [
          { step: '/keuangan', expected: '6 tab tersedia' },
          { step: 'Dashboard: stat + kas/bank + jurnal', expected: 'Data tampil' },
          { step: 'Jurnal: buat (debit=kredit) → simpan', expected: 'Draft tersimpan' },
          { step: 'Post → Reverse', expected: 'Transisi benar' },
          { step: 'Bagan Akun: tree 55+ akun', expected: 'Collapsible, tambah akun' },
          { step: 'Buku Besar: akun + tanggal', expected: 'Running saldo' },
          { step: 'Neraca: Aset | Kewajiban+Ekuitas', expected: 'Balance check' },
          { step: 'Laba Rugi: Pendapatan - Beban', expected: 'Hijau/Merah' },
        ],
      },
      {
        id: '4.2',
        title: 'Kepegawaian / HRIS',
        steps: [
          { step: '/kepegawaian', expected: '7 tab tersedia' },
          { step: 'Tambah pegawai baru', expected: 'NIP auto-gen RS-YYYY-XXXXX, tersimpan' },
          { step: 'Departemen: CRUD (15 default)', expected: 'List departemen' },
          { step: 'Jadwal Dinas: assign shift calendar', expected: 'Warna per shift (Pagi/Siang/Malam/Long)' },
          { step: 'Absensi: hadir/izin/sakit/cuti/alpha', expected: 'Badge warna, summary bulanan' },
          { step: 'Cuti: ajukan → approve/reject', expected: 'Saldo berkurang (12/thn)' },
          { step: 'Gaji: buat → proses → final → slip', expected: 'Auto-calc gaji+tunjangan+PPh21+BPJS' },
        ],
      },
    ],
  },
  {
    title: 'BAGIAN 5 — PENGATURAN & ADMIN',
    subtitle: 'Profil RS, Dokter, Asuransi, User, Terminologi, CDSS, TTE, Backup, Laporan, Audit, SIRS, SIRANAP, Aset',
    tests: [
      {
        id: '5.1',
        title: 'Profil RS, Dokter, Asuransi, User',
        steps: [
          { step: '/admin/rs → ubah → simpan', expected: 'Tersimpan' },
          { step: '/admin/dokter → 3 tab', expected: 'Jadwal, Tarif, Jasa Medis' },
          { step: '/admin/asuransi → CRUD + toggle', expected: 'Tampil di pendaftaran' },
          { step: '/admin/pengguna → tambah → login', expected: 'Menu sesuai role' },
        ],
      },
      {
        id: '5.2',
        title: 'Terminologi LOINC & KFA',
        steps: [
          { step: '/admin/terminologi → Tab LOINC', expected: '90+ kode LOINC, search, filter kategori, stats' },
          { step: 'Tab KFA', expected: '101 kode KFA, filter golongan, stats' },
          { step: 'Tab Mapping: lab param → LOINC', expected: 'Inline combobox per row, progress bar' },
          { step: 'Mapping drug → KFA + Auto-match', expected: 'Word-similarity matching, bulk result' },
        ],
      },
      {
        id: '5.3',
        title: 'CDSS (Clinical Decision Support)',
        steps: [
          { step: '/admin/cdss → Tab High-Alert', expected: 'Daftar obat high-alert, toggle, kategori, instruksi' },
          { step: 'Tab LASA / NORUM', expected: 'Auto-detect pg_trgm similarity, konfirmasi pasangan' },
          { step: 'Tab Interaksi Obat', expected: '65 seed interaksi, search, filter severity, CRUD' },
          { step: 'Tab Riwayat Alert', expected: 'Stats total/overridden/rate, recent alerts table' },
          { step: 'Test: buka dispensing obat high-alert', expected: 'CdssAlertBanner merah muncul, blokir sampai override' },
        ],
      },
      {
        id: '5.4',
        title: 'TTE / Tanda Tangan Elektronik',
        steps: [
          { step: '/admin/tte → Stats', expected: '4 stat cards, breakdown by type/signer' },
          { step: '4 provider cards: Internal/BSrE/VIDA/Privy', expected: 'Config dialog per provider' },
          { step: 'Test tanda tangan dokumen', expected: 'SignaturePad Canvas, SIP input, legal checkbox' },
          { step: 'Verifikasi TTE Badge', expected: 'Klik badge → verify dialog, tamper detection' },
        ],
      },
      {
        id: '5.5',
        title: 'Backup & Recovery',
        steps: [
          { step: '/admin/backup → Tab Overview', expected: '4 stat cards, last success, jadwal status' },
          { step: 'Tab Riwayat: buat backup baru', expected: 'pg_dump+gzip, size, duration, download' },
          { step: 'Tab Jadwal: atur frekuensi + storage', expected: 'Toggle auto, time picker, retention days' },
          { step: 'Restore: validate + command', expected: 'Restore command copyable (docker/bare metal)' },
        ],
      },
      {
        id: '5.6',
        title: 'Laporan & Export',
        steps: [
          { step: '/laporan → 7 tipe laporan cards', expected: 'Kunjungan, Pendapatan, Farmasi, Diagnosa, Pasien, Billing, Lainnya' },
          { step: 'Filter tanggal + groupBy', expected: 'Chart + tabel terupdate' },
          { step: 'Export XLSX', expected: 'Multi-sheet workbook, styled header, auto-fit' },
          { step: 'Export PDF', expected: 'A4 multi-section, header, table, page numbering' },
          { step: 'Export CSV', expected: 'CSV terunduh' },
        ],
      },
      {
        id: '5.7',
        title: 'Audit Trail, Import, Migrasi',
        steps: [
          { step: '/admin/audit', expected: 'Log akses tampil, filter' },
          { step: '/admin/import → upload CSV pasien', expected: 'Parse result: sukses/gagal/duplikat' },
          { step: '/admin/migrasi-khanza', expected: '4-step wizard: Connect → Analyze → Migrate → Verify' },
          { step: 'MFA: /profil/mfa → aktifkan', expected: 'QR Code TOTP, login dengan kode MFA' },
        ],
      },
      {
        id: '5.8',
        title: 'SIRS Online (Laporan RL Kemenkes)',
        steps: [
          { step: '/admin/sirs-online → Tab Laporan RL', expected: '10 card RL: RL1.3, RL3.2-3.12, RL4.1, RL5.1' },
          { step: 'Klik "Lihat" RL1.3', expected: 'Preview: 4 summary cards + tabel ruangan' },
          { step: 'Klik "Lihat" RL3.2', expected: 'Preview: indikator BOR/LOS/TOI/BTO/GDR/NDR + tabel rawat inap per kelas' },
          { step: 'Klik "Lihat" RL3.5', expected: 'Preview: tabel poli baru♂♀ + lama♂♀' },
          { step: 'Klik "Lihat" RL4.1 / RL5.1', expected: 'Preview: morbiditas/mortalitas ranked ICD-10 + gender' },
          { step: 'Tab Konfigurasi: isi kode_rs, endpoint, mode', expected: 'Tersimpan, test koneksi' },
          { step: 'Klik "Kirim" salah satu RL', expected: 'Hasil pengiriman: sukses/gagal + pesan' },
          { step: 'Tab Riwayat', expected: '4 stat cards, breakdown per RL type, submission history table' },
        ],
      },
      {
        id: '5.9',
        title: 'SIRANAP (Ketersediaan Tempat Tidur)',
        steps: [
          { step: '/admin/siranap → Tab Ketersediaan TT', expected: '5 summary cards: Total/Terpakai/Kosong/Waiting/BOR' },
          { step: 'Tabel bed: kode/kelas/total/♂♀ terpakai/♂♀ kosong/waiting', expected: 'Data sesuai ruangan RS' },
          { step: 'Klik "Kirim ke Kemenkes"', expected: 'Build XML → POST → result feedback sukses/gagal' },
          { step: 'Tab Konfigurasi: kode_rs, password', expected: 'Tersimpan' },
          { step: 'Auto send: toggle ON → tambah waktu kirim', expected: 'Multi-time (misal 08:00, 14:00, 20:00)' },
          { step: 'Test Koneksi', expected: 'HEAD request → koneksi berhasil/gagal' },
          { step: 'Tab Riwayat Pengiriman', expected: '4 stat cards (total/hari ini/sukses/gagal)' },
          { step: 'Filter status + tanggal', expected: 'Submission table: waktu/status/rooms/duration/trigger' },
        ],
      },
      {
        id: '5.10',
        title: 'Manajemen Aset',
        steps: [
          { step: '/admin/aset → Tab Daftar Aset', expected: 'Tabel aset, search, filter kategori+kondisi, stat cards' },
          { step: 'Klik "Tambah Aset"', expected: 'Dialog 22 field: kode auto, nama, kategori, harga, penyusutan, lokasi, garansi' },
          { step: 'Tanggal Pembelian / Garansi format dd/mm/yyyy', expected: 'Ketik langsung atau pilih kalender, format dd/mm/yyyy' },
          { step: 'Simpan → muncul di tabel', expected: 'Kode auto (contoh: MED-2026-0001), nilai buku dihitung' },
          { step: 'Klik baris aset → detail dialog', expected: 'Info, harga perolehan, nilai buku, progress penyusutan, riwayat' },
          { step: 'Edit (ikon pensil) → ubah → simpan', expected: 'Data terupdate' },
          { step: 'Tab Pemeliharaan → "Tambah Record"', expected: 'Pilih aset, tipe (perbaikan/kalibrasi/dll), biaya, teknisi' },
          { step: 'Tab Mutasi → "Tambah Mutasi"', expected: 'Pilih aset, tipe (pindah/penghapusan/penjualan/hibah)' },
          { step: 'Mutasi pindah → isi lokasi tujuan', expected: 'Lokasi aset auto-update' },
          { step: 'Tab Penyusutan → pilih tahun', expected: 'Summary cards + tabel per aset: GL/SM, akumulasi, nilai buku, sisa bulan' },
        ],
      },
    ],
  },
  {
    title: 'BAGIAN 6 — INTEGRASI & PORTAL PASIEN',
    subtitle: 'BPJS (8 tab), SATUSEHAT (13 FHIR), Portal Pasien',
    tests: [
      {
        id: '6.1',
        title: 'BPJS (Mock Mode)',
        steps: [
          { step: '/bpjs', expected: '8 tab: Peserta, SEP, Rujukan, PCare, e-Klaim, Aplicare, Monitoring, Antrol' },
          { step: 'Peserta: cari → SEP: buat', expected: 'Mock data, SEP generated' },
          { step: 'PCare / e-Klaim / Aplicare / Monitoring', expected: 'Mock data, stats' },
          { step: 'Antrol: task + tambah + jadwal + dashboard', expected: 'CRUD, auto-refresh 30s/60s' },
        ],
      },
      {
        id: '6.2',
        title: 'SATUSEHAT',
        steps: [
          { step: '/admin/satusehat', expected: '13 FHIR cards (5 core + 8 extended)' },
          { step: 'Badge auto/manual per resource', expected: 'Tampil benar' },
          { step: 'Detail dialog', expected: 'Shows all 13 resources mapping info' },
        ],
      },
      {
        id: '6.3',
        title: 'Portal Pasien',
        steps: [
          { step: '/portal/login → NIK + Tgl Lahir + rs-demo', expected: 'Login, dashboard portal' },
          { step: 'Dashboard: greeting, alergi, upcoming', expected: 'Data tampil, NIK masked' },
          { step: '/portal/riwayat', expected: 'Kunjungan paginated' },
          { step: '/portal/tagihan', expected: 'Outstanding + status badge Lunas/Sebagian/Belum' },
          { step: '/portal/rekam-medis', expected: 'SOAP accordion, diagnosa ICD-10, resep' },
        ],
      },
    ],
  },
  {
    title: 'BAGIAN 7 — SUPER ADMIN PANEL',
    subtitle: 'Dashboard, Tenant, Paket, Monitoring, Settings, SA, Pembayaran',
    tests: [
      {
        id: '7.1',
        title: 'Dashboard & Tenant',
        steps: [
          { step: 'Login SA → /sa', expected: 'Stats, plan distribution, alerts, recent, growth chart' },
          { step: '/sa/tenants → list, toggle, detail', expected: 'Cards + detail: 5 stats, usage bars, users' },
          { step: '/sa/tenants/[id]', expected: 'Info card, stat cards vs plan limits, user table, subscription history' },
        ],
      },
      {
        id: '7.2',
        title: 'Paket & Transaksi',
        steps: [
          { step: '/sa/plans → Tab Paket', expected: 'Trial, Basic, Professional, Enterprise cards' },
          { step: '"Tambah" → modal 9 field → simpan', expected: 'Paket baru di grid' },
          { step: 'Edit (pensil) → simpan', expected: 'Terupdate' },
          { step: 'Toggle aktif/nonaktif', expected: 'Status berubah' },
          { step: 'Hapus → konfirmasi', expected: 'Hapus (gagal jika dipakai)' },
          { step: 'Tab Transaksi', expected: 'Riwayat semua tenant' },
        ],
      },
      {
        id: '7.3',
        title: 'Monitoring, Settings, SA, Bayar',
        steps: [
          { step: '/sa/monitoring', expected: 'System health, tenant growth, revenue trend, per-tenant health table' },
          { step: '/sa/settings → 6 kategori', expected: 'Edit, test email SMTP, cek billing expiry' },
          { step: '/sa/super-admins → CRUD', expected: 'Owner/operator roles, proteksi last-admin' },
          { step: '/sa/payments → 3 tab', expected: 'Revenue 4 cards, pending verifikasi, proof viewer' },
          { step: 'Sidebar collapse', expected: '64px ↔ 250px, tooltip' },
        ],
      },
    ],
  },
  {
    title: 'BAGIAN 8 — FARMASI LANJUTAN',
    subtitle: 'Purchase Order, Stock Opname, Mutasi, Penjualan Bebas',
    tests: [
      {
        id: '8.1',
        title: 'Purchase Order',
        steps: [
          { step: '/farmasi/purchase-order', expected: 'List PO, status filter, search' },
          { step: 'Buat PO: pilih supplier, tambah obat, harga', expected: 'PO draft tersimpan, no PO auto' },
          { step: 'Approve → Order → Receive (input batch+expiry)', expected: '5-step progress bar, stok bertambah otomatis' },
          { step: 'Complete / Cancel', expected: 'Status final, tidak bisa diubah' },
        ],
      },
      {
        id: '8.2',
        title: 'Stock Opname',
        steps: [
          { step: '/farmasi/stock-opname', expected: 'List opname, create baru (farmasi/gudang)' },
          { step: 'Detail: input jumlah aktual per item', expected: 'Selisih highlighting (merah/hijau)' },
          { step: 'Complete → stock adjustment otomatis', expected: 'Stok di-update, summary cards' },
        ],
      },
      {
        id: '8.3',
        title: 'Mutasi Barang & Penjualan Bebas',
        steps: [
          { step: '/farmasi/mutasi → buat mutasi', expected: 'Workflow: draft → approved → completed/rejected' },
          { step: '/farmasi/penjualan-bebas', expected: 'POS-style, search obat, stok terpotong, ringkasan harian' },
        ],
      },
    ],
  },
]

const bdr = '1px solid #d1d5db'
const f = 'Segoe UI, Tahoma, Arial, sans-serif'

const thStyle: React.CSSProperties = {
  border: bdr,
  padding: '4px 6px',
  background: '#f3f4f6',
  fontSize: 9,
  textAlign: 'left',
  fontWeight: 600,
}

const tdStyle: React.CSSProperties = {
  border: bdr,
  padding: '3px 6px',
  fontSize: 9,
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

function TestTable({ test }: { test: TestCase }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', marginBottom: 3 }}>
        TEST {test.id} — {test.title}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '4%' }}>#</th>
            <th style={{ ...thStyle, width: '50%' }}>Langkah</th>
            <th style={{ ...thStyle, width: '40%' }}>Expected Result</th>
            <th style={{ ...thStyle, width: '6%' }}>✅❌</th>
          </tr>
        </thead>
        <tbody>
          {test.steps.map((s, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
              <td style={tdStyle}>{s.step}</td>
              <td style={tdStyle}>{s.expected}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}></td>
            </tr>
          ))}
        </tbody>
      </table>
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
      <span>SIMRS SaaS Manual Testing Guide — {tgl}</span>
      <span>
        Halaman {page} / {total}
      </span>
    </div>
  )
}

export default function ManualTestingGuidePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const totalTests = SECTIONS.reduce((acc, s) => acc + s.tests.length, 0)
  const totalSteps = SECTIONS.reduce(
    (acc, s) => acc + s.tests.reduce((a2, t) => a2 + t.steps.length, 0),
    0,
  )
  const tgl = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handleDownloadPDF = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const { jsPDF } = await import('jspdf')

      const pages = containerRef.current?.querySelectorAll('[data-page]')
      if (!pages) return

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < pages.length; i++) {
        const el = pages[i] as HTMLElement
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

      pdf.save('MANUAL-TESTING-GUIDE.pdf')
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('Gagal generate PDF. Coba lagi.')
    } finally {
      setGenerating(false)
    }
  }

  const pages: React.ReactNode[] = []

  const SectionHeader = ({ idx }: { idx: number }) => (
    <>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#0d9488',
          borderBottom: '2px solid #14b8a6',
          paddingBottom: 2,
          marginBottom: 8,
        }}
      >
        {SECTIONS[idx].title}
      </div>
      <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 6, fontStyle: 'italic' }}>
        {SECTIONS[idx].subtitle}
      </div>
    </>
  )

  const ContinueLabel = ({ idx }: { idx: number }) => (
    <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 6, fontStyle: 'italic' }}>
      Lanjutan — {SECTIONS[idx].title}
    </div>
  )

  const TOTAL_PAGES = 12

  // ═══ Page 1: Cover + Credentials ═══
  pages.push(
    <div key="p1" data-page style={pageBase}>
      <div
        style={{
          textAlign: 'center',
          marginBottom: 16,
          borderBottom: '3px solid #0d9488',
          paddingBottom: 10,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 3 }}>
          🏥 SIMRS SaaS
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 3 }}>
          Panduan Testing Manual
        </div>
        <div style={{ color: '#6b7280', fontSize: 10 }}>
          Langkah-langkah testing manual untuk seluruh fitur SIMRS SaaS
        </div>
        <div style={{ color: '#9ca3af', fontSize: 9, marginTop: 4 }}>
          Versi: 2.1 | Tanggal: {tgl} | Total: {totalTests} Skenario | {totalSteps} Langkah
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 5 }}>
        Prasyarat
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 12 }}>
        <thead>
          <tr>
            <th style={thStyle}>Komponen</th>
            <th style={thStyle}>URL</th>
            <th style={thStyle}>Perintah</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Frontend', 'http://localhost:3000', 'cd apps/web && npm run dev'],
            ['Backend', 'http://localhost:4001', 'cd apps/server && npx tsx src/app.ts'],
            ['PostgreSQL', 'localhost:5432/simrs_db', 'Service running'],
            ['Redis', 'localhost:6379', 'Opsional'],
          ].map(([k, u, c], i) => (
            <tr key={k} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{k}</td>
              <td style={tdStyle}>{u}</td>
              <td style={tdStyle}>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 5 }}>
        Daftar Kredensial
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={thStyle}>Akun</th>
            <th style={thStyle}>Kode RS</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Password</th>
          </tr>
        </thead>
        <tbody>
          {CREDENTIALS.map(([a, k, e, p], i) => (
            <tr key={a} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{a}</td>
              <td style={tdStyle}>{k}</td>
              <td style={tdStyle}>{e}</td>
              <td style={tdStyle}>{p}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 5 }}>
        Daftar Isi — 8 Bagian Testing
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '8%' }}>Hal</th>
            <th style={thStyle}>Bagian</th>
            <th style={{ ...thStyle, width: '12%' }}>Tests</th>
          </tr>
        </thead>
        <tbody>
          {SECTIONS.map((s, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>
                {i === 4 ? '6–7' : i < 4 ? i + 2 : i + 3}
              </td>
              <td style={tdStyle}>{s.title}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{s.tests.length}</td>
            </tr>
          ))}
          <tr style={{ background: '#eff6ff' }}>
            <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'center' }}>11</td>
            <td style={{ ...tdStyle, fontWeight: 700 }}>Checklist Ringkasan</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{totalTests}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ flex: 1 }} />
      <PageFooter page={1} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 2: BAGIAN 1 — Alur SaaS (7 tests) ═══
  pages.push(
    <div key="p2" data-page style={pageBase}>
      <SectionHeader idx={0} />
      {SECTIONS[0].tests.map((t) => (
        <TestTable key={t.id} test={t} />
      ))}
      <div style={{ flex: 1 }} />
      <PageFooter page={2} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 3: BAGIAN 2 — Alur Operasional RS (6 tests) ═══
  pages.push(
    <div key="p3" data-page style={pageBase}>
      <SectionHeader idx={1} />
      {SECTIONS[1].tests.map((t) => (
        <TestTable key={t.id} test={t} />
      ))}
      <div style={{ flex: 1 }} />
      <PageFooter page={3} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 4: BAGIAN 3 — Modul Pendukung (6 tests) ═══
  pages.push(
    <div key="p4" data-page style={pageBase}>
      <SectionHeader idx={2} />
      {SECTIONS[2].tests.map((t) => (
        <TestTable key={t.id} test={t} />
      ))}
      <div style={{ flex: 1 }} />
      <PageFooter page={4} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 5: BAGIAN 4 — Keuangan & Kepegawaian (2 tests) ═══
  pages.push(
    <div key="p5" data-page style={pageBase}>
      <SectionHeader idx={3} />
      {SECTIONS[3].tests.map((t) => (
        <TestTable key={t.id} test={t} />
      ))}
      <div style={{ flex: 1 }} />
      <PageFooter page={5} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 6: BAGIAN 5 — Pengaturan & Admin part 1 (5.1–5.5) ═══
  pages.push(
    <div key="p6" data-page style={pageBase}>
      <SectionHeader idx={4} />
      {SECTIONS[4].tests.slice(0, 5).map((t) => (
        <TestTable key={t.id} test={t} />
      ))}
      <div style={{ flex: 1 }} />
      <PageFooter page={6} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 7: BAGIAN 5 lanjutan (5.6–5.10) ═══
  pages.push(
    <div key="p7" data-page style={pageBase}>
      <ContinueLabel idx={4} />
      {SECTIONS[4].tests.slice(5).map((t) => (
        <TestTable key={t.id} test={t} />
      ))}
      <div style={{ flex: 1 }} />
      <PageFooter page={7} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 8: BAGIAN 6 — Integrasi & Portal Pasien (3 tests) ═══
  pages.push(
    <div key="p8" data-page style={pageBase}>
      <SectionHeader idx={5} />
      {SECTIONS[5].tests.map((t) => (
        <TestTable key={t.id} test={t} />
      ))}
      <div style={{ flex: 1 }} />
      <PageFooter page={8} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 9: BAGIAN 7 — Super Admin Panel (3 tests) ═══
  pages.push(
    <div key="p9" data-page style={pageBase}>
      <SectionHeader idx={6} />
      {SECTIONS[6].tests.map((t) => (
        <TestTable key={t.id} test={t} />
      ))}
      <div style={{ flex: 1 }} />
      <PageFooter page={9} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 10: BAGIAN 8 — Farmasi Lanjutan (3 tests) ═══
  pages.push(
    <div key="p10" data-page style={pageBase}>
      <SectionHeader idx={7} />
      {SECTIONS[7].tests.map((t) => (
        <TestTable key={t.id} test={t} />
      ))}
      <div style={{ flex: 1 }} />
      <PageFooter page={10} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 11: Checklist Ringkasan ═══
  pages.push(
    <div key="p11" data-page style={pageBase}>
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
        CHECKLIST RINGKASAN
      </div>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>
        Seluruh skenario testing — {totalTests} test, {totalSteps} langkah
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={thStyle}>Bagian</th>
            <th style={{ ...thStyle, width: '15%' }}>Jumlah</th>
            <th style={{ ...thStyle, width: '15%' }}>Selesai</th>
          </tr>
        </thead>
        <tbody>
          {SECTIONS.map((s, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{s.title}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{s.tests.length} test</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>/ {s.tests.length}</td>
            </tr>
          ))}
          <tr style={{ background: '#eff6ff', fontWeight: 700 }}>
            <td style={{ ...tdStyle, fontWeight: 700 }}>TOTAL</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
              {totalTests} skenario
            </td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>/ {totalTests}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 24, marginBottom: 30 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Tester:</div>
          <div style={{ borderBottom: '1px solid #000', width: 250, height: 30 }} />
          <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 2 }}>Nama & Tanda Tangan</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Tanggal Testing:</div>
          <div style={{ borderBottom: '1px solid #000', width: 200, height: 30 }} />
          <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 2 }}>Tanggal</div>
        </div>
      </div>

      <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Catatan:</div>
      <div
        style={{
          border: bdr,
          borderRadius: 4,
          padding: 12,
          minHeight: 120,
          background: '#f9fafb',
        }}
      />

      <div style={{ flex: 1 }} />
      <PageFooter page={11} total={TOTAL_PAGES} tgl={tgl} />
    </div>,
  )

  // ═══ Page 12: Tips Testing ═══
  pages.push(
    <div key="p12" data-page style={pageBase}>
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
        TIPS TESTING
      </div>
      <div
        style={{
          border: bdr,
          borderRadius: 6,
          padding: '10px 14px',
          background: '#eff6ff',
          marginBottom: 12,
          fontSize: 9,
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 10 }}>
          🔧 Troubleshooting Umum
        </div>
        <div>• <strong>Service Worker cache</strong>: Jika perubahan tidak muncul, buka DevTools → Application → Service Workers → Unregister, lalu clear Cache Storage dan hard refresh (Ctrl+Shift+R)</div>
        <div>• <strong>Port bentrok</strong>: Jika port 3000/4001 sudah terpakai, matikan proses lama dengan Task Manager atau <code>npx kill-port 3000</code></div>
        <div>• <strong>Database error</strong>: Jalankan ulang seed: <code>cd apps/server && npx knex seed:run</code></div>
        <div>• <strong>Module tidak muncul</strong>: Logout → clear localStorage → login ulang (modul tergantung role + subscription plan)</div>
      </div>

      <div
        style={{
          border: bdr,
          borderRadius: 6,
          padding: '10px 14px',
          background: '#f0fdf4',
          marginBottom: 12,
          fontSize: 9,
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 10 }}>
          📋 Urutan Testing Disarankan
        </div>
        <div>1. <strong>Bagian 1 (SaaS)</strong>: Landing → Register → Approve → Onboarding</div>
        <div>2. <strong>Bagian 2 (Operasional)</strong>: Login → Pasien → Daftar → SOAP → Dispensing → Bayar</div>
        <div>3. <strong>Bagian 3 (Pendukung)</strong>: Lab → Radiologi → Bedah → Gizi → MCU</div>
        <div>4. <strong>Bagian 4 (Keuangan/HR)</strong>: Jurnal → Neraca → Pegawai → Gaji</div>
        <div>5. <strong>Bagian 5 (Admin)</strong>: CDSS → TTE → SIRS Online → SIRANAP → Aset → Backup</div>
        <div>6. <strong>Bagian 6 (Integrasi)</strong>: BPJS → SATUSEHAT → Portal</div>
        <div>7. <strong>Bagian 7 (SA)</strong>: Dashboard → Tenants → Plans → Monitoring</div>
        <div>8. <strong>Bagian 8 (Farmasi)</strong>: PO → Stock Opname → Mutasi → OTC</div>
      </div>

      <div
        style={{
          border: bdr,
          borderRadius: 6,
          padding: '10px 14px',
          background: '#fefce8',
          marginBottom: 12,
          fontSize: 9,
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 10 }}>
          ⚠ Perhatian
        </div>
        <div>• BPJS dan SATUSEHAT berjalan dalam <strong>mock mode</strong> (data simulasi, tidak konek ke server pemerintah)</div>
        <div>• SIRANAP dan SIRS Online memerlukan konfigurasi kode_rs dan endpoint yang valid untuk pengiriman nyata</div>
        <div>• Email notifikasi memerlukan konfigurasi SMTP yang valid di SA Settings</div>
        <div>• TTE provider eksternal (BSrE/VIDA/Privy) dalam mode mock — konfigurasi API key untuk produksi</div>
        <div>• Backup restore memerlukan akses CLI ke server (docker exec atau psql langsung)</div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ borderTop: '2px solid #0d9488', paddingTop: 6, textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: '#6b7280' }}>
          SIMRS SaaS — Panduan Testing Manual v2.1
        </div>
        <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>
          {tgl} • Halaman {TOTAL_PAGES} / {TOTAL_PAGES}
        </div>
      </div>
    </div>,
  )

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <button
          onClick={handleDownloadPDF}
          disabled={generating}
          style={{
            padding: '12px 40px',
            background: generating ? '#9ca3af' : '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: generating ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {generating
            ? '⏳ Generating PDF...'
            : `📄 Download PDF (${TOTAL_PAGES} Halaman, ${totalTests} Test)`}
        </button>
      </div>

      <div ref={containerRef}>{pages}</div>
    </div>
  )
}
