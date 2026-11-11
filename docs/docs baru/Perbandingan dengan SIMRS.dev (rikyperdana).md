# Perbandingan Fitur: SIMRS SaaS vs SIMRS.dev (rikyperdana/simrs)

**Tanggal:** 19 Oktober 2026  
**Sumber:** https://github.com/rikyperdana/simrs

---

## Ringkasan

| Aspek | SIMRS.dev (rikyperdana) | SIMRS SaaS (Kita) |
|-------|------------------------|-------------------|
| Stack | Node.js + MongoDB/Redis + Mithril.js + Bulma | Node.js + PostgreSQL + Next.js + Tailwind/shadcn |
| Ukuran | 120 KB (sangat ringan) | Full-stack monorepo |
| Arsitektur | Single-tenant, 1 gudang, 1 apotik | Multi-tenant SaaS, schema-per-tenant |
| Database | NoSQL (MongoDB/Redis) | RDBMS (PostgreSQL) — ACID compliant |
| Offline | DexieJS (basic) | DexieJS + Service Worker + SyncManager + conflict resolution |
| Auth | Username/password sederhana | JWT + Refresh Token + MFA (TOTP) + Redis session |
| BPJS | Terpisah (project WSBPJS) | Built-in (VClaim, SEP, mock mode) |
| SATUSEHAT | Tidak ada | Built-in (FHIR R4, OAuth2, BullMQ worker) |
| Lisensi | Open source (edukasi), Enterprise berbayar | SaaS subscription model |

---

## Perbandingan Fitur Per Modul

### ✅ = Ada & Lengkap | ⚠️ = Ada tapi Terbatas | ❌ = Tidak Ada

