# SIMRS SaaS — Roadmap & Prompt Per Fase

> Dokumen ini berisi langkah persiapan, aturan koding, dan prompt copy-paste untuk setiap fase pengembangan.
> Setiap prompt dirancang agar bisa langsung di-paste ke Cursor AI untuk dikerjakan secara bertahap.

---

## PERSIAPAN SEBELUM MULAI

### Langkah 1: File Konteks Permanen (✅ Sudah Dibuat)
File-file di `.cursor/rules/` sudah dibuat:
- `01-simrs-context.mdc` — Konteks proyek, arsitektur, domain bisnis, stack teknologi
- `02-coding-rules.mdc` — Aturan koding, konvensi, pattern, larangan
- `03-fase-tracker.mdc` — Tracker fase yang bisa di-update seiring progress

### Langkah 2: Install Prerequisites
Sebelum mulai koding, pastikan sudah terinstall:
```
- Node.js 20+ (LTS)
- PostgreSQL 16+
- Redis 7+
- Docker Desktop
- Git
- VS Code / Cursor
- pnpm (package manager, lebih cepat dari npm)
```

### Langkah 3: Alur Kerja Per Fase
1. Copy prompt fase yang akan dikerjakan
2. Paste ke Cursor AI chat
3. Review hasil, test manual
4. Commit ke git dengan pesan yang jelas
5. Lanjut ke prompt berikutnya dalam fase yang sama
6. Selesai 1 fase → review menyeluruh → lanjut fase berikutnya

---

## FASE 0 — SETUP PROYEK & BOILERPLATE
**Durasi**: 1-2 minggu
**Output**: Monorepo siap pakai, database connected, Docker running

### Prompt 0.1 — Inisialisasi Monorepo

```
Buatkan setup monorepo SIMRS SaaS dengan struktur berikut:

1. Gunakan pnpm workspaces + Turborepo
2. Buat 3 workspace:
   - apps/web (Next.js 14 App Router + TypeScript)
   - apps/server (Express.js + TypeScript)
   - packages/shared-types (TypeScript types shared)
   - packages/validators (Zod schemas shared)

3. Setup konfigurasi:
   - tsconfig.base.json di root (strict mode, path aliases)
   - .env.example dengan variabel: DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, SATUSEHAT_CLIENT_ID, SATUSEHAT_CLIENT_SECRET, BPJS_CONSUMER_ID, BPJS_CONSUMER_SECRET, PORT
   - .gitignore (node_modules, .env, dist, .next, coverage)
   - .prettierrc (singleQuote, no semi, printWidth 100)
   - .eslintrc.js (typescript-eslint, react, import)

4. Di apps/web:
   - Next.js 14 dengan App Router
   - Install: tailwindcss, shadcn/ui (init), zustand, @tanstack/react-query, react-hook-form, @hookform/resolvers, zod, dexie, next-pwa
   - Buat layout.tsx dasar dengan Providers (QueryClient, ThemeProvider)
   - Setup tailwind.config.ts

5. Di apps/server:
   - Express.js + TypeScript setup
   - Install: express, cors, helmet, morgan, compression, jsonwebtoken, bcryptjs, knex, pg, redis, bullmq, zod, winston, dotenv, uuid
   - Buat app.ts dengan middleware dasar (cors, helmet, json parser, error handler)
   - Buat src/config/database.ts (Knex config untuk PostgreSQL)
   - Buat src/config/redis.ts (Redis client)
   - Buat src/shared/errors/ dengan AppError, NotFoundError, ValidationError, ConflictError, ForbiddenError, UnauthorizedError
   - Buat src/shared/logger/ dengan Winston logger

6. docker-compose.yml:
   - PostgreSQL 16 (port 5432, volume persisten)
   - Redis 7 (port 6379)
   - Volume untuk data persistence

7. Turbo pipeline: build, dev, lint, test

Ikuti semua konvensi dari .cursor/rules/02-coding-rules.mdc
```

### Prompt 0.2 — Database Schema Awal & Multi-Tenancy

```
Buatkan database migration awal untuk SIMRS SaaS di apps/server/migrations/:

1. Migration: create_public_schema_tables
   Tabel di schema PUBLIC (shared across tenants):
   - tenants: id (UUID PK), name, slug (unique, untuk subdomain), logo_url, address, phone, email, subscription_plan, subscription_expires_at, is_active, settings (JSONB), created_at, updated_at
   - super_admins: id, email, password_hash, name, role ('superadmin'), created_at, updated_at

2. Migration: create_tenant_template_schema
   Buat SQL function create_tenant_schema(tenant_slug TEXT) yang membuat schema baru dengan tabel:

   - users: id (UUID PK), email (unique dalam schema), password_hash, name, role (ENUM: 'admin','dokter','perawat','apoteker','kasir','pendaftaran','rekam_medis','manajemen','lab','radiologi'), is_active, phone, last_login_at, created_at, updated_at, deleted_at
   
   - patients: id, no_rekam_medis (unique, auto-generate), nik (unique, 16 digit), nama, tempat_lahir, tanggal_lahir, jenis_kelamin (ENUM), golongan_darah, alamat, rt, rw, kelurahan, kecamatan, kabupaten, provinsi, kode_pos, no_telepon, email, pekerjaan, pendidikan, status_pernikahan, nama_keluarga, no_telepon_keluarga, hubungan_keluarga, no_bpjs, kelas_bpjs, foto_url, is_active, created_at, updated_at, created_by, updated_by, deleted_at

   - doctors: id, user_id (FK users), spesialisasi, no_sip, no_str, jadwal_praktek (JSONB), tarif_konsultasi, is_available, created_at, updated_at

   - rooms: id, kode, nama, tipe (ENUM: 'poli','igd','rawat_inap','lab','radiologi','farmasi','operasi'), lantai, kapasitas, tarif_per_hari, is_active, created_at, updated_at

   - beds: id, room_id (FK), nomor, status (ENUM: 'tersedia','terisi','maintenance'), current_patient_id, created_at, updated_at

3. Buat seed file untuk:
   - 1 tenant demo: "RS Demo SIMRS" slug "rs-demo"
   - 1 super admin: admin@simrs.id / password: Admin123!
   - 1 admin tenant: admin@rs-demo.simrs.id / password: Demo123!
   - Sample users (1 dokter, 1 perawat, 1 apoteker, 1 kasir, 1 pendaftaran)
   - Sample rooms (3 poli, 1 IGD, 5 kamar rawat inap, 1 lab, 1 farmasi)

4. Buat helper function untuk:
   - Auto-generate no_rekam_medis (format: RM-YYYYMM-XXXXX)
   - Trigger auto-update updated_at

Gunakan Knex.js migrations. Setiap migration HARUS punya up() dan down().
```

### Prompt 0.3 — Script Dev & Docker

```
Lengkapi setup development environment:

1. Update package.json scripts di root:
   - "dev": turbo run dev (jalankan web + server bersamaan)
   - "dev:web": cd apps/web && next dev
   - "dev:server": cd apps/server && tsx watch src/app.ts
   - "build": turbo run build
   - "db:migrate": knex migrate:latest
   - "db:rollback": knex migrate:rollback
   - "db:seed": knex seed:run
   - "db:reset": rollback all + migrate + seed
   - "docker:up": docker-compose up -d
   - "docker:down": docker-compose down
   - "lint": turbo run lint
   - "test": turbo run test
   - "setup": docker:up + db:migrate + db:seed (first-time setup)

2. Buat apps/server/knexfile.ts yang baca dari .env

3. Buat script tools/setup.sh (atau .ps1 untuk Windows):
   - Check prerequisites (node, pnpm, docker)
   - Copy .env.example to .env
   - pnpm install
   - docker-compose up -d
   - Wait for PostgreSQL ready
   - Run migrations + seeds
   - Print "Setup complete! Run: pnpm dev"

4. Update README sederhana di root yang menjelaskan cara setup dan run

Pastikan semuanya bisa dijalankan di Windows (PowerShell) dan Linux/Mac.
```

---

## FASE 1 — AUTHENTICATION & RBAC
**Durasi**: 3-4 minggu
**Output**: Sistem login, JWT, refresh token, RBAC, tenant identification

### Prompt 1.1 — Auth Backend (JWT + Refresh Token)

```
Implementasikan sistem autentikasi di apps/server/src/modules/auth/:

1. auth.validator.ts — Zod schemas:
   - loginSchema: { email: string (email format), password: string (min 8) }
   - refreshSchema: { refreshToken: string }
   - changePasswordSchema: { oldPassword, newPassword, confirmPassword }

2. auth.service.ts — AuthService class:
   - login(email, password, tenantSlug):
     * Cari tenant by slug → dapatkan schema
     * Cari user di schema tenant
     * Verify password dengan bcrypt
     * Generate access token (JWT, expire 15 menit) dengan payload: { userId, tenantId, role }
     * Generate refresh token (JWT, expire 7 hari) simpan di Redis
     * Update last_login_at
     * Return { accessToken, refreshToken, user: { id, name, email, role } }
   - refresh(refreshToken):
     * Verify refresh token
     * Check ada di Redis (bisa di-revoke)
     * Generate access token baru
     * Return { accessToken }
   - logout(userId, tenantId):
     * Hapus refresh token dari Redis
   - changePassword(userId, tenantId, oldPassword, newPassword)

3. auth.controller.ts — handle HTTP:
   - POST /api/auth/login
   - POST /api/auth/refresh
   - POST /api/auth/logout (protected)
   - PUT /api/auth/change-password (protected)

4. auth.routes.ts — Express router

5. Middleware buat di src/middleware/:
   - authenticate.ts: Verify JWT dari header Authorization: Bearer <token>
     * Decode token, attach req.userId, req.tenantId, req.role
     * Return 401 jika token invalid/expired
   - authorize.ts: Factory function authorize(...roles: Role[])
     * Check req.role ada di allowed roles
     * Return 403 jika tidak
   - tenant.ts: Extract tenant dari subdomain atau header X-Tenant-Slug
     * Verify tenant exists dan active
     * Attach req.tenantId dan req.tenantSchema

6. Buat auth.test.ts — test login, refresh, logout, invalid credentials, expired token

Password hashing: bcrypt salt rounds 12.
Token: gunakan jsonwebtoken library.
Semua error pakai custom error classes.
```

