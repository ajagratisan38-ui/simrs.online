import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create ENUMs in public schema
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE vital_alert_level AS ENUM ('normal', 'warning', 'critical');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE order_status AS ENUM ('active', 'completed', 'cancelled', 'discontinued');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE order_priority AS ENUM ('rutin', 'urgent', 'stat');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE order_category AS ENUM (
        'obat', 'infus', 'diet', 'tindakan', 'lab', 'radiologi',
        'konsultasi', 'monitoring', 'mobilisasi', 'lainnya'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE nursing_shift AS ENUM ('pagi', 'siang', 'malam');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE discharge_readiness AS ENUM ('not_ready', 'partial', 'ready');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)

  // Create helper function FIRST (before calling it for existing tenants)
  await knex.raw(`
    CREATE OR REPLACE FUNCTION add_inpatient_clinical_tables(schema_name TEXT)
    RETURNS VOID AS $$
    BEGIN
      -- vital_signs
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.vital_signs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL REFERENCES %I.visits(id),
          patient_id UUID NOT NULL REFERENCES %I.patients(id),
          recorded_by UUID NOT NULL REFERENCES %I.users(id),
          recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          tekanan_darah_sistolik INTEGER,
          tekanan_darah_diastolik INTEGER,
          nadi INTEGER,
          suhu DECIMAL(4,1),
          respirasi INTEGER,
          spo2 DECIMAL(4,1),
          nyeri_score INTEGER DEFAULT 0,
          kesadaran VARCHAR(20) DEFAULT ''compos_mentis'',
          gcs_eye INTEGER,
          gcs_verbal INTEGER,
          gcs_motorik INTEGER,
          intake_cairan INTEGER,
          output_cairan INTEGER,
          berat_badan DECIMAL(5,1),
          catatan TEXT,
          alert_level vital_alert_level DEFAULT ''normal'',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', schema_name, schema_name, schema_name, schema_name);

      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_vital_signs_visit ON %I.vital_signs(visit_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON %I.vital_signs(patient_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded ON %I.vital_signs(recorded_at DESC)', schema_name);

      -- medical_orders
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.medical_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL REFERENCES %I.visits(id),
          patient_id UUID NOT NULL REFERENCES %I.patients(id),
          ordered_by UUID NOT NULL REFERENCES %I.users(id),
          kategori order_category NOT NULL DEFAULT ''lainnya'',
          prioritas order_priority NOT NULL DEFAULT ''rutin'',
          instruksi TEXT NOT NULL,
          dosis VARCHAR(100),
          frekuensi VARCHAR(100),
          rute VARCHAR(50),
          durasi VARCHAR(100),
          catatan TEXT,
          status order_status NOT NULL DEFAULT ''active'',
          started_at TIMESTAMPTZ DEFAULT NOW(),
          ended_at TIMESTAMPTZ,
          discontinued_reason TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', schema_name, schema_name, schema_name, schema_name);

      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_medical_orders_visit ON %I.medical_orders(visit_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_medical_orders_status ON %I.medical_orders(status)', schema_name);

      -- medical_order_executions
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.medical_order_executions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL REFERENCES %I.medical_orders(id) ON DELETE CASCADE,
          executed_by UUID NOT NULL REFERENCES %I.users(id),
          executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', schema_name, schema_name, schema_name);

      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_order_exec_order ON %I.medical_order_executions(order_id)', schema_name);

      -- nursing_notes
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.nursing_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL REFERENCES %I.visits(id),
          patient_id UUID NOT NULL REFERENCES %I.patients(id),
          nurse_id UUID NOT NULL REFERENCES %I.users(id),
          shift nursing_shift NOT NULL,
          tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
          situation TEXT,
          background TEXT,
          assessment TEXT,
          recommendation TEXT,
          tindakan_keperawatan JSONB DEFAULT ''[]''::jsonb,
          intake_cairan INTEGER,
          output_cairan INTEGER,
          catatan_tambahan TEXT,
          is_finalized BOOLEAN DEFAULT FALSE,
          finalized_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', schema_name, schema_name, schema_name, schema_name);

      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_nursing_notes_visit ON %I.nursing_notes(visit_id)', schema_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_nursing_notes_date ON %I.nursing_notes(tanggal DESC)', schema_name);
      EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS idx_nursing_notes_unique ON %I.nursing_notes(visit_id, nurse_id, shift, tanggal)', schema_name);

      -- discharge_plans
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.discharge_plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL REFERENCES %I.visits(id),
          patient_id UUID NOT NULL REFERENCES %I.patients(id),
          created_by UUID NOT NULL REFERENCES %I.users(id),
          readiness discharge_readiness DEFAULT ''not_ready'',
          klinis_stabil BOOLEAN DEFAULT FALSE,
          luka_kering BOOLEAN DEFAULT FALSE,
          intake_oral_baik BOOLEAN DEFAULT FALSE,
          mobilisasi_mandiri BOOLEAN DEFAULT FALSE,
          obat_pulang_siap BOOLEAN DEFAULT FALSE,
          edukasi_diberikan BOOLEAN DEFAULT FALSE,
          jadwal_kontrol_set BOOLEAN DEFAULT FALSE,
          resume_final BOOLEAN DEFAULT FALSE,
          billing_selesai BOOLEAN DEFAULT FALSE,
          surat_sakit BOOLEAN DEFAULT FALSE,
          obat_pulang JSONB DEFAULT ''[]''::jsonb,
          jadwal_kontrol_tanggal DATE,
          jadwal_kontrol_poli VARCHAR(100),
          jadwal_kontrol_dokter VARCHAR(200),
          edukasi_catatan TEXT,
          catatan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', schema_name, schema_name, schema_name, schema_name);

      EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS idx_discharge_plans_visit ON %I.discharge_plans(visit_id)', schema_name);

      -- updated_at triggers (one per EXECUTE)
      EXECUTE format('
        CREATE OR REPLACE TRIGGER trg_medical_orders_updated
        BEFORE UPDATE ON %I.medical_orders
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      ', schema_name);

      EXECUTE format('
        CREATE OR REPLACE TRIGGER trg_nursing_notes_updated
        BEFORE UPDATE ON %I.nursing_notes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      ', schema_name);

      EXECUTE format('
        CREATE OR REPLACE TRIGGER trg_discharge_plans_updated
        BEFORE UPDATE ON %I.discharge_plans
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      ', schema_name);
    END;
    $$ LANGUAGE plpgsql;
  `)

  // Now apply to all existing tenant schemas (query actual schema names from DB)
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )
  for (const row of tenantSchemas.rows) {
    console.log(`  Applying inpatient clinical tables to ${row.schema_name}`)
    await createInpatientClinicalTables(knex, row.schema_name)
  }
}

