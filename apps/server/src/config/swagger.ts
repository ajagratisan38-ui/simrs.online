import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SIMRS SaaS API',
      version: '1.0.0',
      description:
        'API Sistem Informasi Manajemen Rumah Sakit berbasis SaaS. ' +
        'Multi-tenant, offline-first, terintegrasi BPJS & SATUSEHAT.',
      contact: {
        name: 'SIMRS SaaS Support',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Masukkan access token JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'NOT_FOUND' },
                message: { type: 'string', example: 'Resource tidak ditemukan' },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            no_rekam_medis: { type: 'string', example: 'RM-202610-00001' },
            nik: { type: 'string', example: '3201234567890001' },
            nama: { type: 'string', example: 'Budi Santoso' },
            tempat_lahir: { type: 'string', example: 'Jakarta' },
            tanggal_lahir: { type: 'string', format: 'date', example: '1990-05-15' },
            jenis_kelamin: { type: 'string', enum: ['L', 'P'] },
            alamat: { type: 'string' },
            no_telepon: { type: 'string', example: '081234567890' },
            no_bpjs: { type: 'string', example: '0001234567890' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Visit: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patient_id: { type: 'string', format: 'uuid' },
            visit_number: { type: 'string', example: 'KJ-20261016-00001' },
            tipe: { type: 'string', enum: ['rawat_jalan', 'igd', 'rawat_inap'] },
            tanggal: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['menunggu', 'diperiksa', 'selesai', 'batal', 'rawat_inap', 'pulang'] },
            penjamin: { type: 'string', enum: ['umum', 'bpjs', 'asuransi', 'perusahaan'] },
            keluhan_utama: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Drug: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            kode: { type: 'string', example: 'OBT-001' },
            nama: { type: 'string', example: 'Paracetamol 500mg' },
            kategori: { type: 'string', enum: ['obat', 'alkes', 'bmhp', 'nutrisi'] },
            harga_jual: { type: 'number', example: 5000 },
            stok_minimum: { type: 'integer', example: 100 },
            is_active: { type: 'boolean' },
          },
        },
        Bill: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            visit_id: { type: 'string', format: 'uuid' },
            total_amount: { type: 'number', example: 250000 },
            discount_amount: { type: 'number', example: 0 },
            final_amount: { type: 'number', example: 250000 },
            status: { type: 'string', enum: ['draft', 'final', 'dibayar', 'batal'] },
            penjamin: { type: 'string', enum: ['umum', 'bpjs', 'asuransi', 'perusahaan'] },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password', 'tenantSlug'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@rs-demo.simrs.id' },
            password: { type: 'string', minLength: 8, example: 'Demo123!' },
            tenantSlug: { type: 'string', example: 'rs-demo' },
            mfaToken: { type: 'string', description: 'Kode MFA 6 digit (jika MFA aktif)' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                mfaRequired: { type: 'boolean' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    allowedModules: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      parameters: {
        TenantSlug: {
          name: 'X-Tenant-Slug',
          in: 'header',
          required: true,
          schema: { type: 'string', example: 'rs-demo' },
          description: 'Slug tenant (kode RS)',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Autentikasi & sesi' },
      { name: 'Patients', description: 'Manajemen data pasien' },
      { name: 'Visits', description: 'Pendaftaran & kunjungan' },
      { name: 'Medical Records', description: 'Rekam medis (SOAP, diagnosis, resep)' },
      { name: 'Pharmacy', description: 'Farmasi & stok obat' },
      { name: 'Billing', description: 'Kasir & pembayaran' },
      { name: 'Laboratory', description: 'Order & hasil laboratorium' },
      { name: 'Radiology', description: 'Order & hasil radiologi' },
      { name: 'Surgery', description: 'Jadwal & laporan operasi' },
      { name: 'Nutrition', description: 'Order diet & log gizi' },
      { name: 'Dashboard', description: 'Statistik & laporan' },
      { name: 'BPJS', description: 'Bridging BPJS (VClaim, SEP)' },
      { name: 'SATUSEHAT', description: 'Integrasi SATUSEHAT FHIR' },
      { name: 'Sync', description: 'Sinkronisasi offline' },
      { name: 'Users', description: 'Manajemen pengguna' },
      { name: 'Tenant', description: 'Profil rumah sakit' },
      { name: 'Super Admin', description: 'Manajemen platform SaaS (super admin only)' },
      { name: 'Audit', description: 'Audit trail & log aktivitas' },
      { name: 'Import', description: 'Import data CSV' },
      { name: 'Migration', description: 'Migrasi dari Khanza' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