### Prompt 1.2 — Auth Frontend (Login Page + Token Management)

```
Implementasikan halaman login dan manajemen token di apps/web/:

1. app/(auth)/login/page.tsx:
   - Form login dengan email dan password
   - Gunakan react-hook-form + zod validation (share schema dari @simrs/validators)
   - Tampilkan error message jika login gagal
   - Redirect ke dashboard setelah login sukses
   - Design: centered card, logo SIMRS di atas, shadcn/ui components
   - Responsive (mobile-friendly)

2. lib/api/auth.ts — API client functions:
   - login(email, password): POST /api/auth/login
   - refresh(): POST /api/auth/refresh
   - logout(): POST /api/auth/logout

3. lib/api/client.ts — Axios/fetch wrapper:
   - Base URL dari env
   - Auto-attach Authorization header
   - Interceptor: jika response 401, coba refresh token, retry request
   - Jika refresh juga gagal, redirect ke login
   - Attach X-Tenant-Slug header

4. stores/auth-store.ts — Zustand store:
   - State: user, accessToken, refreshToken, isAuthenticated, isLoading
   - Actions: setAuth, clearAuth, refreshToken
   - Persist ke localStorage (hanya token, bukan password)

5. middleware.ts (Next.js middleware):
   - Protected routes: /dashboard/*, /pasien/*, dll
   - Redirect ke /login jika tidak ada token
   - Redirect ke /dashboard jika sudah login dan akses /login

6. components/layouts/auth-layout.tsx — Layout untuk halaman auth
7. components/layouts/dashboard-layout.tsx — Layout skeleton (sidebar, header, content area)
   - Sidebar dengan menu items berdasarkan role user
   - Header dengan user info, logout button
   - Content area

Gunakan shadcn/ui components: Button, Input, Card, Label, Form.
```

### Prompt 1.3 — RBAC & Menu Dinamis

```
Implementasikan Role-Based Access Control lengkap:

1. Di packages/shared-types/, buat type definitions:
   - Role enum: 'admin', 'dokter', 'perawat', 'apoteker', 'kasir', 'pendaftaran', 'rekam_medis', 'manajemen', 'lab', 'radiologi'
   - Permission type: string literal union
   - RolePermissions: mapping role → permissions[]
   - MenuItem type: { label, href, icon, roles: Role[], children?: MenuItem[] }

2. Di packages/constants/, buat:
   - ROLE_PERMISSIONS: Object yang map setiap role ke array of permissions
     * admin: semua akses
     * dokter: lihat pasien, input rekam medis, lihat farmasi, lihat dashboard
     * perawat: lihat pasien, input asesmen, lihat rekam medis
     * apoteker: kelola farmasi, lihat resep, lihat stok
     * kasir: kelola billing, terima pembayaran, lihat tagihan
     * pendaftaran: daftar pasien, kelola antrian, lihat jadwal dokter
     * rekam_medis: kelola berkas rekam medis, lihat riwayat pasien
     * manajemen: lihat dashboard, lihat laporan, lihat statistik
     * lab: input hasil lab, lihat order lab
     * radiologi: input hasil radiologi, lihat order radiologi

   - MENU_ITEMS: Array menu sidebar dengan role-based visibility:
     * Dashboard (semua role)
     * Pendaftaran (pendaftaran, admin)
     * Pasien (dokter, perawat, pendaftaran, rekam_medis, admin)
     * Rekam Medis (dokter, perawat, rekam_medis, admin)
     * Farmasi (apoteker, admin)
     * Kasir (kasir, admin)
     * Laboratorium (lab, admin)
     * Radiologi (radiologi, admin)
     * Laporan (manajemen, admin)
     * Pengaturan (admin)

3. Di apps/web/, buat:
   - hooks/use-permissions.ts: hook yang return { hasPermission, hasRole, menuItems }
   - components/layouts/sidebar.tsx: Render menu berdasarkan role user
   - components/ui/permission-gate.tsx: Komponen wrapper yang hide children jika user tidak punya permission

4. Di apps/server/, buat middleware:
   - checkPermission(permission: string): Middleware factory yang cek apakah role user punya permission tertentu
   - Gunakan di routes: router.get('/patients', authenticate, checkPermission('patient:read'), controller.list)

Test: login sebagai role berbeda, pastikan menu dan akses API sesuai.
```

---

## FASE 2 — MODUL PASIEN & PENDAFTARAN
**Durasi**: 3-4 minggu
**Output**: CRUD pasien, deteksi duplikasi, pendaftaran rawat jalan/IGD, antrian

### Prompt 2.1 — Backend Modul Pasien

```
Implementasikan modul pasien di apps/server/src/modules/patient/:

1. patient.validator.ts — Zod schemas:
   - createPatientSchema: validasi semua field pasien
     * nik: string 16 digit angka, wajib
     * nama: string min 2 max 100, wajib
     * tempat_lahir: string, wajib
     * tanggal_lahir: date (tidak boleh di masa depan), wajib
     * jenis_kelamin: enum ('L', 'P'), wajib
     * alamat: string, wajib
     * no_telepon: string format Indonesia (08xx / +62xx)
     * no_bpjs: string 13 digit (optional)
     * dll sesuai schema database
   - updatePatientSchema: partial dari create (semua optional)
   - searchPatientSchema: { search?: string, page?: number, limit?: number }
   - duplicateCheckSchema: { nik: string }

2. patient.service.ts — PatientService:
   - create(data, tenantId):
     * Cek duplikasi by NIK
     * Auto-generate no_rekam_medis (format: RM-YYYYMM-XXXXX, sequential)
     * Insert ke database
     * Return patient data
   - findById(id, tenantId)
   - findByNik(nik, tenantId)
   - findByNoRM(noRM, tenantId)
   - search(filters, tenantId):
     * Cari by nama, nik, no_rekam_medis, no_bpjs
     * ILIKE search untuk nama
     * Paginated results
   - update(id, data, tenantId)
   - softDelete(id, tenantId) — set deleted_at
   - checkDuplicate(nik, tenantId):
     * Return existing patient jika NIK sudah ada
     * Return null jika belum ada
   - getHistory(id, tenantId):
     * Return riwayat kunjungan pasien (join visits)
   - merge(primaryId, duplicateId, tenantId):
     * Gabung 2 data pasien duplikat (pindahkan semua relasi ke primary)

3. patient.controller.ts — HTTP handlers:
   - GET /api/patients — list/search (paginated)
   - GET /api/patients/:id — detail + riwayat
   - POST /api/patients — create baru
   - PUT /api/patients/:id — update
   - DELETE /api/patients/:id — soft delete
   - POST /api/patients/duplicate-check — cek duplikasi by NIK
   - POST /api/patients/merge — gabung data duplikat (admin only)

4. patient.routes.ts — dengan middleware auth + permission check

5. patient.test.ts — test CRUD, duplikasi, search, pagination

Auto-generate no_rekam_medis: query MAX dari tabel, increment. Handle race condition dengan database lock atau unique constraint + retry.
```

### Prompt 2.2 — Frontend Modul Pasien

