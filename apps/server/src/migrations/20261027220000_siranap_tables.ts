import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Get all tenant schemas (query actual schema names, not tenants table which may be empty)
  const tenantSchemas = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )
  const tenantSlugs = tenantSchemas.rows.map((r: { schema_name: string }) =>
    r.schema_name.replace('tenant_', '')
  )

  for (const slug of tenantSlugs) {
    const schema = `tenant_${slug}`

    // --- siranap_config (1 row per tenant) ---
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS ${knex.raw('??', [schema])}.siranap_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kode_rs VARCHAR(20) NOT NULL DEFAULT '',
        password VARCHAR(100) NOT NULL DEFAULT '',
        endpoint VARCHAR(500) NOT NULL DEFAULT 'https://sirs.yankes.kemkes.go.id/sirsservice/ranap',
        auto_send BOOLEAN NOT NULL DEFAULT false,
        send_times TEXT NOT NULL DEFAULT '["06:00","18:00"]',
        send_on_change BOOLEAN NOT NULL DEFAULT false,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // --- siranap_submissions (log every send attempt) ---
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS ${knex.raw('??', [schema])}.siranap_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        status VARCHAR(10) NOT NULL DEFAULT 'pending',
        rooms_sent INTEGER NOT NULL DEFAULT 0,
        response_code VARCHAR(10),
        response_message TEXT,
        error_message TEXT,
        duration_ms INTEGER,
        payload_xml TEXT,
        triggered_by VARCHAR(100) NOT NULL DEFAULT 'manual',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Index on submissions for date queries
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_siranap_submissions_created
      ON ${knex.raw('??', [schema])}.siranap_submissions (created_at DESC)
    `)

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_siranap_submissions_status
      ON ${knex.raw('??', [schema])}.siranap_submissions (status)
    `)
  }
}

export async function down(knex: Knex): Promise<void> {
  const tenantSchemaRows = await knex.raw(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
  )

  for (const row of tenantSchemaRows.rows) {
    const schema = row.schema_name
    await knex.raw(`DROP TABLE IF EXISTS ${knex.raw('??', [schema])}.siranap_submissions CASCADE`)
    await knex.raw(`DROP TABLE IF EXISTS ${knex.raw('??', [schema])}.siranap_config CASCADE`)
  }
}
