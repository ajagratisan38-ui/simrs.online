<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa" alt="PWA" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
</p>

# 🏥 SIMRS SaaS

**Sistem Informasi Manajemen Rumah Sakit** berbasis Software-as-a-Service — platform lengkap untuk digitalisasi operasional rumah sakit di Indonesia dengan arsitektur **offline-first** dan **multi-tenant**.

> Penerus alami bagi 500+ RS pengguna Khanza — modern, terintegrasi SATUSEHAT & BPJS, siap pakai dari pendaftaran hingga laporan keuangan.

---

## ✨ Highlights

- 🔄 **Offline-First** — Tetap bisa input data tanpa internet, sinkronisasi otomatis saat online
- 🏢 **Multi-Tenant** — Schema-per-tenant PostgreSQL, setiap RS punya data terisolasi
- 🇮🇩 **Integrasi Pemerintah** — SATUSEHAT FHIR R4 (13 resources), BPJS VClaim/PCare/e-Klaim/Antrol, SIRS Online, SIRANAP
- 🔐 **Keamanan UU PDP** — MFA TOTP, RBAC 10 role, audit trail, enkripsi AES-256-GCM, TTE tersertifikasi
- 💊 **CDSS** — Clinical Decision Support: drug interaction checker, high-alert drugs, LASA/NORUM detection
- 📱 **PWA Installable** — Bisa diinstall di tablet/smartphone layaknya native app
- 🖥️ **Kiosk & Display** — Anjungan mandiri pasien + display antrian TV fullscreen
- 🌙 **Dark Mode** — Tema terang/gelap/sistem
- 📊 **40+ Modul** — Dari pendaftaran, rekam medis, farmasi, laboratorium, sampai akuntansi & HRIS

---

## 🛠️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **State** | Zustand (UI state) + TanStack Query (server state) |
| **Offline** | Dexie.js (IndexedDB) + Service Worker + Background Sync |
| **Backend** | Node.js 20, Express 4, TypeScript |
| **Database** | PostgreSQL 16 (schema-per-tenant multi-tenancy) |
| **Cache & Queue** | Redis 7 + BullMQ |
| **Charts** | Recharts (lazy-loaded) |
| **PDF/Excel** | jsPDF + html2canvas-pro, ExcelJS |
| **Email** | Nodemailer |
| **Auth** | JWT + Refresh Token + MFA (speakeasy TOTP) |
| **Container** | Docker + Docker Compose |

---

## 📦 Modul Lengkap

### Klinik & Medis

| Modul | Deskripsi |
|:------|:----------|
| **Pendaftaran** | Rawat Jalan, IGD, Rawat Inap, booking online, antrian digital, aturan bisnis Khanza |
| **Pasien** | CRUD, auto No. RM, deteksi duplikat NIK, merge, soft delete |
| **Rekam Medis** | SOAP, ICD-10, ICD-9-CM prosedur, diagnosa, resep, template, auto-save |
| **CPPT** | Catatan Perkembangan Pasien Terintegrasi multi-profesi (SOAP-IE), timeline view |
| **Pengkajian Keperawatan** | Asesmen 7 bagian: vital signs, nyeri NRS, Morse Fall Scale, Barthel Index, skrining nutrisi |
| **Resume Medis** | Cetak PDF A4 terstruktur dengan KOP RS, semua data kunjungan |
| **General Consent** | Form persetujuan pasien digital + cetak A4 |
| **Edukasi Pasien** | Formulir edukasi dengan topik kustom |
| **Logbook Dokter** | Catatan tindakan per dokter, statistik, CSV export |
| **MCU** | Medical Check Up: paket, registrasi, pemeriksaan per kategori, sertifikat sehat |
| **Discharge** | Cara keluar: sembuh/rujuk/APS/meninggal dengan validasi per tipe |

### Penunjang

