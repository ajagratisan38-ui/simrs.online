import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // ============================================================
  // EXTENSIONS
  // ============================================================
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')

  // ============================================================
  // ENUM TYPES
  // ============================================================
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE user_role AS ENUM (
      'admin','dokter','perawat','apoteker','kasir',
      'pendaftaran','rekam_medis','manajemen','lab','radiologi'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE gender_type AS ENUM ('L','P');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE room_type AS ENUM (
      'poli','igd','rawat_inap','lab','radiologi','farmasi','operasi','rehabilitasi'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE bed_status AS ENUM ('tersedia','terisi','maintenance');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE visit_type AS ENUM ('rawat_jalan','igd','rawat_inap');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE visit_status AS ENUM (
      'menunggu','dipanggil','diperiksa','selesai','batal','rawat_inap','pulang'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE cara_masuk_type AS ENUM ('datang_sendiri','rujukan','kontrol','kiosk');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE payer_type AS ENUM ('umum','bpjs','asuransi','perusahaan');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE queue_status AS ENUM ('menunggu','dipanggil','dilayani','selesai','batal');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE medical_record_status AS ENUM ('draft','final');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE prescription_status AS ENUM ('draft','dikirim','diproses','selesai','batal');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE diagnosis_type AS ENUM ('utama','sekunder');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE template_category AS ENUM (
      'soap','subjective','objective','assessment','plan',
      'umum','penyakit_dalam','anak','bedah','obgyn',
      'saraf','mata','tht','kulit','gigi','igd'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE drug_category AS ENUM ('obat','alkes','bmhp','nutrisi');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE drug_transaction_type AS ENUM ('masuk','keluar','retur','penyesuaian','expired');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE dispensing_status AS ENUM ('menunggu','diproses','selesai','sebagian');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE bill_status AS ENUM ('draft','final','dibayar','batal');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE bill_item_category AS ENUM (
      'konsultasi','tindakan','obat','kamar','lab','radiologi','admin'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('tunai','debit','kredit','transfer','bpjs','asuransi');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE deposit_status AS ENUM ('aktif','digunakan','dikembalikan');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE satusehat_sync_status AS ENUM ('not_required','pending','sent','failed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE audit_action AS ENUM (
      'view','create','update','delete','login','logout','export','print'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE lab_order_status AS ENUM ('dikirim','sampel_diterima','diproses','selesai','batal');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE lab_priority AS ENUM ('normal','cito');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE specimen_type AS ENUM (
      'darah','urine','feses','sputum','swab','cairan_tubuh','jaringan','lainnya'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE radiology_order_status AS ENUM ('dikirim','dijadwalkan','diproses','selesai','batal');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE radiology_modality AS ENUM (
      'xray','usg','ct_scan','mri','mammografi','panoramik','fluoroskopi','lainnya'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE po_status AS ENUM ('draft','approved','ordered','received','completed','cancelled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE warehouse_category AS ENUM ('alkes','bhp','atk','linen','cleaning','rt','lain_lain');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE opname_status AS ENUM ('draft','in_progress','completed','cancelled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE cara_keluar_type AS ENUM ('sembuh','pulang_paksa','rujuk','meninggal','lainnya');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE triage_level AS ENUM ('1','2','3','4','5');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE igd_disposition AS ENUM ('pulang','rawat_inap','rujuk','meninggal','aps','observasi');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE mcu_exam_category AS ENUM (
      'fisik_umum','mata','tht','gigi','lab','radiologi',
      'ekg','spirometri','audiometri','psikologi'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE mcu_status AS ENUM (
      'registered','in_progress','waiting_review','completed','cancelled'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE mcu_conclusion_type AS ENUM (
      'fit','fit_with_notes','temporarily_unfit','unfit'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE substitution_status AS ENUM (
      'active','completed','cancelled'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE rehab_order_status AS ENUM (
      'dikirim','dijadwalkan','berlangsung','selesai','batal'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE rehab_therapy_type AS ENUM (
      'fisioterapi','terapi_wicara','terapi_okupasi','terapi_psikologi',
      'terapi_respirasi','rehabilitasi_jantung','rehabilitasi_neurologi','lainnya'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE practitioner_status AS ENUM (
      'aktif','nonaktif','kontrak_habis'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)

  // ============================================================
  // TRIGGER FUNCTION
  // ============================================================
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  // ============================================================
  // PUBLIC TABLES
  // ============================================================

  // --- tenants ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(50) NOT NULL UNIQUE,
      logo_url VARCHAR(500),
      address TEXT,
      phone VARCHAR(20),
      email VARCHAR(100),
      subscription_plan VARCHAR(50) DEFAULT 'trial',
      subscription_expires_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true,
      settings JSONB DEFAULT '{}',
      plan_id UUID,
      subscription_started_at TIMESTAMPTZ,
      satusehat_client_id VARCHAR(255),
      satusehat_client_secret_enc TEXT,
      satusehat_base_url VARCHAR(500),
      satusehat_org_id VARCHAR(255),
      satusehat_env VARCHAR(20) DEFAULT 'sandbox',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- super_admins ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.super_admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'superadmin',
      sa_role VARCHAR(20) NOT NULL DEFAULT 'operator',
      is_active BOOLEAN NOT NULL DEFAULT true,
      mfa_enabled BOOLEAN NOT NULL DEFAULT false,
      mfa_secret VARCHAR(255),
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- icd10_codes ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.icd10_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(10) NOT NULL UNIQUE,
      name_en TEXT NOT NULL,
      name_id TEXT NOT NULL,
      category VARCHAR(100),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- icd9cm_codes ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.icd9cm_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(10) NOT NULL UNIQUE,
      name_en TEXT NOT NULL,
      name_id TEXT NOT NULL,
      category VARCHAR(100),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- audit_logs ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID,
      user_id UUID,
      user_name VARCHAR(100),
      user_role VARCHAR(50),
      action audit_action NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(255),
      entity_description TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      old_data JSONB,
      new_data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- lab_parameters ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.lab_parameters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kode VARCHAR(20) NOT NULL UNIQUE,
      nama VARCHAR(200) NOT NULL,
      kategori VARCHAR(100) NOT NULL,
      satuan VARCHAR(30),
      nilai_normal_l VARCHAR(100),
      nilai_normal_p VARCHAR(100),
      specimen specimen_type NOT NULL DEFAULT 'darah',
      metode VARCHAR(100),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- radiology_examinations ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.radiology_examinations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kode VARCHAR(20) NOT NULL UNIQUE,
      nama VARCHAR(200) NOT NULL,
      modalitas radiology_modality NOT NULL,
      kategori VARCHAR(100) NOT NULL,
      deskripsi TEXT,
      persiapan TEXT,
      tarif_default NUMERIC(12,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- subscription_plans ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.subscription_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(30) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price_monthly BIGINT NOT NULL DEFAULT 0,
      price_yearly BIGINT,
      max_users INTEGER NOT NULL DEFAULT 5,
      max_patients INTEGER NOT NULL DEFAULT 100,
      max_doctors INTEGER NOT NULL DEFAULT 3,
      max_storage_gb INTEGER NOT NULL DEFAULT 5,
      allowed_modules JSONB NOT NULL DEFAULT '[]',
      trial_days INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_public BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- subscription_transactions ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.subscription_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES subscription_plans(id),
      type VARCHAR(30) NOT NULL,
      amount BIGINT NOT NULL DEFAULT 0,
      payment_method VARCHAR(50),
      payment_reference VARCHAR(200),
      notes TEXT,
      period VARCHAR(20) NOT NULL DEFAULT 'monthly',
      period_start TIMESTAMPTZ NOT NULL,
      period_end TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'paid',
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- backup_logs ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.backup_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_schema VARCHAR(100),
      type VARCHAR(30) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'running',
      filename TEXT,
      filepath TEXT,
      size_bytes BIGINT,
      storage VARCHAR(10) DEFAULT 'local',
      storage_url TEXT,
      error_message TEXT,
      duration_ms INTEGER,
      pg_version VARCHAR(20),
      table_count INTEGER,
      triggered_by UUID,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- backup_schedules ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.backup_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_schema VARCHAR(100),
      frequency VARCHAR(10) NOT NULL DEFAULT 'daily',
      time VARCHAR(5) NOT NULL DEFAULT '02:00',
      day_of_week INTEGER,
      day_of_month INTEGER,
      retention_days INTEGER NOT NULL DEFAULT 30,
      is_active BOOLEAN NOT NULL DEFAULT true,
      storage VARCHAR(10) DEFAULT 'local',
      storage_config JSONB,
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- loinc_codes ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.loinc_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(300) NOT NULL,
      short_name VARCHAR(200),
      kategori VARCHAR(100),
      class VARCHAR(100),
      property VARCHAR(50),
      time_aspect VARCHAR(20),
      system VARCHAR(100),
      scale VARCHAR(20),
      method VARCHAR(100),
      unit VARCHAR(50),
      ucum_code VARCHAR(30),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // --- kfa_codes ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.kfa_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(30) NOT NULL UNIQUE,
      name VARCHAR(300) NOT NULL,
      nama_dagang VARCHAR(300),
      kekuatan VARCHAR(100),
      bentuk_sediaan VARCHAR(100),
      kategori VARCHAR(50),
      golongan VARCHAR(100),
      pabrik VARCHAR(200),
      nie VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // --- drug_interactions (public, for CDSS) ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.drug_interactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      drug_a_name VARCHAR(200) NOT NULL,
      drug_b_name VARCHAR(200) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      effect TEXT NOT NULL,
      mechanism TEXT,
      recommendation TEXT NOT NULL,
      evidence_level VARCHAR(20) DEFAULT 'established',
      source VARCHAR(100) DEFAULT 'MIMS/Stockley',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // --- registration_status enum + tenant_registrations ---
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE registration_status AS ENUM (
      'pending','payment_pending','under_review','approved','provisioning','active','rejected'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.tenant_registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nama_rs VARCHAR(200) NOT NULL,
      tipe_rs VARCHAR(10) CHECK (tipe_rs IN ('A','B','C','D','pratama','utama','madya')),
      alamat TEXT, provinsi VARCHAR(100), kota VARCHAR(100),
      no_telepon VARCHAR(20), email_rs VARCHAR(100), website VARCHAR(200), nomor_izin VARCHAR(100),
      admin_nama VARCHAR(100) NOT NULL, admin_jabatan VARCHAR(100),
      admin_email VARCHAR(100) NOT NULL, admin_phone VARCHAR(20),
      admin_password_hash VARCHAR(255) NOT NULL,
      plan_code VARCHAR(30) NOT NULL DEFAULT 'trial',
      billing_period VARCHAR(10) DEFAULT 'monthly' CHECK (billing_period IN ('monthly','yearly')),
      payment_method VARCHAR(30), payment_reference VARCHAR(200),
      payment_proof_url TEXT, payment_amount NUMERIC(14,2) DEFAULT 0,
      payment_verified_at TIMESTAMPTZ, payment_verified_by UUID,
      requested_slug VARCHAR(50) NOT NULL,
      tenant_id UUID REFERENCES public.tenants(id),
      migrasi_requested BOOLEAN DEFAULT false, migrasi_source VARCHAR(30), migrasi_notes TEXT,
      status registration_status NOT NULL DEFAULT 'pending',
      rejection_reason TEXT, reviewed_by UUID, reviewed_at TIMESTAMPTZ, provisioned_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- platform_settings ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.platform_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(100) NOT NULL UNIQUE,
      value TEXT,
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      description TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by UUID
    )
  `)

  // --- super_admin_activity_log ---
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS public.super_admin_activity_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID NOT NULL,
      admin_email VARCHAR(100),
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50),
      entity_id UUID,
      details JSONB DEFAULT '{}',
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // --- ALTER lab_parameters ADD loinc_code ---
  await knex.raw(`ALTER TABLE public.lab_parameters ADD COLUMN IF NOT EXISTS loinc_code VARCHAR(20)`)

  // --- ALTER tenants ADD lifecycle columns ---
  await knex.raw(`
    ALTER TABLE public.tenants
      ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(200),
      ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS registration_id UUID,
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS suspended_reason TEXT
  `)

  // --- Seed platform_settings (combined from saas_registration + sa_panel) ---
  await knex.raw(`
    INSERT INTO public.platform_settings (key, value, category, description) VALUES
      ('platform_name', 'SIMRS', 'general', 'Nama platform'),
      ('platform_tagline', 'Sistem Informasi Manajemen Rumah Sakit Modern', 'general', 'Tagline platform'),
      ('contact_email', 'admin@simrs.id', 'general', 'Email kontak platform'),
      ('contact_phone', '', 'general', 'Nomor telepon kontak'),
      ('primary_domain', 'simrs.id', 'domain', 'Domain utama platform'),
      ('enable_self_registration', 'true', 'general', 'Izinkan RS mendaftar sendiri'),
      ('auto_approve_trial', 'true', 'general', 'Auto-approve registrasi paket Trial'),
      ('maintenance_mode', 'false', 'general', 'Mode maintenance platform'),
      ('default_timezone', 'Asia/Jakarta', 'general', 'Timezone default'),
      ('smtp_host', '', 'email', 'SMTP server host'),
      ('smtp_port', '587', 'email', 'SMTP server port'),
      ('smtp_user', '', 'email', 'SMTP username'),
      ('smtp_password_enc', '', 'email', 'SMTP password (encrypted)'),
      ('smtp_from_email', 'noreply@simrs.id', 'email', 'Email pengirim'),
      ('smtp_from_name', 'SIMRS', 'email', 'Nama pengirim'),
      ('bank_name', 'Bank Mandiri', 'billing', 'Nama bank untuk pembayaran'),
      ('bank_account_number', '1234567890123', 'billing', 'Nomor rekening'),
      ('bank_account_name', 'PT SIMRS Digital Indonesia', 'billing', 'Nama pemilik rekening'),
      ('auto_suspend_days', '7', 'billing', 'Hari setelah expired untuk auto-suspend'),
      ('grace_period_days', '3', 'billing', 'Grace period sebelum auto-suspend'),
      ('max_concurrent_sessions', '5', 'security', 'Max session per user'),
      ('enforce_2fa_superadmin', 'true', 'security', 'Wajib 2FA untuk super admin'),
      ('allowed_ips_superadmin', '', 'security', 'IP whitelist super admin (comma separated)'),
      ('session_timeout_minutes', '480', 'security', 'Session timeout dalam menit (default 8 jam)'),
      ('satusehat_mode', 'sandbox', 'integrations', 'Mode SATUSEHAT: sandbox atau production'),
      ('satusehat_organization_id', '', 'integrations', 'SATUSEHAT Organization ID'),
      ('bpjs_mode', 'sandbox', 'integrations', 'Mode BPJS: sandbox atau production'),
      ('whatsapp_gateway_url', '', 'integrations', 'URL WhatsApp Gateway API'),
      ('whatsapp_api_key', '', 'integrations', 'API Key WhatsApp Gateway'),
      ('payment_gateway_provider', '', 'integrations', 'Payment Gateway provider (midtrans/xendit/doku)'),
      ('payment_gateway_api_key', '', 'integrations', 'API Key Payment Gateway'),
      ('invoice_prefix', 'INV-', 'billing', 'Prefix nomor invoice otomatis'),
      ('invoice_footer', 'Terima kasih atas kepercayaan Anda menggunakan SIMRS.', 'billing', 'Footer text pada invoice'),
      ('wildcard_ssl_status', 'active', 'domain', 'Status Wildcard SSL certificate'),
      ('custom_domain_enabled', 'false', 'domain', 'Izinkan tenant menggunakan custom domain')
    ON CONFLICT (key) DO NOTHING
  `)

  // --- Add plan_id FK to tenants ---
  await knex.raw(`
    DO $$ BEGIN
      ALTER TABLE public.tenants
        ADD CONSTRAINT fk_tenants_plan FOREIGN KEY (plan_id)
        REFERENCES public.subscription_plans(id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)

  // ============================================================
  // PUBLIC TABLE INDEXES
  // ============================================================
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_icd10_code ON public.icd10_codes(code)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_icd10_name_en ON public.icd10_codes USING gin(to_tsvector('english', name_en))`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_icd10_name_id ON public.icd10_codes(name_id)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_icd9cm_code ON public.icd9cm_codes(code)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_icd9cm_name_id ON public.icd9cm_codes(name_id)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_logs(tenant_id)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON public.audit_logs(user_id, action)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_lab_param_kode ON public.lab_parameters(kode)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_lab_param_kategori ON public.lab_parameters(kategori)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_rad_exam_kode ON public.radiology_examinations(kode)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_rad_exam_modalitas ON public.radiology_examinations(modalitas)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_rad_exam_kategori ON public.radiology_examinations(kategori)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_sub_tx_tenant ON public.subscription_transactions(tenant_id)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_sub_tx_created ON public.subscription_transactions(created_at DESC)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_tenants_plan ON public.tenants(plan_id)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_tenants_expires ON public.tenants(subscription_expires_at)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON public.backup_logs(status)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_backup_logs_started ON public.backup_logs(started_at DESC)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_loinc_code ON public.loinc_codes(code)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_loinc_kategori ON public.loinc_codes(kategori)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_loinc_class ON public.loinc_codes(class)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_kfa_code ON public.kfa_codes(code)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_kfa_kategori ON public.kfa_codes(kategori)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_kfa_golongan ON public.kfa_codes(golongan)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_kfa_bentuk ON public.kfa_codes(bentuk_sediaan)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_di_drug_a ON public.drug_interactions(drug_a_name)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_di_drug_b ON public.drug_interactions(drug_b_name)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_di_severity ON public.drug_interactions(severity)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_di_drug_a_trgm ON public.drug_interactions USING gin(drug_a_name gin_trgm_ops)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_di_drug_b_trgm ON public.drug_interactions USING gin(drug_b_name gin_trgm_ops)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_reg_status ON public.tenant_registrations(status)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_reg_slug ON public.tenant_registrations(requested_slug)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_reg_email ON public.tenant_registrations(admin_email)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_reg_created ON public.tenant_registrations(created_at DESC)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_platform_settings_cat ON public.platform_settings(category)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_sa_log_admin ON public.super_admin_activity_log(admin_id)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_sa_log_action ON public.super_admin_activity_log(action)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_sa_log_created ON public.super_admin_activity_log(created_at DESC)`)

  // ============================================================
  // PUBLIC TABLE TRIGGERS
  // ============================================================
  await knex.raw(`DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants`)
  await knex.raw(`CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`)
  await knex.raw(`DROP TRIGGER IF EXISTS trg_super_admins_updated_at ON super_admins`)
  await knex.raw(`CREATE TRIGGER trg_super_admins_updated_at BEFORE UPDATE ON super_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`)
  await knex.raw(`DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON subscription_plans`)
  await knex.raw(`CREATE TRIGGER trg_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`)
  await knex.raw(`DROP TRIGGER IF EXISTS trg_tenant_registrations_updated_at ON tenant_registrations`)
  await knex.raw(`CREATE TRIGGER trg_tenant_registrations_updated_at BEFORE UPDATE ON tenant_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`)
  await knex.raw(`DROP TRIGGER IF EXISTS trg_platform_settings_updated_at ON platform_settings`)
  await knex.raw(`CREATE TRIGGER trg_platform_settings_updated_at BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`)

  // ============================================================
  // FUNCTIONS
  // ============================================================

  // --- generate_no_rekam_medis ---
  await knex.raw(`
    CREATE OR REPLACE FUNCTION generate_no_rekam_medis(schema_name TEXT)
    RETURNS TEXT AS $$
    DECLARE
      prefix TEXT;
      seq_num INTEGER;
      result TEXT;
    BEGIN
      prefix := 'RM-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
      EXECUTE format(
        'SELECT COALESCE(MAX(
          CAST(SUBSTRING(no_rekam_medis FROM 11) AS INTEGER)
        ), 0) + 1 FROM %I.patients WHERE no_rekam_medis LIKE $1',
        schema_name
      ) INTO seq_num USING prefix || '%';
      result := prefix || LPAD(seq_num::TEXT, 5, '0');
      RETURN result;
    END;
    $$ LANGUAGE plpgsql;
  `)

  // --- generate_visit_number ---
  await knex.raw(`
    CREATE OR REPLACE FUNCTION generate_visit_number(schema_name TEXT)
    RETURNS TEXT AS $$
    DECLARE
      prefix TEXT;
      seq_num INTEGER;
      result TEXT;
    BEGIN
      prefix := 'KJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
      EXECUTE format(
        'SELECT COALESCE(MAX(
          CAST(SUBSTRING(visit_number FROM 13) AS INTEGER)
        ), 0) + 1 FROM %I.visits WHERE visit_number LIKE $1',
        schema_name
      ) INTO seq_num USING prefix || '%';
      result := prefix || LPAD(seq_num::TEXT, 5, '0');
      RETURN result;
    END;
    $$ LANGUAGE plpgsql;
  `)

  // --- add_performance_indexes ---
  await knex.raw(`
    CREATE OR REPLACE FUNCTION add_performance_indexes(schema_name TEXT)
    RETURNS void AS $$
    BEGIN
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_patients_nik ON %I.patients (nik)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_patients_nama ON %I.patients USING gin (nama gin_trgm_ops)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_patients_no_rm ON %I.patients (no_rekam_medis)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_patients_bpjs ON %I.patients (no_bpjs) WHERE no_bpjs IS NOT NULL', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_patients_active ON %I.patients (is_active) WHERE deleted_at IS NULL', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_tanggal ON %I.visits (tanggal DESC)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_status ON %I.visits (status)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_patient ON %I.visits (patient_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_doctor ON %I.visits (doctor_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_room ON %I.visits (room_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_penjamin ON %I.visits (penjamin)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_tanggal_tipe ON %I.visits (tanggal, tipe)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_medrec_visit ON %I.medical_records (visit_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_medrec_patient ON %I.medical_records (patient_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_diagnoses_icd10 ON %I.diagnoses (icd10_code)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_diagnoses_medrec ON %I.diagnoses (medical_record_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_drugs_kode ON %I.drugs (kode)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_drugs_nama ON %I.drugs USING gin (nama gin_trgm_ops)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_drugs_active ON %I.drugs (is_active) WHERE is_active = true', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_drug_stocks_drug ON %I.drug_stocks (drug_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_drug_stocks_expiry ON %I.drug_stocks (tanggal_kadaluarsa)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_drug_stocks_fifo ON %I.drug_stocks (drug_id, tanggal_masuk ASC)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bills_visit ON %I.bills (visit_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bills_patient ON %I.bills (patient_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bills_status ON %I.bills (status)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bills_created ON %I.bills (created_at DESC)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_payments_bill ON %I.payments (bill_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_payments_paid ON %I.payments (paid_at DESC)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_queues_visit ON %I.queues (visit_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_queues_status ON %I.queues (status)', schema_name);
    END;
    $$ LANGUAGE plpgsql;
  `)

  // --- create_tenant_schema ---
  await knex.raw(`
    CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_slug TEXT)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', 'tenant_' || tenant_slug);

      -- ============ USERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(100) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(100) NOT NULL,
          role user_role NOT NULL DEFAULT ''admin'',
          is_active BOOLEAN NOT NULL DEFAULT true,
          phone VARCHAR(20),
          mfa_enabled BOOLEAN NOT NULL DEFAULT false,
          mfa_secret TEXT,
          last_login_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ,
          UNIQUE(email)
        )
      ', 'tenant_' || tenant_slug);

      -- ============ PATIENTS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.patients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          no_rekam_medis VARCHAR(20) NOT NULL,
          nik VARCHAR(16) NOT NULL,
          nik_encrypted TEXT,
          nama VARCHAR(100) NOT NULL,
          tempat_lahir VARCHAR(100) NOT NULL,
          tanggal_lahir DATE NOT NULL,
          jenis_kelamin gender_type NOT NULL,
          golongan_darah VARCHAR(5),
          alamat TEXT NOT NULL,
          alamat_encrypted TEXT,
          rt VARCHAR(5), rw VARCHAR(5),
          kelurahan VARCHAR(100), kecamatan VARCHAR(100),
          kabupaten VARCHAR(100), provinsi VARCHAR(100),
          kode_pos VARCHAR(10),
          no_telepon VARCHAR(20),
          no_telepon_encrypted TEXT,
          email VARCHAR(100),
          pekerjaan VARCHAR(100), pendidikan VARCHAR(50),
          status_pernikahan VARCHAR(30),
          nama_keluarga VARCHAR(100),
          no_telepon_keluarga VARCHAR(20),
          hubungan_keluarga VARCHAR(50),
          no_bpjs VARCHAR(13), kelas_bpjs SMALLINT,
          foto_url VARCHAR(500),
          alergi JSONB DEFAULT ''[]''::jsonb,
          satusehat_patient_id VARCHAR(100),
          is_active BOOLEAN NOT NULL DEFAULT true,
          is_deceased BOOLEAN DEFAULT false,
          deceased_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by UUID, updated_by UUID,
          deleted_at TIMESTAMPTZ,
          UNIQUE(no_rekam_medis), UNIQUE(nik)
        )
      ', 'tenant_' || tenant_slug);

      -- ============ DOCTORS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.doctors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          spesialisasi VARCHAR(100),
          no_sip VARCHAR(50), no_str VARCHAR(50),
          jadwal_praktek JSONB DEFAULT ''{}''::jsonb,
          tarif_konsultasi NUMERIC(12,2) NOT NULL DEFAULT 0,
          is_available BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_doctors_user FOREIGN KEY (user_id)
            REFERENCES %I.users(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ ROOMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.rooms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(20) NOT NULL,
          nama VARCHAR(100) NOT NULL,
          tipe room_type NOT NULL,
          lantai SMALLINT,
          kapasitas INTEGER NOT NULL DEFAULT 1,
          tarif_per_hari NUMERIC(12,2) NOT NULL DEFAULT 0,
          kelas SMALLINT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(kode)
        )
      ', 'tenant_' || tenant_slug);

      -- ============ BEDS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.beds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          room_id UUID NOT NULL,
          nomor VARCHAR(50) NOT NULL,
          status bed_status NOT NULL DEFAULT ''tersedia'',
          current_patient_id UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_beds_room FOREIGN KEY (room_id) REFERENCES %I.rooms(id) ON DELETE CASCADE,
          CONSTRAINT fk_beds_patient FOREIGN KEY (current_patient_id) REFERENCES %I.patients(id) ON DELETE SET NULL
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ KOMPONEN TARIF ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.komponen_tarif (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(30) NOT NULL,
          nama VARCHAR(200) NOT NULL,
          kategori VARCHAR(30) NOT NULL DEFAULT ''visite'',
          tarif_kelas_3 NUMERIC(12,2) NOT NULL DEFAULT 0,
          tarif_kelas_2 NUMERIC(12,2) NOT NULL DEFAULT 0,
          tarif_kelas_1 NUMERIC(12,2) NOT NULL DEFAULT 0,
          tarif_vip NUMERIC(12,2) NOT NULL DEFAULT 0,
          tarif_igd NUMERIC(12,2) NOT NULL DEFAULT 0,
          tarif_poli NUMERIC(12,2) NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_komponen_tarif_kode UNIQUE (kode)
        )
      ', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_komponen_tarif_kategori ON %I.komponen_tarif(kategori)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_komponen_tarif_kode ON %I.komponen_tarif(kode)', 'tenant_' || tenant_slug);

      -- ============ DOCTOR SUBSTITUTIONS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.doctor_substitutions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          doctor_id UUID NOT NULL,
          substitute_doctor_id UUID NOT NULL,
          tanggal_mulai DATE NOT NULL,
          tanggal_selesai DATE NOT NULL,
          alasan TEXT NOT NULL,
          catatan TEXT,
          status substitution_status NOT NULL DEFAULT ''active'',
          cancelled_at TIMESTAMPTZ,
          cancelled_by UUID,
          created_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_dsub_doctor FOREIGN KEY (doctor_id) REFERENCES %I.doctors(id) ON DELETE CASCADE,
          CONSTRAINT fk_dsub_substitute FOREIGN KEY (substitute_doctor_id) REFERENCES %I.doctors(id) ON DELETE CASCADE,
          CONSTRAINT fk_dsub_created_by FOREIGN KEY (created_by) REFERENCES %I.users(id),
          CONSTRAINT fk_dsub_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES %I.users(id),
          CONSTRAINT chk_dsub_dates CHECK (tanggal_mulai <= tanggal_selesai),
          CONSTRAINT chk_dsub_not_self CHECK (doctor_id != substitute_doctor_id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dsub_doctor ON %I.doctor_substitutions(doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dsub_substitute ON %I.doctor_substitutions(substitute_doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dsub_status ON %I.doctor_substitutions(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dsub_dates ON %I.doctor_substitutions(tanggal_mulai, tanggal_selesai)', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_dsub_updated ON %I.doctor_substitutions', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_dsub_updated BEFORE UPDATE ON %I.doctor_substitutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);

      -- ============ EXTERNAL PRACTITIONERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.external_practitioners (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nama VARCHAR(200) NOT NULL,
          profesi VARCHAR(100) NOT NULL,
          spesialisasi VARCHAR(200),
          no_sip VARCHAR(50), no_str VARCHAR(50),
          instansi_asal VARCHAR(200),
          telepon VARCHAR(20), email VARCHAR(100), alamat TEXT,
          fee_share_persen NUMERIC(5,2) NOT NULL DEFAULT 70,
          fee_share_rs_persen NUMERIC(5,2) NOT NULL DEFAULT 30,
          kontrak_mulai DATE, kontrak_selesai DATE,
          status practitioner_status NOT NULL DEFAULT ''aktif'',
          catatan TEXT, created_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_ep_created_by FOREIGN KEY (created_by) REFERENCES %I.users(id),
          CONSTRAINT chk_ep_fee_share CHECK (fee_share_persen + fee_share_rs_persen = 100)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ep_profesi ON %I.external_practitioners(profesi)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ep_status ON %I.external_practitioners(status)', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_ep_updated ON %I.external_practitioners', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_ep_updated BEFORE UPDATE ON %I.external_practitioners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);

      -- ============ REHABILITATION ORDERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.rehabilitation_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL, patient_id UUID NOT NULL,
          ordering_doctor_id UUID NOT NULL, practitioner_id UUID,
          therapy_type rehab_therapy_type NOT NULL,
          status rehab_order_status NOT NULL DEFAULT ''dikirim'',
          diagnosa_klinis TEXT NOT NULL, indikasi TEXT, target_terapi TEXT,
          jumlah_sesi INTEGER NOT NULL DEFAULT 1,
          sesi_selesai INTEGER NOT NULL DEFAULT 0,
          catatan_dokter TEXT, catatan_terapis TEXT,
          tarif_per_sesi NUMERIC(12,2) NOT NULL DEFAULT 0,
          started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
          cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancelled_reason TEXT,
          created_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_ro_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id),
          CONSTRAINT fk_ro_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id),
          CONSTRAINT fk_ro_doctor FOREIGN KEY (ordering_doctor_id) REFERENCES %I.doctors(id),
          CONSTRAINT fk_ro_practitioner FOREIGN KEY (practitioner_id) REFERENCES %I.external_practitioners(id),
          CONSTRAINT fk_ro_created_by FOREIGN KEY (created_by) REFERENCES %I.users(id),
          CONSTRAINT chk_ro_sesi CHECK (sesi_selesai <= jumlah_sesi)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ro_visit ON %I.rehabilitation_orders(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ro_patient ON %I.rehabilitation_orders(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ro_status ON %I.rehabilitation_orders(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ro_therapy ON %I.rehabilitation_orders(therapy_type)', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_ro_updated ON %I.rehabilitation_orders', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_ro_updated BEFORE UPDATE ON %I.rehabilitation_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);

      -- ============ REHABILITATION SESSIONS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.rehabilitation_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL, sesi_ke INTEGER NOT NULL,
          tanggal DATE NOT NULL, waktu_mulai TIME, waktu_selesai TIME,
          practitioner_id UUID, tindakan TEXT, hasil TEXT,
          catatan_progress TEXT,
          skala_nyeri_sebelum INTEGER, skala_nyeri_sesudah INTEGER,
          rom_sebelum TEXT, rom_sesudah TEXT,
          status VARCHAR(20) NOT NULL DEFAULT ''dijadwalkan'',
          performed_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_rs_order FOREIGN KEY (order_id) REFERENCES %I.rehabilitation_orders(id) ON DELETE CASCADE,
          CONSTRAINT fk_rs_practitioner FOREIGN KEY (practitioner_id) REFERENCES %I.external_practitioners(id),
          CONSTRAINT fk_rs_performed_by FOREIGN KEY (performed_by) REFERENCES %I.users(id),
          CONSTRAINT chk_rs_nyeri_before CHECK (skala_nyeri_sebelum BETWEEN 0 AND 10),
          CONSTRAINT chk_rs_nyeri_after CHECK (skala_nyeri_sesudah BETWEEN 0 AND 10),
          CONSTRAINT uq_rs_order_sesi UNIQUE (order_id, sesi_ke)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_rs_order ON %I.rehabilitation_sessions(order_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_rs_tanggal ON %I.rehabilitation_sessions(tanggal)', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_rs_updated ON %I.rehabilitation_sessions', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_rs_updated BEFORE UPDATE ON %I.rehabilitation_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);

      -- ============ PRACTITIONER FEE TRANSACTIONS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.practitioner_fee_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          practitioner_id UUID NOT NULL REFERENCES %I.external_practitioners(id),
          order_id UUID NOT NULL REFERENCES %I.rehabilitation_orders(id),
          session_id UUID REFERENCES %I.rehabilitation_sessions(id) ON DELETE SET NULL,
          visit_id UUID REFERENCES %I.visits(id),
          deskripsi VARCHAR(500) NOT NULL,
          tarif_sesi NUMERIC(12,2) NOT NULL DEFAULT 0,
          jumlah_practitioner NUMERIC(12,2) NOT NULL DEFAULT 0,
          jumlah_rs NUMERIC(12,2) NOT NULL DEFAULT 0,
          fee_share_persen NUMERIC(5,2) NOT NULL DEFAULT 70,
          fee_share_rs_persen NUMERIC(5,2) NOT NULL DEFAULT 30,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_pft_practitioner ON %I.practitioner_fee_transactions(practitioner_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_pft_order ON %I.practitioner_fee_transactions(order_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_pft_created ON %I.practitioner_fee_transactions(created_at)', 'tenant_' || tenant_slug);

      -- ============ BED TRANSFERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.bed_transfers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL,
          from_bed_id UUID,
          from_room_id UUID,
          to_bed_id UUID NOT NULL,
          to_room_id UUID NOT NULL,
          from_room_nama VARCHAR(200),
          from_room_tarif NUMERIC(12,2) DEFAULT 0,
          from_room_kelas INT,
          to_room_nama VARCHAR(200),
          to_room_tarif NUMERIC(12,2) DEFAULT 0,
          to_room_kelas INT,
          transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          transferred_by UUID,
          catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_bed_transfers_visit ON %I.bed_transfers (visit_id)
      ', 'tenant_' || tenant_slug);
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_bed_transfers_date ON %I.bed_transfers (transferred_at)
      ', 'tenant_' || tenant_slug);

      -- ============ INSURANCES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.insurances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(30) NOT NULL,
          nama VARCHAR(200) NOT NULL,
          tipe VARCHAR(30) NOT NULL DEFAULT ''asuransi'',
          alamat TEXT, telepon VARCHAR(30), email VARCHAR(100),
          pic_nama VARCHAR(100), pic_telepon VARCHAR(30),
          tarif_persen NUMERIC(5,2) DEFAULT 100,
          catatan TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(kode)
        )
      ', 'tenant_' || tenant_slug);

      -- ============ VISITS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.visits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL,
          visit_number VARCHAR(20) NOT NULL,
          tipe visit_type NOT NULL,
          tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
          room_id UUID NOT NULL,
          doctor_id UUID NOT NULL,
          bed_id UUID,
          status visit_status NOT NULL DEFAULT ''menunggu'',
          keluhan_utama TEXT,
          cara_masuk cara_masuk_type DEFAULT ''datang_sendiri'',
          no_rujukan VARCHAR(50),
          penjamin payer_type NOT NULL DEFAULT ''umum'',
          no_sep VARCHAR(50),
          catatan TEXT,
          insurance_id UUID,
          is_laka_lantas BOOLEAN NOT NULL DEFAULT false,
          laka_lantas_data JSONB,
          satusehat_encounter_id VARCHAR(100),
          satusehat_sync_status satusehat_sync_status NOT NULL DEFAULT ''not_required'',
          triage_level triage_level,
          triage_time TIMESTAMPTZ,
          response_time TIMESTAMPTZ,
          igd_bed_number VARCHAR(10),
          disposition igd_disposition,
          disposition_time TIMESTAMPTZ,
          disposition_notes TEXT,
          cara_keluar cara_keluar_type,
          rujuk_ke VARCHAR(255),
          sebab_meninggal TEXT,
          waktu_keluar TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by UUID, updated_by UUID,
          deleted_at TIMESTAMPTZ,
          UNIQUE(visit_number),
          CONSTRAINT fk_visits_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id),
          CONSTRAINT fk_visits_room FOREIGN KEY (room_id) REFERENCES %I.rooms(id),
          CONSTRAINT fk_visits_doctor FOREIGN KEY (doctor_id) REFERENCES %I.doctors(id),
          original_doctor_id UUID,
          substitution_id UUID,
          CONSTRAINT fk_visits_bed FOREIGN KEY (bed_id) REFERENCES %I.beds(id),
          CONSTRAINT fk_visit_insurance FOREIGN KEY (insurance_id) REFERENCES %I.insurances(id) ON DELETE SET NULL,
          CONSTRAINT fk_v_orig_doctor FOREIGN KEY (original_doctor_id) REFERENCES %I.doctors(id),
          CONSTRAINT fk_v_substitution FOREIGN KEY (substitution_id) REFERENCES %I.doctor_substitutions(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ QUEUES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.queues (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL,
          room_id UUID NOT NULL,
          nomor_antrian INTEGER NOT NULL,
          status queue_status NOT NULL DEFAULT ''menunggu'',
          called_at TIMESTAMPTZ, served_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_queues_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id) ON DELETE CASCADE,
          CONSTRAINT fk_queues_room FOREIGN KEY (room_id) REFERENCES %I.rooms(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ MEDICAL_RECORDS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.medical_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL, patient_id UUID NOT NULL, doctor_id UUID NOT NULL,
          subjective TEXT, objective TEXT, assessment TEXT, plan TEXT,
          vital_signs JSONB DEFAULT ''{}''::jsonb,
          alergi JSONB DEFAULT ''[]''::jsonb,
          riwayat_penyakit TEXT, catatan_tambahan TEXT,
          status medical_record_status NOT NULL DEFAULT ''draft'',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by UUID, updated_by UUID,
          UNIQUE(visit_id),
          CONSTRAINT fk_mr_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id),
          CONSTRAINT fk_mr_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id),
          CONSTRAINT fk_mr_doctor FOREIGN KEY (doctor_id) REFERENCES %I.doctors(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ DIAGNOSES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.diagnoses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          medical_record_id UUID NOT NULL,
          icd10_code VARCHAR(10) NOT NULL, icd10_name TEXT NOT NULL,
          tipe diagnosis_type NOT NULL DEFAULT ''utama'',
          catatan TEXT,
          satusehat_condition_id VARCHAR(100),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_dx_mr FOREIGN KEY (medical_record_id) REFERENCES %I.medical_records(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ PROCEDURES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.procedures (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          medical_record_id UUID NOT NULL, kode_tindakan VARCHAR(20),
          nama_tindakan VARCHAR(200) NOT NULL, catatan TEXT,
          tarif NUMERIC(12,2) NOT NULL DEFAULT 0, qty INTEGER NOT NULL DEFAULT 1,
          total NUMERIC(12,2) NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_proc_mr FOREIGN KEY (medical_record_id) REFERENCES %I.medical_records(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ PRESCRIPTIONS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.prescriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          medical_record_id UUID, visit_id UUID NOT NULL,
          status prescription_status NOT NULL DEFAULT ''draft'',
          catatan_dokter TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_rx_mr FOREIGN KEY (medical_record_id) REFERENCES %I.medical_records(id) ON DELETE CASCADE,
          CONSTRAINT fk_rx_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ PRESCRIPTION_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.prescription_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          prescription_id UUID NOT NULL, drug_id UUID,
          nama_obat VARCHAR(200) NOT NULL, dosis VARCHAR(50), satuan VARCHAR(30),
          frekuensi VARCHAR(50), durasi_hari INTEGER, jumlah INTEGER NOT NULL DEFAULT 1,
          aturan_pakai TEXT, catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_rxi_rx FOREIGN KEY (prescription_id) REFERENCES %I.prescriptions(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ MEDICAL_TEMPLATES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.medical_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL, category template_category NOT NULL,
          content JSONB NOT NULL DEFAULT ''{}''::jsonb, doctor_id UUID,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_tpl_doctor FOREIGN KEY (doctor_id) REFERENCES %I.doctors(id) ON DELETE SET NULL
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ DRUGS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.drugs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(30) NOT NULL, nama VARCHAR(200) NOT NULL, nama_generik VARCHAR(200),
          kategori drug_category NOT NULL DEFAULT ''obat'',
          satuan_kecil VARCHAR(30) NOT NULL DEFAULT ''tablet'',
          satuan_besar VARCHAR(30), konversi INTEGER NOT NULL DEFAULT 1,
          harga_beli NUMERIC(12,2) NOT NULL DEFAULT 0,
          harga_jual NUMERIC(12,2) NOT NULL DEFAULT 0,
          margin_persen NUMERIC(5,2) NOT NULL DEFAULT 0,
          stok_minimum INTEGER NOT NULL DEFAULT 10,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(kode)
        )
      ', 'tenant_' || tenant_slug);

      -- ============ DRUG_STOCKS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.drug_stocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          drug_id UUID NOT NULL, batch_number VARCHAR(50),
          tanggal_kadaluarsa DATE, stok_awal INTEGER NOT NULL DEFAULT 0,
          stok_sisa INTEGER NOT NULL DEFAULT 0,
          harga_beli_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
          supplier VARCHAR(200), tanggal_masuk DATE NOT NULL DEFAULT CURRENT_DATE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_ds_drug FOREIGN KEY (drug_id) REFERENCES %I.drugs(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ DRUG_TRANSACTIONS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.drug_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          drug_id UUID NOT NULL, drug_stock_id UUID,
          tipe drug_transaction_type NOT NULL,
          jumlah INTEGER NOT NULL, stok_sebelum INTEGER NOT NULL, stok_sesudah INTEGER NOT NULL,
          referensi_id UUID, referensi_tipe VARCHAR(50), catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID,
          CONSTRAINT fk_dt_drug FOREIGN KEY (drug_id) REFERENCES %I.drugs(id),
          CONSTRAINT fk_dt_stock FOREIGN KEY (drug_stock_id) REFERENCES %I.drug_stocks(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ DISPENSING ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.dispensing (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          prescription_id UUID NOT NULL, visit_id UUID NOT NULL,
          status dispensing_status NOT NULL DEFAULT ''menunggu'',
          catatan_apoteker TEXT, dispensed_by UUID, dispensed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_disp_rx FOREIGN KEY (prescription_id) REFERENCES %I.prescriptions(id),
          CONSTRAINT fk_disp_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id),
          CONSTRAINT fk_disp_user FOREIGN KEY (dispensed_by) REFERENCES %I.users(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ DISPENSING_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.dispensing_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          dispensing_id UUID NOT NULL, prescription_item_id UUID,
          drug_id UUID NOT NULL, drug_stock_id UUID,
          jumlah_diminta INTEGER NOT NULL, jumlah_diberikan INTEGER NOT NULL DEFAULT 0,
          catatan TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_di_disp FOREIGN KEY (dispensing_id) REFERENCES %I.dispensing(id) ON DELETE CASCADE,
          CONSTRAINT fk_di_rxi FOREIGN KEY (prescription_item_id) REFERENCES %I.prescription_items(id),
          CONSTRAINT fk_di_drug FOREIGN KEY (drug_id) REFERENCES %I.drugs(id),
          CONSTRAINT fk_di_stock FOREIGN KEY (drug_stock_id) REFERENCES %I.drug_stocks(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ BILLS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.bills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL, patient_id UUID NOT NULL,
          total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
          discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
          final_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
          penjamin payer_type NOT NULL DEFAULT ''umum'',
          status bill_status NOT NULL DEFAULT ''draft'',
          catatan TEXT,
          insurance_id UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by UUID,
          UNIQUE(visit_id),
          CONSTRAINT fk_bills_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id),
          CONSTRAINT fk_bills_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id),
          CONSTRAINT fk_bills_user FOREIGN KEY (created_by) REFERENCES %I.users(id),
          CONSTRAINT fk_bill_insurance FOREIGN KEY (insurance_id) REFERENCES %I.insurances(id) ON DELETE SET NULL
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ BILL_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.bill_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bill_id UUID NOT NULL,
          kategori bill_item_category NOT NULL,
          deskripsi TEXT NOT NULL,
          qty INTEGER NOT NULL DEFAULT 1,
          harga_satuan NUMERIC(12,2) NOT NULL DEFAULT 0,
          subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
          discount NUMERIC(14,2) NOT NULL DEFAULT 0,
          total NUMERIC(14,2) NOT NULL DEFAULT 0,
          referensi_id UUID, referensi_tipe VARCHAR(50),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_bi_bill FOREIGN KEY (bill_id) REFERENCES %I.bills(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ PAYMENTS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bill_id UUID NOT NULL,
          metode payment_method NOT NULL,
          jumlah NUMERIC(14,2) NOT NULL,
          referensi_pembayaran VARCHAR(100),
          catatan TEXT, received_by UUID,
          paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_pay_bill FOREIGN KEY (bill_id) REFERENCES %I.bills(id) ON DELETE CASCADE,
          CONSTRAINT fk_pay_user FOREIGN KEY (received_by) REFERENCES %I.users(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ DEPOSITS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.deposits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL, visit_id UUID,
          jumlah NUMERIC(14,2) NOT NULL,
          status deposit_status NOT NULL DEFAULT ''aktif'',
          catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_dep_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id),
          CONSTRAINT fk_dep_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ LAB_ORDERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.lab_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL, patient_id UUID NOT NULL, doctor_id UUID NOT NULL,
          medical_record_id UUID,
          nomor_order VARCHAR(30) NOT NULL,
          prioritas lab_priority NOT NULL DEFAULT ''normal'',
          status lab_order_status NOT NULL DEFAULT ''dikirim'',
          catatan_klinis TEXT,
          tanggal_order TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          tanggal_sampel TIMESTAMPTZ, tanggal_selesai TIMESTAMPTZ,
          petugas_lab_id UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by UUID, updated_by UUID,
          UNIQUE(nomor_order),
          CONSTRAINT fk_lo_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id),
          CONSTRAINT fk_lo_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id),
          CONSTRAINT fk_lo_doctor FOREIGN KEY (doctor_id) REFERENCES %I.doctors(id),
          CONSTRAINT fk_lo_mr FOREIGN KEY (medical_record_id) REFERENCES %I.medical_records(id),
          CONSTRAINT fk_lo_petugas FOREIGN KEY (petugas_lab_id) REFERENCES %I.users(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ LAB_ORDER_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.lab_order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lab_order_id UUID NOT NULL,
          parameter_id UUID NOT NULL,
          parameter_kode VARCHAR(20) NOT NULL, parameter_nama VARCHAR(200) NOT NULL,
          kategori VARCHAR(100) NOT NULL, satuan VARCHAR(30),
          nilai_normal VARCHAR(100),
          specimen specimen_type NOT NULL DEFAULT ''darah'',
          hasil VARCHAR(200), keterangan TEXT, flag VARCHAR(10),
          tarif NUMERIC(12,2) NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_loi_order FOREIGN KEY (lab_order_id) REFERENCES %I.lab_orders(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ RADIOLOGY_ORDERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.radiology_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL, patient_id UUID NOT NULL, doctor_id UUID NOT NULL,
          medical_record_id UUID,
          nomor_order VARCHAR(30) NOT NULL,
          examination_id UUID NOT NULL,
          examination_kode VARCHAR(20) NOT NULL, examination_nama VARCHAR(200) NOT NULL,
          modalitas radiology_modality NOT NULL,
          prioritas lab_priority NOT NULL DEFAULT ''normal'',
          status radiology_order_status NOT NULL DEFAULT ''dikirim'',
          catatan_klinis TEXT, diagnosa_klinis TEXT,
          tanggal_order TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          tanggal_jadwal TIMESTAMPTZ, tanggal_selesai TIMESTAMPTZ,
          radiografer_id UUID, radiolog_id UUID,
          hasil_bacaan TEXT, kesan TEXT,
          tarif NUMERIC(12,2) NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by UUID, updated_by UUID,
          UNIQUE(nomor_order),
          CONSTRAINT fk_ro_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id),
          CONSTRAINT fk_ro_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id),
          CONSTRAINT fk_ro_doctor FOREIGN KEY (doctor_id) REFERENCES %I.doctors(id),
          CONSTRAINT fk_ro_mr FOREIGN KEY (medical_record_id) REFERENCES %I.medical_records(id),
          CONSTRAINT fk_ro_radiografer FOREIGN KEY (radiografer_id) REFERENCES %I.users(id),
          CONSTRAINT fk_ro_radiolog FOREIGN KEY (radiolog_id) REFERENCES %I.users(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ SURGERIES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.surgeries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nomor_operasi VARCHAR(20) NOT NULL UNIQUE,
          visit_id UUID NOT NULL, patient_id UUID NOT NULL, doctor_id UUID NOT NULL,
          tanggal_operasi DATE NOT NULL,
          jam_mulai TIME NOT NULL,
          jam_mulai_aktual TIMESTAMPTZ, jam_selesai TIMESTAMPTZ,
          estimasi_durasi_menit INTEGER NOT NULL DEFAULT 60,
          ruang_operasi VARCHAR(50) NOT NULL,
          jenis_operasi VARCHAR(20) NOT NULL CHECK (jenis_operasi IN (''elektif'',''cito'',''emergency'')),
          jenis_anestesi VARCHAR(20) NOT NULL CHECK (jenis_anestesi IN (''general'',''regional'',''lokal'',''sedasi'')),
          diagnosis_pre_op TEXT NOT NULL, diagnosis_post_op TEXT,
          tindakan_rencana TEXT NOT NULL, tindakan_aktual TEXT,
          icd9cm_code VARCHAR(10), laporan_operasi TEXT, komplikasi TEXT,
          anestesiolog_id UUID,
          perawat_instrumen VARCHAR(200), perawat_sirkuler VARCHAR(200),
          perdarahan_ml INTEGER,
          jaringan_dieksisi TEXT,
          specimen_patologi BOOLEAN DEFAULT false,
          durasi_aktual_menit INTEGER,
          klasifikasi_luka VARCHAR(30),
          status VARCHAR(20) NOT NULL DEFAULT ''dijadwalkan'' CHECK (status IN (''dijadwalkan'',''persiapan'',''berjalan'',''selesai'',''batal'')),
          catatan TEXT,
          created_by UUID NOT NULL, updated_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_surg_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id),
          CONSTRAINT fk_surg_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ SURGERY_TEAM_MEMBERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.surgery_team_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          surgery_id UUID NOT NULL,
          nama VARCHAR(200) NOT NULL,
          peran VARCHAR(50) NOT NULL CHECK (peran IN (
            ''operator_utama'',''operator_asisten'',''anestesiolog'',''penata_anestesi'',
            ''perawat_instrumen'',''perawat_sirkuler'',''perawat_onloop'',''lainnya''
          )),
          no_sip VARCHAR(50), catatan VARCHAR(200),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_stm_surgery FOREIGN KEY (surgery_id) REFERENCES %I.surgeries(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ SURGERY_INSTRUMENTS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.surgery_instruments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          surgery_id UUID NOT NULL,
          nama_instrumen VARCHAR(200) NOT NULL,
          jumlah INTEGER NOT NULL DEFAULT 1,
          keterangan VARCHAR(300),
          status_steril BOOLEAN DEFAULT true,
          dikembalikan BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_si_surgery FOREIGN KEY (surgery_id) REFERENCES %I.surgeries(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ SURGERY_ANESTHESIA ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.surgery_anesthesia (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          surgery_id UUID NOT NULL,
          jenis_anestesi VARCHAR(30) NOT NULL, teknik VARCHAR(200),
          obat_anestesi TEXT, dosis TEXT,
          asa_ps VARCHAR(10), mallampati VARCHAR(10),
          airway_management TEXT, posisi_pasien VARCHAR(100),
          monitoring TEXT, cairan_masuk TEXT, cairan_keluar TEXT,
          komplikasi_anestesi TEXT, catatan TEXT,
          created_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(surgery_id),
          CONSTRAINT fk_sa_surgery FOREIGN KEY (surgery_id) REFERENCES %I.surgeries(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ SURGERY_NURSING ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.surgery_nursing (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          surgery_id UUID NOT NULL,
          fase VARCHAR(10) NOT NULL CHECK (fase IN (''pre'',''intra'',''post'')),
          identitas_verified BOOLEAN, site_marking BOOLEAN, consent_signed BOOLEAN,
          puasa_verified BOOLEAN, alergi_checked BOOLEAN, gigi_palsu_removed BOOLEAN,
          perhiasan_removed BOOLEAN, iv_line_terpasang BOOLEAN, darah_tersedia BOOLEAN,
          time_out_done BOOLEAN,
          counting_kasa_pre INTEGER, counting_kasa_post INTEGER,
          counting_instrumen_pre INTEGER, counting_instrumen_post INTEGER,
          posisi_pasien VARCHAR(100), pemakaian_diatermi BOOLEAN,
          drain_terpasang BOOLEAN, specimen_ada BOOLEAN, specimen_label VARCHAR(200),
          kesadaran_post VARCHAR(50), vital_signs_post JSONB,
          skala_nyeri_post INTEGER, balutan_kondisi VARCHAR(200),
          drain_output VARCHAR(100), instruksi_post_op TEXT,
          catatan TEXT, perawat_nama VARCHAR(200) NOT NULL,
          created_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_sn_surgery FOREIGN KEY (surgery_id) REFERENCES %I.surgeries(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ NUTRITION_ORDERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.nutrition_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL, patient_id UUID NOT NULL,
          diet_type VARCHAR(100) NOT NULL,
          kalori_target INTEGER NOT NULL,
          protein_target INTEGER, karbohidrat_target INTEGER, lemak_target INTEGER,
          catatan_diet TEXT,
          alergi_makanan JSONB DEFAULT ''[]'', pantangan JSONB DEFAULT ''[]'',
          status VARCHAR(20) NOT NULL DEFAULT ''aktif'' CHECK (status IN (''aktif'',''selesai'')),
          assessment_bb NUMERIC(5,1), assessment_tb NUMERIC(5,1),
          assessment_imt NUMERIC(5,2), assessment_lla NUMERIC(5,1),
          assessment_albumin NUMERIC(5,2), assessment_hb NUMERIC(5,2),
          assessment_gds NUMERIC(6,1), assessment_fisik TEXT,
          assessment_riwayat_makan TEXT, assessment_riwayat_penyakit TEXT,
          diagnosis_gizi TEXT,
          intervention_jenis_diet VARCHAR(100), intervention_bentuk_makanan VARCHAR(50),
          intervention_jalur_pemberian VARCHAR(50), intervention_frekuensi VARCHAR(50),
          intervention_keterangan TEXT,
          monitoring_parameter JSONB DEFAULT ''[]'', monitoring_frekuensi VARCHAR(100),
          monitoring_catatan TEXT,
          evaluation_hasil VARCHAR(30), evaluation_target_tercapai BOOLEAN,
          evaluation_catatan TEXT, evaluation_tindak_lanjut TEXT,
          created_by UUID NOT NULL, updated_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_no_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id),
          CONSTRAINT fk_no_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ NUTRITION_LOGS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.nutrition_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nutrition_order_id UUID NOT NULL,
          tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
          waktu_makan VARCHAR(20) NOT NULL CHECK (waktu_makan IN (''pagi'',''siang'',''sore'',''snack_pagi'',''snack_sore'')),
          menu TEXT NOT NULL,
          porsi_disajikan NUMERIC(5,1) NOT NULL DEFAULT 1,
          porsi_dimakan NUMERIC(5,1) NOT NULL DEFAULT 1,
          catatan TEXT, created_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_nl_order FOREIGN KEY (nutrition_order_id) REFERENCES %I.nutrition_orders(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ FOOD_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.food_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nama VARCHAR(200) NOT NULL,
          kategori VARCHAR(50) NOT NULL CHECK (kategori IN (
            ''karbohidrat'',''protein_hewani'',''protein_nabati'',''sayuran'',''buah'',
            ''susu'',''minyak_lemak'',''bumbu'',''minuman'',''snack'',''suplemen'',''lainnya''
          )),
          satuan VARCHAR(30) NOT NULL DEFAULT ''gram'',
          kalori_per_unit NUMERIC(8,2) DEFAULT 0,
          protein_per_unit NUMERIC(8,2) DEFAULT 0,
          karbohidrat_per_unit NUMERIC(8,2) DEFAULT 0,
          lemak_per_unit NUMERIC(8,2) DEFAULT 0,
          harga_per_unit NUMERIC(12,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ MEAL_PLANS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.meal_plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nama VARCHAR(200) NOT NULL, diet_type VARCHAR(100) NOT NULL,
          kalori_total NUMERIC(8,2) DEFAULT 0, protein_total NUMERIC(8,2) DEFAULT 0,
          karbohidrat_total NUMERIC(8,2) DEFAULT 0, lemak_total NUMERIC(8,2) DEFAULT 0,
          total_cost NUMERIC(12,2) DEFAULT 0, catatan TEXT,
          is_active BOOLEAN DEFAULT true, created_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ MEAL_PLAN_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.meal_plan_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          meal_plan_id UUID NOT NULL,
          waktu_makan VARCHAR(20) NOT NULL CHECK (waktu_makan IN (''pagi'',''snack_pagi'',''siang'',''snack_sore'',''sore'')),
          food_item_id UUID,
          nama_menu VARCHAR(300) NOT NULL,
          porsi NUMERIC(8,2) NOT NULL DEFAULT 1,
          satuan VARCHAR(30) DEFAULT ''porsi'',
          kalori NUMERIC(8,2) DEFAULT 0, protein NUMERIC(8,2) DEFAULT 0,
          karbohidrat NUMERIC(8,2) DEFAULT 0, lemak NUMERIC(8,2) DEFAULT 0,
          harga NUMERIC(12,2) DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_mpi_plan FOREIGN KEY (meal_plan_id) REFERENCES %I.meal_plans(id) ON DELETE CASCADE,
          CONSTRAINT fk_mpi_food FOREIGN KEY (food_item_id) REFERENCES %I.food_items(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ ITEM_TRANSFERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.item_transfers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nomor_mutasi VARCHAR(30) NOT NULL UNIQUE,
          drug_id UUID NOT NULL,
          drug_nama VARCHAR(200) NOT NULL,
          from_location VARCHAR(100) NOT NULL, to_location VARCHAR(100) NOT NULL,
          jumlah INTEGER NOT NULL CHECK (jumlah > 0),
          satuan VARCHAR(30) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT ''pending'' CHECK (status IN (''pending'',''approved'',''completed'',''rejected'')),
          catatan TEXT,
          requested_by UUID NOT NULL, approved_by UUID, approved_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          created_by UUID NOT NULL, updated_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_it_drug FOREIGN KEY (drug_id) REFERENCES %I.drugs(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ OTC_SALES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.otc_sales (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          receipt_number VARCHAR(30) NOT NULL UNIQUE,
          nama_pembeli VARCHAR(200) DEFAULT ''Umum'',
          subtotal BIGINT NOT NULL DEFAULT 0,
          diskon BIGINT NOT NULL DEFAULT 0,
          diskon_persen NUMERIC(5,2) DEFAULT 0,
          grand_total BIGINT NOT NULL DEFAULT 0,
          metode_bayar VARCHAR(20) NOT NULL CHECK (metode_bayar IN (''tunai'',''qris'',''debit'',''kredit'')),
          catatan TEXT, created_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ OTC_SALE_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.otc_sale_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          otc_sale_id UUID NOT NULL,
          drug_id UUID NOT NULL,
          drug_nama VARCHAR(200) NOT NULL,
          jumlah INTEGER NOT NULL CHECK (jumlah > 0),
          harga_satuan BIGINT NOT NULL DEFAULT 0,
          total BIGINT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_osi_sale FOREIGN KEY (otc_sale_id) REFERENCES %I.otc_sales(id),
          CONSTRAINT fk_osi_drug FOREIGN KEY (drug_id) REFERENCES %I.drugs(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ SUPPLIERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.suppliers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(30) NOT NULL UNIQUE,
          nama VARCHAR(200) NOT NULL,
          alamat VARCHAR(500), kota VARCHAR(100),
          telepon VARCHAR(30), email VARCHAR(100),
          kontak_person VARCHAR(100), npwp VARCHAR(30),
          catatan TEXT, is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ
        )
      ', 'tenant_' || tenant_slug);

      -- ============ PURCHASE_ORDERS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.purchase_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nomor_po VARCHAR(30) NOT NULL UNIQUE,
          supplier_id UUID NOT NULL,
          status po_status NOT NULL DEFAULT ''draft'',
          tanggal_po DATE NOT NULL DEFAULT CURRENT_DATE,
          tanggal_dibutuhkan DATE,
          subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
          diskon NUMERIC(15,2) NOT NULL DEFAULT 0,
          ppn NUMERIC(15,2) NOT NULL DEFAULT 0,
          grand_total NUMERIC(15,2) NOT NULL DEFAULT 0,
          catatan TEXT,
          created_by UUID, approved_by UUID, approved_at TIMESTAMPTZ,
          received_by UUID, received_at TIMESTAMPTZ, catatan_penerimaan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ,
          CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES %I.suppliers(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ PURCHASE_ORDER_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.purchase_order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          po_id UUID NOT NULL,
          drug_id UUID NOT NULL,
          drug_nama VARCHAR(200) NOT NULL,
          satuan VARCHAR(30) NOT NULL,
          jumlah INTEGER NOT NULL,
          harga_satuan NUMERIC(12,2) NOT NULL,
          total NUMERIC(15,2) NOT NULL,
          jumlah_diterima INTEGER NOT NULL DEFAULT 0,
          batch_number VARCHAR(50), tanggal_kadaluarsa DATE,
          catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_poi_po FOREIGN KEY (po_id) REFERENCES %I.purchase_orders(id) ON DELETE CASCADE,
          CONSTRAINT fk_poi_drug FOREIGN KEY (drug_id) REFERENCES %I.drugs(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ CPPT_ENTRIES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.cppt_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL, patient_id UUID NOT NULL, user_id UUID NOT NULL,
          profesi VARCHAR(30) NOT NULL,
          subjective TEXT, objective TEXT, assessment TEXT, planning TEXT,
          instruksi TEXT, evaluasi TEXT,
          tanggal_waktu TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          is_verified BOOLEAN DEFAULT false,
          verified_by UUID, verified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ,
          CONSTRAINT fk_cppt_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id),
          CONSTRAINT fk_cppt_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id),
          CONSTRAINT fk_cppt_user FOREIGN KEY (user_id) REFERENCES %I.users(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ GENERAL_CONSENTS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.general_consents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL, visit_id UUID,
          persetujuan_rawat BOOLEAN NOT NULL DEFAULT false,
          persetujuan_informasi BOOLEAN NOT NULL DEFAULT false,
          persetujuan_privasi BOOLEAN NOT NULL DEFAULT false,
          persetujuan_biaya BOOLEAN NOT NULL DEFAULT false,
          persetujuan_tata_tertib BOOLEAN NOT NULL DEFAULT false,
          persetujuan_pelepasan_info BOOLEAN NOT NULL DEFAULT false,
          penanggung_jawab_nama VARCHAR(255),
          penanggung_jawab_hubungan VARCHAR(100),
          penanggung_jawab_telepon VARCHAR(20),
          penanggung_jawab_alamat TEXT,
          signed_by VARCHAR(255), signed_at TIMESTAMPTZ,
          catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by UUID, updated_by UUID,
          CONSTRAINT fk_gc_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id) ON DELETE CASCADE,
          CONSTRAINT fk_gc_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id) ON DELETE SET NULL
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ WAREHOUSE_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.warehouse_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(30) NOT NULL UNIQUE,
          nama VARCHAR(200) NOT NULL,
          kategori warehouse_category NOT NULL DEFAULT ''lain_lain'',
          satuan VARCHAR(30) NOT NULL DEFAULT ''pcs'',
          harga_beli NUMERIC(12,2) NOT NULL DEFAULT 0,
          stok_minimum INTEGER NOT NULL DEFAULT 5,
          lokasi VARCHAR(100),
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ WAREHOUSE_STOCKS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.warehouse_stocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_id UUID NOT NULL, batch_number VARCHAR(50),
          tanggal_kadaluarsa DATE,
          stok_awal INTEGER NOT NULL DEFAULT 0,
          stok_sisa INTEGER NOT NULL DEFAULT 0,
          harga_beli_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
          supplier VARCHAR(200),
          tanggal_masuk DATE NOT NULL DEFAULT CURRENT_DATE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_ws_item FOREIGN KEY (item_id) REFERENCES %I.warehouse_items(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ WAREHOUSE_TRANSACTIONS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.warehouse_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          item_id UUID NOT NULL, stock_id UUID,
          tipe VARCHAR(20) NOT NULL,
          jumlah INTEGER NOT NULL,
          stok_sebelum INTEGER NOT NULL, stok_sesudah INTEGER NOT NULL,
          catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID,
          CONSTRAINT fk_wt_item FOREIGN KEY (item_id) REFERENCES %I.warehouse_items(id),
          CONSTRAINT fk_wt_stock FOREIGN KEY (stock_id) REFERENCES %I.warehouse_stocks(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ STOCK_OPNAMES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.stock_opnames (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nomor_opname VARCHAR(30) NOT NULL UNIQUE,
          tipe VARCHAR(20) NOT NULL DEFAULT ''farmasi'',
          tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
          status opname_status NOT NULL DEFAULT ''draft'',
          catatan TEXT,
          started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
          created_by UUID, completed_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ STOCK_OPNAME_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.stock_opname_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          opname_id UUID NOT NULL,
          item_type VARCHAR(20) NOT NULL DEFAULT ''drug'',
          item_id UUID NOT NULL,
          item_nama VARCHAR(200) NOT NULL,
          satuan VARCHAR(30),
          stok_sistem INTEGER NOT NULL DEFAULT 0,
          stok_fisik INTEGER,
          selisih INTEGER GENERATED ALWAYS AS (
            CASE WHEN stok_fisik IS NOT NULL THEN stok_fisik - stok_sistem ELSE NULL END
          ) STORED,
          catatan TEXT, counted_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_soi_opname FOREIGN KEY (opname_id) REFERENCES %I.stock_opnames(id) ON DELETE CASCADE,
          CONSTRAINT uq_soi_item UNIQUE (opname_id, item_type, item_id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ PATIENT_INSURANCES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.patient_insurances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL, insurance_id UUID NOT NULL,
          no_polis VARCHAR(50) NOT NULL,
          kelas VARCHAR(10),
          berlaku_mulai DATE, berlaku_sampai DATE,
          is_active BOOLEAN NOT NULL DEFAULT true,
          catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_pi_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id) ON DELETE CASCADE,
          CONSTRAINT fk_pi_insurance FOREIGN KEY (insurance_id) REFERENCES %I.insurances(id) ON DELETE CASCADE,
          UNIQUE(patient_id, insurance_id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ DOCTOR_SCHEDULES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.doctor_schedules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          doctor_id UUID NOT NULL, room_id UUID NOT NULL,
          hari VARCHAR(10) NOT NULL CHECK (hari IN (''senin'',''selasa'',''rabu'',''kamis'',''jumat'',''sabtu'',''minggu'')),
          jam_mulai TIME NOT NULL, jam_selesai TIME NOT NULL,
          kuota INTEGER NOT NULL DEFAULT 30,
          is_active BOOLEAN NOT NULL DEFAULT true,
          catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_ds_doctor FOREIGN KEY (doctor_id) REFERENCES %I.doctors(id) ON DELETE CASCADE,
          CONSTRAINT fk_ds_room FOREIGN KEY (room_id) REFERENCES %I.rooms(id) ON DELETE CASCADE,
          CONSTRAINT uq_ds_doctor_day_room UNIQUE (doctor_id, room_id, hari),
          CONSTRAINT chk_ds_time CHECK (jam_mulai < jam_selesai)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ DOCTOR_FEES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.doctor_fees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          doctor_id UUID NOT NULL,
          kode VARCHAR(30) NOT NULL,
          nama_layanan VARCHAR(200) NOT NULL,
          kategori VARCHAR(50) NOT NULL DEFAULT ''konsultasi'',
          tarif NUMERIC(12,2) NOT NULL DEFAULT 0,
          persentase_dokter NUMERIC(5,2) NOT NULL DEFAULT 80,
          persentase_rs NUMERIC(5,2) NOT NULL DEFAULT 20,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_df_doctor FOREIGN KEY (doctor_id) REFERENCES %I.doctors(id) ON DELETE CASCADE,
          CONSTRAINT uq_df_doctor_kode UNIQUE (doctor_id, kode),
          CONSTRAINT chk_df_persen CHECK (persentase_dokter + persentase_rs = 100)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ DOCTOR_FEE_TRANSACTIONS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.doctor_fee_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          doctor_id UUID NOT NULL, visit_id UUID NOT NULL,
          fee_id UUID, deskripsi TEXT NOT NULL,
          tarif NUMERIC(12,2) NOT NULL DEFAULT 0,
          jumlah_dokter NUMERIC(12,2) NOT NULL DEFAULT 0,
          jumlah_rs NUMERIC(12,2) NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT ''pending'',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_dft_doctor FOREIGN KEY (doctor_id) REFERENCES %I.doctors(id) ON DELETE CASCADE,
          CONSTRAINT fk_dft_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id) ON DELETE CASCADE,
          CONSTRAINT fk_dft_fee FOREIGN KEY (fee_id) REFERENCES %I.doctor_fees(id) ON DELETE SET NULL
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ NURSING_ASSESSMENTS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.nursing_assessments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL, patient_id UUID NOT NULL, nurse_id UUID NOT NULL,
          tanggal_pengkajian TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          keluhan_utama TEXT, riwayat_penyakit_sekarang TEXT,
          riwayat_penyakit_dahulu TEXT, riwayat_alergi TEXT, riwayat_pengobatan TEXT,
          tekanan_darah_sistolik INTEGER, tekanan_darah_diastolik INTEGER,
          nadi INTEGER, suhu NUMERIC(4,1), respirasi INTEGER, spo2 INTEGER,
          tinggi_badan NUMERIC(5,1), berat_badan NUMERIC(5,1), imt NUMERIC(5,2),
          nyeri_ada BOOLEAN DEFAULT false, nyeri_skala INTEGER DEFAULT 0,
          nyeri_lokasi VARCHAR(100), nyeri_karakteristik VARCHAR(100),
          nyeri_durasi VARCHAR(50), nyeri_frekuensi VARCHAR(50), nyeri_penyebab TEXT,
          jatuh_riwayat BOOLEAN DEFAULT false, jatuh_diagnosis_sekunder BOOLEAN DEFAULT false,
          jatuh_alat_bantu VARCHAR(30) DEFAULT ''tidak_ada'',
          jatuh_terpasang_infus BOOLEAN DEFAULT false,
          jatuh_cara_berjalan VARCHAR(30) DEFAULT ''normal'',
          jatuh_status_mental VARCHAR(30) DEFAULT ''orientasi_baik'',
          jatuh_skor_total INTEGER DEFAULT 0, jatuh_kategori VARCHAR(20) DEFAULT ''rendah'',
          barthel_makan INTEGER DEFAULT 10, barthel_mandi INTEGER DEFAULT 5,
          barthel_perawatan_diri INTEGER DEFAULT 5, barthel_berpakaian INTEGER DEFAULT 10,
          barthel_bab INTEGER DEFAULT 10, barthel_bak INTEGER DEFAULT 10,
          barthel_toileting INTEGER DEFAULT 10, barthel_transfer INTEGER DEFAULT 15,
          barthel_mobilitas INTEGER DEFAULT 15, barthel_naik_tangga INTEGER DEFAULT 10,
          barthel_skor_total INTEGER DEFAULT 100, barthel_kategori VARCHAR(30) DEFAULT ''mandiri'',
          nutrisi_penurunan_bb BOOLEAN DEFAULT false, nutrisi_asupan_kurang BOOLEAN DEFAULT false,
          nutrisi_kondisi_khusus BOOLEAN DEFAULT false,
          nutrisi_skor INTEGER DEFAULT 0, nutrisi_kategori VARCHAR(30) DEFAULT ''tidak_berisiko'',
          psikososial_status VARCHAR(50), psikososial_hubungan_keluarga VARCHAR(50),
          spiritual_agama VARCHAR(30), spiritual_kebutuhan TEXT,
          edukasi_hambatan TEXT, edukasi_kebutuhan TEXT, edukasi_diberikan TEXT,
          discharge_plan TEXT,
          data_tambahan JSONB DEFAULT ''{}''::jsonb,
          status VARCHAR(20) NOT NULL DEFAULT ''draft'',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by UUID, updated_by UUID,
          CONSTRAINT fk_na_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id) ON DELETE CASCADE,
          CONSTRAINT fk_na_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id),
          CONSTRAINT fk_na_nurse FOREIGN KEY (nurse_id) REFERENCES %I.users(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ DIGITAL_SIGNATURES (TTE) ============
      EXECUTE format('
        DO $e$ BEGIN CREATE TYPE %I.signature_level_type AS ENUM (
          ''basic'', ''advanced'', ''qualified''
        ); EXCEPTION WHEN duplicate_object THEN NULL; END $e$;
      ', 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.digital_signatures (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_type VARCHAR(50) NOT NULL,
          document_id UUID NOT NULL,
          signer_id UUID NOT NULL,
          signer_name VARCHAR(200) NOT NULL,
          signer_role VARCHAR(50) NOT NULL,
          signer_sip VARCHAR(50),
          signature_data TEXT,
          signature_hash VARCHAR(128) NOT NULL,
          certificate_serial VARCHAR(200),
          certificate_issuer VARCHAR(200),
          signature_level VARCHAR(20) NOT NULL DEFAULT ''basic'',
          verification_url TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      EXECUTE format('ALTER TABLE %I.medical_records ADD COLUMN IF NOT EXISTS tte_signature_id UUID, ADD COLUMN IF NOT EXISTS tte_signed_at TIMESTAMPTZ', 'tenant_' || tenant_slug);
      EXECUTE format('ALTER TABLE %I.cppt_entries ADD COLUMN IF NOT EXISTS tte_signature_id UUID, ADD COLUMN IF NOT EXISTS tte_signed_at TIMESTAMPTZ', 'tenant_' || tenant_slug);
      EXECUTE format('ALTER TABLE %I.general_consents ADD COLUMN IF NOT EXISTS tte_signature_id UUID, ADD COLUMN IF NOT EXISTS tte_signed_at TIMESTAMPTZ', 'tenant_' || tenant_slug);

      -- ============ ANTROL_BOOKINGS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.antrol_bookings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kodebooking VARCHAR(100) NOT NULL UNIQUE,
          nomorkartu VARCHAR(20) NOT NULL,
          nik VARCHAR(20),
          nohp VARCHAR(20),
          patient_id UUID,
          visit_id UUID,
          kodepoli VARCHAR(10) NOT NULL,
          namapoli VARCHAR(100),
          kodedokter VARCHAR(20) NOT NULL,
          namadokter VARCHAR(200),
          tanggalperiksa DATE NOT NULL,
          jampraktek VARCHAR(20),
          jeniskunjungan INTEGER NOT NULL DEFAULT 1,
          nomorreferensi VARCHAR(50),
          nomorantrean VARCHAR(10),
          angkaantrean INTEGER,
          estimasidilayani BIGINT,
          status VARCHAR(20) NOT NULL DEFAULT ''menunggu'',
          taskid INTEGER NOT NULL DEFAULT 0,
          keterangan_batal TEXT,
          source VARCHAR(20) NOT NULL DEFAULT ''mobile_jkn'',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_antrol_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id) ON DELETE SET NULL,
          CONSTRAINT fk_antrol_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id) ON DELETE SET NULL
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ ALTER DRUGS — kfa_code + CDSS columns ============
      EXECUTE format('ALTER TABLE %I.drugs ADD COLUMN IF NOT EXISTS kfa_code VARCHAR(30)', 'tenant_' || tenant_slug);
      EXECUTE format('ALTER TABLE %I.drugs ADD COLUMN IF NOT EXISTS is_high_alert BOOLEAN NOT NULL DEFAULT false', 'tenant_' || tenant_slug);
      EXECUTE format('ALTER TABLE %I.drugs ADD COLUMN IF NOT EXISTS is_lasa BOOLEAN NOT NULL DEFAULT false', 'tenant_' || tenant_slug);
      EXECUTE format('ALTER TABLE %I.drugs ADD COLUMN IF NOT EXISTS is_norum BOOLEAN NOT NULL DEFAULT false', 'tenant_' || tenant_slug);
      EXECUTE format('ALTER TABLE %I.drugs ADD COLUMN IF NOT EXISTS max_dose_per_day NUMERIC(10,2)', 'tenant_' || tenant_slug);
      EXECUTE format('ALTER TABLE %I.drugs ADD COLUMN IF NOT EXISTS max_dose_unit VARCHAR(30)', 'tenant_' || tenant_slug);
      EXECUTE format('ALTER TABLE %I.drugs ADD COLUMN IF NOT EXISTS high_alert_category VARCHAR(50)', 'tenant_' || tenant_slug);
      EXECUTE format('ALTER TABLE %I.drugs ADD COLUMN IF NOT EXISTS lasa_pairs TEXT', 'tenant_' || tenant_slug);
      EXECUTE format('ALTER TABLE %I.drugs ADD COLUMN IF NOT EXISTS special_instructions TEXT', 'tenant_' || tenant_slug);

      -- ============ CDSS_ALERTS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.cdss_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID,
          patient_id UUID,
          prescription_id UUID,
          alert_type VARCHAR(30) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          title VARCHAR(300) NOT NULL,
          message TEXT NOT NULL,
          drug_ids UUID[],
          drug_names TEXT[],
          interaction_id UUID,
          is_overridden BOOLEAN DEFAULT false,
          overridden_by UUID,
          override_reason TEXT,
          overridden_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ CHART_OF_ACCOUNTS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.chart_of_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(20) NOT NULL,
          nama VARCHAR(200) NOT NULL,
          tipe VARCHAR(20) NOT NULL CHECK (tipe IN (''aset'',''kewajiban'',''ekuitas'',''pendapatan'',''beban'')),
          sub_tipe VARCHAR(50),
          parent_id UUID,
          level INTEGER NOT NULL DEFAULT 1,
          is_header BOOLEAN DEFAULT false,
          saldo_normal VARCHAR(10) NOT NULL CHECK (saldo_normal IN (''debit'',''kredit'')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (kode),
          CONSTRAINT fk_coa_parent FOREIGN KEY (parent_id) REFERENCES %I.chart_of_accounts(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ JOURNAL_ENTRIES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.journal_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nomor_jurnal VARCHAR(30) NOT NULL,
          tanggal DATE NOT NULL,
          deskripsi TEXT NOT NULL,
          referensi_tipe VARCHAR(30),
          referensi_id UUID,
          total_debit NUMERIC(14,2) NOT NULL DEFAULT 0,
          total_kredit NUMERIC(14,2) NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT ''draft'' CHECK (status IN (''draft'',''posted'',''reversed'')),
          posted_at TIMESTAMPTZ,
          posted_by UUID,
          reversed_by UUID,
          reversed_at TIMESTAMPTZ,
          reverse_ref UUID,
          catatan TEXT,
          created_by UUID NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (nomor_jurnal),
          CONSTRAINT fk_je_reverse FOREIGN KEY (reverse_ref) REFERENCES %I.journal_entries(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ JOURNAL_ENTRY_LINES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.journal_entry_lines (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          journal_entry_id UUID NOT NULL,
          account_id UUID NOT NULL,
          deskripsi VARCHAR(300),
          debit NUMERIC(14,2) NOT NULL DEFAULT 0,
          kredit NUMERIC(14,2) NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT fk_jel_journal FOREIGN KEY (journal_entry_id) REFERENCES %I.journal_entries(id) ON DELETE CASCADE,
          CONSTRAINT fk_jel_account FOREIGN KEY (account_id) REFERENCES %I.chart_of_accounts(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ FISCAL_PERIODS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.fiscal_periods (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nama VARCHAR(100) NOT NULL,
          tipe VARCHAR(20) NOT NULL CHECK (tipe IN (''bulanan'',''tahunan'')),
          tanggal_mulai DATE NOT NULL,
          tanggal_selesai DATE NOT NULL,
          is_closed BOOLEAN DEFAULT false,
          closed_at TIMESTAMPTZ,
          closed_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ HRIS ENUMS ============
      EXECUTE format('DO $e$ BEGIN CREATE TYPE %I.status_kepegawaian_type AS ENUM (''tetap'',''kontrak'',''magang'',''honorer''); EXCEPTION WHEN duplicate_object THEN NULL; END $e$', 'tenant_' || tenant_slug);
      EXECUTE format('DO $e$ BEGIN CREATE TYPE %I.attendance_status_type AS ENUM (''hadir'',''izin'',''sakit'',''cuti'',''alpha'',''libur'',''dinas_luar''); EXCEPTION WHEN duplicate_object THEN NULL; END $e$', 'tenant_' || tenant_slug);
      EXECUTE format('DO $e$ BEGIN CREATE TYPE %I.leave_type AS ENUM (''cuti_tahunan'',''cuti_sakit'',''cuti_melahirkan'',''cuti_besar'',''izin_khusus''); EXCEPTION WHEN duplicate_object THEN NULL; END $e$', 'tenant_' || tenant_slug);
      EXECUTE format('DO $e$ BEGIN CREATE TYPE %I.leave_status_type AS ENUM (''pending'',''approved'',''rejected'',''cancelled''); EXCEPTION WHEN duplicate_object THEN NULL; END $e$', 'tenant_' || tenant_slug);
      EXECUTE format('DO $e$ BEGIN CREATE TYPE %I.payroll_status_type AS ENUM (''draft'',''processing'',''finalized'',''paid''); EXCEPTION WHEN duplicate_object THEN NULL; END $e$', 'tenant_' || tenant_slug);

      -- ============ DEPARTMENTS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.departments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(20) NOT NULL UNIQUE,
          nama VARCHAR(100) NOT NULL,
          kepala_departemen_id UUID,
          deskripsi TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ EMPLOYEES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.employees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          nip VARCHAR(30) UNIQUE,
          nik VARCHAR(16),
          nama VARCHAR(100) NOT NULL,
          tempat_lahir VARCHAR(100), tanggal_lahir DATE,
          jenis_kelamin VARCHAR(10), agama VARCHAR(20),
          alamat TEXT, no_telepon VARCHAR(20), email VARCHAR(100), foto_url TEXT,
          jabatan VARCHAR(100) NOT NULL,
          departemen VARCHAR(100),
          status_kepegawaian VARCHAR(30) NOT NULL DEFAULT ''tetap'',
          tanggal_masuk DATE NOT NULL,
          tanggal_keluar DATE, alasan_keluar TEXT,
          no_sip VARCHAR(50), no_str VARCHAR(50),
          pendidikan_terakhir VARCHAR(50), jurusan VARCHAR(100), universitas VARCHAR(200),
          gaji_pokok NUMERIC(12,2) NOT NULL DEFAULT 0,
          tunjangan_tetap NUMERIC(12,2) DEFAULT 0,
          tunjangan_fungsional NUMERIC(12,2) DEFAULT 0,
          nomor_rekening VARCHAR(30), nama_bank VARCHAR(50), nama_pemilik_rekening VARCHAR(100),
          no_bpjs_kesehatan VARCHAR(20), no_bpjs_ketenagakerjaan VARCHAR(20), npwp VARCHAR(30),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          deleted_at TIMESTAMPTZ,
          CONSTRAINT fk_emp_user FOREIGN KEY (user_id) REFERENCES %I.users(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      EXECUTE format('ALTER TABLE %I.departments ADD CONSTRAINT fk_dept_kepala FOREIGN KEY (kepala_departemen_id) REFERENCES %I.employees(id)', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ SHIFT_TEMPLATES ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.shift_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nama VARCHAR(50) NOT NULL,
          kode VARCHAR(10) NOT NULL UNIQUE,
          jam_mulai TIME NOT NULL,
          jam_selesai TIME NOT NULL,
          durasi_jam NUMERIC(4,1) NOT NULL,
          warna VARCHAR(7) DEFAULT ''#3B82F6'',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ SHIFT_ASSIGNMENTS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.shift_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL,
          shift_id UUID NOT NULL,
          tanggal DATE NOT NULL,
          catatan TEXT,
          assigned_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT fk_sa_emp FOREIGN KEY (employee_id) REFERENCES %I.employees(id),
          CONSTRAINT fk_sa_shift FOREIGN KEY (shift_id) REFERENCES %I.shift_templates(id),
          CONSTRAINT fk_sa_user FOREIGN KEY (assigned_by) REFERENCES %I.users(id),
          CONSTRAINT uq_sa_emp_date UNIQUE (employee_id, tanggal)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ ATTENDANCE_RECORDS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.attendance_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL,
          tanggal DATE NOT NULL,
          jam_masuk TIMESTAMPTZ,
          jam_keluar TIMESTAMPTZ,
          status VARCHAR(20) NOT NULL DEFAULT ''hadir'',
          keterangan TEXT,
          shift_id UUID,
          terlambat_menit INTEGER DEFAULT 0,
          lembur_menit INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT fk_att_emp FOREIGN KEY (employee_id) REFERENCES %I.employees(id),
          CONSTRAINT fk_att_shift FOREIGN KEY (shift_id) REFERENCES %I.shift_templates(id),
          CONSTRAINT uq_att_emp_date UNIQUE (employee_id, tanggal)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ LEAVE_REQUESTS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.leave_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL,
          jenis VARCHAR(30) NOT NULL,
          tanggal_mulai DATE NOT NULL,
          tanggal_selesai DATE NOT NULL,
          jumlah_hari INTEGER NOT NULL,
          alasan TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT ''pending'',
          approved_by UUID,
          approved_at TIMESTAMPTZ,
          rejected_reason TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT fk_lr_emp FOREIGN KEY (employee_id) REFERENCES %I.employees(id),
          CONSTRAINT fk_lr_approver FOREIGN KEY (approved_by) REFERENCES %I.users(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ PAYROLL_PERIODS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.payroll_periods (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bulan INTEGER NOT NULL,
          tahun INTEGER NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT ''draft'',
          tanggal_proses TIMESTAMPTZ,
          tanggal_bayar TIMESTAMPTZ,
          total_gaji_pokok NUMERIC(14,2) DEFAULT 0,
          total_tunjangan NUMERIC(14,2) DEFAULT 0,
          total_potongan NUMERIC(14,2) DEFAULT 0,
          total_bersih NUMERIC(14,2) DEFAULT 0,
          jumlah_pegawai INTEGER DEFAULT 0,
          processed_by UUID,
          finalized_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT fk_pp_processor FOREIGN KEY (processed_by) REFERENCES %I.users(id),
          CONSTRAINT fk_pp_finalizer FOREIGN KEY (finalized_by) REFERENCES %I.users(id),
          CONSTRAINT uq_pp_period UNIQUE (bulan, tahun)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ PAYROLL_ITEMS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.payroll_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payroll_period_id UUID NOT NULL,
          employee_id UUID NOT NULL,
          gaji_pokok NUMERIC(12,2) NOT NULL DEFAULT 0,
          tunjangan_tetap NUMERIC(12,2) DEFAULT 0,
          tunjangan_fungsional NUMERIC(12,2) DEFAULT 0,
          tunjangan_kehadiran NUMERIC(12,2) DEFAULT 0,
          tunjangan_lembur NUMERIC(12,2) DEFAULT 0,
          tunjangan_lain NUMERIC(12,2) DEFAULT 0,
          jasa_medis NUMERIC(12,2) DEFAULT 0,
          total_pendapatan NUMERIC(14,2) NOT NULL DEFAULT 0,
          potongan_bpjs_kesehatan NUMERIC(12,2) DEFAULT 0,
          potongan_bpjs_tk NUMERIC(12,2) DEFAULT 0,
          potongan_pph21 NUMERIC(12,2) DEFAULT 0,
          potongan_lain NUMERIC(12,2) DEFAULT 0,
          total_potongan NUMERIC(14,2) NOT NULL DEFAULT 0,
          gaji_bersih NUMERIC(14,2) NOT NULL DEFAULT 0,
          hari_kerja INTEGER DEFAULT 0,
          hari_hadir INTEGER DEFAULT 0,
          hari_sakit INTEGER DEFAULT 0,
          hari_izin INTEGER DEFAULT 0,
          hari_alpha INTEGER DEFAULT 0,
          jam_lembur NUMERIC(5,1) DEFAULT 0,
          catatan TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT fk_pi_period FOREIGN KEY (payroll_period_id) REFERENCES %I.payroll_periods(id) ON DELETE CASCADE,
          CONSTRAINT fk_pi_emp FOREIGN KEY (employee_id) REFERENCES %I.employees(id),
          CONSTRAINT uq_pi_emp_period UNIQUE (payroll_period_id, employee_id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ EDUCATION_TOPICS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.education_topics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(20) NOT NULL UNIQUE,
          nama VARCHAR(200) NOT NULL,
          kategori VARCHAR(50) NOT NULL,
          deskripsi TEXT,
          materi TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ PATIENT_EDUCATION_RECORDS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.patient_education_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL,
          patient_id UUID NOT NULL,
          educator_id UUID NOT NULL,
          tanggal TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          topic_id UUID,
          topik_manual VARCHAR(300),
          kategori VARCHAR(50) NOT NULL,
          materi_diberikan TEXT NOT NULL,
          metode TEXT[] NOT NULL,
          bahasa VARCHAR(30) NOT NULL DEFAULT ''Indonesia'',
          sasaran VARCHAR(30) NOT NULL DEFAULT ''pasien'',
          nama_sasaran VARCHAR(100),
          hubungan_sasaran VARCHAR(50),
          evaluasi_pemahaman VARCHAR(20) NOT NULL DEFAULT ''baik'',
          evaluasi_catatan TEXT,
          perlu_reedukasi BOOLEAN NOT NULL DEFAULT false,
          reedukasi_tanggal DATE,
          reedukasi_ref UUID,
          verified_by_patient BOOLEAN NOT NULL DEFAULT false,
          patient_signature TEXT,
          verified_at TIMESTAMPTZ,
          status VARCHAR(20) NOT NULL DEFAULT ''completed'',
          catatan TEXT,
          created_by UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_per_visit FOREIGN KEY (visit_id) REFERENCES %I.visits(id),
          CONSTRAINT fk_per_patient FOREIGN KEY (patient_id) REFERENCES %I.patients(id),
          CONSTRAINT fk_per_topic FOREIGN KEY (topic_id) REFERENCES %I.education_topics(id),
          CONSTRAINT fk_per_reedu FOREIGN KEY (reedukasi_ref) REFERENCES %I.patient_education_records(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug);

      -- ============ MCU (MEDICAL CHECK UP) ============
      -- MCU enum types are created in public schema (above)

      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.mcu_packages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nama VARCHAR(100) NOT NULL,
          kode VARCHAR(20) NOT NULL,
          deskripsi TEXT,
          harga DECIMAL(12,2) NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(kode)
        )
      ', 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.mcu_package_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          package_id UUID NOT NULL REFERENCES %I.mcu_packages(id) ON DELETE CASCADE,
          kategori mcu_exam_category NOT NULL,
          nama VARCHAR(200) NOT NULL,
          deskripsi TEXT,
          is_required BOOLEAN NOT NULL DEFAULT true,
          sort_order INT NOT NULL DEFAULT 0
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.mcu_registrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES %I.patients(id),
          visit_id UUID REFERENCES %I.visits(id),
          package_id UUID NOT NULL REFERENCES %I.mcu_packages(id),
          doctor_id UUID REFERENCES %I.doctors(id),
          status mcu_status NOT NULL DEFAULT ''registered'',
          tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
          tujuan VARCHAR(100),
          perusahaan VARCHAR(200),
          conclusion mcu_conclusion_type,
          conclusion_notes TEXT,
          concluded_at TIMESTAMPTZ,
          concluded_by UUID REFERENCES %I.users(id),
          certificate_number VARCHAR(50),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by UUID REFERENCES %I.users(id)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.mcu_examinations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          registration_id UUID NOT NULL REFERENCES %I.mcu_registrations(id) ON DELETE CASCADE,
          package_item_id UUID REFERENCES %I.mcu_package_items(id),
          kategori mcu_exam_category NOT NULL,
          nama VARCHAR(200) NOT NULL,
          hasil TEXT,
          nilai VARCHAR(100),
          satuan VARCHAR(50),
          nilai_normal VARCHAR(100),
          is_abnormal BOOLEAN DEFAULT false,
          is_completed BOOLEAN NOT NULL DEFAULT false,
          completed_at TIMESTAMPTZ,
          completed_by UUID REFERENCES %I.users(id),
          catatan TEXT,
          lab_order_id UUID,
          radiology_order_id UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug,
         'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ PUSH SUBSCRIPTIONS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.push_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES %I.users(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_agent TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, endpoint)
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ============ ALL INDEXES ============
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_push_sub_user ON %I.push_subscriptions(user_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mcu_reg_patient ON %I.mcu_registrations(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mcu_reg_status ON %I.mcu_registrations(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mcu_reg_tanggal ON %I.mcu_registrations(tanggal)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mcu_reg_package ON %I.mcu_registrations(package_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mcu_exam_reg ON %I.mcu_examinations(registration_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mcu_exam_kategori ON %I.mcu_examinations(kategori)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_users_email ON %I.users(email)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_users_role ON %I.users(role)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_patients_nik ON %I.patients(nik)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_patients_nama ON %I.patients(nama)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_patients_no_rm ON %I.patients(no_rekam_medis)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_patients_no_bpjs ON %I.patients(no_bpjs)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_patients_satusehat ON %I.patients(satusehat_patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_doctors_user ON %I.doctors(user_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_beds_room ON %I.beds(room_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_beds_status ON %I.beds(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_patient ON %I.visits(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_tanggal ON %I.visits(tanggal)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_status ON %I.visits(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_room ON %I.visits(room_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_doctor ON %I.visits(doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_number ON %I.visits(visit_number)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_satusehat_enc ON %I.visits(satusehat_encounter_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_satusehat_status ON %I.visits(satusehat_sync_status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_triage ON %I.visits(triage_level) WHERE tipe = ''igd''', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_visits_igd_active ON %I.visits(tipe, status) WHERE tipe = ''igd'' AND deleted_at IS NULL', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_queues_visit ON %I.queues(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_queues_room_status ON %I.queues(room_id, status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mr_visit ON %I.medical_records(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mr_patient ON %I.medical_records(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mr_doctor ON %I.medical_records(doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mr_status ON %I.medical_records(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dx_mr ON %I.diagnoses(medical_record_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dx_code ON %I.diagnoses(icd10_code)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dx_satusehat ON %I.diagnoses(satusehat_condition_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_proc_mr ON %I.procedures(medical_record_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_rx_mr ON %I.prescriptions(medical_record_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_rx_visit ON %I.prescriptions(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_rx_status ON %I.prescriptions(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_rxi_rx ON %I.prescription_items(prescription_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_tpl_category ON %I.medical_templates(category)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_tpl_doctor ON %I.medical_templates(doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_drugs_kode ON %I.drugs(kode)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_drugs_nama ON %I.drugs(nama)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_drugs_kategori ON %I.drugs(kategori)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ds_drug ON %I.drug_stocks(drug_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ds_exp ON %I.drug_stocks(tanggal_kadaluarsa)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ds_sisa ON %I.drug_stocks(stok_sisa)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dt_drug ON %I.drug_transactions(drug_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dt_tipe ON %I.drug_transactions(tipe)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dt_ref ON %I.drug_transactions(referensi_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_disp_rx ON %I.dispensing(prescription_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_disp_visit ON %I.dispensing(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_disp_status ON %I.dispensing(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_di_disp ON %I.dispensing_items(dispensing_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bills_visit ON %I.bills(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bills_patient ON %I.bills(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bills_status ON %I.bills(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bills_created ON %I.bills(created_at)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bi_bill ON %I.bill_items(bill_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bi_kategori ON %I.bill_items(kategori)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_pay_bill ON %I.payments(bill_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_pay_paid_at ON %I.payments(paid_at)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_pay_metode ON %I.payments(metode)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dep_patient ON %I.deposits(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dep_visit ON %I.deposits(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dep_status ON %I.deposits(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_lo_visit ON %I.lab_orders(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_lo_patient ON %I.lab_orders(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_lo_doctor ON %I.lab_orders(doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_lo_status ON %I.lab_orders(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_lo_tanggal ON %I.lab_orders(tanggal_order)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_lo_prioritas ON %I.lab_orders(prioritas)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_loi_order ON %I.lab_order_items(lab_order_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ro_visit ON %I.radiology_orders(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ro_patient ON %I.radiology_orders(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ro_doctor ON %I.radiology_orders(doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ro_status ON %I.radiology_orders(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ro_tanggal ON %I.radiology_orders(tanggal_order)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ro_modalitas ON %I.radiology_orders(modalitas)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_surgeries_visit ON %I.surgeries(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON %I.surgeries(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_surgeries_doctor ON %I.surgeries(doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_surgeries_date ON %I.surgeries(tanggal_operasi)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_surgeries_status ON %I.surgeries(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_surgeries_room_date ON %I.surgeries(ruang_operasi, tanggal_operasi)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_surgery_team_sid ON %I.surgery_team_members(surgery_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_surgery_instr_sid ON %I.surgery_instruments(surgery_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_surgery_nursing_sid ON %I.surgery_nursing(surgery_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_nutrition_orders_visit ON %I.nutrition_orders(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_nutrition_orders_patient ON %I.nutrition_orders(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_nutrition_orders_status ON %I.nutrition_orders(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_nutrition_logs_order ON %I.nutrition_logs(nutrition_order_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_mpi_plan ON %I.meal_plan_items(meal_plan_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_item_transfers_status ON %I.item_transfers(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_item_transfers_drug ON %I.item_transfers(drug_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_item_transfers_from ON %I.item_transfers(from_location)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_item_transfers_nomor ON %I.item_transfers(nomor_mutasi)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_otc_sales_date ON %I.otc_sales(created_at)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_otc_sales_receipt ON %I.otc_sales(receipt_number)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_otc_sale_items_sale ON %I.otc_sale_items(otc_sale_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_cppt_visit_time ON %I.cppt_entries(visit_id, tanggal_waktu)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_cppt_patient_time ON %I.cppt_entries(patient_id, tanggal_waktu)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_general_consents_patient ON %I.general_consents(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_general_consents_visit ON %I.general_consents(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_wi_kode ON %I.warehouse_items(kode)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_wi_kategori ON %I.warehouse_items(kategori)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ws_item ON %I.warehouse_stocks(item_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_wt_item ON %I.warehouse_transactions(item_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_so_status ON %I.stock_opnames(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_so_tipe ON %I.stock_opnames(tipe)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_soi_opname ON %I.stock_opname_items(opname_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ins_kode ON %I.insurances(kode)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ins_tipe ON %I.insurances(tipe)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_pi_patient ON %I.patient_insurances(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_pi_insurance ON %I.patient_insurances(insurance_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ds_doctor ON %I.doctor_schedules(doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ds_room ON %I.doctor_schedules(room_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_ds_hari ON %I.doctor_schedules(hari)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_df_doctor ON %I.doctor_fees(doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_df_kategori ON %I.doctor_fees(kategori)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dft_doctor ON %I.doctor_fee_transactions(doctor_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dft_visit ON %I.doctor_fee_transactions(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dft_status ON %I.doctor_fee_transactions(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dft_created ON %I.doctor_fee_transactions(created_at)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_na_visit ON %I.nursing_assessments(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_na_patient ON %I.nursing_assessments(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_na_nurse ON %I.nursing_assessments(nurse_id)', 'tenant_' || tenant_slug);
      -- Digital Signatures indexes
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_digsig_doc ON %I.digital_signatures(document_type, document_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_digsig_signer ON %I.digital_signatures(signer_id)', 'tenant_' || tenant_slug);
      -- Antrol indexes
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_antrol_tgl ON %I.antrol_bookings(tanggalperiksa)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_antrol_poli ON %I.antrol_bookings(kodepoli)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_antrol_status ON %I.antrol_bookings(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_antrol_kartu ON %I.antrol_bookings(nomorkartu)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_antrol_patient ON %I.antrol_bookings(patient_id)', 'tenant_' || tenant_slug);
      -- CDSS indexes
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_cdss_visit ON %I.cdss_alerts(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_cdss_type ON %I.cdss_alerts(alert_type)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_cdss_severity ON %I.cdss_alerts(severity)', 'tenant_' || tenant_slug);
      -- Accounting indexes
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_coa_kode ON %I.chart_of_accounts(kode)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_coa_tipe ON %I.chart_of_accounts(tipe)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_je_tanggal ON %I.journal_entries(tanggal)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_je_status ON %I.journal_entries(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_je_nomor ON %I.journal_entries(nomor_jurnal)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_jel_account ON %I.journal_entry_lines(account_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_jel_journal ON %I.journal_entry_lines(journal_entry_id)', 'tenant_' || tenant_slug);
      -- HRIS indexes
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_emp_dept ON %I.employees(departemen)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_emp_active ON %I.employees(is_active)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_emp_status ON %I.employees(status_kepegawaian)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_emp_nama ON %I.employees(nama)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_sa_date ON %I.shift_assignments(tanggal)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_att_date ON %I.attendance_records(tanggal)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_att_status ON %I.attendance_records(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_lr_emp ON %I.leave_requests(employee_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_lr_status ON %I.leave_requests(status)', 'tenant_' || tenant_slug);
      -- Education indexes
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_edu_topic_kat ON %I.education_topics(kategori)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_edu_topic_active ON %I.education_topics(is_active)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_edu_rec_visit ON %I.patient_education_records(visit_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_edu_rec_patient ON %I.patient_education_records(patient_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_edu_rec_educator ON %I.patient_education_records(educator_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_edu_rec_topic ON %I.patient_education_records(topic_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_edu_rec_status ON %I.patient_education_records(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_edu_rec_reedu ON %I.patient_education_records(perlu_reedukasi)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_edu_rec_tanggal ON %I.patient_education_records(tanggal)', 'tenant_' || tenant_slug);

      -- ============ ASSETS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.assets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode VARCHAR(50) NOT NULL,
          nama VARCHAR(300) NOT NULL,
          kategori VARCHAR(50) NOT NULL DEFAULT ''medis'',
          merk VARCHAR(200), model VARCHAR(200), serial_number VARCHAR(200),
          tahun_pembelian INTEGER, tanggal_pembelian DATE,
          harga_perolehan DECIMAL(15,2) NOT NULL DEFAULT 0,
          vendor VARCHAR(300), no_faktur VARCHAR(100),
          umur_ekonomis_tahun INTEGER NOT NULL DEFAULT 5,
          nilai_residu DECIMAL(15,2) NOT NULL DEFAULT 0,
          metode_penyusutan VARCHAR(20) NOT NULL DEFAULT ''garis_lurus'',
          lokasi_gedung VARCHAR(200), lokasi_lantai VARCHAR(50), lokasi_ruangan VARCHAR(200),
          penanggung_jawab VARCHAR(200),
          kondisi VARCHAR(20) NOT NULL DEFAULT ''baik'',
          status VARCHAR(20) NOT NULL DEFAULT ''aktif'',
          garansi_mulai DATE, garansi_berakhir DATE,
          tanggal_kalibrasi_terakhir DATE, interval_kalibrasi_bulan INTEGER,
          catatan TEXT, foto_url VARCHAR(500),
          deleted_at TIMESTAMPTZ, created_by UUID, updated_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_asset_kode UNIQUE (kode)
        )
      ', 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.asset_maintenances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          asset_id UUID NOT NULL,
          tipe VARCHAR(30) NOT NULL DEFAULT ''perbaikan'',
          tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
          deskripsi TEXT NOT NULL, teknisi VARCHAR(200), vendor VARCHAR(300),
          biaya DECIMAL(15,2) NOT NULL DEFAULT 0,
          hasil VARCHAR(50) DEFAULT ''selesai'',
          tanggal_selanjutnya DATE, catatan TEXT,
          created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_am_asset FOREIGN KEY (asset_id) REFERENCES %I.assets(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.asset_mutations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          asset_id UUID NOT NULL,
          tipe VARCHAR(20) NOT NULL DEFAULT ''pindah'',
          tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
          dari_lokasi VARCHAR(300), ke_lokasi VARCHAR(300),
          alasan TEXT, nilai_jual DECIMAL(15,2),
          no_berita_acara VARCHAR(100), disetujui_oleh VARCHAR(200),
          catatan TEXT, created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_amut_asset FOREIGN KEY (asset_id) REFERENCES %I.assets(id) ON DELETE CASCADE
        )
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- Asset indexes
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_assets_kategori ON %I.assets(kategori)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_assets_status ON %I.assets(status)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_assets_lokasi ON %I.assets(lokasi_ruangan)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_asset_maint_asset ON %I.asset_maintenances(asset_id)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_asset_mut_asset ON %I.asset_mutations(asset_id)', 'tenant_' || tenant_slug);

      -- ============ ALL TRIGGERS (drop+create for idempotency) ============
      EXECUTE format('DROP TRIGGER IF EXISTS trg_users_updated_at ON %I.users', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON %I.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_patients_updated_at ON %I.patients', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON %I.patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_doctors_updated_at ON %I.doctors', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_doctors_updated_at BEFORE UPDATE ON %I.doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_rooms_updated_at ON %I.rooms', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON %I.rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_beds_updated_at ON %I.beds', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_beds_updated_at BEFORE UPDATE ON %I.beds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_visits_updated_at ON %I.visits', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_visits_updated_at BEFORE UPDATE ON %I.visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_mr_updated_at ON %I.medical_records', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_mr_updated_at BEFORE UPDATE ON %I.medical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_rx_updated_at ON %I.prescriptions', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_rx_updated_at BEFORE UPDATE ON %I.prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_tpl_updated_at ON %I.medical_templates', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_tpl_updated_at BEFORE UPDATE ON %I.medical_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_drugs_updated_at ON %I.drugs', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_drugs_updated_at BEFORE UPDATE ON %I.drugs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_ds_updated_at ON %I.drug_stocks', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_ds_updated_at BEFORE UPDATE ON %I.drug_stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_disp_updated_at ON %I.dispensing', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_disp_updated_at BEFORE UPDATE ON %I.dispensing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_bills_updated_at ON %I.bills', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_bills_updated_at BEFORE UPDATE ON %I.bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_deposits_updated_at ON %I.deposits', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_deposits_updated_at BEFORE UPDATE ON %I.deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_lo_updated_at ON %I.lab_orders', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_lo_updated_at BEFORE UPDATE ON %I.lab_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_ro_updated_at ON %I.radiology_orders', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_ro_updated_at BEFORE UPDATE ON %I.radiology_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_ins_updated ON %I.insurances', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_ins_updated BEFORE UPDATE ON %I.insurances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_pi_updated ON %I.patient_insurances', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_pi_updated BEFORE UPDATE ON %I.patient_insurances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_ds_updated ON %I.doctor_schedules', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_ds_updated BEFORE UPDATE ON %I.doctor_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_df_updated ON %I.doctor_fees', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_df_updated BEFORE UPDATE ON %I.doctor_fees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_wi_updated ON %I.warehouse_items', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_wi_updated BEFORE UPDATE ON %I.warehouse_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_ws_updated ON %I.warehouse_stocks', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_ws_updated BEFORE UPDATE ON %I.warehouse_stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_so_updated ON %I.stock_opnames', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_so_updated BEFORE UPDATE ON %I.stock_opnames FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_na_updated ON %I.nursing_assessments', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_na_updated BEFORE UPDATE ON %I.nursing_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      -- Antrol trigger
      EXECUTE format('DROP TRIGGER IF EXISTS trg_antrol_updated ON %I.antrol_bookings', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_antrol_updated BEFORE UPDATE ON %I.antrol_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      -- Accounting trigger
      EXECUTE format('DROP TRIGGER IF EXISTS trg_je_updated ON %I.journal_entries', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_je_updated BEFORE UPDATE ON %I.journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      -- HRIS triggers
      EXECUTE format('DROP TRIGGER IF EXISTS trg_emp_updated ON %I.employees', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_emp_updated BEFORE UPDATE ON %I.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_shift_assign_updated ON %I.shift_assignments', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_shift_assign_updated BEFORE UPDATE ON %I.shift_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_att_updated ON %I.attendance_records', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_att_updated BEFORE UPDATE ON %I.attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_lr_updated ON %I.leave_requests', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_lr_updated BEFORE UPDATE ON %I.leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_pp_updated ON %I.payroll_periods', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_pp_updated BEFORE UPDATE ON %I.payroll_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);
      -- Education trigger
      EXECUTE format('DROP TRIGGER IF EXISTS trg_edu_rec_updated ON %I.patient_education_records', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE TRIGGER trg_edu_rec_updated BEFORE UPDATE ON %I.patient_education_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 'tenant_' || tenant_slug);

      -- ============================================================
      -- SEED DATA (per-tenant)
      -- ============================================================

      -- ── COA Seed (55 accounts) ──
      EXECUTE format('
        INSERT INTO %I.chart_of_accounts (kode, nama, tipe, sub_tipe, level, is_header, saldo_normal) VALUES
          (''1-0000'', ''ASET'', ''aset'', NULL, 1, true, ''debit''),
          (''1-1000'', ''Aset Lancar'', ''aset'', ''aset_lancar'', 2, true, ''debit''),
          (''1-1001'', ''Kas'', ''aset'', ''aset_lancar'', 3, false, ''debit''),
          (''1-1002'', ''Kas di Bank'', ''aset'', ''aset_lancar'', 3, false, ''debit''),
          (''1-1003'', ''Piutang Pasien'', ''aset'', ''aset_lancar'', 3, false, ''debit''),
          (''1-1004'', ''Piutang BPJS'', ''aset'', ''aset_lancar'', 3, false, ''debit''),
          (''1-1005'', ''Piutang Asuransi'', ''aset'', ''aset_lancar'', 3, false, ''debit''),
          (''1-1006'', ''Persediaan Obat'', ''aset'', ''aset_lancar'', 3, false, ''debit''),
          (''1-1007'', ''Persediaan BHP'', ''aset'', ''aset_lancar'', 3, false, ''debit''),
          (''1-1008'', ''Persediaan Alkes'', ''aset'', ''aset_lancar'', 3, false, ''debit''),
          (''1-1009'', ''Uang Muka'', ''aset'', ''aset_lancar'', 3, false, ''debit''),
          (''1-1010'', ''Biaya Dibayar di Muka'', ''aset'', ''aset_lancar'', 3, false, ''debit''),
          (''1-2000'', ''Aset Tetap'', ''aset'', ''aset_tetap'', 2, true, ''debit''),
          (''1-2001'', ''Tanah'', ''aset'', ''aset_tetap'', 3, false, ''debit''),
          (''1-2002'', ''Bangunan'', ''aset'', ''aset_tetap'', 3, false, ''debit''),
          (''1-2003'', ''Akumulasi Penyusutan Bangunan'', ''aset'', ''aset_tetap'', 3, false, ''kredit''),
          (''1-2004'', ''Peralatan Medis'', ''aset'', ''aset_tetap'', 3, false, ''debit''),
          (''1-2005'', ''Akumulasi Penyusutan Peralatan Medis'', ''aset'', ''aset_tetap'', 3, false, ''kredit''),
          (''1-2006'', ''Kendaraan'', ''aset'', ''aset_tetap'', 3, false, ''debit''),
          (''1-2007'', ''Akumulasi Penyusutan Kendaraan'', ''aset'', ''aset_tetap'', 3, false, ''kredit''),
          (''1-2008'', ''Inventaris Kantor'', ''aset'', ''aset_tetap'', 3, false, ''debit''),
          (''1-2009'', ''Akumulasi Penyusutan Inventaris'', ''aset'', ''aset_tetap'', 3, false, ''kredit''),
          (''2-0000'', ''KEWAJIBAN'', ''kewajiban'', NULL, 1, true, ''kredit''),
          (''2-1000'', ''Kewajiban Lancar'', ''kewajiban'', ''kewajiban_lancar'', 2, true, ''kredit''),
          (''2-1001'', ''Utang Usaha / Supplier'', ''kewajiban'', ''kewajiban_lancar'', 3, false, ''kredit''),
          (''2-1002'', ''Utang Pajak'', ''kewajiban'', ''kewajiban_lancar'', 3, false, ''kredit''),
          (''2-1003'', ''Utang Gaji'', ''kewajiban'', ''kewajiban_lancar'', 3, false, ''kredit''),
          (''2-1004'', ''Pendapatan Diterima di Muka'', ''kewajiban'', ''kewajiban_lancar'', 3, false, ''kredit''),
          (''2-1005'', ''Deposit Pasien'', ''kewajiban'', ''kewajiban_lancar'', 3, false, ''kredit''),
          (''2-1006'', ''Utang BPJS'', ''kewajiban'', ''kewajiban_lancar'', 3, false, ''kredit''),
          (''2-2000'', ''Kewajiban Jangka Panjang'', ''kewajiban'', ''kewajiban_jangka_panjang'', 2, true, ''kredit''),
          (''2-2001'', ''Utang Bank'', ''kewajiban'', ''kewajiban_jangka_panjang'', 3, false, ''kredit''),
          (''2-2002'', ''Utang Sewa Pembiayaan'', ''kewajiban'', ''kewajiban_jangka_panjang'', 3, false, ''kredit''),
          (''3-0000'', ''EKUITAS'', ''ekuitas'', NULL, 1, true, ''kredit''),
          (''3-1000'', ''Ekuitas'', ''ekuitas'', ''ekuitas'', 2, true, ''kredit''),
          (''3-1001'', ''Modal Disetor'', ''ekuitas'', ''ekuitas'', 3, false, ''kredit''),
          (''3-1002'', ''Laba Ditahan'', ''ekuitas'', ''ekuitas'', 3, false, ''kredit''),
          (''3-1003'', ''Laba Tahun Berjalan'', ''ekuitas'', ''ekuitas'', 3, false, ''kredit''),
          (''4-0000'', ''PENDAPATAN'', ''pendapatan'', NULL, 1, true, ''kredit''),
          (''4-1000'', ''Pendapatan Operasional'', ''pendapatan'', ''pendapatan_operasional'', 2, true, ''kredit''),
          (''4-1001'', ''Pendapatan Rawat Jalan'', ''pendapatan'', ''pendapatan_operasional'', 3, false, ''kredit''),
          (''4-1002'', ''Pendapatan Rawat Inap'', ''pendapatan'', ''pendapatan_operasional'', 3, false, ''kredit''),
          (''4-1003'', ''Pendapatan IGD'', ''pendapatan'', ''pendapatan_operasional'', 3, false, ''kredit''),
          (''4-1004'', ''Pendapatan Laboratorium'', ''pendapatan'', ''pendapatan_operasional'', 3, false, ''kredit''),
          (''4-1005'', ''Pendapatan Radiologi'', ''pendapatan'', ''pendapatan_operasional'', 3, false, ''kredit''),
          (''4-1006'', ''Pendapatan Farmasi'', ''pendapatan'', ''pendapatan_operasional'', 3, false, ''kredit''),
          (''4-1007'', ''Pendapatan Bedah/Operasi'', ''pendapatan'', ''pendapatan_operasional'', 3, false, ''kredit''),
          (''4-1008'', ''Pendapatan Tindakan Medis'', ''pendapatan'', ''pendapatan_operasional'', 3, false, ''kredit''),
          (''4-1009'', ''Pendapatan Konsultasi'', ''pendapatan'', ''pendapatan_operasional'', 3, false, ''kredit''),
          (''4-1010'', ''Pendapatan Rehabilitasi'', ''pendapatan'', ''pendapatan_operasional'', 3, false, ''kredit''),
          (''4-2000'', ''Pendapatan Lain-lain'', ''pendapatan'', ''pendapatan_lain'', 2, true, ''kredit''),
          (''4-2001'', ''Pendapatan Bunga Bank'', ''pendapatan'', ''pendapatan_lain'', 3, false, ''kredit''),
          (''4-2002'', ''Pendapatan Sewa'', ''pendapatan'', ''pendapatan_lain'', 3, false, ''kredit''),
          (''4-2003'', ''Pendapatan Lain-lain'', ''pendapatan'', ''pendapatan_lain'', 3, false, ''kredit''),
          (''5-0000'', ''BEBAN'', ''beban'', NULL, 1, true, ''debit''),
          (''5-1000'', ''Beban Operasional'', ''beban'', ''beban_operasional'', 2, true, ''debit''),
          (''5-1001'', ''Beban Gaji & Tunjangan'', ''beban'', ''beban_operasional'', 3, false, ''debit''),
          (''5-1002'', ''Beban Obat & BHP'', ''beban'', ''beban_operasional'', 3, false, ''debit''),
          (''5-1003'', ''Beban Listrik, Air, Telepon'', ''beban'', ''beban_operasional'', 3, false, ''debit''),
          (''5-1004'', ''Beban Pemeliharaan'', ''beban'', ''beban_operasional'', 3, false, ''debit''),
          (''5-1005'', ''Beban Penyusutan'', ''beban'', ''beban_operasional'', 3, false, ''debit''),
          (''5-1006'', ''Beban Administrasi'', ''beban'', ''beban_operasional'', 3, false, ''debit''),
          (''5-1007'', ''Beban Kebersihan & Laundry'', ''beban'', ''beban_operasional'', 3, false, ''debit''),
          (''5-1008'', ''Beban Makan Pasien'', ''beban'', ''beban_operasional'', 3, false, ''debit''),
          (''5-1009'', ''Beban Asuransi'', ''beban'', ''beban_operasional'', 3, false, ''debit''),
          (''5-1010'', ''Beban Pajak'', ''beban'', ''beban_operasional'', 3, false, ''debit''),
          (''5-2000'', ''Beban Lain-lain'', ''beban'', ''beban_lain'', 2, true, ''debit''),
          (''5-2001'', ''Beban Bunga'', ''beban'', ''beban_lain'', 3, false, ''debit''),
          (''5-2002'', ''Beban Lain-lain'', ''beban'', ''beban_lain'', 3, false, ''debit'')
        ON CONFLICT (kode) DO NOTHING
      ', 'tenant_' || tenant_slug);

      -- Update parent_id references for COA
      EXECUTE format('
        UPDATE %I.chart_of_accounts c SET parent_id = p.id
        FROM (VALUES
          (''1-1000'', ''1-0000''), (''1-1001'', ''1-1000''), (''1-1002'', ''1-1000''),
          (''1-1003'', ''1-1000''), (''1-1004'', ''1-1000''), (''1-1005'', ''1-1000''),
          (''1-1006'', ''1-1000''), (''1-1007'', ''1-1000''), (''1-1008'', ''1-1000''),
          (''1-1009'', ''1-1000''), (''1-1010'', ''1-1000''),
          (''1-2000'', ''1-0000''), (''1-2001'', ''1-2000''), (''1-2002'', ''1-2000''),
          (''1-2003'', ''1-2000''), (''1-2004'', ''1-2000''), (''1-2005'', ''1-2000''),
          (''1-2006'', ''1-2000''), (''1-2007'', ''1-2000''), (''1-2008'', ''1-2000''),
          (''1-2009'', ''1-2000''),
          (''2-1000'', ''2-0000''), (''2-1001'', ''2-1000''), (''2-1002'', ''2-1000''),
          (''2-1003'', ''2-1000''), (''2-1004'', ''2-1000''), (''2-1005'', ''2-1000''),
          (''2-1006'', ''2-1000''), (''2-2000'', ''2-0000''), (''2-2001'', ''2-2000''),
          (''2-2002'', ''2-2000''),
          (''3-1000'', ''3-0000''), (''3-1001'', ''3-1000''), (''3-1002'', ''3-1000''),
          (''3-1003'', ''3-1000''),
          (''4-1000'', ''4-0000''), (''4-1001'', ''4-1000''), (''4-1002'', ''4-1000''),
          (''4-1003'', ''4-1000''), (''4-1004'', ''4-1000''), (''4-1005'', ''4-1000''),
          (''4-1006'', ''4-1000''), (''4-1007'', ''4-1000''), (''4-1008'', ''4-1000''),
          (''4-1009'', ''4-1000''), (''4-1010'', ''4-1000''), (''4-2000'', ''4-0000''), (''4-2001'', ''4-2000''),
          (''4-2002'', ''4-2000''), (''4-2003'', ''4-2000''),
          (''5-1000'', ''5-0000''), (''5-1001'', ''5-1000''), (''5-1002'', ''5-1000''),
          (''5-1003'', ''5-1000''), (''5-1004'', ''5-1000''), (''5-1005'', ''5-1000''),
          (''5-1006'', ''5-1000''), (''5-1007'', ''5-1000''), (''5-1008'', ''5-1000''),
          (''5-1009'', ''5-1000''), (''5-1010'', ''5-1000''), (''5-2000'', ''5-0000''),
          (''5-2001'', ''5-2000''), (''5-2002'', ''5-2000'')
        ) AS v(child_kode, parent_kode)
        JOIN %I.chart_of_accounts p ON p.kode = v.parent_kode
        WHERE c.kode = v.child_kode AND c.parent_id IS NULL
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      -- ── Default Shift Templates Seed (5 shifts) ──
      EXECUTE format('
        INSERT INTO %I.shift_templates (nama, kode, jam_mulai, jam_selesai, durasi_jam, warna) VALUES
          (''Pagi'', ''P'', ''06:30'', ''14:00'', 7.5, ''#3B82F6''),
          (''Siang'', ''S'', ''14:00'', ''21:00'', 7, ''#F59E0B''),
          (''Malam'', ''M'', ''21:00'', ''07:00'', 10, ''#6366F1''),
          (''Long Shift'', ''L'', ''07:00'', ''19:00'', 12, ''#10B981''),
          (''Libur'', ''OFF'', ''00:00'', ''00:00'', 0, ''#9CA3AF'')
        ON CONFLICT (kode) DO NOTHING
      ', 'tenant_' || tenant_slug);

      -- ── Default Departments Seed (15 departments) ──
      EXECUTE format('
        INSERT INTO %I.departments (kode, nama) VALUES
          (''MAN'', ''Manajemen''), (''IGD'', ''IGD''), (''RJ'', ''Rawat Jalan''),
          (''RI'', ''Rawat Inap''), (''BDH'', ''Bedah''), (''ICU'', ''ICU''),
          (''FAR'', ''Farmasi''), (''LAB'', ''Laboratorium''), (''RAD'', ''Radiologi''),
          (''GIZ'', ''Gizi''), (''RM'', ''Rekam Medis''), (''KEU'', ''Keuangan''),
          (''SDM'', ''SDM & Umum''), (''CSSD'', ''CSSD''), (''LDR'', ''Laundry'')
        ON CONFLICT (kode) DO NOTHING
      ', 'tenant_' || tenant_slug);

      -- ── Default Education Topics Seed (36 topics) ──
      EXECUTE format('
        INSERT INTO %I.education_topics (kode, nama, kategori, deskripsi, materi) VALUES
          (''EDU-DX-001'', ''Penjelasan Diagnosis'', ''diagnosis'', ''Edukasi mengenai diagnosis penyakit pasien'', ''Penjelasan tentang penyakit yang diderita, penyebab, dan mekanisme terjadinya penyakit.''),
          (''EDU-DX-002'', ''Prognosis Penyakit'', ''diagnosis'', ''Edukasi mengenai prognosis dan perjalanan penyakit'', ''Penjelasan tentang perkiraan perjalanan penyakit, kemungkinan kesembuhan, dan faktor-faktor yang mempengaruhi prognosis.''),
          (''EDU-DX-003'', ''Faktor Risiko'', ''diagnosis'', ''Edukasi mengenai faktor risiko penyakit'', ''Penjelasan tentang faktor risiko yang dapat dimodifikasi dan tidak dapat dimodifikasi terkait penyakit pasien.''),
          (''EDU-DX-004'', ''Pencegahan Penyakit'', ''diagnosis'', ''Edukasi mengenai pencegahan dan gaya hidup sehat'', ''Langkah-langkah pencegahan penyakit melalui modifikasi gaya hidup, pola makan, olahraga, dan kebiasaan sehat.''),
          (''EDU-TX-001'', ''Rencana Pengobatan'', ''terapi'', ''Edukasi rencana dan tujuan pengobatan'', ''Penjelasan tentang rencana pengobatan yang akan dilakukan, tujuan terapi, dan target yang ingin dicapai.''),
          (''EDU-TX-002'', ''Prosedur Tindakan'', ''terapi'', ''Edukasi mengenai prosedur tindakan medis'', ''Penjelasan tentang prosedur tindakan yang akan dilakukan, tahapan, risiko, dan manfaat tindakan.''),
          (''EDU-TX-003'', ''Persiapan Operasi'', ''terapi'', ''Edukasi persiapan sebelum operasi'', ''Persiapan yang harus dilakukan sebelum operasi: puasa, obat yang harus dihentikan, pemeriksaan penunjang, dan informed consent.''),
          (''EDU-TX-004'', ''Pasca Operasi'', ''terapi'', ''Edukasi perawatan pasca operasi'', ''Perawatan setelah operasi: mobilisasi dini, manajemen nyeri, perawatan luka, diet, dan tanda-tanda komplikasi.''),
          (''EDU-OB-001'', ''Cara Minum Obat'', ''obat'', ''Edukasi cara penggunaan obat yang benar'', ''Cara minum obat yang benar: waktu minum, sebelum/sesudah makan, interval antar dosis, dan apa yang harus dilakukan jika lupa minum obat.''),
          (''EDU-OB-002'', ''Efek Samping Obat'', ''obat'', ''Edukasi efek samping obat'', ''Efek samping yang mungkin terjadi, efek samping yang perlu diwaspadai, dan kapan harus menghubungi dokter.''),
          (''EDU-OB-003'', ''Interaksi Obat'', ''obat'', ''Edukasi interaksi obat dengan obat lain atau makanan'', ''Obat atau makanan yang perlu dihindari selama pengobatan, interaksi yang dapat mengurangi atau meningkatkan efek obat.''),
          (''EDU-OB-004'', ''Penyimpanan Obat'', ''obat'', ''Edukasi cara penyimpanan obat yang benar'', ''Cara menyimpan obat: suhu ruangan vs kulkas, jauhkan dari sinar matahari langsung, simpan di tempat kering, jauhkan dari jangkauan anak.''),
          (''EDU-OB-005'', ''Obat High-Alert'', ''obat'', ''Edukasi khusus obat high-alert'', ''Penjelasan khusus untuk obat high-alert: insulin, antikoagulan, opioid, elektrolit pekat — dosis tepat, tanda overdosis, dan penanganan darurat.''),
          (''EDU-DT-001'', ''Pola Makan Sehat'', ''diet'', ''Edukasi pola makan sehat umum'', ''Prinsip pola makan sehat: gizi seimbang, porsi makan, frekuensi makan, konsumsi serat, dan hidrasi yang cukup.''),
          (''EDU-DT-002'', ''Diet Khusus Penyakit'', ''diet'', ''Edukasi diet khusus sesuai penyakit'', ''Diet khusus sesuai kondisi penyakit: diet rendah garam (hipertensi), diet DM, diet rendah purin (asam urat), diet rendah lemak, diet ginjal.''),
          (''EDU-DT-003'', ''Pantangan Makanan'', ''diet'', ''Edukasi makanan yang perlu dihindari'', ''Daftar makanan dan minuman yang perlu dihindari atau dibatasi sesuai dengan kondisi penyakit pasien.''),
          (''EDU-DT-004'', ''Nutrisi Pasca Operasi'', ''diet'', ''Edukasi nutrisi untuk pemulihan pasca operasi'', ''Kebutuhan nutrisi pasca operasi: protein untuk penyembuhan luka, cairan yang cukup, makanan bertahap dari cair ke padat.''),
          (''EDU-NY-001'', ''Manajemen Nyeri'', ''nyeri'', ''Edukasi manajemen nyeri'', ''Teknik manajemen nyeri farmakologis dan non-farmakologis: penggunaan analgesik, kompres, posisi, distraksi, dan relaksasi.''),
          (''EDU-NY-002'', ''Skala Nyeri'', ''nyeri'', ''Edukasi penggunaan skala nyeri'', ''Cara mengukur dan melaporkan nyeri menggunakan skala NRS (0-10), kapan nyeri dianggap berat, dan kapan harus melapor ke perawat.''),
          (''EDU-NY-003'', ''Teknik Relaksasi'', ''nyeri'', ''Edukasi teknik relaksasi untuk mengurangi nyeri'', ''Teknik pernapasan dalam, guided imagery, progressive muscle relaxation, dan distraksi untuk mengurangi persepsi nyeri.''),
          (''EDU-RH-001'', ''Latihan Fisik'', ''rehabilitasi'', ''Edukasi latihan fisik terprogram'', ''Program latihan fisik yang direkomendasikan: jenis latihan, frekuensi, durasi, intensitas, dan tanda-tanda yang harus diwaspadai saat latihan.''),
          (''EDU-RH-002'', ''Mobilisasi Dini'', ''rehabilitasi'', ''Edukasi mobilisasi dini pasca tindakan'', ''Pentingnya mobilisasi dini, tahapan mobilisasi dari tempat tidur, cara berdiri dan berjalan yang aman, dan penggunaan alat bantu.''),
          (''EDU-RH-003'', ''Fisioterapi di Rumah'', ''rehabilitasi'', ''Edukasi latihan fisioterapi mandiri di rumah'', ''Program latihan fisioterapi yang dapat dilakukan di rumah: range of motion, strengthening, stretching, dan jadwal latihan.''),
          (''EDU-LK-001'', ''Perawatan Luka'', ''luka'', ''Edukasi perawatan luka di rumah'', ''Cara merawat luka di rumah: membersihkan luka, mengganti balutan, menjaga luka tetap kering, dan kapan harus kontrol.''),
          (''EDU-LK-002'', ''Ganti Balutan'', ''luka'', ''Edukasi teknik ganti balutan'', ''Langkah-langkah ganti balutan: cuci tangan, buka balutan lama, bersihkan luka dengan NaCl/antiseptik, tutup dengan kasa steril.''),
          (''EDU-LK-003'', ''Tanda Infeksi Luka'', ''luka'', ''Edukasi tanda-tanda infeksi pada luka'', ''Tanda infeksi luka: kemerahan bertambah, bengkak, nyeri memberat, keluar nanah/cairan berbau, demam. Segera ke RS jika muncul tanda ini.''),
          (''EDU-TB-001'', ''Tanda Bahaya Darurat'', ''tanda_bahaya'', ''Edukasi tanda-tanda bahaya yang perlu diwaspadai'', ''Tanda bahaya yang memerlukan perhatian segera: sesak napas berat, nyeri dada, penurunan kesadaran, kejang, perdarahan aktif, demam tinggi tidak turun.''),
          (''EDU-TB-002'', ''Kapan Harus ke IGD'', ''tanda_bahaya'', ''Edukasi kapan harus datang ke IGD'', ''Kondisi-kondisi yang memerlukan kunjungan IGD segera vs yang bisa ditangani di poliklinik saat kontrol.''),
          (''EDU-DC-001'', ''Perawatan di Rumah'', ''discharge'', ''Edukasi perawatan mandiri di rumah'', ''Panduan perawatan di rumah: aktivitas harian, istirahat, mandi, makan minum, minum obat teratur, dan kapan boleh kembali beraktivitas normal.''),
          (''EDU-DC-002'', ''Jadwal Kontrol'', ''discharge'', ''Edukasi jadwal kontrol dan pemeriksaan ulang'', ''Jadwal kontrol yang harus dipenuhi, pemeriksaan apa yang akan dilakukan saat kontrol, dan dokumen yang harus dibawa.''),
          (''EDU-DC-003'', ''Aktivitas Pasca Rawat'', ''discharge'', ''Edukasi pembatasan aktivitas pasca rawat'', ''Batasan aktivitas pasca rawat: kapan boleh bekerja, olahraga, mengangkat beban, menyetir, dan aktivitas berat lainnya.''),
          (''EDU-DC-004'', ''Nomor Darurat RS'', ''discharge'', ''Informasi kontak darurat rumah sakit'', ''Nomor telepon IGD, hotline RS, dan jadwal pelayanan jika pasien memerlukan bantuan darurat di luar jam kontrol.'')
        ON CONFLICT (kode) DO NOTHING
      ', 'tenant_' || tenant_slug);

      -- ============ SIRANAP CONFIG ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.siranap_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode_rs VARCHAR(20) NOT NULL DEFAULT '''',
          password VARCHAR(100) NOT NULL DEFAULT '''',
          endpoint VARCHAR(500) NOT NULL DEFAULT ''https://sirs.yankes.kemkes.go.id/sirsservice/ranap'',
          auto_send BOOLEAN NOT NULL DEFAULT false,
          send_times TEXT NOT NULL DEFAULT ''["06:00","18:00"]'',
          send_on_change BOOLEAN NOT NULL DEFAULT false,
          created_by UUID,
          updated_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ SIRANAP SUBMISSIONS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.siranap_submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          status VARCHAR(10) NOT NULL DEFAULT ''pending'',
          rooms_sent INTEGER NOT NULL DEFAULT 0,
          response_code VARCHAR(10),
          response_message TEXT,
          error_message TEXT,
          duration_ms INTEGER,
          payload_xml TEXT,
          triggered_by VARCHAR(100) NOT NULL DEFAULT ''manual'',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_siranap_submissions_created ON %I.siranap_submissions (created_at DESC)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_siranap_submissions_status ON %I.siranap_submissions (status)', 'tenant_' || tenant_slug);

      -- ============ SIRS CONFIG ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.sirs_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kode_rs VARCHAR(20) NOT NULL DEFAULT '''',
          username VARCHAR(100) NOT NULL DEFAULT '''',
          password VARCHAR(100) NOT NULL DEFAULT '''',
          endpoint VARCHAR(500) NOT NULL DEFAULT ''https://sirs.kemkes.go.id/api'',
          mode VARCHAR(20) NOT NULL DEFAULT ''sandbox'',
          auto_send_rl13 BOOLEAN NOT NULL DEFAULT false,
          rl13_times TEXT NOT NULL DEFAULT ''["06:00","18:00"]'',
          created_by UUID,
          updated_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);

      -- ============ SIRS SUBMISSIONS ============
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.sirs_submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          rl_type VARCHAR(10) NOT NULL,
          periode VARCHAR(10) NOT NULL,
          status VARCHAR(10) NOT NULL DEFAULT ''pending'',
          response_code VARCHAR(10),
          response_message TEXT,
          error_message TEXT,
          duration_ms INTEGER,
          submitted_by VARCHAR(100) NOT NULL DEFAULT ''manual'',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      ', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_sirs_submissions_created ON %I.sirs_submissions (created_at DESC)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_sirs_submissions_rl_type ON %I.sirs_submissions (rl_type)', 'tenant_' || tenant_slug);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_sirs_submissions_status ON %I.sirs_submissions (status)', 'tenant_' || tenant_slug);

      -- Auto-provision extension modules (added by later migrations)
      IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'provision_tenant_extensions') THEN
        PERFORM provision_tenant_extensions(tenant_slug);
      END IF;

    END;
    $$ LANGUAGE plpgsql;
  `)

  // --- drop_tenant_schema ---
  await knex.raw(`
    CREATE OR REPLACE FUNCTION drop_tenant_schema(tenant_slug TEXT)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', 'tenant_' || tenant_slug);
    END;
    $$ LANGUAGE plpgsql;
  `)
}

export async function down(knex: Knex): Promise<void> {
  // Drop all tenant schemas
  const tenants = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )
  for (const { schema_name } of tenants.rows) {
    await knex.raw(`DROP SCHEMA IF EXISTS "${schema_name}" CASCADE`)
  }

  // Drop functions
  await knex.raw('DROP FUNCTION IF EXISTS provision_tenant_extensions(TEXT)')
  await knex.raw('DROP FUNCTION IF EXISTS drop_tenant_schema(TEXT)')
  await knex.raw('DROP FUNCTION IF EXISTS create_tenant_schema(TEXT)')
  await knex.raw('DROP FUNCTION IF EXISTS add_performance_indexes(TEXT)')
  await knex.raw('DROP FUNCTION IF EXISTS generate_visit_number(TEXT)')
  await knex.raw('DROP FUNCTION IF EXISTS generate_no_rekam_medis(TEXT)')

  // Drop public triggers
  await knex.raw('DROP TRIGGER IF EXISTS trg_platform_settings_updated_at ON platform_settings')
  await knex.raw('DROP TRIGGER IF EXISTS trg_tenant_registrations_updated_at ON tenant_registrations')
  await knex.raw('DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON subscription_plans')
  await knex.raw('DROP TRIGGER IF EXISTS trg_super_admins_updated_at ON super_admins')
  await knex.raw('DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants')

  // Drop public tables (reverse dependency order — new tables first)
  await knex.raw('DROP TABLE IF EXISTS public.super_admin_activity_log CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.platform_settings CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.tenant_registrations CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.drug_interactions CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.kfa_codes CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.loinc_codes CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.backup_schedules CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.backup_logs CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.subscription_transactions CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.subscription_plans CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.radiology_examinations CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.lab_parameters CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.audit_logs CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.icd9cm_codes CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.icd10_codes CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.super_admins CASCADE')
  await knex.raw('DROP TABLE IF EXISTS public.tenants CASCADE')

  // Drop trigger function
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column()')

  // Drop ENUM types (new + existing)
  await knex.raw('DROP TYPE IF EXISTS practitioner_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS rehab_therapy_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS rehab_order_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS substitution_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS mcu_conclusion_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS mcu_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS mcu_exam_category CASCADE')
  await knex.raw('DROP TYPE IF EXISTS registration_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS igd_disposition CASCADE')
  await knex.raw('DROP TYPE IF EXISTS triage_level CASCADE')
  await knex.raw('DROP TYPE IF EXISTS cara_keluar_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS opname_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS warehouse_category CASCADE')
  await knex.raw('DROP TYPE IF EXISTS po_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS radiology_modality CASCADE')
  await knex.raw('DROP TYPE IF EXISTS radiology_order_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS specimen_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS lab_priority CASCADE')
  await knex.raw('DROP TYPE IF EXISTS lab_order_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS audit_action CASCADE')
  await knex.raw('DROP TYPE IF EXISTS satusehat_sync_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS deposit_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS payment_method CASCADE')
  await knex.raw('DROP TYPE IF EXISTS bill_item_category CASCADE')
  await knex.raw('DROP TYPE IF EXISTS bill_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS dispensing_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS drug_transaction_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS drug_category CASCADE')
  await knex.raw('DROP TYPE IF EXISTS template_category CASCADE')
  await knex.raw('DROP TYPE IF EXISTS diagnosis_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS prescription_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS medical_record_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS queue_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS payer_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS cara_masuk_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS visit_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS visit_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS bed_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS room_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS gender_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS user_role CASCADE')
}