| No | Modul / Fitur | SIMRS.dev | SIMRS SaaS | Keterangan |
|----|---------------|-----------|------------|------------|
| | **FRONT OFFICE** | | | |
| 1 | Registrasi Pasien Baru | ✅ | ✅ | Kita: auto no_RM, NIK duplicate check, 3-step form |
| 2 | Registrasi Pasien Lama | ✅ | ✅ | Kita: search by nama/NIK/noRM autocomplete |
| 3 | Cetak Kartu Pasien | ✅ | ✅ | Kita: wristband print juga |
| 4 | General Consent | ✅ | ✅ | Kita: form persetujuan 6 item + penanggung jawab + cetak A4 |
| 5 | Sistem Antrian | ✅ | ✅ | Kita: auto-reset per hari per poli, status panggilan |
| 6 | Pendaftaran Poli | ✅ | ✅ | Kita: validasi bisnis Khanza (duplikasi, dokter cuti, dll) |
| 7 | Pendaftaran IGD | ✅ | ✅ | Kita: triase + form IGD khusus |
| 8 | Pendaftaran Rawat Inap | ✅ | ✅ | Kita: admisi + bed management + discharge |
| | | | | |
| | **REKAM MEDIS** | | | |
| 9 | SOAP Dokter | ✅ | ✅ | Kita: auto-save, template, vital signs auto-BMI |
| 10 | SOAP Perawat | ✅ | ✅ | Kita: via CPPT multi-profesi |
| 11 | Diagnosis ICD-10 | ✅ | ✅ | Kita: autocomplete search, utama/sekunder |
| 12 | Tindakan ICD-9-CM | ✅ | ✅ | Kita: 107 kode, 14 kategori, search endpoint |
| 13 | Kodifikasi ICD (menu terpisah) | ✅ | ⚠️ | Kita: terintegrasi langsung di SOAP form, bukan menu terpisah |
| 14 | Riwayat Rekam Medis | ✅ | ✅ | Kita: di tab pasien + halaman RM |
| 15 | Cetak SOAP PDF | ✅ | ✅ | Kita: print layout A4 |
| 16 | CPPT (Catatan Perkembangan Pasien Terintegrasi) | ❌ | ✅ | **Kita punya**: multi-profesi (Dokter, Perawat, Bidan, Apoteker, Dietisien, Fisioterapis), timeline, verifikasi |
| 17 | Resume Medis / Discharge Summary | ❌ | ✅ | **Kita punya**: `/rekam-medis/[visitId]/resume` |
| 18 | Template SOAP | ❌ | ✅ | **Kita punya**: template global & per dokter |
| | | | | |
| | **FARMASI & GUDANG** | | | |
| 19 | Data Barang / Obat | ✅ | ✅ | Kita: CRUD + edit + soft-delete + restore |
| 20 | Stok per Batch | ✅ | ✅ | Kita: batch tracking, tanggal kadaluarsa |
| 21 | FIFO Dispensing | ❌ | ✅ | **Kita punya**: otomatis ambil batch terlama |
| 22 | Retur Stok | ✅ | ✅ | Kita: penyesuaian stok manual |
| 23 | Stok Opname | ✅ | ✅ | Kita: adjust stock + audit trail |
| 24 | Amprah / Mutasi Barang | ✅ | ✅ | Kita: workflow request→approve→complete→reject |
| 25 | Apotik / Dispensing Resep | ✅ | ✅ | Kita: dashboard resep masuk, proses per item |
| 26 | Penjualan Obat Bebas (OTC) | ✅ | ✅ | Kita: dengan daily summary + stock deduction |
| 27 | Alert Expired | ⚠️ | ✅ | Kita: configurable (90 hari default), halaman khusus |
| 28 | Alert Stok Rendah | ⚠️ | ✅ | Kita: based on stok_minimum per obat |
| 29 | Purchase Order (PO) | ❌ | ✅ | **Kita punya**: supplier CRUD, PO workflow 5-step, auto stock on receive |
| 30 | Cetak Label Obat | ❌ | ✅ | **Kita punya**: drug-label print layout |
| | | | | |
| | **PENUNJANG MEDIS** | | | |
| 31 | Laboratorium (2-step) | ✅ | ✅ | Kita: 5-step (order→sampel→proses→hasil→finalisasi), 46 parameter, 7 kategori |
| 32 | Radiologi (2-step) | ✅ | ✅ | Kita: 34 jenis pemeriksaan, 6 modalitas |
| 33 | Gizi | ✅ | ✅ | SIMRS.dev: otomatis info pasien rawat inap. Kita: order nutrisi + log |
| 34 | Bedah / Operasi | ❌ | ✅ | **Kita punya**: jadwal operasi, priority (emergency/cito/elektif), cek konflik ruangan |
| | | | | |
| | **KEUANGAN** | | | |
| 35 | Kasir / Billing | ✅ | ✅ | Kita: auto-generate bill dari visit, multi-kategori |
| 36 | Tambah Biaya Manual | ✅ | ✅ | Kita: via bill_items |
| 37 | Cetak Struk | ⚠️ | ✅ | Kita: thermal 80mm layout, formatted Rupiah |
| 38 | Laporan Penerimaan Kas | ✅ | ✅ | Kita: daily summary + chart + export |
| 39 | Diskon | ❌ | ✅ | **Kita punya**: apply discount per bill |
| 40 | Multi Metode Pembayaran | ❌ | ✅ | **Kita punya**: tunai, debit, kredit, transfer, BPJS, asuransi |
| | | | | |
| | **RAWAT INAP** | | | |
| 41 | Admisi / Bed Management | ✅ | ✅ | Kita: room/bed CRUD, kelas, tarif per hari |
| 42 | Observasi / SOAP Rawat Inap | ✅ | ✅ | Kita: via CPPT multi-profesi |
| 43 | Discharge / Pulang | ✅ | ✅ | Kita: auto-update status, discharge summary |
| 44 | Pemetaan Bed per Kelas | ✅ | ✅ | Kita: kelas 1/2/3/VIP/VVIP/ICU, visual bed map |
| | | | | |
| | **INTEGRASI EKSTERNAL** | | | |
| 45 | Bridging BPJS (VClaim/SEP) | ✅ (terpisah) | ✅ (built-in) | Kita: HMAC-SHA256, AES decrypt, mock mode, 11 methods |
| 46 | SATUSEHAT (FHIR) | ❌ | ✅ | **Kita punya**: 5 FHIR resources, OAuth2, BullMQ worker |
| 47 | Telemedic | ✅ | ❌ | SIMRS.dev punya (project terpisah) |
| | | | | |
| | **MANAJEMEN & ADMIN** | | | |
| 48 | User Management | ✅ | ✅ | Kita: CRUD + role assign + MFA management |
| 49 | Import Data (CSV) | ✅ | ✅ | Kita: pasien + obat, duplicate check |
| 50 | Backup & Restore | ✅ | ✅ | Kita: halaman info + jadwal + instruksi |
| 51 | Referensi Tarif (CSV import) | ✅ | ⚠️ | Kita: tarif dokter ada, tapi import tarif tindakan via CSV belum |
| 52 | Logbook Dokter | ✅ | ✅ | Kita: auto-aggregate dari RM, filter, stats, export CSV |
| | | | | |
| | **DASHBOARD & LAPORAN** | | | |
| 53 | Dashboard Ringkasan | ✅ | ✅ | Kita: 15 modul card + 4 stat metrics + charts |
| 54 | Laporan Kunjungan per Poli | ✅ | ✅ | Kita: filter + chart + export CSV |
| 55 | Laporan Kunjungan IGD | ✅ | ✅ | Kita: termasuk di visit stats |
| 56 | Laporan Pendapatan | ✅ | ✅ | Kita: per hari/minggu/bulan, per kategori, per penjamin |
| 57 | 10 Besar Penyakit | ❌ | ✅ | **Kita punya**: top diagnoses table + chart |
| 58 | BOR / LOS | ❌ | ✅ | **Kita punya**: Bed Occupancy Rate + Length of Stay |
| 59 | Laporan Farmasi | ❌ | ✅ | **Kita punya**: obat terlaris, expired, stok rendah, nilai stok |
| 60 | Export Excel/CSV | ❌ | ✅ | **Kita punya**: CSV export untuk semua laporan |
| | | | | |
| | **KEAMANAN** | | | |
| 61 | Login Basic | ✅ | ✅ | |
| 62 | Role-Based Access | ✅ | ✅ | Kita: 10 role + granular permissions per aksi |
| 63 | MFA (2FA) | ❌ | ✅ | **Kita punya**: TOTP via speakeasy + QR code |
| 64 | Audit Trail | ❌ | ✅ | **Kita punya**: auto-log semua akses data sensitif |
| 65 | Enkripsi Data | ❌ | ✅ | **Kita punya**: AES-256-GCM untuk field sensitif |
| 66 | Rate Limiting | ❌ | ✅ | **Kita punya**: Redis-backed, login 5/15min, API 100/min |
| 67 | Input Sanitization | ❌ | ✅ | **Kita punya**: middleware sanitize + Helmet CSP |
| | | | | |
| | **OFFLINE & SYNC** | | | |
| 68 | Offline Support | ⚠️ (DexieJS) | ✅ | Kita: Dexie + SW + SyncManager + conflict resolution + offline banner |
| 69 | Background Sync | ❌ | ✅ | **Kita punya**: batch sync, retry, conflict detection |
| 70 | Conflict Resolution | ❌ | ✅ | **Kita punya**: admin review, keep local/server |
| | | | | |
| | **SaaS & MULTI-TENANCY** | | | |
| 71 | Multi-Tenant | ❌ | ✅ | **Kita punya**: schema-per-tenant, subdomain routing |
| 72 | Subscription Billing | ❌ | ✅ | **Kita punya**: 4 tier, MRR/ARR tracking, plan switching |
| 73 | Tenant Management (Super Admin) | ❌ | ✅ | **Kita punya**: create/toggle/delete tenant, auto schema |
| 74 | Profil RS per Tenant | ❌ | ✅ | **Kita punya**: logo, nama, alamat, kontak |
| | | | | |
| | **TOOLS** | | | |
| 75 | Migrasi dari Khanza | ❌ | ✅ | **Kita punya**: MySQL→PostgreSQL, 20 field mappers, CLI + dashboard wizard |
| 76 | Dark Mode / Themes | ✅ | ✅ | SIMRS.dev: multiple themes. Kita: light/dark/system |
| 77 | Print Layout Beragam | ⚠️ | ✅ | Kita: thermal, wristband, drug label, A4 |
| 78 | Docker Production | ❌ | ✅ | **Kita punya**: multi-stage Dockerfile, docker-compose.production |