| Modul | Deskripsi |
|:------|:----------|
| **Farmasi** | FIFO dispensing, stok real-time, kadaluarsa alert, low-stock alert |
| **Purchase Order** | PO ke supplier, 5-step workflow draft→approved→ordered→received→completed |
| **Penjualan Bebas** | OTC sales, stok otomatis terpotong |
| **Mutasi Barang** | Transfer antar unit, approve/complete/reject workflow |
| **Stock Opname** | Hitung fisik vs sistem, selisih, adjustment otomatis |
| **Gudang Umum** | Inventaris non-obat, 7 kategori |
| **Laboratorium** | Order lab, 46 parameter, 7 kategori, proses→input hasil→finalize→print |
| **Radiologi** | 34 jenis pemeriksaan, 6 modalitas (X-Ray/USG/CT/MRI/Mammo/Pano) |
| **Bedah / Operasi** | Jadwal, tim bedah 8 peran, instrumen, anestesi, perioperatif 3 fase |
| **Gizi / Nutrisi** | ADIME, kalkulator gizi Harris-Benedict/Mifflin, meal plan, food cost |
| **CDSS** | Drug interaction 65 pasangan, high-alert, LASA/NORUM auto-detect (pg_trgm) |

### Keuangan & Administrasi

| Modul | Deskripsi |
|:------|:----------|
| **Kasir / Billing** | Generate tagihan, pembayaran, diskon, struk cetak, laporan harian |
| **Akuntansi** | COA 55 akun, jurnal umum, buku besar, neraca, laba rugi, arus kas |
| **Auto-Journal** | Jurnal otomatis dari pembayaran dan purchase order |
| **Asuransi & Penjamin** | Kelola asuransi, link ke pasien, integrasi pendaftaran |
| **Laporan** | 7 tipe laporan, export Excel multi-sheet + PDF A4, grafik, filter |
| **Manajemen Aset** | CRUD aset, pemeliharaan, mutasi, penyusutan (Garis Lurus + Saldo Menurun) |

### Kepegawaian / HRIS

| Modul | Deskripsi |
|:------|:----------|
| **Data Pegawai** | NIP auto-gen, data lengkap, link akun login |
| **Departemen** | CRUD departemen RS |
| **Jadwal Dinas** | Calendar grid, 5 shift template, bulk assign |
| **Absensi** | Harian + rekap bulanan, terlambat/lembur auto-calc |
| **Cuti & Izin** | 5 jenis cuti, approve/reject, saldo 12 hari/tahun |
| **Penggajian** | Gaji pokok + 6 tunjangan + jasa medis + PPH 21 progresif, slip gaji |

### Integrasi Pemerintah

| Modul | Deskripsi |
|:------|:----------|
| **SATUSEHAT** | FHIR R4: 13 resources (Patient, Encounter, Condition, Observation, MedicationRequest, Procedure, AllergyIntolerance, MedicationDispense, ServiceRequest, DiagnosticReport, Composition, Practitioner, Location) |
| **BPJS VClaim** | SEP, peserta, rujukan, prosedur, faskes, dokter, spesialistik |
| **BPJS PCare** | Pendaftaran, kunjungan, riwayat, obat DPHO |
| **BPJS e-Klaim** | INACBG grouping, claim management |
| **BPJS Aplicare** | Ketersediaan tempat tidur, BOR per kelas |
| **BPJS Antrol** | Antrean online Mobile JKN, jadwal dokter, dashboard |
| **SIRS Online** | 10 RL reports (RL1.3–RL5.1), indikator BOR/LOS/TOI/BTO/GDR/NDR, kirim Kemenkes |
| **SIRANAP** | Ketersediaan TT real-time, auto-send terjadwal, XML protocol |
| **Terminologi** | LOINC (90+ kode) + KFA (101 kode), mapping otomatis |

### Platform SaaS

| Modul | Deskripsi |
|:------|:----------|
| **Multi-Tenant** | Schema-per-tenant, subdomain routing (`rs-contoh.simrs.id`) |
| **Landing Page** | Halaman marketing + self-registration form |
| **Payment Flow** | Upload bukti bayar, verifikasi, auto-provisioning, email notifikasi |
| **Super Admin Panel** | Dashboard, kelola RS, paket langganan, transaksi, monitoring, verifikasi pembayaran |
| **Onboarding Wizard** | 5 langkah setup RS baru: profil → ruangan → dokter → selesai |
| **Portal Pasien** | Login NIK+DOB, riwayat kunjungan, tagihan, rekam medis |
| **Subscription** | 4 paket (Trial/Basic/Professional/Enterprise), auto-suspend, expiry reminder |
| **Backup & Recovery** | pg_dump + gzip, jadwal otomatis, retention, download, restore guide |