```
Implementasikan UI modul pasien di apps/web/:

1. app/(dashboard)/pasien/page.tsx — Halaman daftar pasien:
   - Search bar (cari by nama, NIK, no RM)
   - Tabel data pasien: No RM, Nama, NIK, Tanggal Lahir, Jenis Kelamin, No BPJS, Aksi
   - Pagination controls
   - Tombol "Tambah Pasien Baru"
   - Gunakan shadcn/ui DataTable
   - TanStack Query untuk data fetching

2. app/(dashboard)/pasien/baru/page.tsx — Form tambah pasien baru:
   - Multi-step form (3 step):
     * Step 1: Data Identitas (NIK, nama, tempat/tanggal lahir, jenis kelamin, golongan darah)
     * Step 2: Data Kontak & Alamat (alamat, RT/RW, kelurahan, kecamatan, kabupaten, provinsi, kode pos, telepon, email)
     * Step 3: Data Tambahan (pekerjaan, pendidikan, status pernikahan, keluarga, BPJS)
   - Auto-check duplikasi saat NIK diinput (debounce 500ms)
     * Jika ada duplikat: tampilkan warning + link ke data existing
   - Validasi real-time per field
   - Tombol "Simpan" di step terakhir
   - react-hook-form + zod (share schema dari @simrs/validators)
   - shadcn/ui: Form, Input, Select, DatePicker, Button, Stepper, Alert

3. app/(dashboard)/pasien/[id]/page.tsx — Detail pasien:
   - Tab: Profil | Riwayat Kunjungan | Rekam Medis | Billing
   - Profil: tampilkan semua data pasien, tombol edit
   - Riwayat: tabel kunjungan (tanggal, poli/ruangan, dokter, diagnosis, status)
   - Tab lain: placeholder dulu ("Akan tersedia di fase selanjutnya")

4. app/(dashboard)/pasien/[id]/edit/page.tsx — Form edit pasien

5. components/forms/patient-search.tsx — Komponen search reusable:
   - Input search dengan debounce
   - Dropdown hasil (nama, NIK, no RM) — autocomplete style
   - onClick select → navigasi ke detail atau return data pasien

6. hooks/use-patients.ts — TanStack Query hooks:
   - usePatients(filters) — list/search
   - usePatient(id) — detail
   - useCreatePatient() — mutation create
   - useUpdatePatient() — mutation update
   - useDuplicateCheck(nik) — cek duplikasi

7. lib/api/patients.ts — API client functions

Semua form harus responsive (mobile-friendly).
Gunakan loading skeleton saat data sedang dimuat.
Toast notification untuk success/error.
```

### Prompt 2.3 — Backend Modul Pendaftaran & Antrian

```
Implementasikan modul pendaftaran kunjungan di apps/server/src/modules/registration/:

1. Tambah migration untuk tabel:
   - visits: id, patient_id (FK), visit_number (auto-generate: KJ-YYYYMMDD-XXXXX), tipe (ENUM: 'rawat_jalan','igd','rawat_inap'), tanggal, room_id (FK), doctor_id (FK), bed_id (FK, nullable), status (ENUM: 'menunggu','diperiksa','selesai','batal','rawat_inap','pulang'), keluhan_utama, cara_masuk (ENUM: 'datang_sendiri','rujukan','kontrol'), no_rujukan, penjamin (ENUM: 'umum','bpjs','asuransi','perusahaan'), no_sep, catatan, created_at, updated_at, created_by, deleted_at

   - queues: id, visit_id (FK), room_id (FK), nomor_antrian (auto per hari per poli), status (ENUM: 'menunggu','dipanggil','dilayani','selesai','batal'), called_at, served_at, finished_at, created_at

2. registration.validator.ts — schemas:
   - createVisitSchema: patient_id, tipe, room_id, doctor_id, keluhan_utama, cara_masuk, penjamin, no_bpjs (wajib jika penjamin=bpjs), no_rujukan
   - Validasi bisnis:
     * Cek pasien tidak sedang rawat inap aktif
     * Cek pasien tidak sudah terdaftar di poli/dokter/tanggal yang sama
     * Cek dokter available (is_available = true)

3. registration.service.ts:
   - createVisit(data, tenantId):
     * Jalankan semua validasi bisnis
     * Auto-generate visit_number
     * Buat record visit
     * Auto-buat antrian (nomor sequential per poli per hari)
     * Return visit + queue data
   - getQueue(roomId, date, tenantId):
     * Return daftar antrian hari ini untuk poli tertentu, sorted by nomor
   - callNext(roomId, tenantId):
     * Update antrian: status 'menunggu' terkecil → 'dipanggil'
     * Return nomor antrian yang dipanggil
   - updateVisitStatus(visitId, status, tenantId)
   - getDailyStats(date, tenantId):
     * Jumlah kunjungan per poli, per penjamin, per status
   - cancelVisit(visitId, reason, tenantId)

4. registration.controller.ts:
   - POST /api/visits — daftar kunjungan baru
   - GET /api/visits — list kunjungan (filter by tanggal, status, tipe, room, doctor)
   - GET /api/visits/:id — detail kunjungan
   - PUT /api/visits/:id/status — update status
   - DELETE /api/visits/:id — batalkan kunjungan
   - GET /api/queues/:roomId — antrian per poli hari ini
   - POST /api/queues/:roomId/call-next — panggil antrian berikutnya
   - GET /api/visits/stats/daily — statistik harian

5. registration.routes.ts + registration.test.ts

Aturan bisnis dari Khanza yang WAJIB diimplementasi:
- Blokir pendaftaran jika pasien masih rawat inap aktif
- Blokir duplikasi pendaftaran (poli + dokter + tanggal sama)
- Cek ketersediaan dokter
- Auto-generate nomor antrian reset per hari per poli
```

### Prompt 2.4 — Frontend Modul Pendaftaran & Antrian

```
Implementasikan UI pendaftaran dan antrian di apps/web/:

1. app/(dashboard)/pendaftaran/page.tsx — Halaman utama pendaftaran:
   - Split layout: Kiri = form pendaftaran, Kanan = antrian hari ini
   - Atau tab layout jika di mobile

2. Form pendaftaran (components/forms/registration-form.tsx):
   - Step 1: Cari/pilih pasien
     * Komponen PatientSearch (autocomplete by nama/NIK/noRM)
     * Jika pasien baru → link ke form tambah pasien
     * Tampilkan ringkasan data pasien yang dipilih
   - Step 2: Detail kunjungan
     * Tipe: Rawat Jalan / IGD (radio button)
     * Poli / Ruangan: dropdown (hanya poli yang buka hari ini)
     * Dokter: dropdown (filter by poli, hanya yang available)
     * Keluhan utama: textarea
     * Cara masuk: datang sendiri / rujukan / kontrol
     * No rujukan: input (jika cara masuk = rujukan)
   - Step 3: Penjamin
     * Penjamin: Umum / BPJS / Asuransi / Perusahaan
     * Jika BPJS: tampilkan no_bpjs pasien, field no_sep (bisa diisi nanti)
   - Submit → tampilkan nomor antrian di dialog/modal

3. app/(dashboard)/pendaftaran/antrian/page.tsx — Display antrian:
   - Dropdown pilih poli
   - List antrian hari ini: nomor, nama pasien, status (menunggu/dipanggil/dilayani/selesai)
   - Warna badge per status
   - Tombol "Panggil Berikutnya" (untuk petugas poli)
   - Auto-refresh setiap 10 detik (TanStack Query refetchInterval)

4. hooks/use-registration.ts — TanStack Query hooks
5. hooks/use-queues.ts — TanStack Query hooks
6. lib/api/registration.ts — API client
7. lib/api/queues.ts — API client

8. Tampilan nomor antrian setelah daftar:
   - Modal besar dengan nomor antrian
   - Nama pasien, poli, dokter
   - Estimasi waktu tunggu (hitungan sederhana: nomor × 10 menit)
   - Tombol print (window.print() CSS)

Komponen shadcn/ui: Card, Select, RadioGroup, Textarea, Badge, Dialog, Skeleton.
```

---

## FASE 3 — REKAM MEDIS & POLIKLINIK
**Durasi**: 3-4 minggu
**Output**: Input SOAP, diagnosis ICD-10, tindakan, resep, template smart input

### Prompt 3.1 — Backend Rekam Medis

```
Implementasikan modul rekam medis di apps/server/src/modules/medical-record/:

1. Migration untuk tabel baru:
   - medical_records: id, visit_id (FK, unique), patient_id (FK), doctor_id (FK),
     subjective (TEXT), objective (TEXT), assessment (TEXT), plan (TEXT),
     vital_signs (JSONB: { tekanan_darah_sistolik, tekanan_darah_diastolik, nadi, suhu, respirasi, spo2, tinggi_badan, berat_badan, bmi }),
     alergi (JSONB array), riwayat_penyakit (TEXT), catatan_tambahan (TEXT),
     status (ENUM: 'draft','final'), created_at, updated_at, created_by, updated_by

   - diagnoses: id, medical_record_id (FK), icd10_code, icd10_name, tipe (ENUM: 'utama','sekunder'), catatan, created_at

   - procedures: id, medical_record_id (FK), kode_tindakan, nama_tindakan, catatan, tarif, qty, total, created_at

   - prescriptions: id, medical_record_id (FK), visit_id (FK), status (ENUM: 'draft','dikirim','diproses','selesai','batal'), catatan_dokter, created_at, updated_at
   
   - prescription_items: id, prescription_id (FK), drug_id (FK), nama_obat, dosis, satuan, frekuensi, durasi_hari, jumlah, aturan_pakai (TEXT), catatan, created_at

   - icd10_codes: id, code (unique), name_en, name_id, category, is_active
     (Seed dengan data ICD-10 — minimal top 500 kode yang umum di RS Indonesia)

   - medical_templates: id, name, category (ENUM: 'soap','subjective','objective','assessment','plan'), content (JSONB), doctor_id (nullable, null = template global), is_active, created_at

2. medical-record.service.ts:
   - create(visitId, data, doctorId, tenantId):
     * Validasi visit ada dan status 'diperiksa'
     * Buat medical record
     * Insert diagnoses (batch)
     * Insert procedures (batch)
     * Jika ada resep: buat prescription + items
     * Update visit status ke 'diperiksa' jika belum
   - update(id, data, doctorId, tenantId):
     * Hanya bisa update jika status 'draft'
     * Update medical record + related data
   - finalize(id, doctorId, tenantId):
     * Set status 'final' — setelah ini TIDAK bisa diedit (audit trail)
   - getByVisit(visitId, tenantId)
   - getPatientHistory(patientId, tenantId):
     * Return semua rekam medis pasien, sorted by tanggal desc
   - searchICD10(query, limit):
     * Search di tabel icd10_codes by code atau name (ILIKE)

3. medical-record.controller.ts:
   - POST /api/medical-records/:visitId — create/update rekam medis
   - GET /api/medical-records/:visitId — get by visit
   - PUT /api/medical-records/:id/finalize — finalisasi
   - GET /api/patients/:patientId/medical-records — riwayat medis pasien
   - GET /api/icd10/search?q=xxx — search ICD-10 codes
   - GET /api/medical-templates — list templates
   - POST /api/medical-templates — buat template baru

4. Seed data ICD-10:
   - Import top 500 kode ICD-10 yang umum di RS Indonesia
   - Kategori: penyakit dalam, bedah, anak, obstetri, mata, THT, dll

5. medical-record.test.ts
```

