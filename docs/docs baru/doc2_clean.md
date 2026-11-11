__Flowchart SIMRS Khanza \- Panduan Referensi untuk Pengembangan Sistem Baru__

Berdasarkan hasil penelusuran dari berbagai sumber, berikut adalah flowchart alur proses SIMRS Khanza yang dapat Anda jadikan acuan dalam mengembangkan sistem Laravel SaaS Anda\. Dokumen ini mencakup alur utama pelayanan pasien, aturan bisnis kritis, serta modul\-modul yang terintegrasi\.

__1\. Gambaran Umum Arsitektur SIMRS Khanza__

SIMRS Khanza adalah sistem open\-source yang mencakup seluruh proses bisnis rumah sakit, mulai dari Front Office hingga Back Office \. Berdasarkan studi tiru di RSUD Hanau, alur sistem terintegrasi mencakup:

- Pendaftaran pasien
- Poliklinik
- IGD
- Rawat Inap
- Laboratorium
- Farmasi
- Radiologi
- Penunjang medis
- Rekam medis
- Pelaporan 

__2\. Flowchart Alur Pelayanan Pasien \(High Level\)__

Berikut adalah alur utama pelayanan pasien di SIMRS Khanza berdasarkan video tutorial dan dokumentasi implementasi :

[GAMBAR]

__3\. Flowchart Detail Modul Pendaftaran dan Antrian__

Berdasarkan dokumentasi teknis Anjungan Mandiri RS Indriati, berikut adalah alur detail pendaftaran pasien :

[GAMBAR]

__4\. Flowchart Khusus Pasien BPJS \(JKN\)__

Alur untuk pasien BPJS memiliki kompleksitas tambahan dengan integrasi ke VClaim dan aplikasi sidik jari :

[GAMBAR]

__5\. Flowchart Integrasi Layanan dan Modul Pendukung__

Berdasarkan dokumentasi dari RSUD Hanau dan pelatihan resmi, berikut alur integrasi antar modul :

[GAMBAR]

__6\. Aturan Bisnis Kritis SIMRS Khanza__

Berdasarkan dokumentasi teknis dan penelitian lapangan, berikut adalah aturan bisnis yang harus diimplementasikan :

__6\.1 Aturan Validasi Pendaftaran__

__Aturan__

__Kondisi__

__Tindakan Sistem__

__Cek Status Rawat Inap__

Pasien lama masih berstatus rawat inap

Blokir pendaftaran ulang hingga status diperbarui 

__Duplikasi Pendaftaran__

Pasien sudah terdaftar di poli/dokter & tanggal sama

Blokir pendaftaran baru, arahkan ke check\-in 

__Dokter Cuti__

Dokter yang dipilih sedang cuti/ tidak tersedia

Tampilkan pesan, arahkan pilih dokter lain 

__6\.2 Aturan Pasien BPJS__

__Aturan__

__Kondisi__

__Tindakan Sistem__

__Biometrik Wajib__

Pasien ≥ 17 tahun, layanan non\-IGD

Wajib verifikasi sidik jari sebelum pendaftaran 

__Hak Kelas Tidak Sesuai__

Kelas peserta tidak sesuai dengan kelas perawatan

Pendaftaran ditunda, proses upgrade kelas 

__Batas SEP Harian__

Kuota SEP untuk jenis layanan tertentu tercapai

Blokir pembuatan SEP baru \(kecuali darurat\) 

__Laka Lantas__

Pasien kecelakaan lalu lintas

Wajib input detail kecelakaan sebelum pendaftaran 

__MobileJKN Terdaftar__

Pasien terdaftar di Mobile JKN

Arahkan ke menu check\-in MobileJKN 

__6\.3 Aturan Data dan Keamanan__

__Aturan__

__Kondisi__

__Tindakan Sistem__

__Data Wajib Tidak Lengkap__

Ada field mandatory yang kosong

Pendaftaran ditunda sampai data lengkap 

__Persetujuan Satu Sehat__

Pasien belum menyetujui penggunaan data

Aktivasi Satu Sehat tidak dapat dilakukan 

__7\. Modul dan Fitur Lengkap SIMRS Khanza__

Berdasarkan materi pelatihan resmi dan dokumentasi :

__Kategori__

__Modul__

__Fitur Utama__

__Front Office__

Registrasi

Pendaftaran pasien baru/lama, pencarian data, cetak bukti

Rekam Medis

SOAP, diagnosis \(ICD\-10\), tindakan, resume medis

