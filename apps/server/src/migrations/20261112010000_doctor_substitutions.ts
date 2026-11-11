import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create enum for substitution status
  await knex.raw(`
    DO $$ BEGIN CREATE TYPE substitution_status AS ENUM (
      'active', 'completed', 'cancelled'
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

    // Create doctor_substitutions table
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS "${schema}".doctor_substitutions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL,
        substitute_doctor_id UUID NOT NULL,
        tanggal_mulai DATE NOT NULL,
        tanggal_selesai DATE NOT NULL,
        alasan TEXT NOT NULL,
        catatan TEXT,
        status substitution_status NOT NULL DEFAULT 'active',
        cancelled_at TIMESTAMPTZ,
        cancelled_by UUID,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_dsub_doctor FOREIGN KEY (doctor_id)
          REFERENCES "${schema}".doctors(id) ON DELETE CASCADE,
        CONSTRAINT fk_dsub_substitute FOREIGN KEY (substitute_doctor_id)
          REFERENCES "${schema}".doctors(id) ON DELETE CASCADE,
        CONSTRAINT fk_dsub_created_by FOREIGN KEY (created_by)
          REFERENCES "${schema}".users(id),
        CONSTRAINT fk_dsub_cancelled_by FOREIGN KEY (cancelled_by)
          REFERENCES "${schema}".users(id),
        CONSTRAINT chk_dsub_dates CHECK (tanggal_mulai <= tanggal_selesai),
        CONSTRAINT chk_dsub_not_self CHECK (doctor_id != substitute_doctor_id)
      )
    `)

    // Indexes
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_dsub_doctor ON "${schema}".doctor_substitutions(doctor_id)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_dsub_substitute ON "${schema}".doctor_substitutions(substitute_doctor_id)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_dsub_status ON "${schema}".doctor_substitutions(status)`)
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_dsub_dates ON "${schema}".doctor_substitutions(tanggal_mulai, tanggal_selesai)`)

    // Trigger updated_at
    await knex.raw(`DROP TRIGGER IF EXISTS trg_dsub_updated ON "${schema}".doctor_substitutions`)
    await knex.raw(`CREATE TRIGGER trg_dsub_updated BEFORE UPDATE ON "${schema}".doctor_substitutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`)

    // Also add original_doctor_id and substitute_doctor_id to visits for tracking
    const hasOrigDoc = await knex.raw(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = ? AND table_name = 'visits' AND column_name = 'original_doctor_id'
    `, [schema])

    if (hasOrigDoc.rows.length === 0) {
      await knex.raw(`
        ALTER TABLE "${schema}".visits
        ADD COLUMN original_doctor_id UUID,
        ADD COLUMN substitution_id UUID,
        ADD CONSTRAINT fk_v_orig_doctor FOREIGN KEY (original_doctor_id)
          REFERENCES "${schema}".doctors(id),
        ADD CONSTRAINT fk_v_substitution FOREIGN KEY (substitution_id)
          REFERENCES "${schema}".doctor_substitutions(id)
      `)
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_v_orig_doctor ON "${schema}".visits(original_doctor_id)`)
      await knex.raw(`CREATE INDEX IF NOT EXISTS idx_v_substitution ON "${schema}".visits(substitution_id)`)
    }
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

    // Drop columns from visits
    await knex.raw(`
      ALTER TABLE "${schema}".visits
      DROP COLUMN IF EXISTS substitution_id,
      DROP COLUMN IF EXISTS original_doctor_id
    `)

    // Drop table
    await knex.raw(`DROP TABLE IF EXISTS "${schema}".doctor_substitutions CASCADE`)
  }

  await knex.raw('DROP TYPE IF EXISTS substitution_status CASCADE')
}
