'use client'

import { useMemo } from 'react'
import { usePermissions } from '@/hooks/use-permissions'
import {
  ClipboardList,
  Users,
  FileText,
  Pill,
  Wallet,
  FlaskConical,
  ScanLine,
  BarChart3,
  Settings,
  Scissors,
  Utensils,
  ShoppingCart,
  ArrowRightLeft,
  Cloud,
  RefreshCw,
  Shield,
  BookOpen,
  Warehouse,
  Truck,
  BookMarked,
  Stethoscope,
  Heart,
  Calculator,
  UserCog,
  ClipboardCheck,
  PenTool,
  Database,
  BedDouble,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'

interface GuideSection {
  title: string
  icon: LucideIcon
  steps: string[]
  tips?: string[]
}

interface RoleGuide {
  roleName: string
  description: string
  sections: GuideSection[]
}

function buildGuide(role: string | undefined): RoleGuide {
  switch (role) {
    case 'admin':
      return {
        roleName: 'Administrator',
        description:
          'Sebagai Admin, Anda memiliki akses penuh ke seluruh modul SIMRS. ' +
          'Tugas utama Anda meliputi pengelolaan pengguna, konfigurasi RS, dan monitoring operasional.',
        sections: [
          {
            title: 'Kelola Pengguna',
            icon: Users,
            steps: [
              'Buka menu Pengaturan → Pengguna',
              'Klik "Tambah Pengguna" untuk membuat akun baru',
              'Pilih role yang sesuai (dokter, perawat, apoteker, kasir, dll)',
              'Atur password awal — pengguna bisa mengubahnya setelah login',
              'Untuk mereset password, klik ikon reset di daftar pengguna',
            ],
            tips: [
              'Setiap role otomatis mendapat permission sesuai tugasnya',
              'Admin bisa mengakses semua modul sebagai fallback',
            ],
          },
          {
            title: 'Profil Rumah Sakit',
            icon: Settings,
            steps: [
              'Buka menu Pengaturan → Profil RS',
              'Lengkapi identitas RS: nama, alamat, telepon, email',
              'Data ini akan muncul di header cetak (kwitansi, resep, laporan)',
            ],
          },
          {
            title: 'Import Data',
            icon: ClipboardList,
            steps: [
              'Buka menu Pengaturan → Import CSV',
              'Download template CSV (pasien / obat)',
              'Isi data sesuai format kolom, lalu upload',
              'Sistem otomatis skip NIK duplikat dan generate nomor RM baru',
            ],
          },
          {
            title: 'Migrasi dari Khanza',
            icon: RefreshCw,
            steps: [
              'Buka menu Pengaturan → Migrasi Khanza',
              'Masukkan koneksi MySQL database Khanza',
              'Klik "Test Koneksi" → "Analisis" → "Mulai Migrasi"',
              'Pantau progress, lalu verifikasi setelah selesai',
            ],
            tips: [
              'Migrasi bisa dijalankan berulang (incremental)',
              'Data yang sudah ada tidak akan ditimpa',
            ],
          },
          {
            title: 'Integrasi SATUSEHAT',
            icon: Cloud,
            steps: [
              'Buka menu Pengaturan → SATUSEHAT',
              'Masukkan Client ID dan Client Secret dari SATUSEHAT',
              'Pilih environment (Sandbox / Production)',
              'Sinkronisasi bisa dilakukan manual atau otomatis via BullMQ',
            ],
          },
          {
            title: 'Laporan & Dashboard',
            icon: BarChart3,
            steps: [
              'Dashboard menampilkan statistik harian secara real-time',
              'Menu Laporan memungkinkan filter by tanggal, jenis laporan',
              'Export tersedia dalam format CSV, Excel (XLSX), dan PDF',
            ],
          },
          {
            title: 'Keamanan',
            icon: Shield,
            steps: [
              'Aktifkan MFA di menu Profil → MFA untuk keamanan ekstra',
              'Audit log tersedia di pengaturan — catat semua akses data pasien',
              'Backup otomatis berjalan harian, cek di Pengaturan → Backup',
            ],
          },
          {
            title: 'Dokter & Jadwal Praktik',
            icon: Stethoscope,
            steps: [
              'Buka menu Pengaturan → Dokter & Jadwal',
              'Klik dokter untuk melihat 3 tab: Jadwal, Tarif, Jasa Medis',
              'Jadwal: tambah slot per hari (poli, jam mulai/selesai, kuota pasien)',
              'Tarif Layanan: set kode, nama, kategori, tarif, dan persentase bagi hasil dokter vs RS',
              'Jasa Medis: lihat rekapitulasi pendapatan dokter per periode',
            ],
          },
          {
            title: 'Asuransi & Penjamin',
            icon: Shield,
            steps: [
              'Buka menu Pengaturan → Asuransi & Penjamin',
              'Tambah penjamin baru: isi kode, nama, tipe (Asuransi/Perusahaan/Yayasan/Kerjasama)',
              'Set PIC, kontak, dan potongan tarif (%)',
              'Pasien bisa dihubungkan ke penjamin di menu Pasien → tab Asuransi',
              'Saat pendaftaran, pilih penjamin → pilih asuransi terdaftar pasien',
            ],
          },
          {
            title: 'Gudang Umum & Stock Opname',
            icon: Warehouse,
            steps: [
              'Buka menu Gudang untuk mengelola barang non-obat (ATK, alkes, linen, dll)',
              'Tambah item: isi nama, kode, kategori, satuan, stok minimum',
              'Tambah stok: klik item → isi jumlah dan catatan',
              'Stock Opname: buka Farmasi → Stock Opname → Buat Opname',
              'Pilih tipe: Farmasi (obat) atau Gudang (barang umum)',
              'Input jumlah fisik per item → sistem otomatis hitung selisih',
              'Selesaikan opname → stok otomatis disesuaikan',
            ],
          },
          {
            title: 'Purchase Order',
            icon: Truck,
            steps: [
              'Buka menu Farmasi → Purchase Order',
              'Buat PO baru: pilih supplier, tambah item obat, atur jumlah dan harga',
              'Alur status: Draft → Approved → Ordered → Received → Completed',
              'Saat penerimaan: input jumlah diterima, batch, dan expiry date per item',
              'Stok obat otomatis bertambah setelah penerimaan',
            ],
          },
          {
            title: 'CDSS (Clinical Decision Support)',
            icon: Shield,
            steps: [
              'Buka menu Pengaturan → CDSS',
              'Tab High-Alert: kelola obat high-alert (elektrolit konsentrat, antikoagulan, insulin, dll)',
              'Tab LASA/NORUM: deteksi otomatis obat dengan nama mirip menggunakan algoritma similarity',
              'Tab Interaksi Obat: lihat database 65+ interaksi obat, tambah manual, cek interaksi antar obat',
              'Tab Riwayat Alert: pantau alert yang muncul dan rate override oleh petugas farmasi',
              'Alert otomatis muncul di halaman dispensing saat obat high-alert atau ada interaksi',
            ],
            tips: [
              'CDSS critical alert akan memblokir dispensing sampai di-override dengan alasan',
              'Deteksi LASA menggunakan pg_trgm untuk similarity matching',
            ],
          },
          {
            title: 'Terminologi LOINC & KFA',
            icon: BookOpen,
            steps: [
              'Buka menu Pengaturan → Terminologi',
              'Tab LOINC: cari kode LOINC untuk parameter lab (90+ kode tersedia)',
              'Tab KFA: cari Kode Farmasi Alat Kesehatan (101 kode tersedia)',
              'Tab Mapping: hubungkan parameter lab ke kode LOINC, obat ke kode KFA',
              'Auto-match: klik tombol otomatis untuk mencocokkan obat ke KFA berdasarkan similarity nama',
              'Mapping ini digunakan untuk pelaporan SATUSEHAT dan standarisasi nasional',
            ],
          },
          {
            title: 'TTE (Tanda Tangan Elektronik)',
            icon: PenTool,
            steps: [
              'Buka menu Pengaturan → TTE / Tanda Tangan',
              'Lihat statistik tanda tangan: total, terverifikasi, per tipe dokumen',
              'Konfigurasi provider TTE: Internal, BSrE, VIDA, atau Privy',
              'Dokter/perawat bisa menandatangani rekam medis, CPPT, dan general consent',
              'Verifikasi: klik badge TTE pada dokumen untuk cek keaslian (tamper detection)',
            ],
            tips: [
              'TTE Internal menggunakan SHA-512 hash, cocok untuk internal RS',
              'BSrE/VIDA/Privy untuk tanda tangan elektronik tersertifikasi (sesuai UU ITE)',
            ],
          },
          {
            title: 'Keuangan / Akuntansi',
            icon: Calculator,
            steps: [
              'Buka menu Keuangan — 6 tab tersedia',
              'Dashboard: ringkasan total aset, kewajiban, pendapatan, beban, kas & bank',
              'Jurnal Umum: buat jurnal manual, atau otomatis dari pembayaran kasir/PO',
              'Bagan Akun (COA): 55 akun standar RS, bisa ditambah/edit',
              'Buku Besar: lihat mutasi per akun dengan saldo berjalan',
              'Neraca: posisi keuangan — Aset = Kewajiban + Ekuitas',
              'Laba Rugi: pendapatan - beban = laba/rugi periode',
            ],
            tips: [
              'Jurnal otomatis dibuat saat kasir menerima pembayaran dan saat PO diterima',
              'Jurnal bisa di-post (final) atau di-reverse (buat jurnal balikan)',
            ],
          },
          {
            title: 'Kepegawaian / HRIS',
            icon: UserCog,
            steps: [
              'Buka menu Kepegawaian — 7 tab tersedia',
              'Dashboard SDM: statistik pegawai, status kepegawaian, kehadiran hari ini',
              'Data Pegawai: tambah pegawai dengan NIP otomatis, jabatan, departemen, gaji pokok',
              'Departemen: kelola 15 departemen standar RS',
              'Jadwal Dinas: atur shift Pagi/Siang/Malam per pegawai per tanggal',
              'Absensi: catat kehadiran harian, lembur, dan keterlambatan',
              'Cuti & Izin: ajukan cuti (saldo 12 hari/tahun), approve/reject oleh atasan',
              'Penggajian: buat periode gaji → proses (tunjangan, BPJS, PPh21, lembur) → finalisasi → slip gaji',
            ],
            tips: [
              'PPh21 dihitung otomatis dengan tarif progresif (5/15/25/30%)',
              'Jasa medis dokter otomatis diambil dari transaksi tarif layanan',
            ],
          },
          {
            title: 'MCU (Medical Check Up)',
            icon: ClipboardCheck,
            steps: [
              'Buka menu MCU — 3 tab tersedia',
              'Dashboard: statistik hari ini, distribusi kesimpulan, paket terpopuler',
              'Pendaftaran MCU: daftarkan pasien, pilih paket (Basic/Executive/Pre-Employment)',
              'Detail MCU: input hasil per pemeriksaan (fisik, lab, radiologi, dll)',
              'Kesimpulan: Fit / Fit with Notes / Temporarily Unfit / Unfit',
              'Cetak Surat Keterangan Sehat (format A4 standar RS)',
              'Paket MCU: kelola paket dengan item pemeriksaan yang bisa dikustomisasi',
            ],
          },
          {
            title: 'SIRS Online',
            icon: Database,
            steps: [
              'Buka menu Pengaturan → SIRS Online',
              'Tab Laporan RL: generate 10 jenis laporan (RL1.3 s/d RL5.1)',
              'RL1.3: Ketersediaan tempat tidur',
              'RL3.2: Indikator RS (BOR, LOS, TOI, BTO, GDR, NDR)',
              'RL3.5: Kunjungan rawat jalan per poli',
              'RL4.1: Morbiditas rawat inap (20 besar diagnosa)',
              'RL5.1: Mortalitas rawat inap (20 besar penyebab kematian)',
              'Tab Konfigurasi: set kode RS, username, password SIRS Online',
              'Tab Riwayat: pantau pengiriman dan status per jenis RL',
            ],
          },
          {
            title: 'SIRANAP',
            icon: BedDouble,
            steps: [
              'Buka menu Pengaturan → SIRANAP',
              'Tab Ketersediaan TT: lihat dan kirim data tempat tidur ke Kemenkes',
              'Tab Konfigurasi: set credentials, jadwal pengiriman otomatis, dan endpoint',
              'Tab Riwayat: pantau pengiriman (auto setiap 15 menit jika diaktifkan)',
              'Data dikirim dalam format XML sesuai spesifikasi SIRANAP Kemenkes',
            ],
          },
          {
            title: 'Bridging BPJS Antrol',
            icon: CreditCard,
            steps: [
              'Buka menu BPJS → Tab Antrol',
              'Task List: lihat antrian dari Mobile JKN, sync dari BPJS, update status',
              'Tambah Antrean: buat antrean manual untuk pasien BPJS',
              'Jadwal Dokter: lihat jadwal dari referensi Antrol BPJS',
              'Dashboard: statistik harian/bulanan, breakdown per poli',
            ],
          },
          {
            title: 'Rawat Inap — Monitoring Klinis',
            icon: BedDouble,
            steps: [
              'Buka menu Rawat Inap → klik "Monitoring Klinis" pada bed yang terisi pasien',
              'Halaman detail 4 tab: Vital Signs, Instruksi Medis, Catatan Keperawatan, Perencanaan Pulang',
              'Tab Vital Signs: lihat tren vital 24 jam, alert level otomatis (Normal/Warning/Critical)',
              'Tab Instruksi Medis: lihat semua instruksi dokter + riwayat eksekusi perawat',
              'Tab Catatan Keperawatan: catatan SBAR per shift (Pagi/Siang/Malam)',
              'Tab Perencanaan Pulang: 10-item checklist kesiapan pulang + obat pulang + jadwal kontrol',
              'Status kesiapan pulang otomatis: Belum Siap (<5 check), Sebagian (5-9), Siap Pulang (10/10)',
            ],
            tips: [
              'Alert level vital signs dihitung otomatis berdasarkan range klinis standar',
              'Peringatan akan muncul di daftar pasien rawat inap jika vital signs abnormal',
              'Catatan keperawatan yang sudah difinalisasi tidak bisa diubah',
            ],
          },
          {
            title: 'Tarif Layanan RS',
            icon: Calculator,
            steps: [
              'Buka menu Pengaturan → Tarif Layanan',
              'Tambah komponen tarif: kode, nama, kategori (visite/tindakan/administrasi/keperawatan)',
              'Set tarif per kelas kamar: Kelas 3, 2, 1, VIP, IGD, Poli',
              'Toggle aktif/nonaktif komponen tarif',
              'Tarif ini digunakan otomatis di billing saat pasien mendapat layanan',
            ],
          },
          {
            title: 'Tenaga Luar (Mitra Eksternal)',
            icon: UserCog,
            steps: [
              'Buka menu Pengaturan → Tenaga Luar',
              'Tambah tenaga luar: nama, profesi, spesialisasi, SIP, STR, instansi asal',
              'Set kontrak: tanggal mulai/selesai, fee share % dokter vs % RS (total 100%)',
              'Digunakan di modul Rehabilitasi untuk fisioterapis, terapis wicara, dll',
              'Fee split otomatis dihitung saat sesi rehabilitasi selesai',
            ],
          },
          {
            title: 'Rehabilitasi Medik',
            icon: Heart,
            steps: [
              'Buka menu Rehabilitasi — 3 tab: Dashboard, Orders, Fees',
              'Dashboard: statistik sesi, distribusi jenis terapi, ringkasan fee',
              'Orders: daftar order rehabilitasi dari dokter, filter status/terapi',
              'Fees: breakdown fee per tenaga luar (split RS vs praktisi)',
              'Detail order: progress ring, timeline sesi, tambah sesi baru',
              'Status alur: ordered → in_progress → completed / cancelled',
            ],
          },
          {
            title: 'Manajemen Aset',
            icon: Warehouse,
            steps: [
              'Buka menu Pengaturan → Manajemen Aset',
              'Tab Daftar Aset: lihat, cari, filter berdasarkan kategori/kondisi, tambah/edit/hapus aset',
              'Kode aset auto-generate berdasarkan kategori (contoh: MED-2026-0001)',
              'Isi data pembelian: harga perolehan, vendor, no faktur, tanggal pembelian',
              'Set umur ekonomis & metode penyusutan (Garis Lurus / Saldo Menurun Ganda)',
              'Tab Pemeliharaan: catat perbaikan, kalibrasi, penggantian part beserta biaya',
              'Tab Mutasi: pindah lokasi, penghapusan, penjualan, hibah aset',
              'Tab Penyusutan: laporan per tahun — nilai perolehan, akumulasi penyusutan, nilai buku',
              'Alert otomatis: aset perlu kalibrasi & garansi akan habis dalam 3 bulan',
            ],
            tips: [
              'Format tanggal: dd/mm/yyyy — ketik langsung atau pilih dari kalender',
              'Metode Garis Lurus cocok untuk aset dengan penyusutan merata per tahun',
              'Metode Saldo Menurun cocok untuk aset yang nilainya turun cepat di awal',
              'Isi interval kalibrasi (bulan) untuk aset medis agar muncul alert otomatis',
            ],
          },
        ],
      }

    case 'dokter':
      return {
        roleName: 'Dokter',
        description:
          'Sebagai Dokter, Anda bertugas melakukan pemeriksaan, menulis rekam medis (SOAP), ' +
          'meresepkan obat, dan memesan pemeriksaan penunjang (lab/radiologi).',
        sections: [
          {
            title: 'Melihat Antrian Pasien',
            icon: ClipboardList,
            steps: [
              'Buka menu Dashboard — lihat jumlah pasien menunggu di poli Anda',
              'Atau buka menu Pasien untuk melihat daftar pasien terdaftar',
              'Klik pasien untuk melihat riwayat kunjungan sebelumnya',
            ],
          },
          {
            title: 'Pemeriksaan (Rekam Medis)',
            icon: FileText,
            steps: [
              'Dari daftar kunjungan, klik "Periksa" pada pasien yang dipanggil',
              'Isi form SOAP: Subjective, Objective, Assessment, Plan',
              'Sistem menyimpan otomatis (auto-save) setiap perubahan',
              'Tambahkan diagnosa — ketik untuk mencari kode ICD-10',
              'Tambahkan tindakan — cari kode ICD-9-CM',
              'Klik "Finalisasi" jika rekam medis sudah selesai (tidak bisa diubah lagi)',
            ],
            tips: [
              'Gunakan template SOAP untuk mempercepat pengisian',
              'Diagnosis primer harus ditandai (centang "Primer")',
              'Anda bisa melihat riwayat rekam medis sebelumnya di tab Riwayat',
            ],
          },
          {
            title: 'Menulis Resep',
            icon: Pill,
            steps: [
              'Di halaman rekam medis, buka bagian Resep',
              'Ketik nama obat — sistem mencari dari database farmasi',
              'Atur dosis, frekuensi, jumlah, dan aturan pakai',
              'Resep otomatis masuk ke antrian Farmasi setelah finalisasi',
            ],
          },
          {
            title: 'Order Lab & Radiologi',
            icon: FlaskConical,
            steps: [
              'Buka menu Laboratorium atau Radiologi',
              'Klik "Buat Order" → pilih parameter lab / jenis pemeriksaan',
              'Tandai prioritas CITO jika darurat',
              'Hasil akan muncul di halaman order setelah petugas lab/radiologi input',
            ],
          },
          {
            title: 'Jadwal Operasi',
            icon: Scissors,
            steps: [
              'Buka menu Bedah untuk melihat jadwal hari ini',
              'Buat jadwal baru: pilih pasien, jenis operasi, ruang OK, waktu',
              'Sistem otomatis cek konflik ruangan',
              'Prioritas: Emergency > Cito > Elektif',
            ],
          },
          {
            title: 'CPPT (Catatan Perkembangan)',
            icon: FileText,
            steps: [
              'Di halaman pemeriksaan, klik tombol "CPPT"',
              'CPPT Multi-Profesi: Dokter, Perawat, Farmasi, Gizi, dll',
              'Isi SOAP-IE: Subjective, Objective, Assessment, Plan, Implementasi, Evaluasi',
              'Entri bisa diverifikasi oleh penanggung jawab',
              'Filter timeline berdasarkan profesi',
            ],
          },
          {
            title: 'Logbook Tindakan',
            icon: BookMarked,
            steps: [
              'Buka menu Logbook di sidebar',
              'Lihat seluruh catatan tindakan yang Anda lakukan',
              'Filter berdasarkan rentang tanggal',
              'Lihat statistik: total tindakan, diagnosa terbanyak, tindakan terbanyak',
              'Export data ke CSV untuk pelaporan',
            ],
          },
          {
            title: 'MCU (Medical Check Up)',
            icon: ClipboardCheck,
            steps: [
              'Buka menu MCU → Pendaftaran MCU',
              'Daftarkan pasien MCU dan pilih paket pemeriksaan',
              'Input hasil pemeriksaan fisik dan penunjang',
              'Buat kesimpulan: Fit / Fit with Notes / Temporarily Unfit / Unfit',
              'Cetak Surat Keterangan Sehat untuk pasien',
            ],
          },
          {
            title: 'Rawat Inap — Instruksi Medis',
            icon: BedDouble,
            steps: [
              'Buka menu Rawat Inap → klik "Monitoring Klinis" pada bed pasien yang Anda tangani',
              'Buka tab "Instruksi Medis" untuk membuat instruksi baru',
              'Pilih kategori: Obat, Infus, Diet, Tindakan, Lab, Radiologi, Konsultasi, Monitoring, Mobilisasi',
              'Atur prioritas: Rutin, Urgent, atau STAT (segera)',
              'Isi instruksi lengkap dengan dosis, frekuensi, rute pemberian, dan durasi',
              'Perawat akan mengeksekusi instruksi dan mencatat waktu pelaksanaan',
              'Instruksi bisa diselesaikan (Completed) atau dihentikan (Discontinued) dengan alasan',
            ],
            tips: [
              'Instruksi STAT ditandai merah dan diprioritaskan oleh perawat',
              'Riwayat eksekusi per instruksi bisa dilihat di detail instruksi',
              'Anda juga bisa melihat vital signs dan catatan keperawatan untuk evaluasi',
            ],
          },
          {
            title: 'Rawat Inap — Perencanaan Pulang',
            icon: BedDouble,
            steps: [
              'Di halaman Monitoring Klinis, buka tab "Perencanaan Pulang"',
              'Lengkapi checklist kesiapan pulang 10 item (klinis stabil, luka kering, dll)',
              'Isi daftar obat pulang: nama, dosis, frekuensi, durasi',
              'Tentukan jadwal kontrol: tanggal, poli, dan dokter',
              'Catat edukasi yang diberikan ke pasien/keluarga',
              'Status otomatis berubah: Belum Siap → Sebagian Siap → Siap Pulang',
            ],
          },
          {
            title: 'General Consent',
            icon: FileText,
            steps: [
              'Di halaman pendaftaran, klik "General Consent" untuk buat formulir persetujuan',
              'Isi informasi pasien, wali, dan hak-kewajiban',
              'Pasien/wali menandatangani formulir',
              'Cetak formulir persetujuan format A4 standar RS',
            ],
          },
          {
            title: 'Formulir Edukasi Pasien',
            icon: BookOpen,
            steps: [
              'Di halaman pemeriksaan, klik "Edukasi"',
              'Pilih template edukasi sesuai diagnosis',
              'Isi materi edukasi, metode, evaluasi pemahaman',
              'Tandai status re-edukasi jika diperlukan',
            ],
          },
          {
            title: 'Order Rehabilitasi',
            icon: Heart,
            steps: [
              'Buka menu Rehabilitasi → klik "Buat Order"',
              'Pilih pasien, jenis terapi (fisioterapi, terapi wicara, terapi okupasi, dll)',
              'Pilih tenaga luar (praktisi) yang menangani',
              'Set jumlah sesi yang direncanakan dan catatan klinis',
              'Praktisi akan menambah sesi per kunjungan rehabilitasi',
              'Lihat progress di detail order (progress ring + timeline sesi)',
            ],
            tips: [
              'Fee split otomatis dihitung dari kontrak tenaga luar',
              'Sesi masuk ke billing pasien dengan kategori "rehabilitasi"',
            ],
          },
          {
            title: 'Dokter Pengganti (Substitusi)',
            icon: Users,
            steps: [
              'Buka profil dokter → tab "Pengganti"',
              'Tambah dokter pengganti saat cuti/berhalangan',
              'Pilih dokter pengganti, tanggal mulai/selesai, alasan',
              'Dokter pengganti otomatis muncul di pendaftaran selama periode substitusi',
              'Batalkan substitusi jika berubah rencana',
            ],
          },
          {
            title: 'Resume Medis',
            icon: FileText,
            steps: [
              'Di halaman pemeriksaan, klik "Resume Medis"',
              'Resume otomatis diisi dari data kunjungan: identitas, vital, SOAP, diagnosa, resep',
              'Download PDF format A4 standar RS dengan KOP surat',
              'File name: Resume-Medis-{nama}-{visitNumber}.pdf',
            ],
          },
        ],
      }

    case 'perawat':
      return {
        roleName: 'Perawat',
        description:
          'Sebagai Perawat, Anda membantu proses asesmen pasien, mencatat tanda vital, ' +
          'dan melihat rekam medis serta hasil pemeriksaan penunjang.',
        sections: [
          {
            title: 'Asesmen Keperawatan',
            icon: FileText,
            steps: [
              'Buka menu Pasien — pilih pasien yang sedang dirawat',
              'Buka tab kunjungan aktif',
              'Catat tanda vital: tekanan darah, nadi, suhu, respirasi, SpO2',
              'Data tersimpan di rekam medis kunjungan',
            ],
          },
          {
            title: 'Melihat Rekam Medis',
            icon: BookOpen,
            steps: [
              'Buka menu Rekam Medis',
              'Anda bisa melihat catatan SOAP dokter (read-only)',
              'Lihat riwayat diagnosa dan tindakan sebelumnya di tab Riwayat',
            ],
          },
          {
            title: 'Order Diet (Gizi)',
            icon: Utensils,
            steps: [
              'Buka menu Gizi untuk pasien rawat inap',
              'Buat order diet baru sesuai instruksi dokter',
              'Catat log pemberian makanan (pagi/siang/sore/snack)',
            ],
          },
          {
            title: 'Melihat Hasil Lab',
            icon: FlaskConical,
            steps: [
              'Buka menu Laboratorium — cari berdasarkan pasien',
              'Lihat status order: menunggu, proses, atau selesai',
              'Hasil lab yang sudah final bisa dilihat langsung',
            ],
          },
          {
            title: 'Pengkajian Keperawatan',
            icon: Heart,
            steps: [
              'Di halaman pemeriksaan pasien, klik tombol "Pengkajian"',
              'Isi 7 bagian: Riwayat, Tanda Vital, Nyeri, Risiko Jatuh, Status Fungsional, Nutrisi, Psikososial',
              'Nyeri: isi skala NRS 0-10, lokasi, karakteristik, dan durasi',
              'Risiko Jatuh (Morse Fall Scale): isi 6 faktor → skor otomatis dihitung',
              'Status Fungsional (Barthel Index): pilih dari 10 item ADL → skor otomatis',
              'Skrining Nutrisi: 4 kriteria → kategori risiko otomatis',
              'Klik "Simpan Draft" untuk menyimpan sementara, "Finalisasi" jika sudah lengkap',
            ],
            tips: [
              'Summary card di atas menampilkan TD, Nyeri, Fall Risk, Barthel, IMT',
              'Pengkajian yang sudah difinalisasi tidak bisa diubah',
            ],
          },
          {
            title: 'CPPT (Catatan Perkembangan)',
            icon: FileText,
            steps: [
              'Di halaman pemeriksaan, klik tombol "CPPT"',
              'Tambah entri CPPT dengan format SOAP-IE',
              'Pilih profesi Anda (Perawat) saat membuat entri',
              'Entri bisa diverifikasi oleh penanggung jawab',
            ],
          },
          {
            title: 'Rawat Inap — Catat Vital Signs',
            icon: Heart,
            steps: [
              'Buka menu Rawat Inap → klik "Monitoring Klinis" pada bed pasien',
              'Buka tab "Vital Signs" → klik "Catat Vital"',
              'Isi: TD (Sistolik/Diastolik), Nadi, Suhu, Respirasi, SpO2',
              'Isi skala nyeri (0-10), kesadaran, GCS (Eye/Verbal/Motorik)',
              'Isi balance cairan: Intake (mL) dan Output (mL)',
              'Berat badan dan catatan tambahan (opsional)',
              'Alert level otomatis dihitung: Normal, Warning (kuning), Critical (merah)',
            ],
            tips: [
              'Catat vital signs minimal setiap 6-8 jam atau sesuai instruksi dokter',
              'Tren vital 24 jam bisa dilihat di tabel ringkasan',
              'Alert Critical: TD >180/110 atau <80/50, Nadi >150 atau <40, Suhu >40 atau <34, SpO2 <90%',
              'Alert Warning: TD >140/90 atau <90/60, Nadi >100 atau <50, Suhu >38.5 atau <35',
            ],
          },
          {
            title: 'Rawat Inap — Catatan Keperawatan (SBAR)',
            icon: FileText,
            steps: [
              'Di halaman Monitoring Klinis, buka tab "Catatan Keperawatan"',
              'Klik "Buat Catatan" → pilih shift: Pagi (07-14), Siang (14-21), Malam (21-07)',
              'Isi format SBAR:',
              'S (Situation): kondisi pasien saat ini, keluhan',
              'B (Background): riwayat penyakit, terapi yang sedang berjalan',
              'A (Assessment): penilaian perawat terhadap kondisi pasien',
              'R (Recommendation): rekomendasi tindak lanjut untuk shift berikutnya',
              'Tambah tindakan keperawatan: waktu, tindakan yang dilakukan, hasil',
              'Catat balance cairan (intake/output) per shift',
              'Klik "Finalize" jika catatan sudah lengkap — catatan terkunci permanen',
            ],
            tips: [
              'Satu perawat hanya bisa membuat satu catatan per shift per tanggal per kunjungan',
              'Catatan draft bisa diedit, tapi setelah finalisasi tidak bisa diubah',
              'Balance cairan ditampilkan otomatis (Intake - Output)',
            ],
          },
          {
            title: 'Rawat Inap — Eksekusi Instruksi Medis',
            icon: ClipboardList,
            steps: [
              'Di tab "Instruksi Medis", lihat instruksi aktif dari dokter',
              'Instruksi STAT (merah) harus diprioritaskan',
              'Klik instruksi untuk melihat detail (dosis, frekuensi, rute)',
              'Klik "Eksekusi" dan isi catatan pelaksanaan',
              'Riwayat eksekusi tercatat dengan waktu dan nama perawat',
            ],
          },
          {
            title: 'Rawat Inap — Checklist Kesiapan Pulang',
            icon: BedDouble,
            steps: [
              'Di tab "Perencanaan Pulang", centang item yang sudah terpenuhi',
              '10 item: klinis stabil, luka kering, intake oral, mobilisasi, obat pulang siap, dll',
              'Progress bar menunjukkan persentase kesiapan',
              'Status otomatis berubah berdasarkan jumlah checklist yang tercentang',
              'Koordinasikan dengan dokter untuk persetujuan kepulangan',
            ],
          },
        ],
      }

    case 'pendaftaran':
      return {
        roleName: 'Petugas Pendaftaran',
        description:
          'Sebagai Petugas Pendaftaran, Anda menangani registrasi pasien baru, ' +
          'pendaftaran kunjungan, dan pengelolaan antrian.',
        sections: [
          {
            title: 'Daftar Pasien Baru',
            icon: Users,
            steps: [
              'Buka menu Pasien → Tambah Pasien Baru',
              'Isi data wajib: NIK, nama, tempat/tanggal lahir, jenis kelamin, alamat',
              'Sistem otomatis generate nomor Rekam Medis',
              'Jika NIK sudah terdaftar, sistem akan menampilkan data pasien yang ada',
            ],
            tips: [
              'Gunakan fitur "Cek Duplikasi" sebelum mendaftarkan pasien baru',
              'NIK harus 16 digit — validasi otomatis',
            ],
          },
          {
            title: 'Pendaftaran Kunjungan',
            icon: ClipboardList,
            steps: [
              'Buka menu Pendaftaran → Daftar Baru',
              'Cari pasien by nama/NIK/nomor RM',
              'Pilih tipe kunjungan: Rawat Jalan, IGD, atau Rawat Inap',
              'Pilih poli tujuan dan dokter',
              'Pilih penjamin: Umum, BPJS, Asuransi, atau Perusahaan',
              'Isi keluhan utama, lalu klik Daftar',
              'Sistem otomatis generate nomor antrian',
            ],
            tips: [
              'Sistem mencegah pendaftaran ganda (poli + dokter + tanggal sama)',
              'Pasien yang masih rawat inap tidak bisa didaftarkan ulang',
              'Jika dokter cuti, sistem akan memberi peringatan',
            ],
          },
          {
            title: 'Kelola Antrian',
            icon: ClipboardList,
            steps: [
              'Buka menu Pendaftaran → Antrian',
              'Pilih poli untuk melihat antrian hari ini',
              'Klik "Panggil Berikutnya" untuk memanggil nomor antrian',
              'Status pasien otomatis berubah ke "Diperiksa"',
            ],
          },
          {
            title: 'Display TV Antrian',
            icon: ClipboardList,
            steps: [
              'Di halaman Antrian, klik tombol "Display TV" — buka di tab baru',
              'Tampilan fullscreen dark theme untuk monitor/TV di ruang tunggu',
              '3 kolom: Sedang Dipanggil (nomor besar), Menunggu, Dilayani',
              'Klik ikon gear untuk pengaturan: filter poli, suara on/off, fullscreen',
              'Auto-refresh setiap 10 detik, suara ding-dong saat panggilan baru',
              'Cocok untuk TV di ruang tunggu pasien',
            ],
          },
          {
            title: 'Kiosk / Anjungan Mandiri',
            icon: ClipboardList,
            steps: [
              'Di halaman Antrian, klik tombol "Kiosk" — buka di tab baru',
              'Tampilan touch-friendly untuk tablet/layar sentuh di lobi RS',
              'Alur pendaftaran mandiri: Cari Pasien → Pilih Poli → Pilih Dokter → Pembayaran → Konfirmasi',
              'Pasien input No RM atau NIK via numpad di layar',
              'Jika sudah terdaftar hari ini, bisa langsung cetak tiket',
              'Auto-reset ke halaman awal setelah 60 detik tanpa aktivitas',
            ],
            tips: [
              'Ideal untuk mengurangi antrian di loket pendaftaran',
              'Pastikan tablet/PC kiosk terhubung ke printer thermal untuk cetak tiket',
            ],
          },
          {
            title: 'BPJS — Cek Peserta & SEP',
            icon: Shield,
            steps: [
              'Saat mendaftarkan pasien BPJS, masukkan nomor kartu BPJS',
              'Sistem otomatis cek status kepesertaan, kelas rawat, dan faskes',
              'Setelah pendaftaran, buat SEP (Surat Elegibilitas Peserta)',
              'Pasien ≥17 tahun (non-IGD) wajib verifikasi sidik jari',
            ],
          },
          {
            title: 'General Consent',
            icon: FileText,
            steps: [
              'Saat pendaftaran pasien baru, buat formulir General Consent',
              'Isi informasi pasien, wali, dan hak-kewajiban',
              'Pasien/wali menandatangani formulir',
              'Cetak formulir persetujuan format A4 standar RS',
            ],
          },
        ],
      }

    case 'apoteker':
      return {
        roleName: 'Apoteker',
        description:
          'Sebagai Apoteker, Anda mengelola stok obat, memproses resep dokter (dispensing), ' +
          'dan memantau obat kadaluarsa serta stok rendah.',
        sections: [
          {
            title: 'Dispensing Resep',
            icon: Pill,
            steps: [
              'Buka menu Farmasi — lihat antrian resep masuk',
              'Klik resep untuk melihat detail (nama obat, dosis, jumlah)',
              'Klik "Proses" untuk melakukan dispensing',
              'Stok otomatis terpotong (FIFO — batch terlama diambil duluan)',
              'Jika stok tidak cukup, sistem akan memberi peringatan',
            ],
            tips: [
              'Periksa interaksi obat sebelum menyerahkan ke pasien',
              'Label obat bisa dicetak dari halaman dispensing',
            ],
          },
          {
            title: 'Kelola Stok Obat',
            icon: Pill,
            steps: [
              'Buka menu Farmasi → Stok Obat',
              'Tambah obat baru: isi nama, kode, kategori, harga, stok minimum',
              'Tambah stok: klik obat → "Tambah Stok" → isi batch, jumlah, expiry',
              'Stock opname: gunakan "Koreksi Stok" untuk penyesuaian',
            ],
          },
          {
            title: 'Alerts (Peringatan)',
            icon: Pill,
            steps: [
              'Menu Farmasi → Alerts menampilkan 2 kategori:',
              '1. Obat Kadaluarsa — expired dalam 90 hari ke depan',
              '2. Stok Rendah — di bawah batas minimum yang ditentukan',
              'Segera lakukan tindakan (order ulang / retur)',
            ],
          },
          {
            title: 'Mutasi Barang',
            icon: ArrowRightLeft,
            steps: [
              'Buka menu Farmasi → Mutasi Barang',
              'Buat permintaan amprah: pilih obat, jumlah, gudang asal/tujuan',
              'Proses: Pending → Approve → Complete',
              'Setelah complete, stok otomatis terpotong dan masuk',
            ],
          },
          {
            title: 'Penjualan Obat Bebas (OTC)',
            icon: ShoppingCart,
            steps: [
              'Buka menu Farmasi → Penjualan Bebas',
              'Tambah item: cari obat, atur jumlah',
              'Pilih metode pembayaran, lalu simpan',
              'Stok otomatis terpotong',
              'Lihat ringkasan penjualan harian di tab Summary',
            ],
          },
          {
            title: 'Purchase Order',
            icon: Truck,
            steps: [
              'Buka menu Farmasi → Purchase Order',
              'Buat PO: pilih supplier, tambah item obat, jumlah, harga satuan',
              'Alur: Draft → Approved → Ordered → Received → Completed',
              'Penerimaan: input jumlah diterima, batch, expiry per item',
              'Stok otomatis bertambah setelah penerimaan barang',
            ],
          },
          {
            title: 'Stock Opname',
            icon: ClipboardList,
            steps: [
              'Buka menu Farmasi → Stock Opname',
              'Buat opname baru (tipe Farmasi untuk obat)',
              'Sistem otomatis isi semua item obat dengan stok sistem',
              'Input jumlah fisik di setiap baris',
              'Selisih otomatis dihitung (fisik - sistem)',
              'Selesaikan opname → stok otomatis disesuaikan',
            ],
          },
          {
            title: 'Gudang Umum',
            icon: Warehouse,
            steps: [
              'Buka menu Gudang untuk barang non-obat',
              'Kategori: ATK, Alkes, Linen, Rumah Tangga, Cetakan, dll',
              'Tambah item baru dan kelola stok masuk',
              'Item dengan stok di bawah minimum ditandai peringatan',
            ],
          },
          {
            title: 'CDSS — Peringatan Obat',
            icon: Shield,
            steps: [
              'Saat dispensing, CDSS otomatis cek 5 hal:',
              '1. High-Alert Drug — obat berbahaya (ditandai badge merah HA)',
              '2. Interaksi Obat — major/moderate/minor antar obat dalam resep',
              '3. LASA — Look-Alike Sound-Alike, obat mirip nama (badge LASA)',
              '4. Dosis Maksimum — cek apakah dosis melebihi batas harian',
              '5. Duplikasi — obat sama diresepkan dua kali',
              'Alert critical (merah) MEMBLOKIR dispensing sampai di-override dengan alasan',
              'Alert warning (kuning) dan info (biru) hanya peringatan, bisa lanjut',
            ],
            tips: [
              'Selalu baca alasan interaksi dan rekomendasi sebelum override',
              'Override dicatat di audit trail untuk keamanan pasien',
            ],
          },
        ],
      }

    case 'kasir':
      return {
        roleName: 'Kasir',
        description:
          'Sebagai Kasir, Anda memproses pembayaran pasien, mengelola tagihan, ' +
          'dan membuat laporan keuangan harian.',
        sections: [
          {
            title: 'Proses Pembayaran',
            icon: Wallet,
            steps: [
              'Buka menu Kasir — lihat daftar tagihan yang belum dibayar',
              'Klik tagihan untuk melihat rincian biaya per kategori',
              'Terapkan diskon jika ada (opsional, perlu alasan)',
              'Klik "Finalisasi" untuk mengunci tagihan',
              'Pilih metode pembayaran: tunai, debit, kredit, transfer, BPJS',
              'Masukkan jumlah bayar — sistem otomatis hitung kembalian',
              'Cetak kwitansi / struk',
            ],
            tips: [
              'Tagihan yang sudah difinalisasi tidak bisa diubah',
              'Kwitansi bisa dicetak ulang dari detail kunjungan',
            ],
          },
          {
            title: 'Ringkasan Harian',
            icon: BarChart3,
            steps: [
              'Buka menu Kasir — tab Ringkasan',
              'Lihat total pendapatan hari ini per metode pembayaran',
              'Data ini bisa digunakan untuk rekonsiliasi kas harian',
            ],
          },
          {
            title: 'Tagihan Outstanding',
            icon: Wallet,
            steps: [
              'Tab Outstanding menampilkan tagihan yang belum lunas',
              'Follow up dengan bagian terkait untuk penyelesaian',
            ],
          },
          {
            title: 'Keuangan / Akuntansi',
            icon: Calculator,
            steps: [
              'Buka menu Keuangan — 6 tab tersedia',
              'Jurnal Umum: catat transaksi keuangan debit/kredit',
              'Jurnal otomatis dibuat saat pembayaran pasien (posting otomatis)',
              'Bagan Akun: lihat struktur Chart of Accounts standar RS',
              'Buku Besar: lihat saldo per akun dengan running balance',
              'Neraca: laporan posisi keuangan (Aset = Kewajiban + Ekuitas)',
              'Laba Rugi: laporan pendapatan vs beban per periode',
            ],
            tips: [
              'Jurnal dari pembayaran pasien di-posting otomatis — tidak perlu input manual',
              'Jurnal manual bisa dibuat untuk transaksi non-billing (pembelian ATK, dll)',
            ],
          },
        ],
      }

    case 'lab':
      return {
        roleName: 'Analis Laboratorium',
        description:
          'Sebagai Analis Lab, Anda menerima sampel, melakukan pemeriksaan, ' +
          'dan menginput hasil laboratorium.',
        sections: [
          {
            title: 'Antrian Order Lab',
            icon: FlaskConical,
            steps: [
              'Buka menu Laboratorium — lihat antrian order masuk',
              'Filter by status: Ordered, Sample Received, Processing, Completed',
              'Order CITO ditandai warna merah — prioritaskan!',
            ],
          },
          {
            title: 'Proses Pemeriksaan',
            icon: FlaskConical,
            steps: [
              'Klik order → klik "Terima Sampel" saat sampel diterima di lab',
              'Klik "Mulai Proses" saat mulai pemeriksaan',
              'Input hasil: isi nilai per parameter',
              'Nilai di luar rentang normal akan ditandai otomatis (H/L)',
              'Klik "Finalisasi" → hasil terkunci, masuk ke rekam medis dokter',
            ],
            tips: [
              'Hasil yang sudah difinalisasi tidak bisa diubah',
              'Dokter bisa melihat hasil langsung dari halaman rekam medis',
              'Cetak hasil lab dari halaman detail order',
              'Parameter lab sudah di-mapping ke kode LOINC standar internasional',
            ],
          },
        ],
      }

    case 'radiologi':
      return {
        roleName: 'Radiografer',
        description:
          'Sebagai Radiografer, Anda melakukan pemeriksaan radiologi (X-Ray, USG, CT, MRI) ' +
          'dan menginput bacaan serta kesan.',
        sections: [
          {
            title: 'Antrian Order Radiologi',
            icon: ScanLine,
            steps: [
              'Buka menu Radiologi — lihat antrian order masuk',
              'Filter by modalitas: X-Ray, USG, CT-Scan, MRI, Mammography',
              'Order CITO ditandai merah — prioritaskan!',
            ],
          },
          {
            title: 'Proses Pemeriksaan',
            icon: ScanLine,
            steps: [
              'Klik order → "Jadwalkan" (set waktu pemeriksaan)',
              'Klik "Mulai Proses" saat pasien masuk ruang radiologi',
              'Input hasil: tulis bacaan (deskripsi temuan) dan kesan (kesimpulan)',
              'Klik "Finalisasi" → hasil masuk ke rekam medis dokter',
            ],
            tips: [
              'Hasil bisa dicetak untuk dokter pengirim',
              'Riwayat radiologi pasien bisa dilihat di tab Patient History',
            ],
          },
        ],
      }

    case 'gizi':
      return {
        roleName: 'Ahli Gizi',
        description:
          'Sebagai Ahli Gizi, Anda mengelola kebutuhan nutrisi pasien rawat inap, ' +
          'merencanakan diet, menghitung kebutuhan kalori, dan monitoring food cost.',
        sections: [
          {
            title: 'Order Diet (ADIME)',
            icon: Utensils,
            steps: [
              'Buka menu Gizi — tab pertama "ADIME Orders"',
              'Lihat daftar order diet dari dokter/perawat untuk pasien rawat inap',
              'Buat order baru: pilih pasien, jenis diet, instruksi khusus',
              'Catat log pemberian makanan (pagi/siang/sore/snack)',
              'Status order: pending → active → completed',
            ],
          },
          {
            title: 'Kalkulator Gizi',
            icon: Calculator,
            steps: [
              'Buka tab "Kalkulator Gizi"',
              'Input: jenis kelamin, umur, tinggi badan, berat badan, tingkat aktivitas',
              'Sistem hitung otomatis: IMT, BMR (Harris-Benedict & Mifflin-St Jeor), TDEE',
              'Hasil: kebutuhan kalori harian, distribusi makro (karbohidrat, protein, lemak)',
              'Gunakan hasil ini untuk merencanakan diet pasien',
            ],
            tips: [
              'IMT <18.5 = Kurang, 18.5-24.9 = Normal, 25-29.9 = Overweight, ≥30 = Obesitas',
              'Faktor aktivitas: bedrest 1.2, ringan 1.375, sedang 1.55, berat 1.725',
            ],
          },
          {
            title: 'Bahan Makanan',
            icon: Utensils,
            steps: [
              'Buka tab "Bahan Makanan"',
              'Kelola database bahan makanan: nama, kategori, kalori, protein, lemak, karbo per 100g',
              'Filter berdasarkan 12 kategori (serealia, sayur, buah, protein hewani, dll)',
              'Tambah, edit, atau hapus bahan makanan sesuai kebutuhan dapur',
            ],
          },
          {
            title: 'Meal Plans (Rencana Menu)',
            icon: ClipboardList,
            steps: [
              'Buka tab "Meal Plans"',
              'Buat rencana menu harian: pilih bahan makanan, atur porsi',
              'Sistem otomatis hitung total kalori, protein, lemak, karbohidrat',
              'Simpan meal plan sebagai template untuk digunakan ulang',
            ],
          },
          {
            title: 'Food Cost & Analytics',
            icon: BarChart3,
            steps: [
              'Buka tab "Food Cost"',
              'Lihat ringkasan biaya makanan per porsi, per hari',
              'Analisis food waste (persentase sisa makanan)',
              'Data ini membantu efisiensi pengelolaan dapur RS',
            ],
          },
        ],
      }

    case 'rekam_medis':
      return {
        roleName: 'Petugas Rekam Medis',
        description:
          'Sebagai Petugas Rekam Medis, Anda mengelola berkas rekam medis, ' +
          'memastikan kelengkapan data, coding ICD-10/ICD-9-CM, dan menangani permintaan data medis.',
        sections: [
          {
            title: 'Kelola Rekam Medis',
            icon: FileText,
            steps: [
              'Buka menu Rekam Medis untuk melihat daftar kunjungan',
              'Periksa kelengkapan: SOAP, diagnosa, tindakan harus terisi',
              'Rekam medis yang sudah difinalisasi bersifat read-only',
              'Klik kunjungan → lihat resume medis lengkap',
            ],
          },
          {
            title: 'Riwayat Pasien',
            icon: BookOpen,
            steps: [
              'Buka menu Pasien → pilih pasien → tab Riwayat',
              'Lihat seluruh kunjungan historis beserta diagnosa',
              'Gunakan data ini untuk kebutuhan resume medis',
            ],
          },
          {
            title: 'Coding ICD-10 & ICD-9-CM',
            icon: Database,
            steps: [
              'Dokter input diagnosa ICD-10 dan prosedur ICD-9-CM saat pemeriksaan',
              'Verifikasi kode: pastikan kode ICD-10 sesuai diagnosa di SOAP',
              'Verifikasi prosedur: pastikan ICD-9-CM sesuai tindakan yang dilakukan',
              'Data coding digunakan untuk SIRS Online, e-Klaim BPJS, dan statistik RS',
            ],
          },
          {
            title: 'Resume Medis & Cetak',
            icon: FileText,
            steps: [
              'Resume medis otomatis terisi dari data kunjungan',
              'Download PDF format A4 dengan KOP surat RS',
              'Berisi: identitas, vital, SOAP, diagnosa, tindakan, resep, TTD dokter',
            ],
          },
        ],
      }

    case 'manajemen':
      return {
        roleName: 'Manajemen RS',
        description:
          'Sebagai Manajemen, Anda memantau kinerja rumah sakit melalui dashboard ' +
          'dan laporan statistik (kunjungan, pendapatan, okupansi).',
        sections: [
          {
            title: 'Dashboard',
            icon: BarChart3,
            steps: [
              'Dashboard menampilkan ringkasan harian:',
              '• Total kunjungan, pasien baru, antrian aktif',
              '• Okupansi kamar rawat inap (BOR)',
              '• Pendapatan hari ini',
              '• Distribusi penjamin (Umum vs BPJS)',
            ],
          },
          {
            title: 'Laporan',
            icon: BarChart3,
            steps: [
              'Buka menu Laporan untuk analisis mendalam',
              'Pilih jenis laporan: Kunjungan, Pendapatan, Farmasi, Diagnosa, Pasien, Billing',
              'Atur rentang tanggal dan pengelompokan (harian/mingguan/bulanan)',
              'Export ke Excel (XLSX multi-sheet), PDF (format A4), atau CSV',
            ],
            tips: [
              'Laporan Kunjungan — tren naik/turun per poli, per dokter, per penjamin',
              'Laporan Pendapatan — perbandingan per kategori dan penjamin',
              'Laporan Farmasi — obat terlaris, stok rendah, nilai inventori',
              'Top Diagnosa — 10 besar diagnosa (ICD-10) untuk perencanaan SDM',
            ],
          },
          {
            title: 'Keuangan RS',
            icon: Calculator,
            steps: [
              'Buka menu Keuangan untuk melihat posisi keuangan RS',
              'Dashboard: 5 stat card (total aset, kewajiban, ekuitas, pendapatan, beban)',
              'Neraca: posisi keuangan aktual, cek keseimbangan Aset = Kewajiban + Ekuitas',
              'Laba Rugi: pendapatan dikurangi beban, per sub-kategori',
              'Arus Kas: aliran kas operasi, investasi, pendanaan',
            ],
          },
          {
            title: 'Kepegawaian (HRIS)',
            icon: Users,
            steps: [
              'Buka menu Kepegawaian — Dashboard SDM',
              'Lihat jumlah pegawai aktif, per status (tetap, kontrak, magang)',
              'Distribusi per departemen dan kehadiran hari ini',
              'Penggajian: pantau periode gaji draft/processing/finalized',
              'Jadwal Dinas: lihat jadwal shift pegawai per tanggal',
            ],
          },
          {
            title: 'Indikator Kinerja RS',
            icon: BarChart3,
            steps: [
              'Pantau indikator wajib SIRS Online:',
              'BOR (Bed Occupancy Rate) — target ideal 60-85%',
              'ALOS (Average Length of Stay) — lama rawat rata-rata',
              'TOI (Turn Over Interval) — waktu kosong tempat tidur',
              'BTO (Bed Turn Over) — frekuensi pemakaian TT',
              'GDR (Gross Death Rate) & NDR (Net Death Rate)',
              'Data otomatis dihitung dari data kunjungan dan rawat inap',
            ],
          },
        ],
      }

    case 'superadmin':
      return {
        roleName: 'Super Admin Platform',
        description:
          'Sebagai Super Admin, Anda mengelola seluruh tenant (RS) di platform SaaS. ' +
          'Akses panel SA di /sa — terpisah dari dashboard RS. ' +
          'Ada 2 role: Owner (akses penuh) dan Operator (operasional harian).',
        sections: [
          {
            title: 'Akses SA Panel',
            icon: Shield,
            steps: [
              'Login dengan akun Super Admin (tenantSlug: platform)',
              'Anda akan diarahkan ke /sa (SA Panel terpisah dari dashboard RS)',
              'SA Panel memiliki layout indigo tersendiri dengan sidebar dedicated',
              'Role Owner: akses penuh ke semua fitur termasuk pengaturan & kelola SA',
              'Role Operator: hanya operasional — registrasi, verifikasi, monitoring',
            ],
          },
          {
            title: 'Pendaftaran RS Baru',
            icon: ClipboardList,
            steps: [
              'Menu Pendaftaran RS — lihat antrian registrasi dari RS yang mendaftar via landing page',
              'Review detail: info RS, admin, paket yang dipilih',
              'Approve registrasi → sistem auto-provisioning (buat schema + user admin)',
              'Reject dengan alasan → RS mendapat email notifikasi',
              'Retry provisioning jika gagal',
            ],
          },
          {
            title: 'Verifikasi Pembayaran',
            icon: Wallet,
            steps: [
              'Menu Verifikasi Pembayaran — lihat bukti bayar yang diupload RS',
              'Cek kesesuaian: jumlah, pengirim, tanggal transfer',
              'Verifikasi → RS mendapat email konfirmasi dan bisa di-approve',
              'Tab Transaksi untuk riwayat semua pembayaran',
            ],
          },
          {
            title: 'Kelola Tenant (RS)',
            icon: Settings,
            steps: [
              'Menu Kelola Tenant — daftar semua RS di platform',
              'Klik Detail untuk lihat info lengkap + penggunaan vs limit paket',
              'Toggle aktif/nonaktif tenant (owner only)',
              'Hapus tenant beserta semua datanya (owner only, irreversible)',
            ],
          },
          {
            title: 'Paket & Transaksi (Owner Only)',
            icon: Wallet,
            steps: [
              'Menu Paket & Transaksi — kelola paket langganan',
              'Buat/edit paket: nama, harga, limit user/pasien/dokter/storage, modul',
              'Toggle paket aktif/nonaktif, hapus paket',
              'Change plan tenant, renewal subscription',
              'Lihat riwayat semua transaksi',
            ],
          },
          {
            title: 'Monitoring Sistem',
            icon: BarChart3,
            steps: [
              'Menu Monitoring — kondisi kesehatan sistem real-time',
              'Cek: DB size, connections, jumlah backup, tenant abandoned',
              'Grafik pertumbuhan tenant dan revenue per bulan',
              'Health check per tenant: last login, hari sejak login terakhir',
            ],
          },
          {
            title: 'Pengaturan Platform (Owner Only)',
            icon: Settings,
            steps: [
              'Menu Pengaturan Platform — konfigurasi global',
              '5 kategori: Umum, Email/SMTP, Billing, Keamanan, Integrasi',
              'Konfigurasi SMTP untuk email notifikasi',
              'Set info rekening bank untuk pembayaran',
              'Tombol "Test Email" untuk verifikasi SMTP berfungsi',
              'Cek Langganan Kadaluarsa untuk trigger email reminder manual',
            ],
          },
          {
            title: 'Kelola Super Admin (Owner Only)',
            icon: Users,
            steps: [
              'Menu Super Admin — tambah/hapus akun SA lain',
              'Pilih role: Owner (full access) atau Operator (limited)',
              'Operator bisa: lihat dashboard, approve registrasi, verifikasi pembayaran',
              'Operator tidak bisa: kelola settings, paket, hapus tenant, kelola SA',
              'Toggle aktif/nonaktif akun SA, hapus SA (kecuali SA terakhir)',
            ],
          },
        ],
      }

    default:
      return {
        roleName: 'Pengguna',
        description: 'Selamat datang di SIMRS.',
        sections: [],
      }
  }
}

export default function PanduanPage() {
  const { role } = usePermissions()
  const guide = useMemo(() => buildGuide(role), [role])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Panduan Pengguna</h1>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm font-semibold text-primary">{guide.roleName}</p>
          <p className="text-sm text-muted-foreground mt-1">{guide.description}</p>
        </div>
      </div>

      {/* Sections */}
      {guide.sections.map((section, idx) => {
        const Icon = section.icon
        return (
          <section key={idx} className="bg-card border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <h2 className="font-semibold">{section.title}</h2>
            </div>
            <div className="p-5 space-y-4">
              <ol className="space-y-2.5">
                {section.steps.map((step, sIdx) => (
                  <li key={sIdx} className="flex gap-3 text-sm">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                      {sIdx + 1}
                    </span>
                    <span className="text-muted-foreground leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>

              {section.tips && section.tips.length > 0 && (
                <div className="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3.5">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                    Tips
                  </p>
                  <ul className="space-y-1">
                    {section.tips.map((tip, tIdx) => (
                      <li
                        key={tIdx}
                        className="text-xs text-amber-700/80 dark:text-amber-400/80 flex gap-2"
                      >
                        <span className="shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )
      })}

      {/* Keyboard Shortcuts / General Tips */}
      <section className="bg-card border rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-semibold">Tips Umum</h2>
        </div>
        <div className="p-5">
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>
                <strong>Offline Mode:</strong> SIMRS tetap bisa digunakan saat internet putus.
                Data tersimpan lokal dan otomatis sync saat koneksi kembali.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>
                <strong>Auto-Save:</strong> Form rekam medis dan pendaftaran otomatis menyimpan
                draft setiap perubahan.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>
                <strong>Cetak:</strong> Gunakan Ctrl+P pada halaman yang mendukung cetak
                (kwitansi, resep, hasil lab, tiket antrian).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>
                <strong>Dark Mode:</strong> Klik ikon matahari/bulan di header untuk mengganti
                tema gelap/terang.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>
                <strong>MFA:</strong> Aktifkan Two-Factor Authentication di Profil → MFA untuk
                keamanan akun.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>
                <strong>Status Sync:</strong> Ikon di header menunjukkan status sinkronisasi.
                Klik untuk melihat detail operasi pending.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Print button */}
      <div className="flex justify-center pb-8">
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Cetak Panduan (PDF)
        </button>
      </div>
    </div>
  )
}