### Prompt 3.2 — Frontend Rekam Medis (Halaman Periksa Pasien)

```
Implementasikan UI rekam medis di apps/web/:

1. app/(dashboard)/rekam-medis/page.tsx — Daftar pasien untuk diperiksa:
   - Tampilkan antrian hari ini yang status 'dipanggil' atau 'diperiksa'
   - Card per pasien: nama, no RM, keluhan, poli, nomor antrian
   - Klik card → masuk ke halaman periksa

2. app/(dashboard)/rekam-medis/[visitId]/page.tsx — Halaman periksa:
   Layout split (responsive):
   - Sidebar kiri (30%): Info pasien (nama, umur, no RM, alergi, riwayat singkat)
   - Content utama (70%): Form rekam medis

   Form rekam medis (tabs atau scroll sections):
   
   a. VITAL SIGNS section:
      - Grid input: tekanan darah (sistolik/diastolik), nadi, suhu, respirasi, SpO2, TB, BB
      - Auto-hitung BMI dari TB dan BB
      - Warning jika nilai di luar range normal (highlight merah)
   
   b. SOAP section:
      - Subjective: textarea dengan auto-save (debounce 2 detik)
        * Tombol "Pakai Template" → pilih dari medical_templates
      - Objective: textarea dengan auto-save
      - Assessment: textarea dengan auto-save
      - Plan: textarea dengan auto-save
   
   c. DIAGNOSIS section:
      - Input search ICD-10 (autocomplete, debounce 300ms)
        * Tampilkan kode + nama Indonesia/English
      - Bisa tambah multiple diagnosa
      - Tandai diagnosa utama vs sekunder
      - Tombol hapus per diagnosa
   
   d. TINDAKAN section:
      - Input cari tindakan (dari masterdata)
      - Nama tindakan, qty, tarif, total
      - Bisa tambah multiple
   
   e. RESEP section:
      - Input cari obat (autocomplete dari stok farmasi)
      - Per item: nama obat, dosis, frekuensi (dropdown: 1x1, 2x1, 3x1, dll), durasi (hari), aturan pakai
      - Auto-hitung jumlah: frekuensi × durasi
      - Alert jika stok tidak cukup (cek ke API farmasi)
      - Catatan dokter untuk apoteker
   
   f. Footer:
      - Tombol "Simpan Draft" (save tanpa finalisasi)
      - Tombol "Selesai Periksa" (finalisasi + kirim resep ke farmasi + update status visit)
      - Auto-save indicator ("Tersimpan otomatis 5 detik lalu")

3. components/forms/soap-form.tsx — Reusable SOAP form component
4. components/forms/diagnosis-picker.tsx — ICD-10 autocomplete
5. components/forms/prescription-form.tsx — Form resep

6. hooks/use-medical-record.ts — TanStack Query hooks
7. lib/api/medical-records.ts — API client

Auto-save: setiap perubahan field, debounce 2 detik, PUT ke backend status 'draft'.
Saat "Selesai Periksa": konfirmasi dialog → finalize → redirect ke daftar antrian.
```

---

## FASE 4 — FARMASI & KASIR/BILLING
**Durasi**: 4-5 minggu
**Output**: Manajemen stok real-time, dispensing obat, billing, pembayaran

### Prompt 4.1 — Backend Modul Farmasi

```
Implementasikan modul farmasi di apps/server/src/modules/pharmacy/:

1. Migration tabel baru:
   - drugs: id, kode (unique), nama, nama_generik, kategori (ENUM: 'obat','alkes','bmhp','nutrisi'), satuan_kecil, satuan_besar, konversi (1 besar = X kecil), harga_beli, harga_jual, margin_persen, stok_minimum, is_active, created_at, updated_at

   - drug_stocks: id, drug_id (FK), batch_number, tanggal_kadaluarsa, stok_awal, stok_sisa, harga_beli_per_unit, supplier, tanggal_masuk, created_at, updated_at

   - drug_transactions: id, drug_id (FK), drug_stock_id (FK), tipe (ENUM: 'masuk','keluar','retur','penyesuaian','expired'), jumlah, stok_sebelum, stok_sesudah, referensi_id (visit_id/purchase_order_id), referensi_tipe, catatan, created_at, created_by

   - dispensing: id, prescription_id (FK), visit_id (FK), status (ENUM: 'menunggu','diproses','selesai','sebagian'), catatan_apoteker, dispensed_by (FK users), dispensed_at, created_at, updated_at

   - dispensing_items: id, dispensing_id (FK), prescription_item_id (FK), drug_id (FK), drug_stock_id (FK), jumlah_diminta, jumlah_diberikan, catatan, created_at

2. pharmacy.service.ts:
   - getDrugList(filters, tenantId): list obat with current total stok
   - getDrugDetail(id, tenantId): detail obat + stok per batch
   - searchDrug(query, tenantId): cari obat by nama/kode
   - addStock(drugId, data, tenantId): tambah stok (masuk dari supplier)
     * Buat drug_stock record
     * Buat drug_transaction record (tipe: 'masuk')
   - dispense(prescriptionId, items, tenantId):
     * Validasi stok cukup per item
     * FIFO: ambil dari batch terlama yang belum expired
     * Kurangi stok
     * Buat drug_transaction per item (tipe: 'keluar')
     * Update dispensing status
     * Return dispensing record
   - getExpiringDrugs(days, tenantId):
     * Return obat yang akan expired dalam X hari
   - getLowStockDrugs(tenantId):
     * Return obat yang stok di bawah stok_minimum
   - adjustStock(drugId, batchId, adjustment, reason, tenantId):
     * Penyesuaian stok manual (stock opname)
   - getStockHistory(drugId, tenantId):
     * Return semua transaksi stok obat

3. pharmacy.controller.ts:
   - GET /api/drugs — list obat + stok
   - GET /api/drugs/:id — detail + stok per batch
   - GET /api/drugs/search?q=xxx — cari obat
   - POST /api/drugs — tambah obat baru
   - PUT /api/drugs/:id — update data obat
   - POST /api/drugs/:id/stock — tambah stok
   - POST /api/drugs/:id/adjust — penyesuaian stok
   - GET /api/drugs/alerts/expiring — obat mau expired
   - GET /api/drugs/alerts/low-stock — obat stok rendah
   - GET /api/dispensing/pending — resep menunggu
   - POST /api/dispensing/:prescriptionId — proses dispensing
   - GET /api/dispensing/:id — detail dispensing

4. FIFO logic: Query drug_stocks WHERE stok_sisa > 0 AND tanggal_kadaluarsa > NOW() ORDER BY tanggal_kadaluarsa ASC. Ambil stok dari batch terlama dulu.

5. pharmacy.test.ts — test FIFO, stok kurang, expired, alerts
```

### Prompt 4.2 — Frontend Modul Farmasi

```
Implementasikan UI farmasi di apps/web/:

1. app/(dashboard)/farmasi/page.tsx — Dashboard farmasi:
   - Tab: Resep Masuk | Stok Obat | Alerts
   - Resep Masuk: daftar resep dari dokter yang menunggu diproses
     * Card per resep: nama pasien, dokter, poli, waktu masuk, jumlah item
     * Badge status: menunggu (kuning), diproses (biru), selesai (hijau)
     * Klik → halaman proses dispensing

2. app/(dashboard)/farmasi/dispensing/[prescriptionId]/page.tsx — Proses resep:
   - Info pasien & dokter di atas
   - Tabel items resep:
     * Nama obat, dosis, frekuensi, durasi, jumlah diminta
     * Stok tersedia (real-time check)
     * Jumlah diberikan (editable, default = jumlah diminta)
     * Warning jika stok kurang (highlight merah)
     * Catatan per item
   - Catatan apoteker (textarea)
   - Tombol "Selesai" → proses dispensing → update stok → cetak etiket

3. app/(dashboard)/farmasi/stok/page.tsx — Manajemen stok:
   - Tabel obat: kode, nama, kategori, stok total, satuan, harga jual
   - Search & filter (by kategori, by status stok)
   - Klik row → detail stok per batch
   - Tombol "Tambah Stok" → form: pilih obat, batch number, jumlah, harga beli, tanggal kadaluarsa, supplier
   - Tombol "Tambah Obat Baru" → form CRUD obat

4. app/(dashboard)/farmasi/alerts/page.tsx — Alerts:
   - Section "Obat Hampir Expired" (dalam 90 hari): tabel obat, batch, sisa stok, tanggal kadaluarsa
   - Section "Stok Rendah" (di bawah minimum): tabel obat, stok sisa, stok minimum

5. hooks/use-pharmacy.ts — TanStack Query hooks
6. lib/api/pharmacy.ts — API client

Warna badge stok:
- Hijau: stok > 2x minimum
- Kuning: stok antara 1x-2x minimum
- Merah: stok < minimum atau ada batch expired
```

