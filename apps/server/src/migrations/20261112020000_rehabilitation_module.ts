import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // 1. Add 'rehabilitasi' to room_type enum
  await knex.raw(`
    DO $$ BEGIN
      ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'rehabilitasi';
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)

  // 2. Create ENUMs
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

  const tenants = await knex('tenants').select('slug')

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`

    const schemaExists = await knex.raw(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?`,
      [schema],
    )
    if (schemaExists.rows.length === 0) continue

    // 3. External practitioners table
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS "${schema}".external_practitioners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nama VARCHAR(200) NOT NULL,
        profesi VARCHAR(100) NOT NULL,
        spesialisasi VARCHAR(200),
        no_sip VARCHAR(50),
        no_str VARCHAR(50),
        instansi_asal VARCHAR(200),
        telepon VARCHAR(20),
        email VARCHAR(100),
        alamat TEXT,
        fee_share_persen NUMERIC(5,2) NOT NULL DEFAULT 70,
        fee_share_rs_persen NUMERIC(5,2) NOT NULL DEFAULT 30,
        kontrak_mulai DATE,
        kontrak_selesai DATE,
        status practitioner_status NOT NULL DEFAULT 'aktif',
        catatan TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_ep_created_by FOREIGN KEY (created_by)
          REFERENCES "${schema}".users(id),
        CONSTRAINT chk_ep_fee_share CHECK (fee_share_persen + fee_share_rs_persen = 100)
      )
    `)

    // 4. Rehabilitation orders table
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS "${schema}".rehabilitation_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        visit_id UUID NOT NULL,
        patient_id UUID NOT NULL,
        ordering_doctor_id UUID NOT NULL,
        practitioner_id UUID,
        therapy_type rehab_therapy_type NOT NULL,
        status rehab_order_status NOT NULL DEFAULT 'dikirim',
        diagnosa_klinis TEXT NOT NULL,
        indikasi TEXT,
        target_terapi TEXT,
        jumlah_sesi INTEGER NOT NULL DEFAULT 1,
        sesi_selesai INTEGER NOT NULL DEFAULT 0,
        catatan_dokter TEXT,
        catatan_terapis TEXT,
        tarif_per_sesi NUMERIC(12,2) NOT NULL DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        cancelled_by UUID,
        cancelled_reason TEXT,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_ro_visit FOREIGN KEY (visit_id)
          REFERENCES "${schema}".visits(id),
        CONSTRAINT fk_ro_patient FOREIGN KEY (patient_id)
          REFERENCES "${schema}".patients(id),
        CONSTRAINT fk_ro_doctor FOREIGN KEY (ordering_doctor_id)
          REFERENCES "${schema}".doctors(id),
        CONSTRAINT fk_ro_practitioner FOREIGN KEY (practitioner_id)
          REFERENCES "${schema}".external_practitioners(id),
        CONSTRAINT fk_ro_created_by FOREIGN KEY (created_by)
          REFERENCES "${schema}".users(id),
        CONSTRAINT chk_ro_sesi CHECK (sesi_selesai <= jumlah_sesi)
      )
    `)

    // 5. Rehabilitation sessions table
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS "${schema}".rehabilitation_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        sesi_ke INTEGER NOT NULL,
        tanggal DATE NOT NULL,
        waktu_mulai TIME,
        waktu_selesai TIME,
        practitioner_id UUID,
        tindakan TEXT,
        hasil TEXT,
        catatan_progress TEXT,
        skala_nyeri_sebelum INTEGER,
        skala_nyeri_sesudah INTEGER,
        rom_sebelum TEXT,
        rom_sesudah TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'dijadwalkan',
        performed_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_rs_order FOREIGN KEY (order_id)
          REFERENCES "${schema}".rehabilitation_orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_rs_practitioner FOREIGN KEY (practitioner_id)
          REFERENCES "${schema}".external_practitioners(id),
        CONSTRAINT fk_rs_performed_by FOREIGN KEY (performed_by)
          REFERENCES "${schema}".users(id),
        CONSTRAINT chk_rs_nyeri_before CHECK (skala_nyeri_sebelum BETWEEN 0 AND 10),
        CONSTRAINT chk_rs_nyeri_after CHECK (skala_nyeri_sesudah BETWEEN 0 AND 10),
        CONSTRAINT uq_rs_order_sesi UNIQUE (order_id, sesi_ke)
      )
    `)

    // Indexes
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_ep_profesi ON "${schema}".external_practitioners(profesi)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_ep_status ON "${schema}".external_practitioners(status)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_ro_visit ON "${schema}".rehabilitation_orders(visit_id)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_ro_patient ON "${schema}".rehabilitation_orders(patient_id)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_ro_doctor ON "${schema}".rehabilitation_orders(ordering_doctor_id)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_ro_practitioner ON "${schema}".rehabilitation_orders(practitioner_id)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_ro_status ON "${schema}".rehabilitation_orders(status)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_ro_therapy ON "${schema}".rehabilitation_orders(therapy_type)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_rs_order ON "${schema}".rehabilitation_sessions(order_id)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_rs_tanggal ON "${schema}".rehabilitation_sessions(tanggal)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_rs_practitioner ON "${schema}".rehabilitation_sessions(practitioner_id)`)

    // Triggers
    await knex.raw(`DROP TRIGGER IF EXISTS trg_ep_updated ON "${schema}".external_practitioners`)
    await knex.raw(`CREATE TRIGGER trg_ep_updated BEFORE UPDATE ON "${schema}".external_practitioners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`)
    await knex.raw(`DROP TRIGGER IF EXISTS trg_ro_updated ON "${schema}".rehabilitation_orders`)
    await knex.raw(`CREATE TRIGGER trg_ro_updated BEFORE UPDATE ON "${schema}".rehabilitation_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`)
    await knex.raw(`DROP TRIGGER IF EXISTS trg_rs_updated ON "${schema}".rehabilitation_sessions`)
    await knex.raw(`CREATE TRIGGER trg_rs_updated BEFORE UPDATE ON "${schema}".rehabilitation_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`)
  }
}

export async function down(knex: Knex): Promise<void> {
  const tenants = await knex('tenants').select('slug')

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`

    const schemaExists = await knex.raw(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?`,
      [schema],
    )
    if (schemaExists.rows.length === 0) continue

    await knex.raw(`DROP TABLE IF EXISTS "${schema}".rehabilitation_sessions CASCADE`)
    await knex.raw(`DROP TABLE IF EXISTS "${schema}".rehabilitation_orders CASCADE`)
    await knex.raw(`DROP TABLE IF EXISTS "${schema}".external_practitioners CASCADE`)
  }

  await knex.raw('DROP TYPE IF EXISTS practitioner_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS rehab_therapy_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS rehab_order_status CASCADE')
}