---

## Skor Perbandingan

| Metrik | SIMRS.dev | SIMRS SaaS |
|--------|-----------|------------|
| Total fitur dari tabel di atas | 78 | 78 |
| ✅ Ada & Lengkap | 40 | 69 |
| ⚠️ Ada tapi Terbatas | 5 | 3 |
| ❌ Tidak Ada | 33 | 6 |
| **Coverage** | **54%** | **91%** |

---

## Fitur yang SIMRS.dev Punya tapi Kita BELUM Punya

| No | Fitur | Prioritas | Estimasi |
|----|-------|-----------|----------|
| 1 | ~~**General Consent**~~ | ~~Sedang~~ | ✅ **Selesai** |
| 2 | **Telemedic** (video call + chat) | Rendah | Kompleks |
| 3 | ~~**Logbook Dokter**~~ | ~~Rendah~~ | ✅ **Selesai** |
| 4 | **Import Tarif Tindakan via CSV** | Sedang | Ringan |

---

## Fitur yang Kita Punya tapi SIMRS.dev TIDAK Punya

| No | Fitur | Nilai Bisnis |
|----|-------|-------------|
| 1 | **SATUSEHAT FHIR Integration** | Wajib regulasi |
| 2 | **CPPT Multi-Profesi** | Kunci akreditasi STARKES |
| 3 | **Resume Medis / Discharge Summary** | Wajib regulasi |
| 4 | **Multi-Tenancy SaaS** | Model bisnis scalable |
| 5 | **Subscription Billing** | Revenue management |
| 6 | **MFA (2FA)** | Keamanan UU PDP |
| 7 | **Audit Trail** | Kepatuhan & keamanan |
| 8 | **Enkripsi Data (AES-256)** | UU PDP |
| 9 | **FIFO Dispensing** | Best practice farmasi |
| 10 | **Purchase Order** | Procurement management |
| 11 | **Bedah / Operasi** | Pelayanan khusus |
| 12 | **Background Sync + Conflict Resolution** | Offline reliability |
| 13 | **Migration Tool Khanza** | User acquisition |
| 14 | **10 Besar Penyakit + BOR/LOS** | KPI manajemen |
| 15 | **Export CSV/Excel** | Pelaporan |
| 16 | **Rate Limiting + Helmet** | Security hardening |
| 17 | **Print: Wristband + Drug Label** | Operasional |
| 18 | **Docker Production** | Deployment |
| 19 | **Template SOAP** | Efisiensi dokter |
| 20 | **Diskon + Multi Payment** | Fleksibilitas kasir |

---

## Kesimpulan

**SIMRS.dev** adalah solusi ringan (120 KB!) yang cocok untuk RS kecil/sederhana dengan kebutuhan basic. Kelebihannya: sangat ringan, mudah deploy, multiple themes.

**SIMRS SaaS** dirancang sebagai **penerus** dengan arsitektur modern yang menjawab kebutuhan regulasi terkini (SATUSEHAT, UU PDP), standar akreditasi (CPPT, audit trail), dan model bisnis scalable (multi-tenant SaaS). Unggul di: keamanan, integrasi pemerintah, offline reliability, dan manajemen enterprise.

**Yang perlu dikerjakan untuk menutup gap:**
1. ~~General Consent form~~ ✅ Selesai
2. Import tarif tindakan CSV (prioritas sedang)
3. ~~Logbook Dokter~~ ✅ Selesai
4. Telemedic bisa ditunda ke fase lanjutan