### Keamanan

| Fitur | Deskripsi |
|:------|:----------|
| **RBAC** | 10 role, 42+ permissions, per-modul per-aksi |
| **MFA** | TOTP via authenticator app, QR code setup |
| **Audit Trail** | Log semua akses data sensitif, CSV export |
| **Enkripsi** | AES-256-GCM untuk field sensitif |
| **TTE** | Tanda Tangan Elektronik tersertifikasi (Internal/BSrE/VIDA/Privy) |
| **Rate Limiting** | Redis-backed: login 5/15min, API 100/min |
| **Multi-Session** | Concurrent session limit, device management |

### Fitur Tambahan

| Fitur | Deskripsi |
|:------|:----------|
| **Kiosk** | Anjungan mandiri 8-step: welcome→cari pasien→pilih poli→dokter→cetak tiket |
| **Display Antrian** | Fullscreen dark theme, 3 kolom, bell sound, auto-refresh, filter poli |
| **Dark Mode** | Tema terang/gelap/sistem (next-themes) |
| **Import CSV** | Import pasien & obat dari file CSV, deteksi duplikat |
| **Migrasi Khanza** | 4-step wizard: Connect→Analyze→Migrate→Verify dari MySQL Khanza |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### 1. Clone & Install

```bash
git clone https://github.com/ajagratisan38-ui/simrs.online.git
cd simrs.online
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

Starts PostgreSQL (port 5432) and Redis (port 6379).

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Run Migrations & Seeds

```bash
cd apps/server
npx tsx node_modules/knex/bin/cli.js migrate:latest
npx tsx node_modules/knex/bin/cli.js seed:run
```

### 5. Start Development

```bash
# Terminal 1: Backend
cd apps/server && pnpm dev

# Terminal 2: Frontend
cd apps/web && pnpm dev
```

| Service | URL |
|:--------|:----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4001/api/v1 |
| Health Check | http://localhost:4001/api/health |

### 6. Demo Login

| Role | Email | Password |
|:-----|:------|:---------|
| Admin | `admin@rs-demo.simrs.id` | `Demo123!` |
| Dokter | `dr.budi@rs-demo.simrs.id` | `User123!` |
| Apoteker | `apoteker.rina@rs-demo.simrs.id` | `User123!` |
| Kasir | `kasir.maya@rs-demo.simrs.id` | `User123!` |
| Pendaftaran | `pendaftaran.ahmad@rs-demo.simrs.id` | `User123!` |

> Tenant slug: **`rs-demo`**

---

## 📁 Project Structure

```
simrs.online/
├── apps/
│   ├── web/                    # Next.js 14 frontend (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/         # Login page
│   │   │   ├── (dashboard)/    # 40+ authenticated pages
│   │   │   ├── (portal)/       # Patient portal
│   │   │   ├── kiosk/          # Self-service kiosk
│   │   │   ├── display-antrian/ # Queue display TV
│   │   │   ├── onboarding/     # New RS setup wizard
│   │   │   └── sa/             # Super Admin panel
│   │   ├── components/         # UI components (shadcn/ui)
│   │   ├── hooks/              # 200+ custom hooks (TanStack Query)
│   │   ├── lib/api/            # API client functions
│   │   └── stores/             # Zustand stores
│   │
│   └── server/                 # Express.js backend
│       ├── src/
│       │   ├── config/         # Database, Redis, env
│       │   ├── middleware/      # Auth, RBAC, tenant, rate-limit
│       │   ├── modules/        # 30+ domain modules
│       │   │   ├── auth/       # JWT + MFA + user management
│       │   │   ├── patient/    # Patient CRUD
│       │   │   ├── registration/ # Visit registration
│       │   │   ├── medical-record/ # SOAP, diagnosis, prescriptions
│       │   │   ├── pharmacy/   # Drug management, dispensing
│       │   │   ├── billing/    # Invoicing, payments
│       │   │   ├── laboratory/ # Lab orders & results
│       │   │   ├── radiology/  # Radiology orders
│       │   │   ├── surgery/    # Surgical management
│       │   │   ├── nutrition/  # Dietary management
│       │   │   ├── mcu/        # Medical check-up
│       │   │   ├── hris/       # HR management
│       │   │   ├── accounting/ # Chart of accounts, journals
│       │   │   ├── bpjs/       # BPJS VClaim/PCare/e-Klaim/Antrol
│       │   │   ├── satusehat/  # FHIR R4 integration
│       │   │   ├── cdss/       # Clinical decision support
│       │   │   ├── backup/     # Backup & recovery
│       │   │   └── ...         # + 15 more modules
│       │   └── shared/         # Logger, errors, email, types
│       ├── migrations/         # 30+ Knex migrations
│       └── seeds/              # ICD-10, drugs, demo data
│
├── packages/
│   ├── shared-types/           # TypeScript types (frontend ↔ backend)
│   ├── validators/             # Shared Zod schemas
│   └── constants/              # RBAC permissions, menu items
│
├── tools/
│   └── migration-khanza/       # Khanza MySQL → PostgreSQL CLI
│
└── docker/
    ├── Dockerfile.web          # Next.js production build
    ├── Dockerfile.server       # Express production build
    └── docker-compose.yml      # PostgreSQL + Redis