### Prompt 4.3 — Backend Modul Billing & Kasir

```
Implementasikan modul billing di apps/server/src/modules/billing/:

1. Migration tabel:
   - bills: id, visit_id (FK, unique), patient_id (FK), total_amount, discount_amount, final_amount, penjamin (ENUM), status (ENUM: 'draft','final','dibayar','batal'), catatan, created_at, updated_at, created_by

   - bill_items: id, bill_id (FK), kategori (ENUM: 'konsultasi','tindakan','obat','kamar','lab','radiologi','admin'), deskripsi, qty, harga_satuan, subtotal, discount, total, referensi_id, referensi_tipe, created_at

   - payments: id, bill_id (FK), metode (ENUM: 'tunai','debit','kredit','transfer','bpjs','asuransi'), jumlah, referensi_pembayaran, catatan, received_by (FK users), paid_at, created_at

   - deposits: id, patient_id (FK), visit_id (FK), jumlah, status (ENUM: 'aktif','digunakan','dikembalikan'), catatan, created_at, updated_at

2. billing.service.ts:
   - generateBill(visitId, tenantId):
     * Collect semua biaya dari visit:
       - Konsultasi dokter (dari tarif dokter)
       - Tindakan (dari procedures di medical_record)
       - Obat (dari dispensing items, harga jual)
       - Kamar (jika rawat inap: tarif × hari)
       - Lab, Radiologi (future: dari order)
     * Buat bill + bill_items
     * Hitung total
     * Return bill
   - getBill(visitId, tenantId)
   - applyDiscount(billId, discountAmount, reason, tenantId)
   - finalizeBill(billId, tenantId): lock bill, tidak bisa diubah lagi
   - processPayment(billId, paymentData, tenantId):
     * Validasi jumlah payment ≥ final_amount (atau partial)
     * Buat payment record
     * Update bill status ke 'dibayar'
     * Return payment + kembalian
   - getDailySummary(date, tenantId):
     * Total pendapatan hari ini per metode pembayaran
     * Jumlah kunjungan yang sudah bayar vs belum
   - getOutstandingBills(tenantId):
     * Bills yang belum dibayar

3. billing.controller.ts:
   - POST /api/bills/:visitId/generate — generate bill dari visit
   - GET /api/bills/:visitId — get bill
   - PUT /api/bills/:id/discount — apply discount
   - PUT /api/bills/:id/finalize — finalize bill
   - POST /api/bills/:id/pay — proses pembayaran
   - GET /api/bills/outstanding — tagihan belum bayar
   - GET /api/bills/summary/daily?date=xxx — ringkasan harian

4. billing.test.ts — test generate bill, pembayaran, ringkasan
```

### Prompt 4.4 — Frontend Modul Kasir/Billing

```
Implementasikan UI kasir di apps/web/:

1. app/(dashboard)/kasir/page.tsx — Dashboard kasir:
   - Tab: Tagihan Aktif | Riwayat Pembayaran | Ringkasan Hari Ini
   
   Tagihan Aktif:
   - Tabel: No Visit, Nama Pasien, Poli, Total Tagihan, Penjamin, Status
   - Filter: status (draft/final), penjamin, tanggal
   - Klik row → halaman detail billing

2. app/(dashboard)/kasir/[visitId]/page.tsx — Detail billing:
   - Info pasien & kunjungan di atas
   - Tabel rincian biaya:
     * Kategori, Deskripsi, Qty, Harga Satuan, Subtotal
     * Grouped by kategori (konsultasi, tindakan, obat, dll)
   - Summary box:
     * Total: Rp xxx.xxx
     * Diskon: Rp xxx.xxx (editable jika belum final)
     * Grand Total: Rp xxx.xxx
   - Jika penjamin BPJS: tampilkan estimasi klaim INA-CBG (placeholder)
   - Action buttons:
     * "Finalisasi Tagihan" → lock bill
     * "Proses Pembayaran" → modal pembayaran

3. Modal Pembayaran (components/forms/payment-modal.tsx):
   - Jumlah yang harus dibayar
   - Metode pembayaran: Tunai / Debit / Kredit / Transfer
   - Jika tunai: input jumlah dibayar, auto-hitung kembalian
   - No referensi (untuk debit/kredit/transfer)
   - Tombol "Bayar" → proses → tampilkan struk

4. Struk pembayaran (components/print/receipt.tsx):
   - Desain struk thermal (width 80mm)
   - Logo RS, nama RS, alamat
   - Data pasien, tanggal
   - Rincian biaya
   - Total, diskon, grand total
   - Metode pembayaran, jumlah bayar, kembalian
   - Tombol print (window.print() dengan CSS @media print)

5. Ringkasan Harian (di tab Ringkasan):
   - Card: total pendapatan hari ini
   - Chart sederhana: pembayaran per metode (pie chart, shadcn/ui + recharts)
   - Tabel: daftar pembayaran hari ini

6. hooks/use-billing.ts, lib/api/billing.ts
```

---

## FASE 5 — OFFLINE MODE & SINKRONISASI
**Durasi**: 3-4 minggu
**Output**: Aplikasi bisa dipakai tanpa internet, auto-sync saat online

### Prompt 5.1 — Dexie.js Database & Service Worker

```
Implementasikan offline mode lengkap di apps/web/:

1. lib/offline/database.ts — Dexie.js database definition:
   - Extend SimrsOfflineDB dengan semua tabel yang diperlukan:
     * patients: id, nik, nama, synced, lastModified, data (JSONB full patient data)
     * visits: id, patientId, visitNumber, date, status, synced, lastModified, data
     * medicalRecords: id, visitId, patientId, synced, lastModified, data
     * prescriptions: id, visitId, synced, lastModified, data
     * drugs: id, kode, nama, stok, synced, lastModified, data
     * queues: id, visitId, roomId, nomor, status, synced, lastModified
     * syncQueue: id, action ('create'|'update'|'delete'), entity, entityId, payload, timestamp, retryCount, lastError
   - Index on: synced, lastModified, nik, patientId, visitId

2. lib/offline/sync-manager.ts — SyncManager class:
   - addToQueue(action, entity, entityId, payload):
     * Tambah ke syncQueue table
   - processQueue():
     * Ambil semua record synced=false, sorted by timestamp
     * Batch kirim ke POST /api/sync/batch
     * Format: { operations: [{ action, entity, entityId, payload, timestamp }] }
     * Handle response: sukses → update synced=true, hapus dari queue
     * Handle conflict: timestamp server > client → simpan conflict, notifikasi admin
     * Handle error: increment retryCount, simpan lastError
   - getConflicts(): return daftar conflict untuk review
   - resolveConflict(id, resolution: 'keep_local'|'keep_server')
   - getSyncStatus(): return { pending, synced, conflicts, lastSyncAt }

3. lib/offline/offline-detector.ts — Hook & utility:
   - useOnlineStatus(): hook yang return isOnline (navigator.onLine + periodic ping)
   - Event listener: online → trigger processQueue()
   - UI indicator: banner "Anda sedang offline" di top page

4. Service Worker (public/sw.js atau next-pwa config):
   - Cache static assets (JS, CSS, images)
   - Cache API responses (GET requests) untuk offline reading
   - Background sync: register sync event untuk pending operations
   - Periodic sync: cek & kirim queue setiap 30 detik saat online

5. lib/offline/offline-wrapper.ts — Higher-order functions:
   - withOfflineSupport(onlineFn, offlineFn):
     * Jika online: jalankan onlineFn (API call)
     * Jika offline: jalankan offlineFn (Dexie.js operation) + addToQueue
   - Contoh penggunaan:
     ```
     const createPatient = withOfflineSupport(
       (data) => patientApi.create(data),           // online
       (data) => offlineDb.patients.add({...data, synced: false}) // offline
     )
     ```

6. Buat apps/server/src/modules/sync/:
   - sync.service.ts:
     * processBatch(operations, tenantId):
       - Loop operations
       - Per operation: apply ke database
       - Detect conflicts (timestamp comparison)
       - Return results: { applied, conflicts, errors }
   - sync.controller.ts:
     * POST /api/sync/batch — terima batch operations
     * GET /api/sync/status — status sinkronisasi tenant

7. Update semua hooks yang sudah ada (usePatients, useCreatePatient, dll):
   - Tambah fallback ke Dexie.js saat offline
   - Auto-cache response API ke Dexie.js saat online

Testing: simulasi offline (DevTools Network: Offline), input data, go online, verifikasi sync.
```

### Prompt 5.2 — UI Offline Indicators & Conflict Resolution

