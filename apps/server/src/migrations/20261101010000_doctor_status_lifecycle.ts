import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )

  for (const row of tenantSchemas.rows) {
    const schema = row.schema_name as string

    // Add doctor_status enum type (per schema)
    await knex.raw(`
      DO $$ BEGIN
        CREATE TYPE ${knex.raw('??', [schema])}.doctor_status AS ENUM (
          'aktif', 'cuti_panjang', 'pindah', 'resign', 'pensiun'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `)

    // Add status column to doctors table
    await knex.raw(`
      ALTER TABLE ${knex.raw('??', [schema])}.doctors
        ADD COLUMN IF NOT EXISTS status ${knex.raw('??', [schema])}.doctor_status
          NOT NULL DEFAULT 'aktif'
    `)

    // Add status_changed_at for tracking when status last changed
    await knex.raw(`
      ALTER TABLE ${knex.raw('??', [schema])}.doctors
        ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ
    `)

    // Add status_note for reason (e.g. "pindah ke RS X", "pensiun per 1 Jan 2027")
    await knex.raw(`
      ALTER TABLE ${knex.raw('??', [schema])}.doctors
        ADD COLUMN IF NOT EXISTS status_note TEXT
    `)

    // Index on status for filtering
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_doctors_status
        ON ${knex.raw('??', [schema])}.doctors(status)
    `)
  }

  // Helper function for new tenant provisioning
  await knex.raw(`
    CREATE OR REPLACE FUNCTION add_doctor_status(tenant_slug TEXT)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE format('
        DO $e$ BEGIN
          CREATE TYPE %I.doctor_status AS ENUM (
            ''aktif'', ''cuti_panjang'', ''pindah'', ''resign'', ''pensiun''
          );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $e$
      ', 'tenant_' || tenant_slug);

      EXECUTE format('
        ALTER TABLE %I.doctors
          ADD COLUMN IF NOT EXISTS status %I.doctor_status NOT NULL DEFAULT ''aktif'',
          ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS status_note TEXT
      ', 'tenant_' || tenant_slug, 'tenant_' || tenant_slug);

      EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_doctors_status ON %I.doctors(status)
      ', 'tenant_' || tenant_slug);
    END;
    $$ LANGUAGE plpgsql;
  `)
}

export async function down(knex: Knex): Promise<void> {
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )

  for (const row of tenantSchemas.rows) {
    const schema = row.schema_name as string

    await knex.raw(`
      ALTER TABLE ${knex.raw('??', [schema])}.doctors
        DROP COLUMN IF EXISTS status_note,
        DROP COLUMN IF EXISTS status_changed_at,
        DROP COLUMN IF EXISTS status
    `)

    await knex.raw(`
      DROP INDEX IF EXISTS ${knex.raw('??', [schema])}.idx_doctors_status
    `)

    await knex.raw(`
      DROP TYPE IF EXISTS ${knex.raw('??', [schema])}.doctor_status
    `)
  }

  await knex.raw('DROP FUNCTION IF EXISTS add_doctor_status(TEXT)')
}
