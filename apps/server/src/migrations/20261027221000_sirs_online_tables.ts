import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )

  for (const row of tenantSchemas.rows) {
    const schema = row.schema_name as string

    // --- sirs_config (1 row per tenant) ---
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS ${knex.raw('??', [schema])}.sirs_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kode_rs VARCHAR(20) NOT NULL DEFAULT '',
        username VARCHAR(100) NOT NULL DEFAULT '',
        password VARCHAR(100) NOT NULL DEFAULT '',
        endpoint VARCHAR(500) NOT NULL DEFAULT 'https://sirs.kemkes.go.id/api',
        mode VARCHAR(20) NOT NULL DEFAULT 'sandbox',
        auto_send_rl13 BOOLEAN NOT NULL DEFAULT false,
        rl13_times TEXT NOT NULL DEFAULT '["06:00","18:00"]',
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // --- sirs_submissions (log every RL send attempt) ---
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS ${knex.raw('??', [schema])}.sirs_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rl_type VARCHAR(10) NOT NULL,
        periode VARCHAR(10) NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'pending',
        response_code VARCHAR(10),
        response_message TEXT,
        error_message TEXT,
        duration_ms INTEGER,
        submitted_by VARCHAR(100) NOT NULL DEFAULT 'manual',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_sirs_submissions_created
      ON ${knex.raw('??', [schema])}.sirs_submissions (created_at DESC)
    `)

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_sirs_submissions_rl_type
      ON ${knex.raw('??', [schema])}.sirs_submissions (rl_type)
    `)

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_sirs_submissions_status
      ON ${knex.raw('??', [schema])}.sirs_submissions (status)
    `)
  }
}

export async function down(knex: Knex): Promise<void> {
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )

  for (const row of tenantSchemas.rows) {
    const schema = row.schema_name as string
    await knex.raw(`DROP TABLE IF EXISTS "${schema}".sirs_submissions CASCADE`)
    await knex.raw(`DROP TABLE IF EXISTS "${schema}".sirs_config CASCADE`)
  }
}