Poliklinik

Antrian, pemeriksaan dokter, resep

IGD

Triase, pemeriksaan darurat, rujukan

Rawat Inap

Admisi, perawatan, DPJP, discharge

__Penunjang Medis__

Laboratorium

Pemeriksaan lab, hasil, integrasi alat

Radiologi

Pemeriksaan radiologi, hasil, PACS

Farmasi

Stok obat, resep, expired alert, rekonsiliasi

Gizi

Asesmen gizi, diet pasien

__Back Office__

Akuntansi & Keuangan

Jurnal, billing, laporan keuangan

Penggajian

Gaji karyawan, jasa medis 

Manajemen Aset

Inventaris, kalibrasi, pemeliharaan

Parkir

Manajemen parkir, tiket, billing

__Integrasi__

Bridging BPJS

SEP, VClaim, PCare, INACBG, fingerprint 

SATUSEHAT

Kirim data pasien, kunjungan, observasi \(FHIR\)

ERP Odoo

Payroll, akuntansi 

__Pelaporan__

Dashboard Manajemen

Okupansi, pendapatan, 10 besar penyakit

Laporan Operasional

Kunjungan harian, kunjungan per poli

Laporan Keuangan

Laba rugi, neraca, arus kas

__8\. Keterbatasan yang Perlu Diperbaiki di Sistem Baru__

Berdasarkan analisis dan penelitian lapangan , berikut adalah poin\-poin yang perlu Anda perbaiki:

__Masalah__

__Dampak__

__Solusi di Sistem Baru__

__Data pasien masih berstatus rawat inap__

Pasien tidak bisa didaftarkan ulang 

Workflow auto\-update status saat discharge

__Stok obat tidak sinkron dengan billing__

Kebocoran anggaran, data tidak akurat 

Real\-time stock management, validasi otomatis

__Keterbatasan sumber daya manusia__

Staf kurang paham sistem 

Role\-based dashboard, UI intuitif, built\-in tutorial

__Belum ada SOP formal__

Implementasi tidak konsisten 

SOP digital terintegrasi dalam workflow

__Manajemen risiko keamanan__

34 risiko teridentifikasi dengan FMEA 

Enkripsi penuh, audit trail, MFA

__9\. Referensi untuk Pengembangan Sistem Baru__

__Sumber__

__Link / Lokasi__

__Pelajaran__

__Anjungan Mandiri RS Indriati__

[GitHub](https://github\.com/RS\-INDRIATI/anjunganmandiriSEP)

Aturan bisnis detail, verifikasi biometrik, alur SEP 

__Video Tutorial Alur__

[Summarize\.ing](https://summarize\.ing/video\-412823\-PART\-1\-ALUR\-SIMRS\-KHANZA\-DI\-KLINIK\-IBNUSINA\-BALIKPAPAN\-Pengenalan\-Alur\-)

Alur pasien dari registrasi hingga pulang 

__Studi Tiru RSUD Hanau__

[mmc\.kalteng\.go\.id](https://mmc\.kalteng\.go\.id/berita/read/49412/rsud\-hanau\-jadi\-rujukan\-studi\-tiru\-keunggulan\-simrs\-khanza)

Integrasi antar modul, tata kelola rekam medis 

__Pelatihan Khanza__

[RSUD Madani](https://rsmadani\.sultengprov\.go\.id/2017/08/05/pelatihan\-simrs\-berbasis\-khanzahms/)

Daftar modul lengkap, materi bridging BPJS 

__10\. Catatan untuk Tim Programmer__

1. __Proses bisnis Khanza adalah referensi utama__ karena telah teruji di >500 RS \. Jangan buat ulang alur dari nol\.
2. __Aturan bisnis kritis__ \(cek duplikasi, biometrik, SEP\) harus diimplementasikan dengan detail yang sama \.
3. __Perhatikan keterbatasan Khanza__ yang menjadi keluhan pengguna: data status pasien tidak konsisten , stok obat tidak sinkron , dan risiko keamanan \.
4. __Prioritaskan integrasi dengan BPJS dan SATUSEHAT__ sejak awal, karena ini adalah syarat mutlak \.
5. __Gunakan flowchart di atas__ untuk menentukan scope MVP: fokus pada alur registrasi → poli → farmasi → kasir terlebih dahulu\.

*Dokumen ini dapat dijadikan acuan dalam merancang alur bisnis dan fitur SIMRS Laravel SaaS Anda\.*