```
Implementasikan UI untuk status offline dan resolusi konflik:

1. components/ui/online-status-banner.tsx:
   - Banner di top halaman saat offline: "Anda sedang offline. Data disimpan secara lokal dan akan disinkronkan saat online."
   - Warna kuning/orange, icon WiFi off
   - Saat online kembali: "Menyinkronkan data..." → "Sinkronisasi selesai ✓" → auto-hide

2. components/ui/sync-status-indicator.tsx:
   - Di sidebar atau header
   - Icon status: ✓ synced (hijau), ↻ syncing (biru, animasi spin), ⚠ pending (kuning, jumlah), ✕ conflict (merah, jumlah)
   - Tooltip/popover detail: X data menunggu sync, Y konflik perlu review

3. app/(dashboard)/admin/sync/page.tsx — Halaman admin sync:
   - Tab: Status | Konflik | Log
   - Status: jumlah data per entity yang belum sync, last sync time, tombol "Sync Sekarang"
   - Konflik: tabel konflik yang perlu diresolusi
     * Per row: entity, deskripsi, data lokal vs data server, waktu
     * Action: "Pakai Data Lokal" / "Pakai Data Server"
   - Log: history sinkronisasi (sukses, gagal, konflik)

4. Update semua form (pasien, pendaftaran, rekam medis, resep):
   - Tambah auto-save indicator: "Tersimpan" / "Menyimpan..." / "Tersimpan offline"
   - Saat submit offline: toast "Data disimpan offline, akan dikirim saat internet tersedia"

5. hooks/use-sync.ts — Hook untuk sync management:
   - useSyncStatus(): return pending count, conflict count, last sync
   - useForceSync(): trigger manual sync
   - useConflicts(): list conflicts
   - useResolveConflict(): mutation resolve

Pastikan UX smooth: user tidak perlu tahu detail teknis sync. Hanya perlu tahu "data aman" atau "ada masalah yang perlu diperhatikan".
```

---

## FASE 6 — INTEGRASI BPJS & SATUSEHAT
**Durasi**: 4-5 minggu
**Output**: Bridging BPJS (SEP, VClaim), integrasi SATUSEHAT (FHIR)

### Prompt 6.1 — Backend Integrasi BPJS

```
Implementasikan modul bridging BPJS di apps/server/src/modules/bpjs/:

1. bpjs.config.ts:
   - BPJS API endpoints (VClaim, PCare, Aplicare)
   - Consumer ID & Secret dari env
   - URL berdasarkan environment (sandbox/production)

2. bpjs.client.ts — BPJS API HTTP Client:
   - generateSignature(consumerId, consumerSecret, timestamp):
     * HMAC-SHA256 signature sesuai spec BPJS
   - buildHeaders(): Consumer-ID, timestamp, signature
   - request(method, url, data): wrapper dengan retry logic
   - decrypt(response): BPJS response didekripsi (LZString + AES)

3. bpjs.service.ts:
   - getPeserta(noBpjs, tenantId):
     * GET /VClaim/rest/Peserta/{noBpjs}
     * Return data peserta: nama, NIK, kelas, status, faskes
   - getPesertaByNik(nik, tenantId):
     * GET /VClaim/rest/Peserta/nik/{nik}
   - createSEP(data, tenantId):
     * POST /VClaim/rest/SEP/2.0/insert
     * Payload: noKartu, tglSep, ppkPelayanan, jnsPelayanan, klsRawat, noMR, rujukan, diagnosa, dll
     * Return noSEP
   - updateSEP(data, tenantId)
   - deleteSEP(noSEP, tenantId)
   - getSEP(noSEP, tenantId)
   - getRujukan(noKartu, tenantId):
     * GET /VClaim/rest/Rujukan/Peserta/{noKartu}
   - getPoliReferensi(tenantId):
     * GET /VClaim/rest/referensi/poli/{keyword}
   - getDiagnosaReferensi(keyword, tenantId):
     * GET /VClaim/rest/referensi/diagnosa/{keyword}
   - checkFingerprint(noKartu, tenantId):
     * Verifikasi biometrik (jika RS punya alat)

4. bpjs.controller.ts:
   - GET /api/bpjs/peserta/:noBpjs — cek data peserta
   - GET /api/bpjs/peserta/nik/:nik — cek by NIK
   - POST /api/bpjs/sep — buat SEP
   - PUT /api/bpjs/sep — update SEP
   - DELETE /api/bpjs/sep/:noSEP — hapus SEP
   - GET /api/bpjs/sep/:noSEP — get SEP
   - GET /api/bpjs/rujukan/:noKartu — cek rujukan
   - GET /api/bpjs/referensi/poli?q=xxx — search poli BPJS
   - GET /api/bpjs/referensi/diagnosa?q=xxx — search diagnosa BPJS

5. bpjs.routes.ts — dengan middleware auth

6. Error handling khusus BPJS:
   - BPJS sering timeout/error → implementasi retry (3x, exponential backoff)
   - Log semua request/response BPJS untuk debugging
   - Jika BPJS down: simpan data lokal, retry via queue (BullMQ)

7. bpjs.test.ts — test dengan mock BPJS API responses

Catatan: Untuk development, buat mock BPJS API yang mengembalikan response format yang sama. Nanti ganti ke URL sandbox BPJS untuk integration test.
```

### Prompt 6.2 — Backend Integrasi SATUSEHAT

```
Implementasikan modul SATUSEHAT di apps/server/src/modules/satusehat/:

1. satusehat.config.ts:
   - SATUSEHAT API base URLs (sandbox/production)
   - Client ID & Secret dari env
   - Organization ID dari env

2. satusehat.client.ts — SATUSEHAT FHIR Client:
   - getAccessToken():
     * POST /oauth2/v1/accesstoken?grant_type=client_credentials
     * Cache token di Redis (expire sesuai response)
   - request(method, resourceType, data):
     * Auto-attach Bearer token
     * Retry jika token expired
     * Log semua request/response

3. satusehat.service.ts:
   - createPatient(patientData, tenantId):
     * Map data pasien lokal → FHIR Patient resource
     * POST /fhir-r4/v1/Patient
     * Simpan satusehat_id di tabel patients
   - createEncounter(visitData, tenantId):
     * Map data kunjungan → FHIR Encounter resource
     * POST /fhir-r4/v1/Encounter
     * Simpan satusehat_encounter_id di tabel visits
   - createCondition(diagnosisData, tenantId):
     * Map diagnosis → FHIR Condition resource (ICD-10 coding)
     * POST /fhir-r4/v1/Condition
   - createObservation(vitalSigns, tenantId):
     * Map vital signs → FHIR Observation resources
     * POST per observation (tekanan darah, nadi, suhu, dll)
   - createMedicationRequest(prescriptionData, tenantId):
     * Map resep → FHIR MedicationRequest
     * POST /fhir-r4/v1/MedicationRequest

4. satusehat.mapper.ts — Mapping functions:
   - mapPatientToFHIR(patient): Map data pasien lokal ke format FHIR Patient
   - mapEncounterToFHIR(visit): Map kunjungan ke FHIR Encounter
   - mapConditionToFHIR(diagnosis): Map diagnosa ke FHIR Condition
   - mapObservationToFHIR(vitalSigns): Map vital signs ke FHIR Observation
   - Setiap mapper harus mengikuti profil SATUSEHAT Indonesia

5. satusehat.worker.ts — Background job (BullMQ):
   - Queue: 'satusehat-sync'
   - Worker: process pending SATUSEHAT submissions
   - Skenario: saat visit selesai → add job ke queue → worker kirim ke SATUSEHAT
   - Retry logic: 3x dengan delay exponential
   - Error: log + notify admin

6. Migration: tambah kolom di tabel existing:
   - patients: satusehat_patient_id (TEXT, nullable)
   - visits: satusehat_encounter_id (TEXT, nullable)
   - diagnoses: satusehat_condition_id (TEXT, nullable)
   - Status tracking: satusehat_sync_status (ENUM: 'pending','sent','failed','not_required')

7. satusehat.controller.ts:
   - POST /api/satusehat/sync/:visitId — trigger manual sync untuk 1 kunjungan
   - GET /api/satusehat/status/:visitId — cek status sync
   - GET /api/satusehat/pending — list kunjungan belum di-sync
   - POST /api/satusehat/retry/:visitId — retry yang gagal

8. satusehat.test.ts — test mapping, test with mock FHIR server
```

### Prompt 6.3 — Frontend Integrasi BPJS & SATUSEHAT

```
Implementasikan UI untuk integrasi BPJS dan SATUSEHAT di apps/web/:

1. Update form pendaftaran (registration-form.tsx):
   - Saat penjamin = BPJS dan no_bpjs diisi:
     * Auto-check peserta BPJS (GET /api/bpjs/peserta/:noBpjs)
     * Tampilkan info peserta: nama, kelas, status aktif/tidak, faskes
     * Warning jika peserta tidak aktif atau kelas tidak sesuai
   - Saat submit pendaftaran BPJS:
     * Auto-cek rujukan (GET /api/bpjs/rujukan/:noKartu)
     * Jika perlu SEP: auto-create SEP setelah pendaftaran berhasil
     * Tampilkan no SEP di modal konfirmasi

2. components/bpjs/bpjs-peserta-info.tsx:
   - Card info peserta BPJS: nama, no kartu, kelas, status, faskes
   - Badge status: Aktif (hijau), Tidak Aktif (merah)
   - Loading skeleton saat fetching

3. components/bpjs/sep-detail.tsx:
   - Detail SEP: no SEP, tanggal, PPK, jenis pelayanan, kelas rawat
   - Tombol: Edit SEP, Hapus SEP (dengan konfirmasi)

4. app/(dashboard)/admin/satusehat/page.tsx — Dashboard SATUSEHAT admin:
   - Stats cards: total dikirim, pending, gagal
   - Tabel kunjungan pending sync:
     * Tanggal, pasien, status sync, error message
     * Tombol "Retry" per row
     * Tombol "Sync Semua Pending"
   - Filter by tanggal, status

5. Update halaman detail kunjungan/rekam medis:
   - Badge status SATUSEHAT: "Terkirim ✓" / "Pending ⏳" / "Gagal ✕"
   - Tooltip error message jika gagal

6. hooks/use-bpjs.ts — hooks untuk BPJS operations
7. hooks/use-satusehat.ts — hooks untuk SATUSEHAT monitoring
8. lib/api/bpjs.ts, lib/api/satusehat.ts — API clients
```