```

---

## 🔐 Role-Based Access Control

| Role | Modules |
|:-----|:--------|
| **Admin** | Full access to all modules |
| **Dokter** | Rekam medis, pemeriksaan, resep, CPPT, bedah, lab, radiologi, MCU |
| **Perawat** | Pengkajian keperawatan, CPPT, rawat inap, MCU, gizi |
| **Apoteker** | Farmasi, dispensing, stok, PO, stock opname, CDSS |
| **Kasir** | Billing, pembayaran, laporan keuangan |
| **Pendaftaran** | Registrasi pasien, antrian, BPJS, kiosk |
| **Rekam Medis** | Data pasien, rekam medis (read) |
| **Lab** | Laboratorium (proses sample, input hasil) |
| **Radiologi** | Radiologi (proses pemeriksaan, input bacaan) |
| **Manajemen** | Dashboard, laporan, kepegawaian, keuangan |

---

## 🌐 Production Deployment

### Docker Build

```bash
# Build images
docker build -f docker/Dockerfile.server -t simrs-server .
docker build -f docker/Dockerfile.web -t simrs-web .

# Start infrastructure
docker compose up -d  # PostgreSQL + Redis

# Run containers
docker run -d --name simrs-server \
  --network docker_default \
  -p 4001:4001 \
  --env-file .env \
  --restart unless-stopped \
  simrs-server

docker run -d --name simrs-web \
  --network docker_default \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://server:4001/api/v1 \
  -e NODE_ENV=production \
  --restart unless-stopped \
  simrs-web
```

### Database Backup

```bash
# Via admin panel: /admin/backup
# Or via CLI:
docker exec simrs-postgres pg_dump -U simrs simrs_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

---

## 🔄 Migration from Khanza

Two options available:

### Option A: Dashboard Wizard (Recommended)

Navigate to **Pengaturan → Migrasi Khanza** for a 4-step guided migration:
1. **Connect** — Input MySQL credentials
2. **Analyze** — Preview data counts per table
3. **Migrate** — Run with progress bar
4. **Verify** — Check row counts & data integrity

### Option B: CLI Tool

```bash
cd tools/migration-khanza && npm install

# Analyze source data
npx tsx src/cli.ts analyze \
  --mysql-host localhost --mysql-user root \
  --mysql-password secret --mysql-database khanza_db

# Run migration
npx tsx src/cli.ts run --create-schema \
  --mysql-host localhost --mysql-user root \
  --mysql-password secret --mysql-database khanza_db \
  --pg-url postgresql://simrs:secret@localhost:5432/simrs_db \
  --tenant rs-migrated
```

---