async function createInpatientClinicalTables(knex: Knex, schema: string) {
  await knex.raw(`SELECT add_inpatient_clinical_tables('${schema}')`)
}

export async function down(knex: Knex): Promise<void> {
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )
  for (const row of tenantSchemas.rows) {
    const s = row.schema_name
    await knex.raw(`DROP TABLE IF EXISTS "${s}".discharge_plans CASCADE`)
    await knex.raw(`DROP TABLE IF EXISTS "${s}".nursing_notes CASCADE`)
    await knex.raw(`DROP TABLE IF EXISTS "${s}".medical_order_executions CASCADE`)
    await knex.raw(`DROP TABLE IF EXISTS "${s}".medical_orders CASCADE`)
    await knex.raw(`DROP TABLE IF EXISTS "${s}".vital_signs CASCADE`)
  }

  await knex.raw('DROP FUNCTION IF EXISTS add_inpatient_clinical_tables(TEXT)')
  await knex.raw('DROP TYPE IF EXISTS discharge_readiness')
  await knex.raw('DROP TYPE IF EXISTS nursing_shift')
  await knex.raw('DROP TYPE IF EXISTS order_category')
  await knex.raw('DROP TYPE IF EXISTS order_priority')
  await knex.raw('DROP TYPE IF EXISTS vital_alert_level')
  await knex.raw('DROP TYPE IF EXISTS order_status')
}