---

## FASE 7 — DASHBOARD & LAPORAN
**Durasi**: 2-3 minggu
**Output**: Dashboard real-time, laporan operasional, export

### Prompt 7.1 — Backend Dashboard & Laporan

```
Implementasikan modul dashboard & laporan di apps/server/src/modules/dashboard/:

1. dashboard.service.ts:
   - getOverview(tenantId):
     * Kunjungan hari ini (per tipe: rawat jalan, IGD, rawat inap)
     * Antrian aktif (menunggu vs sedang dilayani)
     * Okupansi kamar rawat inap (terisi/total)
     * Pendapatan hari ini (total, per metode pembayaran)
     * Pasien baru hari ini

   - getVisitStats(dateRange, tenantId):
     * Kunjungan per hari/minggu/bulan (untuk chart)
     * Kunjungan per poli
     * Kunjungan per dokter
     * Kunjungan per penjamin (umum/BPJS/asuransi)

   - getTopDiagnoses(dateRange, limit, tenantId):
     * 10 besar penyakit (ICD-10) berdasarkan jumlah kunjungan

   - getRevenueReport(dateRange, tenantId):
     * Pendapatan per hari/minggu/bulan
     * Pendapatan per kategori (konsultasi, tindakan, obat, dll)
     * Pendapatan per penjamin

   - getPharmacyReport(tenantId):
     * Obat terlaris (top 20)
     * Obat hampir expired
     * Nilai stok total
     * Obat stok rendah

   - getBedOccupancy(tenantId):
     * Occupied vs available per ruangan
     * Rata-rata Length of Stay (LOS)
     * BOR (Bed Occupancy Rate)

   - exportReport(reportType, dateRange, format, tenantId):
     * format: 'xlsx' | 'pdf' | 'csv'
     * Gunakan library: exceljs (xlsx), pdfmake (pdf)
     * Return file buffer

2. dashboard.controller.ts:
   - GET /api/dashboard/overview — ringkasan hari ini
   - GET /api/dashboard/visits?from=&to=&groupBy= — statistik kunjungan
   - GET /api/dashboard/top-diagnoses?from=&to=&limit= — 10 besar penyakit
   - GET /api/dashboard/revenue?from=&to=&groupBy= — laporan pendapatan
   - GET /api/dashboard/pharmacy — laporan farmasi
   - GET /api/dashboard/bed-occupancy — okupansi kamar
   - GET /api/dashboard/export?type=&from=&to=&format= — export laporan

3. Cache strategy (Redis):
   - Overview: cache 1 menit
   - Stats: cache 5 menit
   - Reports: cache 15 menit
   - Invalidate cache saat ada data baru (event-driven)

4. dashboard.test.ts
```

### Prompt 7.2 — Frontend Dashboard

```
Implementasikan UI dashboard di apps/web/:

Install: recharts (chart library, cocok dengan shadcn/ui)

1. app/(dashboard)/dashboard/page.tsx — Dashboard utama:
   Layout grid responsive:
   
   Row 1 — Stats cards (4 kolom):
   - Kunjungan Hari Ini (icon: Users, angka besar, sub: +X% dari kemarin)
   - Antrian Aktif (icon: Clock, menunggu / dilayani)
   - Okupansi Kamar (icon: Bed, terisi/total, progress bar)
   - Pendapatan Hari Ini (icon: DollarSign, Rp xxx.xxx.xxx)

   Row 2 — Charts (2 kolom):
   - Kiri: Line chart "Tren Kunjungan" (7 hari terakhir, per tipe rawat jalan/IGD/rawat inap)
   - Kanan: Pie chart "Kunjungan per Penjamin" (Umum/BPJS/Asuransi)

   Row 3 — Tables (2 kolom):
   - Kiri: "10 Besar Penyakit" — tabel ranking (ICD-10 code, nama, jumlah)
   - Kanan: "Antrian Aktif" — tabel ringkasan per poli (poli, menunggu, dilayani)

   Row 4 — Full width:
   - "Pendapatan Mingguan" — Bar chart per hari dalam seminggu terakhir

2. app/(dashboard)/laporan/page.tsx — Halaman laporan:
   - Filter: jenis laporan (dropdown), rentang tanggal (date range picker), groupBy (harian/mingguan/bulanan)
   - Jenis laporan:
     * Kunjungan Pasien
     * Pendapatan
     * 10 Besar Penyakit
     * Laporan Farmasi (obat terlaris, stok)
     * Okupansi Kamar
   - Tampilkan chart + tabel sesuai jenis
   - Tombol Export: Excel / PDF / CSV

3. components/dashboard/:
   - stat-card.tsx — Reusable stat card component
   - visit-trend-chart.tsx — Line chart tren kunjungan
   - payer-pie-chart.tsx — Pie chart penjamin
   - top-diagnoses-table.tsx — Tabel 10 besar penyakit
   - revenue-bar-chart.tsx — Bar chart pendapatan
   - bed-occupancy-card.tsx — Progress bar okupansi

4. hooks/use-dashboard.ts — TanStack Query hooks (refetchInterval: 60000 untuk real-time)
5. lib/api/dashboard.ts — API client

Dashboard harus:
- Auto-refresh setiap 1 menit
- Responsive (1 kolom di mobile, 2 di tablet, 4 di desktop)
- Loading skeleton saat data belum ready
- Angka format Indonesia (Rp 1.234.567, 1.234 pasien)
```

---

## FASE 8 — TOOLS MIGRASI KHANZA
**Durasi**: 3-4 minggu
**Output**: Tools untuk migrasi data dari database Khanza (MySQL) ke SIMRS SaaS (PostgreSQL)

### Prompt 8.1 — Migration Engine

```
Implementasikan tools migrasi di tools/migration-khanza/:

1. Setup project terpisah (Node.js + TypeScript):
   - package.json: mysql2, pg, knex, commander (CLI), ora (spinner), chalk (colors), csv-writer
   - tsconfig.json

2. src/connector/khanza-connector.ts:
   - connect(host, port, user, password, database): Connect ke MySQL Khanza
   - testConnection(): Verify koneksi OK
   - getSchema(): Baca semua tabel, kolom, tipe data
   - getTables(): List tabel utama Khanza:
     * pasien, reg_periksa, rawat_jl_dr, rawat_jl_pr, resep_obat, detail_pemberian_obat,
       databarang, gudangbarang, bangsal, kamar, dokter, petugas, poliklinik,
       diagnosa_pasien, penyakit, billing, detail_nota_jalan, dll
   - getRowCount(table): Hitung jumlah row per tabel
   - readBatch(table, offset, limit): Baca data per batch

3. src/connector/simrs-connector.ts:
   - connect(connectionString): Connect ke PostgreSQL SIMRS SaaS
   - testConnection()
   - createTenantSchema(slug): Buat schema baru untuk RS yang dimigrasi

4. src/mapper/field-mapper.ts:
   - Mapping field Khanza → SIMRS SaaS per tabel:
     * pasien → patients:
       - no_rkm_medis → no_rekam_medis
       - nm_pasien → nama
       - no_ktp → nik
       - tgl_lahir → tanggal_lahir
       - jk → jenis_kelamin (L/P)
       - alamat → alamat
       - no_tlp → no_telepon
       - no_peserta → no_bpjs
       - dll
     * reg_periksa → visits
     * rawat_jl_dr + rawat_jl_pr → medical_records
     * databarang → drugs
     * gudangbarang → drug_stocks
     * diagnosa_pasien → diagnoses
     * billing + detail_nota_jalan → bills + bill_items
   - Data transformation:
     * Clean whitespace, trim
     * Format tanggal konsisten (YYYY-MM-DD)
     * NIK validasi (16 digit, pad dengan 0 jika perlu)
     * Handle NULL dan empty string

5. src/cleaner/data-cleaner.ts:
   - findDuplicatePatients(): Cari pasien duplikat by NIK/nama+tanggal_lahir
   - suggestMerge(): Sarankan pasien yang sebaiknya digabung
   - cleanInvalidDates(): Perbaiki tanggal yang tidak valid
   - cleanPhoneNumbers(): Format ulang nomor telepon
   - generateReport(): Laporan kebersihan data (jumlah duplikat, invalid, dll)

6. src/migrator/batch-migrator.ts:
   - migrateTable(sourceTable, targetTable, mapper, batchSize=1000):
     * Baca dari Khanza per batch
     * Transform via mapper
     * Insert ke PostgreSQL
     * Log progress
     * Handle error per row (skip + log, jangan stop)
   - migrateAll(order): Migrasi semua tabel sesuai urutan dependency:
     1. Master: patients, doctors, rooms, drugs
     2. Transaksi: visits, medical_records, prescriptions
     3. Relasi: diagnoses, procedures, billing

7. src/verifier/verification.ts:
   - compareRowCounts(): Bandingkan jumlah row source vs target
   - sampleCheck(table, sampleSize=100): Ambil random 100 row, bandingkan data
   - generateVerificationReport(): Report lengkap

8. CLI (src/cli.ts menggunakan commander):
   - migrate connect — test koneksi ke Khanza
   - migrate analyze — analisis schema + data quality
   - migrate dry-run — simulasi migrasi tanpa write
   - migrate run — jalankan migrasi
   - migrate verify — verifikasi hasil
   - migrate clean — laporan data kotor
   - migrate rollback — hapus data yang sudah dimigrasi

9. Setiap step harus ada progress bar dan logging ke file.
```

