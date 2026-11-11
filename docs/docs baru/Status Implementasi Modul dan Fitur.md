# Status Implementasi Modul & Fitur SIMRS SaaS

**Tanggal Update:** 25 Oktober 2026 (setelah Sprint B Task #14 TTE)
**Berdasarkan:** Checklist dari `Daftar Modul dan Fitur.docx` (40 item)

---

## Ringkasan

| Status | Jumlah | Persentase |
|--------|--------|------------|
| ✅ Selesai | 26 | 65% |
| ⚠️ Sebagian | 4 | 10% |
| ❌ Belum | 10 | 25% |

---

## A. FITUR WAJIB (No. 1–18)

| No | Kategori | Nama Modul / Fitur | Status | Keterangan |
|----|----------|---------------------|--------|------------|
| 1 | RME | Entri SOAP, anamnesis, ICD-10, ICD-9-CM | ✅ Selesai | SOAP form, diagnosis picker (ICD-10), ICD-9-CM prosedur (107 kode, 14 kategori). Backend: `medical-record` module. Frontend: `/rekam-medis/[visitId]` |
| 2 | RME | Ringkasan pulang (discharge summary) | ✅ Selesai | Frontend: `/rekam-medis/[visitId]/resume`. A4 structured layout, PDF download via html2canvas+jsPDF |
| 3 | RME | Tanda tangan digital / verifikasi sistem | ✅ Selesai | TTE module: SHA-512 hash + tamper detection, provider BSrE/VIDA/Privy, SignaturePad canvas, SignDialog, TteBadge. Admin: `/admin/tte`. 9 document types supported |
| 4 | Integrasi | Bridging VClaim (SEP, rujukan) | ✅ Selesai | `bpjs` module: HMAC-SHA256 client, AES+LZString decrypt, VClaim + referensi. Frontend: `/bpjs` |
| 5 | Integrasi | Bridging E-Klaim / INA-CBG | ✅ Selesai | e-Klaim: groupingStage1, getClaim, listClaims, getStatus, deleteClaim — 5 endpoints. Frontend: tab e-Klaim di `/bpjs` |
| 6 | Integrasi | Bridging Antrol (Antrean Online BPJS) | ✅ Selesai | Antrol module: ref poli/dokter, jadwal dokter, tambah/update/batal antrean, sync task dari Mobile JKN, dashboard per-tanggal/bulan, local `antrol_bookings` table. Frontend: tab Antrol di `/bpjs` (4 sub-section) |
| 7 | Integrasi | Bridging Aplicares (tempat tidur) | ✅ Selesai | Aplicare bed availability endpoint, BOR cards, per-kelas breakdown. Frontend: tab Aplicare di `/bpjs` |
| 8 | Integrasi | SATUSEHAT Platform (FHIR R4) | ✅ Selesai | 13 FHIR resources (Patient, Encounter, Condition, Observation, MedicationRequest, Procedure, AllergyIntolerance, MedicationDispense, ServiceRequest, DiagnosticReport, Composition, Practitioner, Location). OAuth2 + BullMQ worker |
| 9 | Integrasi | Terminologi standar (ICD-10, ICD-9-CM, LOINC, SNOMED CT, KFA) | ⚠️ Sebagian | ✅ ICD-10, ✅ ICD-9-CM, ✅ LOINC (95 codes, 10 kategori, mapped ke lab_parameters), ✅ KFA (102 codes, 12 golongan, mapped ke drugs). ❌ SNOMED CT belum. Admin: `/admin/terminologi` |
| 10 | Penunjang Klinis | LIS (Laboratorium) terintegrasi RME | ✅ Selesai | 12 methods, 12 endpoints, 46 parameter lab, workflow order→sampel→proses→hasil→finalisasi |
| 11 | Penunjang Klinis | RIS (Radiologi) terintegrasi RME | ✅ Selesai | 11 methods, 11 endpoints, 34 jenis pemeriksaan, 6 modalitas |
| 12 | Penunjang Klinis | Farmasi (e-prescription, dispensing, stok) | ✅ Selesai | Drug CRUD, FIFO dispensing, batch tracking, expired/low-stock alerts, OTC sales |
| 13 | Keuangan | Billing / Invoicing terintegrasi | ✅ Selesai | Generate bill, payment, diskon, daily summary, outstanding, print struk thermal |
| 14 | Keuangan | Akuntansi (jurnal, buku besar, laporan keuangan) | ✅ Selesai | COA 55 akun standar RS, jurnal umum CRUD+post+reverse, auto-jurnal dari payment+PO, buku besar running saldo, neraca saldo, neraca (balance sheet), laba rugi, arus kas, periode fiskal, dashboard keuangan |
| 15 | Front Office | Registrasi pasien (rawat jalan, IGD, rawat inap) | ✅ Selesai | CRUD pasien, auto no_rekam_medis, duplikasi NIK, registrasi RJ/IGD/RI, antrian, cara keluar/discharge |
| 16 | Front Office | Sistem antrean & anjungan mandiri (kiosk) | ✅ Selesai | Display antrian fullscreen (3-kolom, bell sound), Kiosk 8-step flow (touch numpad, search RM/NIK, auto-register) |
| 17 | SDM | HRIS (data pegawai, jadwal dinas, remunerasi) | ✅ Selesai | 8 tabel (employees, departments, shift_templates, shift_assignments, attendance, leave_requests, payroll_periods, payroll_items), NIP auto-gen, jadwal dinas kalender grid, absensi terlambat/lembur auto-calc, cuti 12 hari/tahun + approve auto-attendance, penggajian full pipeline gaji+tunjangan+jasa medis+BPJS+PPH21, slip gaji cetak |
| 18 | Logistik | Inventory & pembelian (gudang farmasi) | ✅ Selesai | PO workflow, mutasi barang, supplier management, gudang umum, stock opname |

**Skor Fitur Wajib: 17 Selesai / 1 Sebagian / 0 Belum = 97% coverage**

---

## B. FITUR SEBAIKNYA ADA (No. 19–32)

| No | Kategori | Nama Modul / Fitur | Status | Keterangan |
|----|----------|---------------------|--------|------------|
| 19 | Keselamatan Pasien | CDSS: Alert obat high-alert | ✅ Selesai | High-alert flag + kategori (8 ISMP categories), LASA/NORUM badge, special instructions. Admin toggle di `/admin/cdss` |
| 20 | Keselamatan Pasien | CDSS: Deteksi interaksi obat | ✅ Selesai | 65 interaksi obat (22 major, 26 moderate, 17 minor), bidirectional ILIKE matching, word extraction, severity badges. InteractionChecker component |
| 21 | Keselamatan Pasien | Verifikasi ganda obat high-alert | ✅ Selesai | Critical alerts block dispensing, pharmacist must override with documented reason. Auto-check on prescription load. Alert audit trail in `cdss_alerts` |
| 22 | Manajemen Klinis | CPPT (Catatan Perkembangan Pasien Terintegrasi) | ✅ Selesai | SOAP-IE multi-profesi, timeline, verifikasi, filter profesi |
| 23 | Manajemen Klinis | Formulir pengkajian awal medis & keperawatan | ✅ Selesai | Pengkajian keperawatan: Morse Fall Scale, Barthel Index, skrining nutrisi, nyeri NRS, psikososial. Frontend: `/rekam-medis/[visitId]/pengkajian` |
| 24 | Manajemen Klinis | Formulir edukasi pasien terintegrasi | ✅ Selesai | 32 topik edukasi 10 kategori (Diagnosis/Terapi/Obat/Diet/Nyeri/Rehabilitasi/Luka/Tanda Bahaya/Discharge/Lain), metode multi-select, evaluasi pemahaman baik/cukup/kurang auto-flag re-edukasi, verifikasi tanda tangan pasien Canvas, cetak A4, admin topic management |
| 25 | Pelayanan Khusus | ICU, Bedah Sentral, Kebidanan & Kandungan | ⚠️ Sebagian | ✅ Bedah Sentral lengkap (tim bedah, instrumen, anestesi, perioperatif). ❌ ICU monitoring. ❌ ObGyn |
| 26 | Pelayanan Khusus | Gizi (ADIME) | ⚠️ Sebagian | ✅ Gizi: kalkulator Harris-Benedict/Mifflin, bahan makanan CRUD, meal plan, food cost. ❌ Format ADIME terstruktur belum |
| 27 | Pelayanan Khusus | Bank Darah, Ambulance, Pemulasaran Jenazah | ❌ Belum | Belum ada |
| 28 | Pelayanan Khusus | Laundry & CSSD | ❌ Belum | Belum ada |
| 29 | Tata Kelola | Dashboard Eksekutif (KPI, indikator mutu) | ✅ Selesai | 5 metrik overview, visit stats, revenue, pharmacy, BOR/LOS, export XLSX/PDF, Redis cache |
| 30 | Tata Kelola | Manajemen Aset (aset tetap, pemeliharaan) | ❌ Belum | Belum ada |
| 31 | Kepatuhan | Audit trail lengkap | ✅ Selesai | audit_logs, middleware auto-logging, admin API |
| 32 | Kepatuhan | Kepatuhan UU PDP (enkripsi, RBAC) | ✅ Selesai | AES-256-GCM, JWT+MFA, RBAC, rate limiting, Helmet, sanitization |

**Skor Fitur Sebaiknya Ada: 9 Selesai / 2 Sebagian / 3 Belum = 71% coverage**

---

## C. FITUR NILAI TAMBAH (No. 33–40)

| No | Kategori | Nama Modul / Fitur | Status | Keterangan |
|----|----------|---------------------|--------|------------|
| 33 | Interoperabilitas | SSO antar modul | ⚠️ Sebagian | JWT unified auth. Belum SSO standar SAML/OAuth2 |
| 34 | Interoperabilitas | API terbuka untuk integrasi pihak ketiga | ✅ Selesai | REST API 190+ endpoints, Swagger config |
| 35 | Analitik | Analitik lanjutan (prediktif, BI) | ❌ Belum | |
| 36 | Analitik | IoT & integrasi perangkat medis | ❌ Belum | |
| 37 | Pengalaman Pasien | Patient portal / mobile app | ❌ Belum | PWA ready tapi belum ada halaman publik pasien |
| 38 | Operasional | GIS untuk surveilans & rujukan | ❌ Belum | |
| 39 | Operasional | Telemedicine / telehealth | ❌ Belum | |
| 40 | Kepatuhan | Manajemen risiko & FMEA | ❌ Belum | |

**Skor Fitur Nilai Tambah: 1 Selesai / 1 Sebagian / 6 Belum = 19% coverage**

---

## D. FITUR TAMBAHAN (Tidak di Checklist, Tapi Sudah Dibangun — 28 item)

| No | Fitur | Keterangan |
|----|-------|------------|
| A1 | Offline-First Mode | Dexie.js, SyncManager, Service Worker, background sync |
| A2 | Multi-Tenancy SaaS | Schema-per-tenant PostgreSQL, subdomain routing, tenant config |
| A3 | Tools Migrasi Khanza | MySQL→PostgreSQL, field mapper, batch migrator, CLI, frontend wizard |
| A4 | Subscription & Billing | 4 paket, auto provisioning, MRR/ARR tracking |
| A5 | Import CSV | Pasien & obat, duplicate check, auto RM |
| A6 | Penjualan Obat Bebas (OTC) | Tanpa resep, daily summary |
| A7 | User Management | CRUD pengguna, assign role, MFA management |
| A8 | Dark Mode | next-themes light/dark/system |
| A9 | Profil RS (Tenant) | Edit identitas & kontak RS |
| A10 | Super Admin Panel | Kelola tenant, auto schema provisioning |
| A11 | Sinkronisasi | Batch sync, conflict resolution, monitor |
| A12 | Backup & Recovery | pg_dump, schedule, download, restore command |
| A13 | General Consent | Form persetujuan pasien, cetak A4 |
| A14 | Logbook Dokter | Catatan tindakan per dokter, stats, CSV export |
| A15 | Display Antrian | Fullscreen dark theme, bell ding-dong, auto-refresh |
| A16 | Kiosk / Anjungan Mandiri | 8-step flow, touch numpad, auto-register |
| A17 | Jadwal Praktik Dokter | Schedule per hari/poli/jam/kuota |
| A18 | Jasa Medis | Tarif layanan, persentase dokter vs RS |
| A19 | Asuransi & Penjamin | CRUD asuransi, patient insurance, integr. registrasi & billing |
| A20 | Gudang Umum | CRUD barang gudang, stock tracking, low-stock alert |
| A21 | Stock Opname | Farmasi & gudang, selisih highlighting, complete/cancel |
| A22 | Resume Medis Cetak | A4 structured PDF, html2canvas+jsPDF |
| A23 | BPJS PCare | Pendaftaran, kunjungan, DPHO search |
| A24 | SATUSEHAT Extended | +8 FHIR resources (total 13) |
| A25 | Cara Keluar / Discharge | 5 tipe, rujuk, meninggal handling |
| A26 | TTE Tanda Tangan Elektronik | SHA-512 tamper detection, BSrE/VIDA/Privy, canvas signature |
| A27 | Error Handling | 404/500 pages, ErrorBoundary |
| A28 | Docker Production | Multi-stage Dockerfiles, docker-compose.production |

---

## E. DAFTAR HALAMAN FRONTEND (45+ Pages)

| No | Path | Deskripsi |
|----|------|-----------|
| 1 | `/dashboard` | Dashboard utama |
| 2 | `/pendaftaran` | Pendaftaran pasien |
| 3 | `/pendaftaran/antrian` | Kelola antrian |
| 4 | `/display-antrian` | Display TV antrian fullscreen |
| 5 | `/kiosk` | Anjungan mandiri |
| 6 | `/igd` | Unit Gawat Darurat |
| 7 | `/rawat-inap` | Rawat inap |
| 8 | `/pasien` | Daftar pasien |
| 9 | `/pasien/baru` | Form pasien baru |
| 10 | `/pasien/[id]` | Detail pasien |
| 11 | `/pasien/[id]/edit` | Edit pasien |
| 12 | `/rekam-medis` | Daftar kunjungan |
| 13 | `/rekam-medis/[visitId]` | Pemeriksaan SOAP |
| 14 | `/rekam-medis/[visitId]/cppt` | CPPT multi-profesi |
| 15 | `/rekam-medis/[visitId]/resume` | Resume medis |
| 16 | `/rekam-medis/[visitId]/pengkajian` | Pengkajian keperawatan |
| 17 | `/farmasi` | Dashboard farmasi |
| 18 | `/farmasi/dispensing/[id]` | Dispensing resep |
| 19 | `/farmasi/stok` | Stok obat |
| 20 | `/farmasi/mutasi` | Mutasi barang |
| 21 | `/farmasi/purchase-order` | Daftar PO |
| 22 | `/farmasi/purchase-order/[poId]` | Detail PO |
| 23 | `/farmasi/penjualan-bebas` | OTC sales |
| 24 | `/farmasi/stock-opname` | Daftar stock opname |
| 25 | `/farmasi/stock-opname/[id]` | Detail stock opname |
| 26 | `/kasir` | Dashboard kasir |
| 27 | `/kasir/[visitId]` | Detail billing |
| 28 | `/laboratorium` | Dashboard lab |
| 29 | `/laboratorium/[orderId]` | Detail order lab |
| 30 | `/radiologi` | Dashboard radiologi |
| 31 | `/radiologi/[orderId]` | Detail radiologi |
| 32 | `/bedah` | Jadwal bedah |
| 33 | `/bedah/[surgeryId]` | Detail bedah 5-tab |
| 34 | `/gizi` | Konsultasi nutrisi 5-tab |
| 35 | `/gudang` | Gudang umum |
| 36 | `/bpjs` | BPJS 7-tab |
| 37 | `/laporan` | Laporan & export |
| 38 | `/admin` | Pengaturan |
| 39 | `/admin/tte` | TTE config & stats |
| 40 | `/admin/tenants` | Super admin |
| 41 | `/admin/rs` | Profil RS |
| 42 | `/admin/pengguna` | Manajemen pengguna |
| 43 | `/admin/dokter` | Dokter & jadwal |
| 44 | `/admin/dokter/[id]` | Detail dokter 3-tab |
| 45 | `/admin/asuransi` | Asuransi & penjamin |
| 46 | `/admin/satusehat` | SATUSEHAT |
| 47 | `/admin/sync` | Monitor sync |
| 48 | `/admin/import` | Import CSV |
| 49 | `/admin/backup` | Backup & restore |
| 50 | `/admin/audit` | Audit trail |
| 51 | `/admin/migrasi-khanza` | Migrasi Khanza |
| 52 | `/profil/mfa` | Setup MFA |

---

## F. TOTAL BACKEND: 25 Modules, ~200+ API Endpoints

| No | Module | Endpoints |
|----|--------|-----------|
| 1 | auth + mfa + user-management | ~15 |
| 2 | patient | ~8 |
| 3 | registration + lookup | ~10 |
| 4 | medical-record + logbook | ~12 |
| 5 | cppt | 6 |
| 6 | pharmacy + otc-sales | ~20 |
| 7 | purchase-order + suppliers | 9 |
| 8 | inventory (mutasi) | ~6 |
| 9 | warehouse | ~8 |
| 10 | billing | ~8 |
| 11 | bpjs (VClaim+PCare+eKlaim+Aplicare) | ~26 |
| 12 | satusehat | ~13 |
| 13 | laboratory | 12 |
| 14 | radiology | 11 |
| 15 | surgery | ~13 |
| 16 | nutrition | ~17 |
| 17 | nursing | 7 |
| 18 | inpatient | ~6 |
| 19 | igd | ~5 |
| 20 | dashboard | 7 |
| 21 | sync | ~5 |
| 22 | audit | ~4 |
| 23 | tenant | 2 |
| 24 | super-admin + subscription | ~14 |
| 25 | migration + field-mapper | 5 |
| 26 | import | 3 |
| 27 | backup | 10 |
| 28 | doctor (jadwal + jasa medis) | ~14 |
| 29 | insurance | ~12 |
| 30 | general-consent | ~4 |
| 31 | tte (digital signature) | 8 |

---

## G. SISA TASK YANG BISA DIKERJAKAN

### Sprint C — High Priority (Wajib & Penting)

| # | Task | Prioritas | Kategori | Estimasi |
|---|------|-----------|----------|----------|
| C1 | ~~Bridging Antrol (Antrean Online BPJS)~~ | ✅ Selesai | Integrasi | — |
| C2 | ~~Terminologi LOINC + KFA~~ | ✅ Selesai | Integrasi | — |
| C3 | ~~CDSS: High-Alert Drug (NORUM/LASA) + Interaksi Obat~~ | ✅ Selesai | Keselamatan | — |
| C4 | ~~Akuntansi (Jurnal, Buku Besar, Neraca, Laba Rugi)~~ | ✅ Selesai | Keuangan | — |
| C5 | ~~HRIS (Kepegawaian, Jadwal Dinas, Shift Perawat)~~ | ✅ Selesai | SDM | — |
| C6 | ~~Formulir Edukasi Pasien~~ | ✅ Selesai | Klinis | — |

### Sprint D — Medium Priority (Sebaiknya Ada)

| # | Task | Prioritas | Kategori | Estimasi |
|---|------|-----------|----------|----------|
| D1 | ICU Monitoring (vital sign tracking, ventilator log) | 🟡 Sedang | Pelayanan | Sedang |
| D2 | Gizi ADIME Format Terstruktur | 🟢 Ringan | Pelayanan | Ringan |
| D3 | Bank Darah | 🟡 Sedang | Pelayanan | Sedang |
| D4 | Laundry & CSSD | 🟢 Ringan | Pelayanan | Ringan |
| D5 | Manajemen Aset (Inventaris Tetap, Pemeliharaan) | 🟡 Sedang | Tata Kelola | Sedang |
| D6 | ObGyn (Kebidanan & Kandungan) | 🟡 Sedang | Pelayanan | Sedang |

### Sprint E — Nice to Have (Nilai Tambah)

| # | Task | Prioritas | Kategori | Estimasi |
|---|------|-----------|----------|----------|
| E1 | Patient Portal (Riwayat Medis, Booking Online) | 🟡 Sedang | Pasien | Kompleks |
| E2 | WhatsApp Gateway Notifikasi | 🟢 Ringan | Operasional | Sedang |
| E3 | Telemedicine / Telehealth | 🟢 Ringan | Operasional | Kompleks |
| E4 | Analitik Prediktif (AI/BI) | 🟢 Ringan | Analitik | Kompleks |
| E5 | Manajemen Risiko & FMEA | 🟢 Ringan | Kepatuhan | Sedang |
| E6 | SSO SAML/OAuth2 untuk Pihak Ketiga | 🟢 Ringan | Interop | Sedang |