## 🧪 Testing

```bash
cd apps/server

# Run all tests
pnpm test

# Specific module
pnpm test -- --testPathPattern="auth"
pnpm test -- --testPathPattern="pharmacy"
pnpm test -- --testPathPattern="bpjs"
pnpm test -- --testPathPattern="billing"
```

---

## 📡 API Overview

Base URL: `/api/v1`

| Category | Endpoints | Key Routes |
|:---------|:----------|:-----------|
| **Auth** | 6 | `POST /auth/login`, `/auth/refresh`, `/auth/mfa/*` |
| **Patients** | 5 | `GET/POST /patients`, `GET /patients/:id` |
| **Registration** | 6 | `POST /visits`, `GET /visits/queue`, `/visits/:id/call` |
| **Medical Records** | 8 | `GET/POST /medical-records`, `/icd10/search` |
| **Pharmacy** | 12 | `GET /drugs`, `POST /dispensing`, `/drugs/alerts/*` |
| **Billing** | 6 | `POST /bills/:visitId/generate`, `POST /bills/:id/pay` |
| **Laboratory** | 12 | `POST /lab-orders`, `/lab-orders/:id/results` |
| **Radiology** | 11 | `POST /radiology-orders`, `/radiology-orders/:id/read` |
| **Surgery** | 13 | `GET /surgeries`, `/surgeries/:id/team` |
| **BPJS** | 30+ | `/bpjs/peserta`, `/bpjs/sep`, `/bpjs/antrol/*` |
| **SATUSEHAT** | 13 | `/satusehat/fhir/*`, `/satusehat/sync` |
| **Dashboard** | 7 | `/dashboard/overview`, `/dashboard/export` |
| **HRIS** | 30+ | `/hris/employees`, `/hris/payroll`, `/hris/attendance` |
| **Accounting** | 22 | `/accounting/journals`, `/accounting/neraca` |
| **Backup** | 10 | `/backup/create`, `/backup/download/:id` |

---

## ⚙️ Environment Variables

<details>
<summary>Click to expand full .env configuration</summary>

```env
# ─── Database ─────────────────────────────────
DATABASE_URL=postgresql://simrs:simrs_secret@localhost:5432/simrs_db

# ─── Redis ────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── JWT ──────────────────────────────────────
JWT_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<random-64-char>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ─── Encryption ───────────────────────────────
ENCRYPTION_KEY=<random-64-char>

# ─── MFA ──────────────────────────────────────
MFA_ISSUER=SIMRS SaaS

# ─── Security ─────────────────────────────────
AUDIT_RETENTION_DAYS=1825
MAX_SESSIONS_PER_USER=5
RATE_LIMIT_LOGIN=5
RATE_LIMIT_API=100

# ─── SATUSEHAT (optional) ─────────────────────
SATUSEHAT_CLIENT_ID=
SATUSEHAT_CLIENT_SECRET=
SATUSEHAT_BASE_URL=https://api-satusehat.kemkes.go.id
SATUSEHAT_ORG_ID=

# ─── BPJS (optional) ──────────────────────────
BPJS_CONSUMER_ID=
BPJS_CONSUMER_SECRET=
BPJS_BASE_URL=

# ─── SMTP Email (optional) ────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# ─── TTE Provider (optional) ──────────────────
TTE_PROVIDER=internal
TTE_BSRE_URL=
TTE_BSRE_USERNAME=
TTE_BSRE_PASSWORD=

# ─── Platform ─────────────────────────────────
PLATFORM_DOMAIN=simrs.id
PLATFORM_NAME=SIMRS SaaS
```

</details>

---

## 📊 Stats

| Metric | Count |
|:-------|:------|
| Total modules | 40+ |
| API endpoints | 250+ |
| Database migrations | 30+ |
| Frontend pages | 50+ |
| Custom hooks | 200+ |
| FHIR resources | 13 |
| RBAC roles | 10 |
| Seed data | ICD-10, LOINC, KFA, drugs, demo patients |

---

## 📄 License

Proprietary — All rights reserved.

---

<p align="center">
  Built with ❤️ for Indonesian Hospitals
</p>