---

## FASE 9 — SECURITY HARDENING & AUDIT
**Durasi**: 2-3 minggu
**Output**: MFA, audit trail, enkripsi, penetration test prep

### Prompt 9.1 — Security Features

```
Implementasikan security hardening di seluruh aplikasi:

1. Multi-Factor Authentication (MFA):
   - apps/server/src/modules/auth/ — tambah:
     * mfa.service.ts:
       - enableMFA(userId, tenantId): Generate TOTP secret (speakeasy library), return QR code URL
       - verifyMFA(userId, token, tenantId): Verify TOTP token
       - disableMFA(userId, tenantId): Non-aktifkan MFA
     * Update auth.service.ts:
       - Login flow: email+password → jika MFA enabled → minta token MFA → baru return JWT
     * Migration: tambah kolom di users: mfa_enabled (BOOLEAN), mfa_secret (TEXT encrypted)
   
   - apps/web/:
     * app/(dashboard)/profil/mfa/page.tsx: Setup MFA (QR code scan, verify, enable)
     * Update login flow: step tambahan untuk input kode MFA (6 digit, auto-submit)

2. Audit Trail:
   - Migration: tabel audit_logs (di PUBLIC schema, shared):
     * id, tenant_id, user_id, user_name, user_role, action (ENUM: 'view','create','update','delete','login','logout','export','print'),
       entity_type, entity_id, entity_description, ip_address, user_agent, old_data (JSONB), new_data (JSONB), created_at
   
   - apps/server/src/middleware/audit.ts:
     * Middleware yang auto-log setiap akses ke data sensitif (patients, medical_records, bills)
     * Log: siapa, kapan, apa yang dilakukan, dari IP mana
   
   - apps/server/src/modules/audit/:
     * audit.service.ts: query logs, filter, export
     * audit.controller.ts:
       - GET /api/audit-logs — list audit logs (admin only)
       - GET /api/audit-logs/export — export ke CSV/Excel
     * Retention: auto-delete logs > 5 tahun (configurable)

3. Data Encryption:
   - Enkripsi field sensitif di database:
     * patients: nik, no_telepon, alamat (encrypt at rest)
     * Gunakan pgcrypto extension PostgreSQL
     * Atau: application-level encryption (AES-256-GCM) via crypto module
   - Environment: semua credentials di .env, JANGAN hardcode

4. Rate Limiting:
   - apps/server/src/middleware/rate-limiter.ts:
     * Login: max 5 attempts per IP per 15 menit
     * API: max 100 requests per user per menit
     * Gunakan Redis sebagai store (express-rate-limit + rate-limit-redis)

5. Security Headers:
   - Helmet.js sudah ada, pastikan konfigurasi:
     * CSP (Content Security Policy)
     * HSTS
     * X-Content-Type-Options: nosniff
     * X-Frame-Options: DENY

6. Input Sanitization:
   - Middleware sanitize semua input: trim, escape HTML
   - Parameterized queries sudah via Knex (SQL injection prevention)
   - XSS prevention via React (auto-escape) + DOMPurify untuk rich text

7. Session Management:
   - JWT access token: 15 menit expiry
   - Refresh token: 7 hari, one-time use, stored in Redis
   - Logout: invalidate semua token user
   - Concurrent session limit: configurable per tenant

Test: jalankan OWASP ZAP atau similar untuk basic security scan.
```

---

## FASE 10 — PILOT TESTING & POLISH
**Durasi**: 3-4 minggu
**Output**: Aplikasi siap pilot di 1-2 RS

### Prompt 10.1 — Polish & Performance

```
Lakukan polishing dan optimasi performa:

1. Performance Optimization:
   - Frontend:
     * Audit bundle size dengan next-bundle-analyzer
     * Lazy load semua halaman (next/dynamic)
     * Lazy load chart components (recharts berat)
     * Image optimization (next/image, WebP)
     * Prefetch halaman yang sering diakses
     * Target: < 200KB first load JS
   
   - Backend:
     * Database indexing: review semua query, tambah index yang kurang
     * Connection pooling PostgreSQL (knex pool config)
     * Redis caching: masterdata, ICD-10, daftar obat (jarang berubah)
     * API response compression (sudah ada via compression middleware)
     * Query optimization: EXPLAIN ANALYZE untuk query lambat

2. Error Handling & UX:
   - Error boundary di React (components/error-boundary.tsx)
   - 404 page (app/not-found.tsx)
   - 500 page (app/error.tsx)
   - Toast notification system (sonner atau react-hot-toast)
   - Loading states: skeleton loader untuk semua halaman data
   - Empty states: ilustrasi + pesan saat data kosong

3. Accessibility:
   - Keyboard navigation untuk semua form dan tabel
   - ARIA labels di komponen kustom
   - Color contrast minimal 4.5:1
   - Focus ring visible

4. Responsive Final Check:
   - Test di: desktop (1920px), laptop (1366px), tablet (768px), mobile (375px)
   - Sidebar: collapsible di mobile
   - Tabel: horizontal scroll di mobile, atau card view
   - Form: full width di mobile

5. Print Styles:
   - Struk pembayaran (80mm thermal)
   - Gelang pasien
   - Label obat
   - Laporan A4

6. Documentation:
   - README.md lengkap: cara install, setup, run, deploy
   - API documentation (Swagger/OpenAPI via express-swagger-generator atau manual)
   - User guide sederhana per role (PDF)

7. Deployment Prep:
   - Dockerfile production (multi-stage build)
   - docker-compose.production.yml
   - Environment variables checklist
   - Database backup script
   - Health check endpoint: GET /api/health

8. Seeding Data untuk Demo:
   - 100 pasien sample
   - 30 hari data kunjungan
   - Stok obat 50 item
   - Data billing & pembayaran
   - Supaya demo terlihat hidup

Semua perubahan harus backward-compatible. Jangan break fitur yang sudah jalan.
```

---

## TIPS PENGGUNAAN PROMPT

### Cara Pakai Prompt Ini di Cursor:

1. **Buka chat Cursor** (Ctrl+L atau Cmd+L)
2. **Copy-paste 1 prompt** per satu ke chat
3. **Review hasilnya** — jangan langsung lanjut ke prompt berikutnya
4. **Test manual** — pastikan fitur jalan
5. **Commit ke git** — `git add . && git commit -m "feat: deskripsi"`
6. **Lanjut ke prompt berikutnya** dalam fase yang sama
7. **Selesai 1 fase** → review menyeluruh → lanjut fase berikutnya
8. **Update tracker** di `.cursor/rules/03-fase-tracker.mdc`

### Kalau Ada Error:
- Copy error message ke chat Cursor
- Minta perbaiki dengan konteks: "Error ini terjadi saat [aksi], di file [file]. Fix."

### Kalau Mau Modifikasi:
- Setiap prompt bisa dimodifikasi sebelum dipakai
- Tambah/kurangi fitur sesuai kebutuhan
- Prompt ini adalah panduan, bukan aturan mutlak

### Urutan Prioritas Jika Waktu Terbatas:
1. Fase 0 (Setup) → WAJIB
2. Fase 1 (Auth) → WAJIB
3. Fase 2 (Pasien & Pendaftaran) → WAJIB
4. Fase 3 (Rekam Medis) → WAJIB
5. Fase 4 (Farmasi & Billing) → WAJIB
6. Fase 6 (BPJS & SATUSEHAT) → WAJIB untuk RS Indonesia
7. Fase 5 (Offline) → PENTING tapi bisa ditunda
8. Fase 7 (Dashboard) → PENTING
9. Fase 8 (Migrasi) → PENTING untuk ambil pengguna Khanza
10. Fase 9 (Security) → PENTING sebelum production
11. Fase 10 (Polish) → PENTING sebelum pilot

---

## ESTIMASI TOTAL

| Item | Estimasi |
|------|----------|
| Total Fase | 11 fase (0-10) |
| Total Prompt | ~25 prompt |
| Durasi Estimasi | 8-12 bulan (1 developer) |
| Durasi Estimasi | 4-6 bulan (2-3 developer) |
| Lines of Code | ~30,000-50,000 |
| Tabel Database | ~30-40 tabel |
| API Endpoints | ~60-80 endpoints |
| Halaman Frontend | ~20-30 halaman |

---

*Dokumen ini adalah living document. Update sesuai progress dan kebutuhan di lapangan.*
